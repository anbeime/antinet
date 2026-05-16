"""
Hermes AI 聊天路由 - Hermes + 8 Agent 协同

前端 -> Hermes AI -> 可选调用 8 Agent -> 返回响应

注意：Hermes AIAgent 需要在 Hermes 的虚拟环境中运行。
如果无法连接 Hermes，会自动回退到 8-Agent 模式。
"""

import logging
import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hermes", tags=["Hermes AI"])

# ==================== 数据模型 ====================

class HermesChatRequest(BaseModel):
    """Hermes 聊天请求"""
    message: str = Field(..., description="用户消息")
    session_id: Optional[str] = Field(default=None, description="会话ID")
    user_id: Optional[str] = Field(default="default", description="用户ID")
    enable_8agent: bool = Field(default=True, description="是否启用8-Agent协同")
    context: Optional[Dict[str, Any]] = Field(default=None, description="额外上下文")

class HermesChatResponse(BaseModel):
    """Hermes 聊天响应"""
    response: str = Field(..., description="AI 响应")
    session_id: str = Field(..., description="会话ID")
    reasoning: Optional[str] = Field(default=None, description="推理过程")
    tool_calls: Optional[List[Dict]] = Field(default=None, description="工具调用")
    cards: Optional[List[Dict]] = Field(default=None, description="四色卡片")
    agent_logs: Optional[List[str]] = Field(default=None, description="Agent日志")
    mode: str = Field(default="hermes", description="模式: hermes / 8agent")

class HermesSessionRequest(BaseModel):
    """会话管理请求"""
    session_id: str = Field(..., description="会话ID")
    action: str = Field(..., description="操作: new/list/delete/clear")

# ==================== Hermes Agent 实例管理 ====================

_hermes_agent = None
_hermes_initialized = False
_hermes_available = False

def check_hermes_available() -> bool:
    """检查 Hermes 是否可用"""
    global _hermes_available
    if _hermes_available:
        return True
    
    # 检查 Hermes 环境
    hermes_venv = Path(__file__).parent.parent.parent / "hermes-agent-main" / ".venv"
    if not hermes_venv.exists():
        hermes_venv = Path("C:/D/hermes-agent-main/.venv")
    if not hermes_venv.exists():
        hermes_venv = Path("/mnt/c/D/hermes-agent-main/.venv")
    
    logger.info(f"[Hermes] 检查 Hermes venv: {hermes_venv}")
    _hermes_available = hermes_venv.exists()
    return _hermes_available

def get_hermes_agent():
    """获取或创建 Hermes AIAgent 实例"""
    global _hermes_agent, _hermes_initialized
    
    if _hermes_agent is not None:
        return _hermes_agent
    
    if not check_hermes_available():
        logger.warning("[Hermes] Hermes 虚拟环境不可用，跳过初始化")
        return None
    
    # 添加 hermes-agent-main 到路径
    hermes_paths = [
        Path(__file__).parent.parent.parent.parent / "hermes-agent-main",
        Path("C:/D/hermes-agent-main"),
        Path("/mnt/c/D/hermes-agent-main"),
    ]
    
    hermes_path = None
    for p in hermes_paths:
        if p.exists():
            hermes_path = p
            break
    
    if hermes_path and str(hermes_path) not in sys.path:
        sys.path.insert(0, str(hermes_path))
    
    try:
        # 延迟导入 AIAgent
        from run_agent import AIAgent
        
        # 创建 Agent 实例（简化配置）
        _hermes_agent = AIAgent(
            max_iterations=30,
            enabled_toolsets=["web", "terminal", "file", "delegation", "session_search"],
            quiet_mode=True,
            session_id=None,
        )
        
        _hermes_initialized = True
        logger.info("[Hermes] AIAgent 实例创建成功")
        return _hermes_agent
        
    except Exception as e:
        logger.error(f"[Hermes] AIAgent 创建失败: {e}")
        return None

# ==================== 8 Agent 引擎获取 ====================

def get_8agent_engine():
    """获取 8 Agent 引擎"""
    try:
        from routes.eight_agent_engine import get_eight_agent_engine
        return get_eight_agent_engine()
    except Exception as e:
        logger.error(f"[8-Agent] 引擎获取失败: {e}")
        return None

# ==================== 路由实现 ====================

@router.post("/chat", response_model=HermesChatResponse)
async def hermes_chat(request: HermesChatRequest):
    """
    Hermes AI 聊天接口
    
    工作流程:
    1. 接收用户消息
    2. 如果 Hermes 可用，用 Hermes AI 处理
    3. 否则使用 8-Agent 系统
    4. 返回响应（保持四色卡片格式）
    """
    session_id = request.session_id or f"hermes_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    logger.info(f"[Hermes] 会话 {session_id}: {request.message[:100]}...")
    
    try:
        # 尝试使用 Hermes，如果不可用则回退到 8-Agent
        result = await _try_hermes_or_fallback(
            message=request.message,
            session_id=session_id,
            user_id=request.user_id,
            enable_8agent=request.enable_8agent,
            context=request.context
        )
        
        return HermesChatResponse(**result)
        
    except Exception as e:
        logger.error(f"[Hermes] 聊天异常: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _try_hermes_or_fallback(
    message: str, 
    session_id: str, 
    user_id: str,
    enable_8agent: bool,
    context: Dict = None
) -> Dict:
    """
    尝试使用 Hermes，失败则回退到 8-Agent
    """
    # 先尝试 Hermes
    if check_hermes_available():
        try:
            agent = get_hermes_agent()
            if agent:
                response = agent.chat(message)
                logger.info(f"[Hermes] 成功调用 Hermes")
                return {
                    "response": response,
                    "session_id": session_id,
                    "mode": "hermes",
                }
        except Exception as e:
            logger.warning(f"[Hermes] 调用失败，回退到 8-Agent: {e}")
    else:
        logger.info("[Hermes] Hermes 不可用，使用 8-Agent")
    
    # 回退到 8-Agent
    return await _call_8agent(message, user_id, context, session_id)

async def _call_8agent(message: str, user_id: str, context: Dict = None, session_id: str = None) -> Dict:
    """调用 8 Agent 系统"""
    engine = get_8agent_engine()
    if not engine:
        return {
            "response": "8-Agent 引擎不可用",
            "session_id": session_id,
            "cards": [],
            "agent_logs": [],
            "mode": "error",
        }
    
    try:
        # 初始化引擎
        await engine.initialize()
        
        # 调用 8 Agent
        result = await engine.process(
            query=message,
            context=context or {},
            user_id=user_id
        )
        
        # 提取响应和卡片
        cards = []
        response_text = ""
        logs = []
        
        if isinstance(result, dict):
            # 获取四色卡片
            if hasattr(engine, '_cards'):
                cards = engine._cards.to_list()
            
            # 获取响应文本
            if result.get("final_response"):
                response_text = result["final_response"]
            elif result.get("report"):
                response_text = result["report"].get("summary", str(result))
            
            logs = result.get("logs", [])
        
        return {
            "response": response_text,
            "session_id": session_id,
            "cards": cards,
            "agent_logs": logs,
            "mode": "8agent",
        }
        
    except Exception as e:
        logger.error(f"[8-Agent] 调用失败: {e}")
        return {
            "response": f"处理出错: {e}",
            "session_id": session_id,
            "cards": [],
            "agent_logs": [],
            "mode": "error",
        }

# ==================== 会话管理 ====================

@router.post("/session")
async def hermes_session(request: HermesSessionRequest):
    """会话管理接口"""
    # Hermes 使用自己的会话管理，这里只是预留接口
    return {
        "success": True,
        "session_id": request.session_id,
        "action": request.action,
        "message": "会话操作成功"
    }

# ==================== 健康检查 ====================

@router.get("/health")
async def hermes_health():
    """Hermes 服务健康检查"""
    global _hermes_initialized
    
    status = {
        "status": "healthy" if _hermes_initialized else "initializing",
        "hermes_ready": _hermes_agent is not None,
        "8agent_ready": get_8agent_engine() is not None,
    }
    
    return status