"""
增强版聊天路由 - 集成8-Agent系统、Memory、四色卡片自进化

实现四色卡片知识库的自进化流程：
1. 用户输入 → 密卷房(预处理) → 四色卡片提取
2. 卡片存储 → 太史阁(记忆) → 知识关联
3. 待探索卡片 → 主动探索 → 新卡片生成
4. 知识网络优化 → 健康检查 → 迭代更新
"""

import logging
import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/evolving-chat", tags=["自进化聊天"])

# ==================== 请求/响应模型 ====================

class EvolvingChatRequest(BaseModel):
    """自进化聊天请求"""
    query: str = Field(..., description="用户查询")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="上下文")
    enable_evolution: bool = Field(default=True, description="是否启用自进化")
    enable_memory: bool = Field(default=True, description="是否启用记忆")
    enable_skill: bool = Field(default=True, description="是否启用技能")
    enable_8agent: bool = Field(default=True, description="是否启用完整8-Agent流程")
    user_id: str = Field(default="default_user", description="用户ID")


class CardSource(BaseModel):
    """卡片来源"""
    card_id: str
    card_type: str
    title: str
    similarity: float


class EvolvingChatResponse(BaseModel):
    """自进化聊天响应"""
    response: str
    sources: List[CardSource]
    cards: List[Dict]
    suggested_questions: List[str]
    evolution_info: Optional[Dict[str, Any]] = None
    memory_context: Optional[Dict[str, Any]] = None
    skill_used: Optional[str] = None
    agent_logs: Optional[List[str]] = None


# ==================== 核心服务 ====================

class EvolvingChatEngine:
    """自进化聊天引擎"""
    
    def __init__(self):
        self._initialized = False
        self._orchestrator = None
        self._memory = None
        self._skill_registry = None
        self._four_color_skill = None
        self._eight_agent_engine = None
    
    async def initialize(self):
        """初始化所有组件（每个组件独立失败不影响其他组件）"""
        if self._initialized:
            return
        
        # 尝试初始化 OrchestratorAgent (锦衣卫)
        try:
            from agents.orchestrator import OrchestratorAgent
            self._orchestrator = OrchestratorAgent(
                genie_api_base_url="http://127.0.0.1:8000",
                model_path=""
            )
            logger.info("[EvolvingChat] OrchestratorAgent 初始化完成")
        except Exception as e:
            logger.warning(f"[EvolvingChat] OrchestratorAgent 初始化失败: {e}")
            self._orchestrator = None
        
        # 尝试初始化 MemoryAgent (太史阁)
        try:
            from agents.memory import MemoryAgent
            self._memory = MemoryAgent()
            logger.info("[EvolvingChat] MemoryAgent 初始化完成")
        except Exception as e:
            logger.warning(f"[EvolvingChat] MemoryAgent 初始化失败: {e}")
            self._memory = None
        
        # 尝试初始化 SkillRegistry
        try:
            from services.skill_system import get_skill_registry
            self._skill_registry = get_skill_registry()
            logger.info("[EvolvingChat] SkillRegistry 初始化完成")
        except Exception as e:
            logger.warning(f"[EvolvingChat] SkillRegistry 初始化失败: {e}")
            self._skill_registry = None
        
        # 尝试初始化四色卡片技能
        try:
            from skills.four_color_card_skill import get_four_color_card_skill
            self._four_color_skill = get_four_color_card_skill()
            logger.info("[EvolvingChat] FourColorCardSkill 初始化完成")
        except Exception as e:
            logger.warning(f"[EvolvingChat] FourColorCardSkill 初始化失败: {e}")
            self._four_color_skill = None
        
        self._initialized = True
        logger.info("[EvolvingChat] 组件初始化完成（部分组件可能不可用）")
    
    async def process(
        self,
        query: str,
        context: Dict[str, Any],
        enable_evolution: bool,
        enable_memory: bool,
        enable_skill: bool,
        enable_8agent: bool,
        user_id: str
    ) -> EvolvingChatResponse:
        """处理自进化聊天"""
        
        # 确保初始化
        await self.initialize()
        
        # 如果启用完整8-Agent流程
        if enable_8agent:
            return await self._process_with_8agent(query, context, user_id)
        
        # 1. 记忆检索（太史阁）
        memory_context = {}
        if enable_memory:
            memory_context = await self._retrieve_memory(query, user_id)
        
        # 2. 技能检测
        skill_used = None
        if enable_skill:
            skill_result = await self._check_and_execute_skill(query, context)
            if skill_result:
                return EvolvingChatResponse(
                    response=skill_result["response"],
                    sources=[],
                    cards=[],
                    suggested_questions=skill_result.get("suggestions", []),
                    evolution_info={"skill_executed": skill_result.get("skill_name")},
                    memory_context=memory_context,
                    skill_used=skill_result.get("skill_name")
                )
        
        # 3. 四色卡片提取（如果启用自进化）
        evolution_info = {}
        cards = []
        if enable_evolution:
            cards, evolution_info = await self._extract_and_store_cards(query)
        
        # 4. 知识检索
        relevant_cards = await self._search_knowledge(query)
        
        # 5. 生成回答（结合记忆+知识）
        response = await self._generate_response(
            query,
            relevant_cards,
            memory_context,
            evolution_info
        )
        
        # 6. 存储对话记忆
        if enable_memory:
            await self._store_memory(query, response, user_id)
        
        # 7. 生成推荐问题
        suggestions = self._generate_suggestions(query, relevant_cards)
        
        # 8. 自进化检查
        if enable_evolution:
            await self._check_evolution_tasks()
        
        return EvolvingChatResponse(
            response=response,
            sources=[
                CardSource(
                    card_id=str(c.get("card_id", "")),
                    card_type=c.get("card_type", "blue"),
                    title=c.get("title", ""),
                    similarity=c.get("similarity", 0.8)
                )
                for c in relevant_cards[:5]
            ],
            cards=relevant_cards[:10],
            suggested_questions=suggestions,
            evolution_info=evolution_info,
            memory_context=memory_context,
            skill_used=skill_used
        )
    
    async def _process_with_8agent(
        self,
        query: str,
        context: Dict[str, Any],
        user_id: str
    ) -> EvolvingChatResponse:
        """使用完整8-Agent流程处理"""
        try:
            from routes.eight_agent_engine import get_eight_agent_engine
            
            engine = get_eight_agent_engine()
            result = await engine.process(query, context, user_id)
            
            if result.get("status") == "success":
                cards = result.get("four_color_cards", [])
                report = result.get("report", {})
                
                return EvolvingChatResponse(
                    response=report.get("text", "分析完成"),
                    sources=[
                        CardSource(
                            card_id=c.get("card_id", ""),
                            card_type=c.get("card_type", "blue"),
                            title=c.get("title", ""),
                            similarity=0.9
                        )
                        for c in cards[:5]
                    ],
                    cards=cards[:10],
                    suggested_questions=self._generate_suggestions(query, cards),
                    evolution_info={
                        "cards_extracted": {
                            "total": len(cards),
                            "blue": sum(1 for c in cards if c.get("card_type") == "blue"),
                            "green": sum(1 for c in cards if c.get("card_type") == "green"),
                            "yellow": sum(1 for c in cards if c.get("card_type") == "yellow"),
                            "red": sum(1 for c in cards if c.get("card_type") == "red"),
                        },
                        "8agent_mode": True
                    },
                    agent_logs=result.get("logs", [])
                )
            else:
                return EvolvingChatResponse(
                    response=f"8-Agent处理失败: {result.get('error', '未知错误')}",
                    sources=[],
                    cards=[],
                    suggested_questions=[],
                    agent_logs=result.get("logs", [])
                )
                
        except Exception as e:
            logger.error(f"[EvolvingChat] 8-Agent处理失败: {e}", exc_info=True)
            return EvolvingChatResponse(
                response=f"8-Agent系统调用失败: {str(e)}",
                sources=[],
                cards=[],
                suggested_questions=[]
            )
    
    async def _retrieve_memory(self, query: str, user_id: str) -> Dict[str, Any]:
        """从太史阁检索记忆"""
        try:
            if self._memory is None:
                return {}
            
            # 检索相关记忆 - 使用正确的接口
            memories = await self._memory.retrieve_knowledge("conversation", query, limit=10)
            
            return {
                "recent_conversations": memories.get("results", [])[:5],
                "user_preferences": {},
                "context_history": memories.get("results", [])
            }
        except Exception as e:
            logger.warning(f"[EvolvingChat] 记忆检索失败: {e}")
            return {}
    
    async def _store_memory(self, query: str, response: str, user_id: str):
        """存储对话记忆到太史阁"""
        try:
            if self._memory is None:
                return
            
            # 存储对话记忆 - 使用正确的接口
            await self._memory.store_knowledge("conversation", {
                "query": query,
                "response": response,
                "user_id": user_id
            })
        except Exception as e:
            logger.warning(f"[EvolvingChat] 记忆存储失败: {e}")
    
    async def _check_and_execute_skill(
        self,
        query: str,
        context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """检查并执行技能（内置 + Hermes）"""
        try:
            # 1. 先检查内置 8-Agent 技能
            if self._skill_registry is not None:
                skill_name = self._find_matching_skill(query)
                if skill_name:
                    skill = self._skill_registry.get_skill(skill_name)
                    if skill and skill.enabled:
                        result = await self._skill_registry.execute_skill(
                            skill_name,
                            query=query,
                            context=context
                        )
                        return {
                            "skill_name": skill_name,
                            "response": result.get("result", {}).get("response", "技能执行完成"),
                            "suggestions": self._generate_skill_suggestions(skill_name)
                        }

            # 2. 检查 Hermes 技能（基于关键词匹配）
            from services.hermes_skill_loader import get_hermes_skill_loader
            loader = get_hermes_skill_loader()
            skill = loader.find_matching(query)
            if skill:
                result = await skill.execute(query)
                return {
                    "skill_name": f"hermes:{skill.name}",
                    "response": result.get("result") or result.get("error", "技能执行失败"),
                    "suggestions": [f"查看 {skill.name} 帮助", f"执行其他 {skill.name} 命令"]
                }

        except Exception as e:
            logger.warning(f"[EvolvingChat] 技能执行失败: {e}")

        return None
    
    def _find_matching_skill(self, query: str) -> Optional[str]:
        """查找匹配的内置技能"""
        skill_patterns = {
            "four_color_cards": [r"提取.*卡片", r"四色.*知识", r"构建.*知识库"],
            "html_report": [r"生成.*报告", r"制作.*报告", r"报告.*HTML"],
            "ppt_generator": [r"生成.*PPT", r"制作.*PPT", r"创建.*PPT"],
            "excel_analyzer": [r"分析.*Excel", r"处理.*表格", r"Excel.*分析"],
        }
        
        query_lower = query.lower()
        for skill_name, patterns in skill_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    return skill_name
        
        return None
    
    def _generate_skill_suggestions(self, skill_name: str) -> List[str]:
        """生成技能相关建议"""
        suggestions_map = {
            "four_color_cards": [
                "查看已提取的卡片",
                "导出知识库",
                "执行健康检查"
            ],
            "html_report": [
                "查看生成的报告",
                "下载HTML文件",
                "生成分享链接"
            ]
        }
        return suggestions_map.get(skill_name, [])
    
    async def _extract_and_store_cards(
        self,
        query: str
    ) -> tuple[List[Dict], Dict[str, Any]]:
        """提取并存储四色卡片"""
        try:
            if self._four_color_skill is None:
                return [], {}
            
            # 提取卡片
            result = await self._four_color_skill.execute(
                text=query,
                source="用户对话",
                build_relations=True
            )
            
            if result.get("status") == "success":
                evolution_info = {
                    "cards_extracted": result.get("statistics", {}),
                    "relations_built": len(result.get("relations", [])),
                    "exploration_suggestions": result.get("exploration_suggestions", [])
                }
                return result.get("cards", []), evolution_info
        
        except Exception as e:
            logger.warning(f"[EvolvingChat] 四色卡片提取失败: {e}")
        
        return [], {}
    
    async def _search_knowledge(self, query: str) -> List[Dict]:
        """搜索知识库 - 同时搜索主知识库和四色卡片存储"""
        try:
            all_cards = []
            query_lower = query.lower()
            query_words = query_lower.split()
            
            # 1. 搜索四色卡片技能的内部存储
            if self._four_color_skill:
                skill_cards = self._four_color_skill.export_cards()
                for card in skill_cards:
                    content = card.get("content", "").lower()
                    title = card.get("title", "").lower()
                    score = 0
                    for word in query_words:
                        if word in content:
                            score += 1
                        if word in title:
                            score += 2
                    if score > 0:
                        all_cards.append({
                            **card,
                            "similarity": min(score / len(query_words), 1.0),
                            "source": "skill"
                        })
            
            # 2. 用向量搜索搜主知识库 (knowledge_cards表)
            try:
                from routes import vector_search
                vector_results = vector_search.search_hybrid(query, limit=20)
                logger.info(f"[EvolvingChat] 向量搜索'{query}'找到 {len(vector_results)} 条")
                for r in vector_results:
                    all_cards.append({
                        "card_id": str(r.id),
                        "card_type": r.card_type,
                        "title": r.title,
                        "content": r.content,
                        "similarity": r.score,
                        "source": "knowledge_db"
                    })
            except Exception as e:
                logger.warning(f"[EvolvingChat] 向量搜索失败，回退到关键词: {e}")
                # 回退：关键词搜索
                try:
                    from database import DatabaseManager
                    from config import settings
                    if hasattr(EvolvingChatService, '_db_instance'):
                        db = EvolvingChatService._db_instance
                    else:
                        db = DatabaseManager(settings.DB_PATH)
                        EvolvingChatService._db_instance = db

                    conn = db.get_connection()
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
                    total_count = cursor.fetchone()[0]
                    logger.info(f"[EvolvingChat] 知识库总卡片数: {total_count}")

                    if total_count > 0:
                        cursor.execute("""
                            SELECT id, card_type, title, content, category, created_at
                            FROM knowledge_cards
                            WHERE title LIKE ? OR content LIKE ?
                            ORDER BY created_at DESC
                            LIMIT 50
                        """, [f"%{query}%", f"%{query}%"])

                        rows = cursor.fetchall()
                        logger.info(f"[EvolvingChat] 关键词搜索'{query}'找到 {len(rows)} 条")

                        for row in rows:
                            content = (row["content"] or "").lower()
                            title = (row["title"] or "").lower()
                            score = 0
                            for word in query_words:
                                if word in content:
                                    score += 1
                                if word in title:
                                    score += 2
                            if score > 0:
                                all_cards.append({
                                    "card_id": str(row["id"]),
                                    "card_type": row["card_type"],
                                    "title": row["title"],
                                    "content": row["content"],
                                    "category": row["category"],
                                    "similarity": min(score / len(query_words), 1.0),
                                    "source": "knowledge_db"
                                })

                    conn.close()
                except Exception as e2:
                    logger.warning(f"[EvolvingChat] 关键词搜索也失败: {e2}")
            
            # 按相似度排序并去重
            all_cards.sort(key=lambda x: x.get("similarity", 0), reverse=True)
            
            # 去除重复（基于title）
            seen_titles = set()
            unique_cards = []
            for card in all_cards:
                title = card.get("title", "")
                if title not in seen_titles:
                    seen_titles.add(title)
                    unique_cards.append(card)
            
            return unique_cards[:10]
        
        except Exception as e:
            logger.warning(f"[EvolvingChat] 知识搜索失败: {e}")
        
        return []
    
    async def _generate_response(
        self,
        query: str,
        relevant_cards: List[Dict],
        memory_context: Dict[str, Any],
        evolution_info: Dict[str, Any]
    ) -> str:
        """生成回答"""
        
        if not relevant_cards and not memory_context.get("recent_conversations"):
            return self._generate_empty_response(query)
        
        # 构建上下文
        context_parts = []
        
        # 添加记忆上下文
        if memory_context.get("recent_conversations"):
            context_parts.append("【相关历史对话】")
            for conv in memory_context["recent_conversations"][:2]:
                context_parts.append(f"问: {conv.get('query', '')}")
                context_parts.append(f"答: {conv.get('response', '')[:100]}...")
        
        # 添加相关卡片
        if relevant_cards:
            context_parts.append("\n【相关知识】")
            for card in relevant_cards[:3]:
                card_type = card.get("card_type_cn", card.get("card_type", ""))
                content = card.get("content", "")[:150]
                context_parts.append(f"[{card_type}] {content}...")
        
        # 添加进化信息
        if evolution_info.get("cards_extracted"):
            stats = evolution_info["cards_extracted"]
            context_parts.append(f"\n【知识更新】本次对话提取了 {stats.get('total', 0)} 张知识卡片")
        
        # 构建提示
        prompt = f"""基于以下上下文信息，回答用户问题。如果上下文中没有相关信息，诚实地说明。

上下文：
{chr(10).join(context_parts)}

用户问题：{query}

请生成一个准确、简洁的回答："""
        
        # 调用LLM生成回答
        try:
            from services.ai import get_sensenova_service
            llm_service = get_sensenova_service()
            if llm_service:
                result = llm_service.chat(prompt)
                if result and hasattr(result, 'content'):
                    return result.content
        except Exception as e:
            logger.warning(f"[EvolvingChat] LLM调用失败: {e}")
        
        # Fallback到简单实现
        return self._simple_generate_response(query, relevant_cards, memory_context)
    
    def _simple_generate_response(
        self,
        query: str,
        cards: List[Dict],
        memory_context: Dict[str, Any]
    ) -> str:
        """简单的回答生成"""
        
        if not cards:
            return "抱歉，我在当前知识库中没有找到与您问题相关的信息。您可以尝试换一种表述方式，或者我可以帮您从对话中提取新的知识卡片。"
        
        # 按卡片类型组织回答
        blue_cards = [c for c in cards if c.get("card_type") == "blue"]
        green_cards = [c for c in cards if c.get("card_type") == "green"]
        yellow_cards = [c for c in cards if c.get("card_type") == "yellow"]
        red_cards = [c for c in cards if c.get("card_type") == "red"]
        
        response_parts = []
        
        # 事实信息
        if blue_cards:
            response_parts.append("【相关事实】")
            for card in blue_cards[:2]:
                response_parts.append(f"• {card.get('content', '')[:200]}")
        
        # 解释信息
        if green_cards:
            response_parts.append("\n【解释说明】")
            for card in green_cards[:2]:
                response_parts.append(f"• {card.get('content', '')[:200]}")
        
        # 风险提示
        if yellow_cards:
            response_parts.append("\n【需要注意】")
            for card in yellow_cards[:1]:
                response_parts.append(f"⚠️ {card.get('content', '')[:200]}")
        
        # 行动建议
        if red_cards:
            response_parts.append("\n【建议行动】")
            for card in red_cards[:1]:
                response_parts.append(f"👉 {card.get('content', '')[:200]}")
        
        return "\n".join(response_parts) if response_parts else "根据知识库中的信息，我找到了以下相关内容..."
    
    def _generate_empty_response(self, query: str) -> str:
        """生成空结果回答"""
        return f"我在当前知识库中没有找到与「{query}」直接相关的信息。\n\n您可以：\n1. 尝试使用不同的关键词搜索\n2. 让我从您的描述中提取新的知识卡片\n3. 提供更多背景信息帮助我理解您的问题"
    
    def _generate_suggestions(self, query: str, cards: List[Dict]) -> List[str]:
        """生成推荐问题"""
        suggestions = []
        
        # 基于卡片类型生成建议
        card_types = set(c.get("card_type") for c in cards)
        
        if "yellow" in card_types:
            suggestions.append("这些风险如何规避？")
        if "red" in card_types:
            suggestions.append("建议的具体执行步骤是什么？")
        if "green" in card_types:
            suggestions.append("还有哪些相关的原理说明？")
        if "blue" in card_types:
            suggestions.append("这些数据有哪些来源？")
        
        # 默认建议
        if not suggestions:
            suggestions = [
                "想了解更多相关知识",
                "如何将这些应用到实际工作中",
                "帮我提取这段内容的知识卡片"
            ]
        
        return suggestions[:3]
    
    async def _check_evolution_tasks(self):
        """检查自进化任务"""
        try:
            if self._four_color_skill is None:
                return
            
            stats = self._four_color_skill.get_storage_stats()
            
            # 检查待探索卡片
            pending = stats.get("explore_status", {}).get("待探索", 0)
            if pending > 5:
                logger.info(f"[EvolvingChat] 有 {pending} 张待探索卡片，建议执行探索任务")
            
            # 检查孤立卡片（无关联）
            total = stats.get("total_cards", 0)
            relations = stats.get("total_relations", 0)
            
            if total > 0 and relations < total * 0.5:
                logger.info(f"[EvolvingChat] 知识网络连通性较低，建议优化关联")
        
        except Exception as e:
            logger.warning(f"[EvolvingChat] 自进化检查失败: {e}")


# 全局引擎实例
_chat_engine: Optional[EvolvingChatEngine] = None

def get_chat_engine() -> EvolvingChatEngine:
    """获取聊天引擎单例"""
    global _chat_engine
    if _chat_engine is None:
        _chat_engine = EvolvingChatEngine()
    return _chat_engine


# ==================== API 端点 ====================

@router.post("/chat", response_model=EvolvingChatResponse)
async def evolving_chat(request: EvolvingChatRequest):
    """
    自进化聊天接口
    
    集成8-Agent系统、Memory、四色卡片自进化
    设置 enable_8agent=true 可启用完整8-Agent流程
    """
    try:
        engine = get_chat_engine()
        result = await engine.process(
            query=request.query,
            context=request.context or {},
            enable_evolution=request.enable_evolution,
            enable_memory=request.enable_memory,
            enable_skill=request.enable_skill,
            enable_8agent=request.enable_8agent,
            user_id=request.user_id
        )
        return result
    
    except Exception as e:
        logger.error(f"[EvolvingChat] 处理失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_evolution_stats():
    """获取自进化统计"""
    try:
        engine = get_chat_engine()
        await engine.initialize()
        
        # 四色卡片统计
        four_color_stats = {}
        if engine._four_color_skill:
            four_color_stats = engine._four_color_skill.get_storage_stats()
        
        # 记忆统计
        memory_stats = {}
        if engine._memory:
            memory_stats = engine._memory.get_stats()
        
        return {
            "four_color_cards": four_color_stats,
            "memory": memory_stats,
            "initialized": engine._initialized
        }
    
    except Exception as e:
        logger.error(f"[EvolvingChat] 获取统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explore")
async def trigger_exploration():
    """触发主动探索任务"""
    try:
        engine = get_chat_engine()
        await engine.initialize()
        
        if engine._four_color_skill is None:
            return {"status": "error", "message": "四色卡片技能未初始化"}
        
        # 获取待探索卡片
        cards = engine._four_color_skill.export_cards()
        pending_cards = [c for c in cards if c.get("explore_status") == "待探索"]
        
        return {
            "status": "success",
            "pending_cards": len(pending_cards),
            "message": f"发现 {len(pending_cards)} 张待探索卡片"
        }
    
    except Exception as e:
        logger.error(f"[EvolvingChat] 触发探索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/health-check")
async def knowledge_health_check():
    """执行知识库健康检查"""
    try:
        engine = get_chat_engine()
        await engine.initialize()
        
        issues = []
        
        if engine._four_color_skill:
            stats = engine._four_color_skill.get_storage_stats()
            
            # 检查孤立卡片
            total = stats.get("total_cards", 0)
            relations = stats.get("total_relations", 0)
            
            if total > 0 and relations < total * 0.3:
                issues.append({
                    "type": "low_connectivity",
                    "severity": "warning",
                    "message": f"知识网络连通性较低 ({relations}/{total})"
                })
            
            # 检查过时卡片
            pending = stats.get("explore_status", {}).get("待探索", 0)
            if pending > 10:
                issues.append({
                    "type": "pending_exploration",
                    "severity": "info",
                    "message": f"有 {pending} 张卡片待探索"
                })
        
        return {
            "status": "healthy" if not issues else "needs_attention",
            "issues": issues,
            "checked_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"[EvolvingChat] 健康检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))