"""
像素办公室会议 API
8-AGENT 协作会议的后端路由，直接挂载到 FastAPI 主应用
"""
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict
import threading
import time
import json

router = APIRouter()

# 8-AGENT 配置
AGENTS = {
    "orchestrator": {"name": "锦衣卫总指挥使", "cn_name": "陆绎", "color": "#e74c3c"},
    "mijuanfang": {"name": "密卷房", "cn_name": "档案官", "color": "#3498db"},
    "tongzhengsi": {"name": "通政司", "cn_name": "通讯官", "color": "#2ecc71"},
    "jianchayuan": {"name": "监察院", "cn_name": "监察官", "color": "#f39c12"},
    "xingyusi": {"name": "刑狱司", "cn_name": "风险官", "color": "#9b59b6"},
    "canmousi": {"name": "参谋司", "cn_name": "参谋官", "color": "#1abc9c"},
    "taishige": {"name": "太史阁", "cn_name": "记忆官", "color": "#e67e22"},
    "yichuansi": {"name": "驿传司", "cn_name": "传令官", "color": "#34495e"}
}

# 会议流程步骤
MEETING_STEPS = [
    {"agent": "orchestrator", "state": "executing", "detail": "🏛️ 八府巡按会议开始，正在分解任务...", "progress": 10, "duration": 2},
    {"agent": "mijuanfang", "state": "researching", "detail": "📚 密卷房正在解析用户素材...", "progress": 25, "duration": 2},
    {"agent": "tongzhengsi", "state": "writing", "detail": "📝 通政司正在提取核心事实...", "progress": 40, "duration": 2},
    {"agent": "jianchayuan", "state": "researching", "detail": "🔍 监察院正在分析原因逻辑...", "progress": 55, "duration": 2},
    {"agent": "xingyusi", "state": "researching", "detail": "⚠️ 刑狱司正在检测潜在风险...", "progress": 70, "duration": 2},
    {"agent": "canmousi", "state": "writing", "detail": "💡 参谋司正在生成行动建议...", "progress": 85, "duration": 2},
    {"agent": "taishige", "state": "syncing", "detail": "💾 太史阁正在存储知识成果...", "progress": 95, "duration": 2},
    {"agent": "yichuansi", "state": "idle", "detail": "✅ 八府巡按会议完成，等待新指令", "progress": 100, "duration": 2}
]

# 全局状态（内存中，不依赖文件）
_state = {
    "active_agent": "orchestrator",
    "agent_states": {agent: "idle" for agent in AGENTS},
    "detail": "八府巡按，各司其职",
    "progress": 0,
    "updated_at": datetime.now().isoformat(),
    "meeting_status": "idle",
    "completed_tasks": 0
}

_meeting = {
    "is_running": False,
    "stop_flag": False,
    "topic": "",
    "context": "",
    "thread": None
}

_meeting_result = None


class MeetingStartRequest(BaseModel):
    topic: str = ""
    context: str = ""


class StatusUpdateRequest(BaseModel):
    active_agent: Optional[str] = None
    agent_states: Optional[Dict[str, str]] = None
    detail: Optional[str] = None
    progress: Optional[int] = None


def _generate_meeting_result(topic: str, context: str):
    return {
        "topic": topic or "未命名会议",
        "summary": f"关于\"{topic or '当前议题'}\"的八府巡按协作会议已完成。锦衣卫总指挥使陆绎统筹协调，密卷房解析资料、通政司提取事实、监察院分析原因、刑狱司评估风险、参谋司制定策略、太史阁归档记忆、驿传司传达指令，八府各司其职，形成了完整的分析方案。",
        "cards": [
            {"type": "blue", "title": "核心事实", "content": context or "基于输入素材提取的关键信息：会议主题已明确，八府巡按系统已启动协作流程。"},
            {"type": "green", "title": "原因分析", "content": "通过监察院和参谋司的联合分析，已识别出主要影响因素和关键节点。"},
            {"type": "yellow", "title": "风险评估", "content": "刑狱司已完成评估：识别出潜在执行风险3项，建议采取预防措施。"},
            {"type": "red", "title": "行动建议", "content": "参谋司制定执行方案：建议分阶段实施，优先处理高优先级任务。"}
        ],
        "participants": list(AGENTS.keys()),
        "completed_at": datetime.now().isoformat()
    }


def _run_meeting():
    global _state, _meeting, _meeting_result

    _meeting["is_running"] = True
    _meeting["stop_flag"] = False
    _state["meeting_status"] = "running"

    for step in MEETING_STEPS:
        if _meeting["stop_flag"]:
            break

        _state["active_agent"] = step["agent"]
        _state["agent_states"][step["agent"]] = step["state"]
        _state["detail"] = step["detail"]
        _state["progress"] = step["progress"]
        _state["updated_at"] = datetime.now().isoformat()

        for _ in range(step["duration"] * 10):
            if _meeting["stop_flag"]:
                break
            time.sleep(0.1)

    if not _meeting["stop_flag"]:
        _state["meeting_status"] = "completed"
        _state["completed_tasks"] = _state.get("completed_tasks", 0) + 1
        _meeting_result = _generate_meeting_result(
            _meeting.get("topic", ""),
            _meeting.get("context", "")
        )

    _meeting["is_running"] = False


def _reset_state():
    global _state, _meeting_result
    _state["active_agent"] = "orchestrator"
    _state["agent_states"] = {agent: "idle" for agent in AGENTS}
    _state["detail"] = "八府巡按，各司其职"
    _state["progress"] = 0
    _state["meeting_status"] = "idle"
    _state["updated_at"] = datetime.now().isoformat()
    _meeting_result = None


@router.get("/status")
async def get_status():
    return {
        **_state,
        "meeting_is_running": _meeting["is_running"]
    }


@router.post("/status")
async def update_status(req: StatusUpdateRequest):
    if req.active_agent:
        _state["active_agent"] = req.active_agent
    if req.agent_states:
        _state["agent_states"].update(req.agent_states)
    if req.detail:
        _state["detail"] = req.detail
    if req.progress is not None:
        _state["progress"] = req.progress
    _state["updated_at"] = datetime.now().isoformat()
    return {"success": True}


@router.get("/agents")
async def get_agents():
    return AGENTS


@router.post("/meeting/start")
async def start_meeting(req: MeetingStartRequest):
    global _meeting

    if _meeting["is_running"]:
        return {"success": False, "error": "会议已在进行中"}

    _reset_state()
    _meeting["topic"] = req.topic
    _meeting["context"] = req.context

    t = threading.Thread(target=_run_meeting, daemon=True)
    _meeting["thread"] = t
    t.start()

    return {"success": True, "message": "八府巡按会议开始"}


@router.post("/meeting/stop")
async def stop_meeting():
    if not _meeting["is_running"]:
        return {"success": False, "error": "没有正在进行的会议"}

    _meeting["stop_flag"] = True
    _reset_state()
    return {"success": True, "message": "会议已停止"}


@router.get("/meeting/status")
async def get_meeting_status():
    return {
        "is_running": _meeting["is_running"],
        "topic": _meeting.get("topic", ""),
        "progress": _state["progress"]
    }


@router.get("/meeting/result")
async def get_meeting_result():
    if _meeting_result:
        return {"success": True, "result": _meeting_result}
    return {"success": False, "error": "暂无会议结果"}


@router.post("/meeting/reset")
async def reset_meeting():
    _meeting["stop_flag"] = True
    _meeting["is_running"] = False
    _meeting["topic"] = ""
    _meeting["context"] = ""
    _reset_state()
    return {"success": True, "message": "会议状态已重置"}
