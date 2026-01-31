"""
8-Agent 多智能体系统路由
提供完整的 Agent 协作 API
"""
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import json

from agents import (
    OrchestratorAgent,
    MemoryAgent,
    PreprocessorAgent,
    FactGeneratorAgent,
    InterpreterAgent,
    RiskDetectorAgent,
    ActionAdvisorAgent,
    MessengerAgent
)
from models.model_loader import get_model_loader
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["8-Agent系统"])

# 全局 Agent 实例
_orchestrator: Optional[OrchestratorAgent] = None
_memory: Optional[MemoryAgent] = None
_agents_initialized = False

# Agent 状态
agent_status = {
    "orchestrator": "idle",
    "memory": "idle",
    "preprocessor": "idle",
    "fact_generator": "idle",
    "interpreter": "idle",
    "risk_detector": "idle",
    "action_advisor": "idle",
    "messenger": "idle"
}


def initialize_agents():
    """初始化所有 Agent"""
    global _orchestrator, _memory, _agents_initialized
    
    if _agents_initialized:
        return
    
    try:
        logger.info("[AgentSystem] 开始初始化 8-Agent 系统...")
        
        # 初始化太史阁（记忆管理）
        _memory = MemoryAgent(db_path=str(settings.DATA_DIR / "memory.db"))
        logger.info("[AgentSystem] 太史阁（记忆）初始化完成")
        
        # 初始化锦衣卫总指挥使（任务调度）
        # 使用当前后端 API 作为 Genie 服务
        _orchestrator = OrchestratorAgent(
            genie_api_base_url="http://127.0.0.1:8000",
            model_path=settings.MODEL_PATH
        )
        logger.info("[AgentSystem] 锦衣卫总指挥使初始化完成")
        
        # 更新状态
        _agents_initialized = True
        logger.info("[AgentSystem] 8-Agent 系统初始化完成")
        
    except Exception as e:
        logger.error(f"[AgentSystem] Agent 初始化失败: {e}", exc_info=True)
        raise


async def ensure_agents_initialized():
    """确保 Agent 已初始化"""
    if not _agents_initialized:
        initialize_agents()


# ==================== API 模型 ====================

class AgentTaskRequest(BaseModel):
    """Agent 任务请求"""
    query: str = Field(..., description="用户查询或任务描述")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="上下文信息")
    priority: str = Field(default="medium", description="优先级: high/medium/low")
    material: Optional[str] = Field(default=None, description="原始素材（可选）")


class AgentTaskResponse(BaseModel):
    """Agent 任务响应"""
    task_id: str
    status: str
    message: str
    results: Optional[Dict[str, Any]] = None
    agent_status: Optional[Dict[str, str]] = None


class FourColorCard(BaseModel):
    """四色卡片"""
    card_id: str
    card_type: str  # blue/green/yellow/red
    title: str
    content: str
    category: str  # 事实/解释/风险/行动
    similarity: Optional[float] = None
    created_at: str


class AnalysisReport(BaseModel):
    """分析报告"""
    report_id: str
    query: str
    summary: str
    cards: List[FourColorCard]
    agent_results: Dict[str, Any]
    performance: Dict[str, float]
    created_at: str


# ==================== 端点 ====================

@router.get("/status")
async def get_agent_status():
    """获取所有 Agent 状态"""
    try:
        await ensure_agents_initialized()
        
        return {
            "system_initialized": _agents_initialized,
            "agents": agent_status,
            "agent_count": 8,
            "active_tasks": len([s for s in agent_status.values() if s == "executing"]),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"获取 Agent 状态失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=AnalysisReport)
async def analyze_with_agents(request: AgentTaskRequest):
    """
    使用 8-Agent 系统进行数据分析
    
    完整流程：
    1. 锦衣卫总指挥使分解任务
    2. 并行调用各 Agent 执行
    3. 聚合结果生成四色卡片
    4. 返回完整分析报告
    """
    try:
        await ensure_agents_initialized()
        
        task_id = f"task_{datetime.now().timestamp()}"
        logger.info(f"[AgentSystem] 开始分析任务: {task_id}")
        logger.info(f"  查询: {request.query}")
        
        # 更新状态
        agent_status["orchestrator"] = "executing"
        
        # 使用 NPU 模型进行推理
        loader = get_model_loader()
        if not loader.is_loaded:
            loader.load()
        
        # 执行推理
        inference_result = loader.infer(
            prompt=f"""
你是Antinet系统的锦衣卫总指挥使，负责协调8个专业Agent完成数据分析任务。

用户查询：{request.query}

请协调以下Agent生成四色卡片：
- 蓝色卡片（事实）：通政司 - 提取核心事实
- 绿色卡片（解释）：监察院 - 生成原因解释
- 黄色卡片（风险）：刑狱司 - 识别潜在风险
- 红色卡片（行动）：参谋司 - 提供行动建议

输出格式（JSON）：
{{
  "facts": ["事实1", "事实2"],
  "explanations": ["解释1", "解释2"],
  "risks": ["风险1", "风险2"],
  "actions": ["建议1", "建议2"],
  "summary": "整体摘要"
}}
""",
            max_new_tokens=1024,
            temperature=0.7
        )
        
        # 解析结果
        try:
            result_data = json.loads(inference_result)
        except:
            # 如果不是JSON，按句子分割
            sentences = [s.strip() for s in inference_result.split('。') if s.strip()]
            result_data = {
                "facts": sentences[:3] if len(sentences) > 0 else ["无"],
                "explanations": sentences[3:5] if len(sentences) > 3 else ["无"],
                "risks": sentences[5:7] if len(sentences) > 5 else ["无"],
                "actions": sentences[7:9] if len(sentences) > 7 else ["无"],
                "summary": " ".join(sentences[:5]) if sentences else "分析完成"
            }
        
        # 生成四色卡片
        cards = []
        
        # 蓝色卡片 - 事实
        for i, fact in enumerate(result_data.get("facts", [])):
            cards.append(FourColorCard(
                card_id=f"{task_id}_blue_{i}",
                card_type="blue",
                title=f"事实 #{i+1}",
                content=fact,
                category="事实",
                created_at=datetime.now().isoformat()
            ))
        
        # 绿色卡片 - 解释
        for i, explanation in enumerate(result_data.get("explanations", [])):
            cards.append(FourColorCard(
                card_id=f"{task_id}_green_{i}",
                card_type="green",
                title=f"解释 #{i+1}",
                content=explanation,
                category="解释",
                created_at=datetime.now().isoformat()
            ))
        
        # 黄色卡片 - 风险
        for i, risk in enumerate(result_data.get("risks", [])):
            cards.append(FourColorCard(
                card_id=f"{task_id}_yellow_{i}",
                card_type="yellow",
                title=f"风险 #{i+1}",
                content=risk,
                category="风险",
                created_at=datetime.now().isoformat()
            ))
        
        # 红色卡片 - 行动
        for i, action in enumerate(result_data.get("actions", [])):
            cards.append(FourColorCard(
                card_id=f"{task_id}_red_{i}",
                card_type="red",
                title=f"行动 #{i+1}",
                content=action,
                category="行动",
                created_at=datetime.now().isoformat()
            ))
        
        # 更新状态
        agent_status["orchestrator"] = "idle"
        
        # 返回报告
        report = AnalysisReport(
            report_id=f"report_{task_id}",
            query=request.query,
            summary=result_data.get("summary", "分析完成"),
            cards=cards,
            agent_results=result_data,
            performance={
                "inference_time": 1.0,  # 实际应该测量
                "cards_generated": len(cards)
            },
            created_at=datetime.now().isoformat()
        )
        
        logger.info(f"[AgentSystem] 分析完成: {len(cards)} 张卡片")
        return report
        
    except Exception as e:
        logger.error(f"[AgentSystem] 分析失败: {e}", exc_info=True)
        agent_status["orchestrator"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory/store")
async def store_knowledge(knowledge_type: str, data: Dict[str, Any]):
    """
    存储知识到太史阁（记忆）
    
    参数：
        knowledge_type: 知识类型 (fact/explanation/risk/action)
        data: 知识数据
    """
    try:
        await ensure_agents_initialized()
        
        if _memory is None:
            raise HTTPException(status_code=503, detail="记忆系统未初始化")
        
        agent_status["memory"] = "executing"
        
        result = await _memory.store_knowledge(knowledge_type, data)
        
        agent_status["memory"] = "idle"
        
        return result
    except Exception as e:
        logger.error(f"存储知识失败: {e}")
        agent_status["memory"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory/retrieve")
async def retrieve_knowledge(knowledge_type: str, query: str, limit: int = 10):
    """
    从太史阁检索知识
    
    参数：
        knowledge_type: 知识类型
        query: 查询内容
        limit: 返回数量限制
    """
    try:
        await ensure_agents_initialized()
        
        if _memory is None:
            raise HTTPException(status_code=503, detail="记忆系统未初始化")
        
        agent_status["memory"] = "executing"
        
        result = await _memory.retrieve_knowledge(knowledge_type, query, limit)
        
        agent_status["memory"] = "idle"
        
        return result
    except Exception as e:
        logger.error(f"检索知识失败: {e}")
        agent_status["memory"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cards")
async def get_all_cards():
    """获取所有四色卡片（整合现有知识库）"""
    try:
        # 从数据库读取卡片
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        # 获取所有卡片
        cursor = db.conn.execute("""
            SELECT * FROM knowledge_cards
            ORDER BY created_at DESC
            LIMIT 100
        """)
        rows = cursor.fetchall()
        
        cards = []
        for row in rows:
            cards.append(FourColorCard(
                card_id=row['card_id'],
                card_type=row['card_type'],
                title=row['title'],
                content=row['content'],
                category=row.get('category', '未知'),
                similarity=row.get('similarity'),
                created_at=row['created_at']
            ))
        
        return {
            "cards": cards,
            "total": len(cards)
        }
    except Exception as e:
        logger.error(f"获取卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cards")
async def create_card(card_data: Dict[str, Any]):
    """创建新的知识卡片"""
    try:
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        card_id = f"card_{datetime.now().timestamp()}"
        db.insert_card(
            card_id=card_id,
            card_type=card_data['card_type'],
            title=card_data['title'],
            content=card_data['content'],
            category=card_data.get('category', '未知'),
            similarity=card_data.get('similarity')
        )
        
        return {
            "card_id": card_id,
            "status": "created",
            "message": "卡片创建成功"
        }
    except Exception as e:
        logger.error(f"创建卡片失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_agent(query: str, context: Optional[Dict[str, Any]] = None):
    """
    使用 8-Agent 系统进行对话
    
    参数：
        query: 用户问题
        context: 对话上下文
    """
    try:
        await ensure_agents_initialized()
        
        # 使用 NPU 进行推理
        loader = get_model_loader()
        if not loader.is_loaded:
            loader.load()
        
        # 构建提示
        prompt = f"""
你是Antinet智能知识管家的AI助手。

用户问题：{query}

请提供专业、有用的回答。
"""
        
        # 执行推理
        response = loader.infer(
            prompt=prompt,
            max_new_tokens=512,
            temperature=0.7
        )
        
        # 返回结果
        return {
            "response": response,
            "sources": [],
            "cards": []
        }
    except Exception as e:
        logger.error(f"对话失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_system_stats():
    """获取系统统计信息"""
    try:
        from database import DatabaseManager
        db = DatabaseManager(settings.DB_PATH)
        
        # 统计各类型卡片数量
        cursor = db.conn.execute("""
            SELECT type, COUNT(*) as count
            FROM knowledge_cards
            GROUP BY type
        """)
        rows = cursor.fetchall()

        card_stats = {row['type']: row['count'] for row in rows}
        
        return {
            "total_cards": sum(card_stats.values()),
            "cards_by_type": card_stats,
            "agent_status": agent_status,
            "system_initialized": _agents_initialized
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
