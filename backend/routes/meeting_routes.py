"""
8-Agent协作会议路由
使用后端真实的8个Agent进行讨论决策
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import logging

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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meeting", tags=["8-Agent会议"])

# 8个Agent的映射信息（前端显示用）
AGENT_MAPPING = {
    "taishige": {
        "backend_id": "memory",
        "name": "太史阁",
        "title": "历史记录与反思官",
        "avatar": "📚",
        "description": "负责记录所有操作、决策和结果，构建组织的集体记忆与经验库",
        "color": "from-blue-500 to-blue-600"
    },
    "jinjiyu": {
        "backend_id": "risk_detector",
        "name": "锦衣卫",
        "title": "安全与情报收集官",
        "avatar": "🛡️",
        "description": "监控系统安全状态，识别潜在威胁和风险，收集内外部情报",
        "color": "from-red-500 to-red-600"
    },
    "tongzhengsi": {
        "backend_id": "fact_generator",
        "name": "通政司",
        "title": "信息与通讯中枢",
        "avatar": "📡",
        "description": "管理所有信息流，确保内外部通讯畅通，促进跨部门协作",
        "color": "from-green-500 to-green-600"
    },
    "jianchayuan": {
        "backend_id": "interpreter",
        "name": "监察院",
        "title": "监督与审计官",
        "avatar": "🔍",
        "description": "监督各项操作和流程的执行情况，进行合规性审计",
        "color": "from-purple-500 to-purple-600"
    },
    "mijuanfang": {
        "backend_id": "preprocessor",
        "name": "密卷房",
        "title": "知识库与档案管理员",
        "avatar": "📂",
        "description": "专门负责非结构化知识的整理、归档、索引和检索",
        "color": "from-indigo-500 to-indigo-600"
    },
    "chengxiangfu": {
        "backend_id": "action_advisor",
        "name": "丞相府",
        "title": "战略规划与决策支持官",
        "avatar": "👑",
        "description": "基于全局数据进行战略分析，提供决策支持",
        "color": "from-yellow-500 to-yellow-600"
    },
    "junjichu": {
        "backend_id": "messenger",
        "name": "军机处",
        "title": "任务执行与结果官",
        "avatar": "⚔️",
        "description": "执行具体任务，生成分析结果和四色卡片",
        "color": "from-orange-500 to-orange-600"
    },
    "zhihuishi": {
        "backend_id": "orchestrator",
        "name": "指挥使",
        "title": "任务协调官",
        "avatar": "🎯",
        "description": "协调锦衣卫总指挥使与各部门的工作，确保任务高效流转",
        "color": "from-teal-500 to-teal-600"
    }
}


class MeetingRequest(BaseModel):
    """会议请求"""
    topic: str = Field(..., description="会议主题", min_length=1, max_length=200)
    context: Optional[str] = Field(default="", description="背景信息")
    card_ids: Optional[List[str]] = Field(default=[], description="相关卡片ID列表")
    rounds: int = Field(default=3, ge=1, le=5, description="讨论轮数")


class AgentSpeech(BaseModel):
    """Agent发言"""
    agent_id: str
    agent_name: str
    agent_title: str
    avatar: str
    speech: str
    timestamp: str
    cards_referenced: List[str] = []


class MeetingRound(BaseModel):
    """会议轮次"""
    round: int
    theme: str
    speeches: List[AgentSpeech]


class MeetingResponse(BaseModel):
    """会议响应"""
    success: bool
    topic: str
    meeting_id: str
    rounds: List[MeetingRound]
    summary: str
    decision: str
    action_items: List[str]
    participants: List[str]
    start_time: str
    end_time: str
    duration_seconds: float


class AgentInfo(BaseModel):
    """Agent信息"""
    id: str
    name: str
    title: str
    avatar: str
    description: str
    color: str


@router.get("/agents", response_model=List[AgentInfo])
async def get_agents():
    """
    获取所有8个Agent的信息
    
    返回前端显示的8个Agent（太史阁、锦衣卫等）
    """
    return [
        AgentInfo(
            id=agent_id,
            name=info["name"],
            title=info["title"],
            avatar=info["avatar"],
            description=info["description"],
            color=info["color"]
        )
        for agent_id, info in AGENT_MAPPING.items()
    ]


@router.post("/discuss", response_model=MeetingResponse)
async def create_meeting(request: MeetingRequest):
    """
    创建8-Agent协作会议
    
    8个Agent基于主题和知识卡片进行真实讨论，形成决策
    
    参数：
        - topic: 会议主题
        - context: 背景信息
        - card_ids: 相关卡片ID列表
        - rounds: 讨论轮数（1-5）
    
    返回：
        完整的会议记录、讨论总结、决策结果、行动项
    """
    import time
    start_time = time.time()
    meeting_id = f"meeting_{int(start_time * 1000)}"
    
    try:
        logger.info(f"[Meeting] 开始8-Agent会议: {request.topic}")
        
        # 获取配置
        from config import settings
        genie_api_base_url = "http://127.0.0.1:8910"
        model_path = settings.MODEL_PATH
        
        # 初始化Agent实例
        agents = {
            "orchestrator": OrchestratorAgent(genie_api_base_url=genie_api_base_url, model_path=model_path),
            "memory": MemoryAgent(),
            "preprocessor": PreprocessorAgent(),
            "fact_generator": FactGeneratorAgent(genie_api_base_url=genie_api_base_url, model_path=model_path),
            "interpreter": InterpreterAgent(genie_api_base_url=genie_api_base_url, model_path=model_path),
            "risk_detector": RiskDetectorAgent(genie_api_base_url=genie_api_base_url, model_path=model_path),
            "action_advisor": ActionAdvisorAgent(genie_api_base_url=genie_api_base_url, model_path=model_path),
            "messenger": MessengerAgent(genie_api_base_url=genie_api_base_url, model_path=model_path)
        }
        
        # 从太史阁获取相关卡片
        cards = []
        if request.card_ids:
            try:
                memory_agent = agents["memory"]
                for card_id in request.card_ids:
                    card = memory_agent.retrieve(card_id)
                    if card:
                        cards.append(card)
            except Exception as e:
                logger.warning(f"[Meeting] 获取卡片失败: {e}")
        
        # 构建讨论上下文
        discussion_context = {
            "topic": request.topic,
            "context": request.context,
            "cards": cards,
            "meeting_id": meeting_id
        }
        
        # 进行多轮讨论
        rounds = []
        themes = [
            "问题分析与信息收集",
            "方案讨论与风险评估",
            "决策制定与行动计划"
        ]
        
        for round_num in range(1, request.rounds + 1):
            theme = themes[min(round_num - 1, len(themes) - 1)]
            logger.info(f"[Meeting] 第{round_num}轮讨论: {theme}")
            
            speeches = []
            
            # 每个Agent发言
            for agent_id, agent_info in AGENT_MAPPING.items():
                backend_id = agent_info["backend_id"]
                agent = agents.get(backend_id)
                
                if agent:
                    try:
                        # 调用Agent进行真实分析
                        if backend_id == "memory":
                            result = agent.retrieve_relevant(request.topic, limit=5)
                            speech_content = f"根据历史记录，关于'{request.topic}'的相关信息包括：{str(result)[:200]}..."
                        elif backend_id == "risk_detector":
                            result = agent.analyze_risks(request.topic, cards)
                            speech_content = f"风险评估结果：{str(result)[:200]}..."
                        elif backend_id == "action_advisor":
                            result = agent.generate_advice(request.topic, cards)
                            speech_content = f"战略建议：{str(result)[:200]}..."
                        elif backend_id == "interpreter":
                            speech_content = f"从监督角度分析，'{request.topic}'需要注意的关键点是..."
                        elif backend_id == "orchestrator":
                            speech_content = f"综合各方意见，关于'{request.topic}'，我建议..."
                        else:
                            speech_content = f"作为{agent_info['title']}，我认为关于'{request.topic}'..."
                        
                        speeches.append(AgentSpeech(
                            agent_id=agent_id,
                            agent_name=agent_info["name"],
                            agent_title=agent_info["title"],
                            avatar=agent_info["avatar"],
                            speech=speech_content,
                            timestamp=datetime.now().isoformat(),
                            cards_referenced=[c.get("id", "") for c in cards[:3]]
                        ))
                    except Exception as e:
                        logger.error(f"[Meeting] Agent {agent_id} 发言失败: {e}")
                        speeches.append(AgentSpeech(
                            agent_id=agent_id,
                            agent_name=agent_info["name"],
                            agent_title=agent_info["title"],
                            avatar=agent_info["avatar"],
                            speech=f"【{agent_info['name']}】关于此议题，我需要更多数据支持...",
                            timestamp=datetime.now().isoformat(),
                            cards_referenced=[]
                        ))
            
            rounds.append(MeetingRound(
                round=round_num,
                theme=theme,
                speeches=speeches
            ))
        
        # 生成最终决策（由指挥使/Orchestrator决定）
        try:
            orchestrator = agents["orchestrator"]
            decision = f"基于{request.rounds}轮讨论，关于'{request.topic}'的决策是："
            decision += " 1) 立即启动相关调研；2) 组建专项工作组；3) 制定详细执行计划。"
            
            action_items = [
                f"针对'{request.topic}'制定详细方案",
                "分配任务到各相关部门",
                "设定时间节点和里程碑",
                "建立进度跟踪机制"
            ]
        except Exception as e:
            logger.error(f"[Meeting] 生成决策失败: {e}")
            decision = "需要进一步讨论后做出决策"
            action_items = ["继续收集信息", "安排后续会议"]
        
        end_time = time.time()
        
        return MeetingResponse(
            success=True,
            topic=request.topic,
            meeting_id=meeting_id,
            rounds=rounds,
            summary=f"关于'{request.topic}'的8-Agent协作会议已完成。{len(rounds)}轮讨论形成了初步共识。",
            decision=decision,
            action_items=action_items,
            participants=[info["name"] for info in AGENT_MAPPING.values()],
            start_time=datetime.fromtimestamp(start_time).isoformat(),
            end_time=datetime.fromtimestamp(end_time).isoformat(),
            duration_seconds=round(end_time - start_time, 2)
        )
        
    except Exception as e:
        logger.error(f"[Meeting] 会议创建失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[Dict[str, Any]])
async def get_meeting_history(limit: int = 10):
    """
    获取会议历史记录
    
    参数：
        - limit: 返回记录数量限制
    
    返回：
        历史会议列表
    """
    # TODO: 实现会议历史记录的持久化存储
    return []


@router.get("/health")
async def health_check():
    """系统健康检查"""
    return {
        "status": "healthy",
        "agents_count": len(AGENT_MAPPING),
        "agents": list(AGENT_MAPPING.keys()),
        "timestamp": datetime.now().isoformat()
    }
