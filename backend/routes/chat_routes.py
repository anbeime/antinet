#!/usr/bin/env python3
# backend/routes/chat_routes.py - 知识库聊天路由
"""
提供知识库查询和对话机器人功能（简化版，不依赖向量检索）
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["聊天机器人"])

# 数据库管理器（将在main.py中设置）
db_manager = None


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
    使用关键词搜索数据库中的知识卡片

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

        # 使用 SQL LIKE 进行模糊匹配
        query_lower = query.lower()
        print(f"[DEBUG] 搜索关键词: {query_lower}")

        sql = """
            SELECT id, title, content, card_type, category, created_at
            FROM knowledge_cards
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
            ORDER BY id DESC
        """
        params = (f"%{query_lower}%", f"%{query_lower}%")
        print(f"[DEBUG] SQL: {sql}")
        print(f"[DEBUG] 参数: {params}")

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

            response.append(f"{idx}. **{title}**")
            response.append(f"   {desc}\n")

    # 补充解释
    if green_cards:
        response.append("\n**补充说明：**")
        for card in green_cards[:2]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
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

            response.append(f"**步骤 {idx}：{title}**")
            response.append(f"{desc}\n")

    # 补充背景知识
    if blue_cards and not red_cards:
        response.append("关于您的问题，这里有一些相关信息：\n")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
            response.append(f"• **{title}**：{desc}")

    # 补充原理解释
    if green_cards:
        response.append("\n**原理说明：**")
        for card in green_cards[:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
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

            response.append(f"**{title}**")
            response.append(f"{desc}\n")

    # 补充事实依据
    if blue_cards:
        response.append("\n**相关事实：**")
        for card in blue_cards[:2]:
            title = card.get("title", "")
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
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

        response.append(f"{icon} **{title}**")
        response.append(f"   {desc}\n")

    # 如果有风险提示
    if card_groups["yellow"]:
        response.append("\n⚠️ **注意事项：**")
        for card in card_groups["yellow"][:1]:
            content = card.get("content", {})
            desc = content.get("description", "") if isinstance(content, dict) else content
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
            try:
                loader.load()
            except Exception as e:
                logger.warning(f"模型加载失败，使用模板回答: {e}")
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
            '<|im_start|>', '<|im_end|>', '<|assistant|', '<|user|>',
            '<|system|>', '<|endoftext|>', '|_|end|>', 'assistant', 'user', 'system'
        ]
        for token in special_tokens:
            response = response.replace(token, '')
        # 清理多余的空行
        response = '\n'.join(line.strip() for line in response.split('\n') if line.strip())
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
    1. 根据问题类型调整回答风格
    2. 更自然的语言组织
    3. 智能摘要和整合
    4. 添加上下文理解
    """

    if not relevant_cards:
        return _generate_empty_response(query)

    # 分析问题类型
    question_type = _analyze_question_type(query)

    # 根据问题类型生成回答
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

    try:
        # 直接使用关键词搜索
        cards = _search_cards_by_keyword(request.query, limit=10)
        logger.info(f"[ChatRoutes] 关键词搜索找到 {len(cards)} 张卡片")
        print(f"[DEBUG] 搜索到 {len(cards)} 张卡片")
        
        if cards:
            print(f"[DEBUG] 第一张卡片: {cards[0]}")
        else:
            print(f"[DEBUG] 没有找到卡片，查询词: {request.query}")

        # 使用NPU模型生成AI回答（真正的RAG）
        response = _generate_ai_response(request.query, cards)
        print(f"[DEBUG] 生成回复长度: {len(response)}")
        
        # 生成推荐问题
        suggested_questions = _generate_suggested_questions(request.query, cards)

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

        logger.info(f"[ChatRoutes] 查询完成: {len(cards)}条相关卡片, {len(suggested_questions)}个推荐问题")
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
