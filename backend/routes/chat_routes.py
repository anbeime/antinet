#!/usr/bin/env python3
# backend/routes/chat_routes.py - 知识库聊天路由
"""
提供知识库查询和对话机器人功能（简化版，不依赖向量检索）
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import sys
import os
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["聊天机器人"])

# 数据库管理器（将在main.py中设置）
db_manager = None

# 向量搜索模块
_vector_search = None

# 太史阁记忆系统
_memory_agent = None

def _get_vector_search():
    """获取向量搜索模块"""
    global _vector_search
    if _vector_search is None:
        try:
            from routes.vector_search import hybrid_search
            _vector_search = hybrid_search
            logger.info("[ChatRoutes] 向量搜索模块已加载")
        except Exception as e:
            logger.warning(f"[ChatRoutes] 向量搜索模块加载失败: {e}")
            return None
    return _vector_search


def _get_memory_agent():
    """获取太史阁记忆系统"""
    global _memory_agent
    if _memory_agent is None:
        try:
            from agents.memory import MemoryAgent
            _memory_agent = MemoryAgent()
            logger.info("[ChatRoutes] 太史阁记忆系统已加载")
        except Exception as e:
            logger.warning(f"[ChatRoutes] 太史阁加载失败: {e}")
            return None
    return _memory_agent


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: user|assistant|system")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., description="用户查询")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="对话历史")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")


class CardSource(BaseModel):
    """知识来源"""
    card_id: str
    card_type: str
    title: str
    similarity: float


class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    sources: List[CardSource] = Field(default_factory=list)
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list, description="推荐的相关问题")


class CardSearchRequest(BaseModel):
    """卡片搜索请求"""
    query: str
    card_type: Optional[str] = None
    limit: int = 10


class CardSearchResponse(BaseModel):
    """卡片搜索响应"""
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0


def _search_cards_by_keyword(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    使用语义向量搜索数据库中的知识卡片

    参数：
        query: 查询关键词
        limit: 返回数量限制

    返回：
        匹配的卡片列表
    """
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        print(f"[DEBUG] 搜索关键词: {query}")

        # 直接使用关键词搜索（快速），避免逐卡做 embedding 推理导致极慢
        query_lower = query.lower()
        sql = """
            SELECT id, title, content, card_type, category
            FROM knowledge_cards
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
            ORDER BY id DESC
        """
        params = (f"%{query_lower}%", f"%{query_lower}%")

        cursor.execute(sql, params)

        rows = cursor.fetchall()
        
        seen_content = set()
        cards = []

        for row in rows:
            content_text = row[2] if row[2] else ""
            content_key = content_text[:100]
            
            if content_key in seen_content:
                continue
            seen_content.add(content_key)
            
            cards.append({
                "card_id": f"db_{row[0]}",
                "id": row[0],
                "title": row[1],
                "content": {
                    "description": content_text
                },
                "card_type": row[3] if row[3] else "blue",
                "category": row[4],
                "similarity": 0.8
            })
            
            if len(cards) >= limit:
                break

        conn.close()
        return cards

    except Exception as e:
        logger.error(f"搜索卡片失败: {e}", exc_info=True)
        return []


def _semantic_search_cards(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    使用 Genie 向量搜索数据库中的知识卡片
    
    参数：
        query: 查询文本
        limit: 返回数量限制
    
    返回：
        匹配的卡片列表（按相似度排序）
    """
    try:
        # 优先使用太史阁记忆系统进行语义搜索
        memory_agent = _get_memory_agent()
        
        if memory_agent is not None:
            try:
                import asyncio
                # 太史阁检索是async的，需要在同步函数中调用
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # 如果在async环境中，创建新task
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        future = pool.submit(asyncio.run, memory_agent.retrieve_knowledge("fact", query, limit))
                        memory_result = future.result()
                else:
                    memory_result = asyncio.run(memory_agent.retrieve_knowledge("fact", query, limit))
                
                if memory_result and memory_result.get("results"):
                    results = memory_result["results"]
                    cards = []
                    for r in results:
                        cards.append({
                            "card_id": r.get("id", ""),
                            "id": r.get("id", ""),
                            "title": r.get("title", ""),
                            "content": {"description": r.get("description", "")},
                            "card_type": r.get("knowledge_type", "blue"),
                            "category": "",
                            "similarity": r.get("similarity", 0.8)
                        })
                    logger.info(f"[ChatRoutes] 太史阁找到 {len(cards)} 条记忆")
                    if cards:
                        return cards
            except Exception as e:
                logger.warning(f"[ChatRoutes] 太史阁检索失败: {e}")
        
        # 回退到向量搜索模块
        vs = _get_vector_search()
        if vs is None:
            logger.warning("[ChatRoutes] 向量搜索不可用，回退到关键词搜索")
            return _search_cards_by_keyword(query, limit)
        
        # 执行混合搜索（关键词+向量）
        results = vs(query, limit=limit)
        
        # 转换为统一格式
        cards = []
        for r in results:
            cards.append({
                "card_id": r.id,
                "id": r.id.replace("db_", ""),
                "title": r.title,
                "content": {"description": r.content},
                "card_type": r.card_type,
                "category": "",
                "similarity": r.score
            })
        
        logger.info(f"[ChatRoutes] 向量搜索找到 {len(cards)} 条结果")
        return cards
        
    except Exception as e:
        logger.error(f"语义搜索失败: {e}", exc_info=True)
        # 回退到关键词搜索
        return _search_cards_by_keyword(query, limit)


def _search_invoices(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    搜索发票数据库

    参数：
        query: 查询关键词（发票号码、销售方、购买方等）
        limit: 返回数量限制

    返回：
        匹配的发票列表
    """
    global db_manager
    if db_manager is None:
        logger.error("数据库管理器未初始化")
        return []

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        query_lower = query.lower()

        # 搜索多个字段
        sql = """
            SELECT id, invoice_number, invoice_code, invoice_date,
                   seller_name, seller_tax_id, buyer_name, buyer_tax_id,
                   total_amount, amount, tax_amount, is_excluded, status, engine_used
            FROM invoices
            WHERE LOWER(invoice_number) LIKE ?
               OR LOWER(seller_name) LIKE ?
               OR LOWER(buyer_name) LIKE ?
               OR LOWER(invoice_code) LIKE ?
            ORDER BY invoice_date DESC
            LIMIT ?
        """
        like = f"%{query_lower}%"
        cursor.execute(sql, (like, like, like, like, limit))

        rows = cursor.fetchall()
        invoices = []
        for row in rows:
            invoices.append({
                "id": row["id"],
                "invoice_number": row["invoice_number"],
                "invoice_code": row["invoice_code"],
                "invoice_date": row["invoice_date"],
                "seller_name": row["seller_name"],
                "seller_tax_id": row["seller_tax_id"],
                "buyer_name": row["buyer_name"],
                "buyer_tax_id": row["buyer_tax_id"],
                "total_amount": row["total_amount"],
                "amount": row["amount"],
                "tax_amount": row["tax_amount"],
                "is_excluded": bool(row["is_excluded"]),
                "status": row["status"],
                "engine_used": row["engine_used"],
            })

        conn.close()
        logger.info(f"[ChatRoutes] 发票搜索找到 {len(invoices)} 条结果")
        return invoices

    except Exception as e:
        logger.error(f"搜索发票失败: {e}", exc_info=True)
        return []


def _is_invoice_query(query: str) -> bool:
    """判断用户查询是否与发票相关"""
    keywords = [
        "发票", "invoice", "报销", "进项", "销项", "税",
        "开票", "收票", "发票夹子", "金额", "价税",
        "¥", "￥",
    ]
    query_lower = query.lower()
    for kw in keywords:
        if kw.lower() in query_lower or kw in query:
            return True
    return False


def _generate_invoice_response(query: str, invoices: List[Dict]) -> str:
    """生成发票查询的文本回答"""
    if not invoices:
        return f"没有找到与「{query}」相关的发票记录。"

    lines = [f"找到 {len(invoices)} 张相关发票：\n"]
    for inv in invoices:
        total = inv.get("total_amount")
        total_str = f"¥{total:.2f}" if total is not None else "-"
        date = inv.get("invoice_date", "-")
        seller = inv.get("seller_name", "-")
        number = inv.get("invoice_number", "-")
        excluded = " [不报销]" if inv.get("is_excluded") else ""
        lines.append(f"• {date} {seller} ￥{total_str}（{number}）{excluded}")

    return "\n".join(lines)


def _hybrid_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    混合搜索：结合语义搜索和关键词搜索的结果
    """
    # 获取语义搜索结果
    semantic_results = _semantic_search_cards(query, limit)
    if not semantic_results:
        return _search_cards_by_keyword(query, limit)
    return semantic_results


def _analyze_question_type(query: str) -> str:
    """分析问题类型"""
    query_lower = query.lower()

    # What 类问题：是什么、有哪些
    what_keywords = ["是什么", "什么是", "有哪些", "包括", "功能", "特点"]
    if any(kw in query for kw in what_keywords):
        return "what"

    # How 类问题：如何、怎么
    how_keywords = ["如何", "怎么", "怎样", "方法", "步骤", "操作"]
    if any(kw in query for kw in how_keywords):
        return "how"

    # Why 类问题：为什么、原因
    why_keywords = ["为什么", "为何", "原因", "理由"]
    if any(kw in query for kw in why_keywords):
        return "why"

    return "general"


def _generate_what_answer(query: str, cards: List[Dict]) -> str:
    """生成 What 类问题的回答"""
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]
    green_cards = [c for c in cards if c.get("card_type") == "green"]

    response = []

    # 开场白
    if blue_cards:
        response.append(f"根据知识库，我为您找到了以下信息：\n")

        # 列举要点
        for idx, card in enumerate(blue_cards[:3], 1):
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')

            response.append(f"{idx}. {title}")
            response.append(f"   {desc}\n")

    # 补充解释
    if green_cards:
        response.append("\n补充说明：")
        for card in green_cards[:2]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
            response.append(f"• {desc}")

    # 总结
    response.append(f"\n以上信息来自知识库中的 {len(cards)} 张相关卡片。")

    return "\n".join(response)


def _generate_how_answer(query: str, cards: List[Dict]) -> str:
    """生成 How 类问题的回答"""
    red_cards = [c for c in cards if c.get("card_type") == "red"]
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]

    response = []

    # 优先显示行动建议
    if red_cards:
        response.append("根据知识库，您可以按以下步骤操作：\n")

        for idx, card in enumerate(red_cards[:3], 1):
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')

            response.append(f"步骤 {idx}：{title}")
            response.append(f"{desc}\n")

    # 补充背景知识
    if blue_cards and not red_cards:
        response.append("关于您的问题，这里有一些相关信息：\n")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
            response.append(f"• {title}：{desc}")

    # 补充原理解释
    if green_cards:
        response.append("\n原理说明：")
        for card in green_cards[:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
            response.append(f"{desc}")

    return "\n".join(response)


def _generate_why_answer(query: str, cards: List[Dict]) -> str:
    """生成 Why 类问题的回答"""
    green_cards = [c for c in cards if c.get("card_type") == "green"]
    blue_cards = [c for c in cards if c.get("card_type") == "blue"]

    response = []

    # 优先显示解释类卡片
    if green_cards:
        response.append("让我为您解释一下：\n")

        for card in green_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')

            response.append(f"{title}")
            response.append(f"{desc}\n")

    # 补充事实依据
    if blue_cards:
        response.append("\n相关事实：")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
            response.append(f"• {title}：{desc}")

    return "\n".join(response)


def _generate_general_answer(query: str, cards: List[Dict]) -> str:
    """生成通用回答"""
    response = []

    # 按卡片类型分组
    card_groups = {
        "blue": [c for c in cards if c.get("card_type") == "blue"],
        "green": [c for c in cards if c.get("card_type") == "green"],
        "yellow": [c for c in cards if c.get("card_type") == "yellow"],
        "red": [c for c in cards if c.get("card_type") == "red"]
    }

    # 开场白
    response.append(f"关于「{query}」，我为您找到了以下相关信息：\n")

    # 优先显示最相关的卡片（按相似度排序）
    sorted_cards = sorted(cards, key=lambda x: x.get("similarity", 0), reverse=True)

    for idx, card in enumerate(sorted_cards[:3], 1):
        title = card.get("title", "")
        content = card.get("content", {})
        desc = content.get("description", "") if isinstance(content, dict) else content
        card_type = card.get("card_type", "blue")

        # 根据卡片类型添加图标
        icon = {
            "blue": "📊",
            "green": "💡",
            "yellow": "⚠️",
            "red": "🎯"
        }.get(card_type, "•")

        response.append(f"{icon} {title}")
        # 清理内容中的markdown格式
        clean_desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
        response.append(f"   {clean_desc}\n")

    # 如果有风险提示
    if card_groups["yellow"]:
        response.append("\n注意事项：")
        for card in card_groups["yellow"][:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            desc = desc.replace('**', '').replace('*', '').replace('#', '').replace('`', '')
            response.append(f"{desc}")

    return "\n".join(response)


def _generate_empty_response(query: str) -> str:
    """生成空结果回答"""
    suggestions = [
        "• 尝试使用不同的关键词",
        "• 简化您的问题",
        "• 查看推荐问题获取灵感"
    ]

    return f"""很抱歉，我在知识库中没有找到与「{query}」直接相关的信息。

您可以：
{chr(10).join(suggestions)}

我可以帮您解答关于 Antinet 系统功能、NPU 推理、团队协作、知识管理等方面的问题。"""


def _generate_ai_response(query: str, cards: List[Dict]) -> str:
    """
    使用NPU模型生成回答（基于搜索到的卡片内容）
    
    这是真正的RAG：检索增强生成
    """
    if not cards:
        return _generate_empty_response(query)
    
    try:
        from models.model_loader import get_model_loader
        
        loader = get_model_loader()
        if not loader.is_loaded:
            # NPU 模型未加载，直接使用模板回答（避免阻塞）
            logger.info("NPU 模型未加载，使用模板回答")
            return _generate_general_answer(query, cards)
        
        # 构建上下文：将搜索到的卡片内容作为参考
        context_parts = []
        for i, card in enumerate(cards[:5], 1):
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else str(content)
            card_type = card.get("card_type", "blue")
            type_name = {"blue": "事实", "green": "解释", "yellow": "风险", "red": "行动"}.get(card_type, "信息")
            # 清理描述中的特殊字符
            desc = desc.replace('@{', '').replace('}', '').replace('description=', '')
            context_parts.append(f"{i}. 【{type_name}】{title}\n{desc[:200]}")
        
        context = "\n".join(context_parts)
        
        # 构建提示词 - 更简洁直接
        prompt = f"""根据以下知识回答问题，用简洁的中文，不超过100字：

{context}

问：{query}
答："""
        
        # NPU推理
        raw_output = loader.infer(
            prompt=prompt,
            max_new_tokens=256,
            temperature=0.7
        )
        
        # 清理输出：移除特殊token
        response = raw_output.strip()
        # 移除常见的特殊token
        special_tokens = [
            '``', '````', '<|assistant|', '<|user|>',
            '<|system|>', '``````', '|_|end|>', 'assistant', 'user', 'system'
        ]
        for token in special_tokens:
            response = response.replace(token, '')
        # 清理多余的空行
        response = '\n'.join(line.strip() for line in response.split('\n') if line.strip())
        # 移除单独成行的数字（1, 2, 3 等单独占一行的情况）
        lines = response.split('\n')
        filtered = [line for line in lines if not re.match(r'^\d+\.?$', line.strip())]
        response = '\n'.join(filtered)
        response = response.strip()
        
        if response and len(response) > 10:
            logger.info(f"[ChatRoutes] NPU生成回答成功")
            return response
        else:
            return _generate_general_answer(query, cards)
            
    except Exception as e:
        logger.error(f"NPU生成回答失败: {e}")
        return _generate_general_answer(query, cards)


def _generate_response(query: str, relevant_cards: List[Dict]) -> str:
    """
    生成改进的自然语言回复

    改进点：
    1. 优先尝试使用NPU模型进行RAG生成
    2. 根据问题类型调整回答风格
    3. 更自然的语言组织
    4. 智能摘要和整合
    """

    if not relevant_cards:
        return _generate_empty_response(query)

    # 优先尝试使用NPU模型生成RAG回答
    try:
        ai_response = _generate_ai_response(query, relevant_cards)
        if ai_response and len(ai_response) > 10:
            return ai_response
    except Exception as e:
        logger.warning(f"[ChatRoutes] NPU生成失败，回退到模板: {e}")

    # 回退到模板回答
    question_type = _analyze_question_type(query)

    if question_type == "what":
        return _generate_what_answer(query, relevant_cards)
    elif question_type == "how":
        return _generate_how_answer(query, relevant_cards)
    elif question_type == "why":
        return _generate_why_answer(query, relevant_cards)
    else:
        return _generate_general_answer(query, relevant_cards)


def _generate_suggested_questions(query: str, relevant_cards: List[Dict]) -> List[str]:
    """
    根据查询和相关卡片生成推荐问题
    
    参数:
        query: 用户查询
        relevant_cards: 相关卡片
        
    返回:
        推荐问题列表（最多3个）
    """
    suggestions = []
    
    # 基于查询关键词的推荐问题映射
    keyword_questions = {
        "系统": [
            "Antinet系统有哪些核心功能？",
            "如何启动Antinet系统？",
            "系统的技术架构是怎样的？"
        ],
        "NPU": [
            "NPU推理性能如何优化？",
            "如何验证NPU是否正常工作？",
            "NPU和CPU的性能差异有多大？"
        ],
        "卡片": [
            "四色卡片分别代表什么含义？",
            "如何创建和管理知识卡片？",
            "卡片系统的设计理念是什么？"
        ],
        "团队": [
            "如何进行团队协作？",
            "团队成员如何共享知识？",
            "协作活动如何记录和查看？"
        ],
        "数据": [
            "数据如何保证安全性？",
            "支持哪些数据格式？",
            "如何进行数据分析？"
        ],
        "启动": [
            "如何一键启动系统？",
            "启动失败如何排查？",
            "需要哪些环境依赖？"
        ],
        "性能": [
            "如何优化系统性能？",
            "推理延迟多少算正常？",
            "性能瓶颈在哪里？"
        ],
        "API": [
            "系统提供哪些API接口？",
            "如何调用API进行开发？",
            "API文档在哪里查看？"
        ]
    }
    
    # 基于卡片类型的推荐问题
    card_type_questions = {
        "blue": [
            "还有哪些相关的事实信息？",
            "这个功能的具体参数是什么？",
            "有没有更详细的说明文档？"
        ],
        "green": [
            "为什么要这样设计？",
            "有没有其他实现方式？",
            "这种方法的优缺点是什么？"
        ],
        "yellow": [
            "如何避免这些风险？",
            "遇到问题如何排查？",
            "有哪些注意事项？"
        ],
        "red": [
            "具体操作步骤是什么？",
            "有没有快捷方式？",
            "完成后如何验证？"
        ]
    }
    
    # 1. 根据查询关键词推荐
    query_lower = query.lower()
    for keyword, questions in keyword_questions.items():
        if keyword in query_lower or keyword in query:
            suggestions.extend(questions)
            break
    
    # 2. 根据相关卡片类型推荐
    if relevant_cards:
        card_types = [c.get("card_type") for c in relevant_cards[:3]]
        most_common_type = max(set(card_types), key=card_types.count) if card_types else None
        if most_common_type and most_common_type in card_type_questions:
            suggestions.extend(card_type_questions[most_common_type])
    
    # 3. 通用推荐问题（兜底）
    if not suggestions:
        suggestions = [
            "Antinet系统有哪些核心功能？",
            "如何快速上手使用系统？",
            "系统支持哪些数据分析功能？"
        ]
    
    # 去重并返回前3个
    unique_suggestions = []
    for q in suggestions:
        if q not in unique_suggestions:
            unique_suggestions.append(q)
        if len(unique_suggestions) >= 3:
            break
    
    return unique_suggestions


@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    知识库查询接口

    接收用户查询，返回基于知识库的回复
    """
    logger.info(f"[ChatRoutes] 收到查询: {request.query}")
    import time as _time
    t_start = _time.time()

    try:
        # 搜索卡片 - 使用混合搜索（语义+关键词）
        t_search = _time.time()
        cards = _hybrid_search(request.query, limit=10)

        # 如果查询与发票相关，也搜索发票
        invoices = []
        if _is_invoice_query(request.query):
            invoices = _search_invoices(request.query, limit=5)

        t_search_ms = (_time.time() - t_search) * 1000
        logger.info(f"[ChatRoutes] 搜索耗时 {t_search_ms:.0f}ms, 找到 {len(cards)} 张卡片, {len(invoices)} 张发票")
        
        # 生成回答
        t_gen = _time.time()
        if invoices:
            invoice_part = _generate_invoice_response(request.query, invoices)
            card_part = _generate_response(request.query, cards)
            if cards:
                response = f"{card_part}\n\n---\n\n{invoice_part}"
            else:
                response = invoice_part
        else:
            response = _generate_response(request.query, cards)
        t_gen_ms = (_time.time() - t_gen) * 1000
        logger.info(f"[ChatRoutes] 生成回答耗时 {t_gen_ms:.0f}ms")
        
        # 生成推荐问题
        suggested_questions = _generate_suggested_questions(request.query, cards)
        
        t_total_ms = (_time.time() - t_start) * 1000
        logger.info(f"[ChatRoutes] 查询总耗时 {t_total_ms:.0f}ms")

        # 构建响应
        sources = [
            CardSource(
                card_id=str(card.get("card_id", card.get("id", ""))),
                card_type=card.get("card_type", "unknown"),
                title=card.get("title", ""),
                similarity=card.get("similarity", 0.8)
            )
            for card in cards[:5]
        ]
        
        result = ChatResponse(
            response=response,
            sources=sources,
            cards=cards[:10],
            suggested_questions=suggested_questions
        )

        logger.info(f"[ChatRoutes] 查询完成: {len(cards)}条相关卡片, {len(invoices)}张发票, {len(suggested_questions)}个推荐问题")
        return result

    except Exception as e:
        logger.error(f"[ChatRoutes] 查询失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=CardSearchResponse)
async def search_cards(request: CardSearchRequest):
    """
    卡片搜索接口

    搜索知识库中的卡片
    """
    logger.info(f"[ChatRoutes] 搜索卡片: {request.query} (类型: {request.card_type})")

    try:
        # 使用关键词搜索
        cards = _search_cards_by_keyword(request.query, limit=request.limit)

        # 如果指定了卡片类型，进行过滤
        if request.card_type:
            cards = [c for c in cards if c.get("card_type") == request.card_type]

        result = CardSearchResponse(
            cards=cards,
            total=len(cards)
        )

        logger.info(f"[ChatRoutes] 搜索完成: {len(cards)}条结果")
        return result

    except Exception as e:
        logger.error(f"[ChatRoutes] 搜索失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cards")
async def list_cards(
    card_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    列出知识卡片

    参数：
        card_type: 卡片类型过滤（可选）
        limit: 返回数量限制（默认50）
        offset: 偏移量（默认0）
    """
    global db_manager
    logger.info(f"[ChatRoutes] 列出卡片 (类型: {card_type}, 限制: {limit})")

    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()

        # 构建查询
        if card_type:
            cursor.execute("""
                SELECT id, title, content, card_type, category, created_at
                FROM knowledge_cards
                WHERE card_type = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (card_type, limit, offset))
        else:
            cursor.execute("""
                SELECT id, title, content, card_type, category, created_at
                FROM knowledge_cards
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()
        cards = []

        for row in rows:
            cards.append({
                "card_id": f"db_{row[0]}",
                "id": row[0],
                "title": row[1],
                "content": {
                    "description": row[2]
                },
                "card_type": row[3] if row[3] else "blue",
                "category": row[4],
                "similarity": 0.8
            })

        # 获取总数
        if card_type:
            cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE card_type = ?", (card_type,))
        else:
            cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]

        conn.close()

        return {
            "cards": cards,
            "total": total
        }

    except Exception as e:
        logger.error(f"[ChatRoutes] 列出卡片失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/card/{card_id}")
async def get_card(card_id: str):
    """
    获取单个卡片详情

    参数：
        card_id: 卡片ID（格式：db_<id>）

    返回：
        卡片详情
    """
    global db_manager
    logger.info(f"[ChatRoutes] 获取卡片: {card_id}")

    try:
        # 解析卡片ID
        if card_id.startswith("db_"):
            db_id = int(card_id.replace("db_", ""))
        else:
            db_id = int(card_id)

        conn = db_manager.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, card_type, title, content, category, created_at
            FROM knowledge_cards
            WHERE id = ?
        """, (db_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"卡片不存在: {card_id}"
            )

        return {
            "card_id": f"db_{row[0]}",
            "id": row[0],
            "card_type": row[1] if row[1] else "blue",
            "title": row[2],
            "content": {
                "description": row[3]
            },
            "source": None,  # knowledge_cards 表没有 source 字段
            "category": row[4],
            "similarity": 0.8
        }

    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的卡片ID格式: {card_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ChatRoutes] 获取卡片失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    聊天机器人健康检查

    返回：
        服务状态
    """
    try:
        # 简化版本，总是返回健康状态
        return {
            "status": "healthy",
            "database_initialized": True,
            "search_type": "keyword_match"  # 使用关键词匹配而非向量检索
        }
    except Exception as e:
        logger.error(f"[ChatRoutes] 健康检查失败: {e}", exc_info=True)
        return {
            "status": "degraded",
            "database_initialized": False,
            "error": str(e)
        }


# ==================== Hermes 集成 ====================

HERMES_API_URL = os.environ.get("HERMES_API_URL", "http://localhost:8001")


async def call_hermes_api(query: str, context: str = "", history: list = None) -> str:
    """
    调用Hermes API获取智能回复
    
    参数:
        query: 用户问题
        context: 知识库上下文
        history: 对话历史
    
    返回:
        Hermes的回复
    """
    import aiohttp
    
    system_prompt = f"""你是一个智能助手。请根据以下知识库信息回答用户的问题。

知识库参考内容：
{context}

如果知识库中有相关信息，请优先使用知识库内容回答。
如果没有相关信息，请基于你的知识回答，并说明。"""

    messages = []
    if history:
        for msg in history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    
    messages.append({"role": "user", "content": query})
    
    payload = {
        "message": query,
        "history": messages,
        "system_prompt": system_prompt
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{HERMES_API_URL}/api/chat",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("response", "")
                else:
                    logger.warning(f"Hermes API返回错误: {resp.status}")
                    return ""
    except Exception as e:
        logger.warning(f"调用Hermes失败: {e}")
        return ""


@router.post("/with_hermes")
async def chat_with_hermes(request: ChatRequest):
    """
    集成Hermes的聊天接口
    结合知识库搜索 + Hermes LLM智能回复
    
    请求：
        query: 用户问题
        conversation_history: 对话历史（可选）
        use_hermes: 是否调用Hermes（默认True）
    
    返回：
        response: 回复内容
        sources: 知识库来源
        from_hermes: 是否来自Hermes
    """
    use_hermes = request.context.get("use_hermes", True) if request.context else True
    
    logger.info(f"[ChatRoutes] chat_with_hermes: {request.query}, hermes={use_hermes}")
    
    try:
        # 1. 先搜索知识库
        cards = _search_cards_by_keyword(request.query, limit=5)
        
        # 构建知识库上下文
        context_parts = []
        for card in cards:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            context_parts.append(f"【{title}】{desc}")
        
        kb_context = "\n\n".join(context_parts[:3])
        
        # 2. 如果Hermes可用，调用它
        hermes_response = ""
        if use_hermes:
            hermes_response = await call_hermes_api(
                request.query,
                context=kb_context,
                history=[{"role": m.role, "content": m.content} for m in request.conversation_history]
            )
        
        sources = []
        for card in cards:
            sources.append(CardSource(
                card_id=card.get("card_id", ""),
                card_type=card.get("card_type", "blue"),
                title=card.get("title", ""),
                similarity=card.get("similarity", 0.8)
            ))
        
        # 3. 返回结果
        if hermes_response:
            return {
                "response": hermes_response,
                "sources": sources,
                "cards": cards,
                "from_hermes": True
            }
        else:
            # Hermes不可用，回退到模板生成
            answer = _generate_general_answer(request.query, cards)
            return {
                "response": answer,
                "sources": sources,
                "cards": cards,
                "from_hermes": False
            }
            
    except Exception as e:
        logger.error(f"[ChatRoutes] chat_with_hermes失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
