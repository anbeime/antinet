"""
Hermes AI 聊天路由 - Hermes + 8 Agent 协同

工作流程：
  前端 -> /api/hermes/chat -> 尝试 Hermes AIAgent -> 回退 8-Agent -> 返回响应
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
    message: str = Field(..., description="用户消息")
    session_id: Optional[str] = Field(default=None, description="会话ID")
    user_id: Optional[str] = Field(default="default", description="用户ID")
    enable_8agent: bool = Field(default=True, description="是否启用8-Agent协同")
    context: Optional[Dict[str, Any]] = Field(default=None, description="额外上下文")
    provider: Optional[str] = Field(default=None, description="AI提供者: hermes, nim, openai, npu")

class HermesChatResponse(BaseModel):
    response: str = Field(..., description="AI 响应")
    session_id: str = Field(..., description="会话ID")
    reasoning: Optional[str] = Field(default=None, description="推理过程")
    tool_calls: Optional[List[Dict]] = Field(default=None, description="工具调用")
    cards: Optional[List[Dict]] = Field(default=None, description="四色卡片")
    agent_logs: Optional[List[str]] = Field(default=None, description="Agent日志")
    mode: str = Field(default="hermes", description="模式: hermes / 8agent")

# ==================== Hermes Agent 实例管理 ====================

_hermes_agent = None
_hermes_initialized = False

def _find_hermes_path() -> Optional[Path]:
    for p in [
        Path(__file__).parent.parent.parent.parent / "hermes-agent-main",
        Path("C:/D/hermes-agent-main"),
        Path("/mnt/c/D/hermes-agent-main"),
    ]:
        if p.exists():
            return p
    return None

def check_hermes_available() -> bool:
    hermes_path = _find_hermes_path()
    if not hermes_path:
        return False
    venv = hermes_path / ".venv"
    if not venv.exists():
        venv = Path("C:/D/hermes-agent-main/.venv")
    return venv.exists()

def get_hermes_agent():
    global _hermes_agent, _hermes_initialized

    if _hermes_agent is not None:
        return _hermes_agent

    if not check_hermes_available():
        logger.warning("[Hermes] 虚拟环境不可用，跳过初始化")
        return None

    hermes_path = _find_hermes_path()
    if hermes_path and str(hermes_path) not in sys.path:
        sys.path.insert(0, str(hermes_path))

    try:
        from run_agent import AIAgent

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

def get_8agent_engine():
    try:
        from routes.eight_agent_engine import get_eight_agent_engine
        return get_eight_agent_engine()
    except Exception as e:
        logger.error(f"[8-Agent] 引擎获取失败: {e}")
        return None

# ==================== 路由实现 ====================

@router.post("/chat", response_model=HermesChatResponse)
async def hermes_chat(request: HermesChatRequest):
    session_id = request.session_id or f"hermes_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    logger.info(f"[Hermes] 会话 {session_id}, provider={request.provider}: {request.message[:100]}...")

    try:
        if request.provider:
            result = await _call_provider_service(
                provider=request.provider,
                message=request.message,
                session_id=session_id,
                user_id=request.user_id,
                context=request.context
            )
            return HermesChatResponse(**result)

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


async def _call_provider_service(provider: str, message: str, session_id: str,
                                  user_id: str, context: Dict = None) -> Dict:
    try:
        from services.ai.factory import get_ai_service
        service = get_ai_service(provider)
        if not service:
            return await _call_8agent(message, user_id, context, session_id)

        context_list = []
        if context:
            context_list = [json.dumps(context, ensure_ascii=False)]

        # 同步调用放到线程池
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: service.chat(message, context=context_list)
        )
        return {
            "response": response.content if response.content else f"[{provider}] 无响应",
            "session_id": session_id,
            "mode": provider,
        }
    except Exception as e:
        logger.error(f"[{provider}] 调用失败: {e}，回退到 8-Agent")
        return await _call_8agent(message, user_id, context, session_id)


async def _try_hermes_or_fallback(
    message: str,
    session_id: str,
    user_id: str,
    enable_8agent: bool,
    context: Dict = None
) -> Dict:
    if check_hermes_available():
        try:
            agent = get_hermes_agent()
            if agent:
                # AIAgent.chat() 是同步的，放到线程池执行避免阻塞事件循环
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: agent.chat(message))
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

    return await _call_8agent(message, user_id, context, session_id)


async def _call_8agent(message: str, user_id: str, context: Dict = None, session_id: str = None) -> Dict:
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
        await engine.initialize()
        result = await engine.process(
            query=message,
            context=context or {},
            user_id=user_id
        )

        cards = []
        response_text = ""
        logs = []

        if isinstance(result, dict):
            if hasattr(engine, '_cards'):
                cards = engine._cards.to_list()

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


class HermesSessionRequest(BaseModel):
    session_id: str = Field(..., description="会话ID")
    action: str = Field(..., description="操作: new/list/delete/clear")

@router.post("/session")
async def hermes_session(request: HermesSessionRequest):
    """会话管理接口"""
    return {
        "success": True,
        "session_id": request.session_id,
        "action": request.action,
        "message": "会话操作成功"
    }


@router.get("/health")
async def hermes_health():
    global _hermes_initialized

    status = {
        "status": "healthy" if _hermes_initialized else "initializing",
        "hermes_ready": _hermes_agent is not None,
        "8agent_ready": get_8agent_engine() is not None,
    }

    return status
