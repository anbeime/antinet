#!/usr/bin/env python3
"""
8-AGENT 像素办公室可视化监控面板
基于 Star-Office-UI 复现，适配 Antinet 8-AGENT 系统
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from datetime import datetime
import json
import os
import threading
import time

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
STATE_FILE = os.path.join(ROOT_DIR, "state.json")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="/static")
CORS(app)  # 启用跨域支持

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

# 会议流程定义
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

# 全局会议状态
meeting_state = {
    "is_running": False,
    "current_step": 0,
    "thread": None,
    "stop_flag": False,
    "topic": "",
    "context": ""
}

# 会议结果存储
meeting_result = None

def generate_meeting_result(topic, context):
    """生成会议结果"""
    return {
        "topic": topic or "未命名会议",
        "summary": f"关于\"{topic or '当前议题'}\"的八府巡按协作会议已完成。锦衣卫总指挥使陆绎统筹协调，密卷房解析资料、通政司提取事实、监察院分析原因、刑狱司评估风险、参谋司制定策略、太史阁归档记忆、驿传司传达指令，八府各司其职，形成了完整的分析方案。",
        "cards": [
            {
                "type": "blue",
                "title": "核心事实",
                "content": context or "基于输入素材提取的关键信息：会议主题已明确，八府巡按系统已启动协作流程，各智能体正在按需处理任务。"
            },
            {
                "type": "green", 
                "title": "原因分析",
                "content": "深度剖析问题产生的根本原因：通过监察院和参谋司的联合分析，已识别出主要影响因素和关键节点。"
            },
            {
                "type": "yellow",
                "title": "风险评估", 
                "content": "刑狱司风险判官已完成评估：识别出潜在执行风险3项，建议采取预防措施，确保方案顺利实施。"
            },
            {
                "type": "red",
                "title": "行动建议",
                "content": "参谋司智囊军师制定执行方案：建议分阶段实施，优先处理高优先级任务，预计完成时间2-3个工作日。"
            }
        ],
        "participants": ["orchestrator", "mijuanfang", "tongzhengsi", "jianchayuan", "xingyusi", "canmousi", "taishige", "yichuansi"],
        "completed_at": datetime.now().isoformat()
    }

# Default state
DEFAULT_STATE = {
    "active_agent": "orchestrator",
    "agent_states": {agent: "idle" for agent in AGENTS.keys()},
    "detail": "八府巡按，各司其职",
    "progress": 0,
    "updated_at": datetime.now().isoformat(),
    "task_count": 0,
    "completed_tasks": 0,
    "meeting_status": "idle"  # idle, running, completed
}

def load_state():
    """Load state from file."""
    state = None
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)
        except Exception:
            state = None
    
    if not isinstance(state, dict):
        state = dict(DEFAULT_STATE)
    
    return state

def save_state(state: dict):
    """Save state to file"""
    state["updated_at"] = datetime.now().isoformat()
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def reset_all_agents():
    """重置所有 AGENT 为待命状态"""
    state = load_state()
    state["agent_states"] = {agent: "idle" for agent in AGENTS.keys()}
    state["active_agent"] = "orchestrator"
    state["detail"] = "八府巡按，各司其职"
    state["progress"] = 0
    state["meeting_status"] = "idle"
    save_state(state)

def run_meeting():
    """在后台线程运行会议流程"""
    global meeting_state
    
    # 重置状态
    reset_all_agents()
    meeting_state["is_running"] = True
    meeting_state["stop_flag"] = False
    
    state = load_state()
    state["meeting_status"] = "running"
    save_state(state)
    
    for i, step in enumerate(MEETING_STEPS):
        if meeting_state["stop_flag"]:
            break
        
        meeting_state["current_step"] = i
        
        # 更新状态
        state = load_state()
        state["active_agent"] = step["agent"]
        state["agent_states"][step["agent"]] = step["state"]
        state["detail"] = step["detail"]
        state["progress"] = step["progress"]
        save_state(state)
        
        # 等待下一步
        for _ in range(step["duration"] * 10):  # 每 0.1 秒检查一次停止标志
            if meeting_state["stop_flag"]:
                break
            time.sleep(0.1)
    
    # 会议结束
    if not meeting_state["stop_flag"]:
        global meeting_result
        state = load_state()
        state["meeting_status"] = "completed"
        state["completed_tasks"] = state.get("completed_tasks", 0) + 1
        
        # 生成会议结果
        meeting_result = generate_meeting_result(
            meeting_state.get("topic", ""),
            meeting_state.get("context", "")
        )
        state["meeting_result"] = meeting_result
        
        save_state(state)
    
    meeting_state["is_running"] = False

# Initialize state
if not os.path.exists(STATE_FILE):
    save_state(DEFAULT_STATE)

@app.route("/", methods=["GET"])
def index():
    """Serve the pixel office UI"""
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/status", methods=["GET"])
def get_status():
    """Get current state"""
    state = load_state()
    state["meeting_is_running"] = meeting_state["is_running"]
    state["meeting_current_step"] = meeting_state["current_step"]
    return jsonify(state)

@app.route("/status", methods=["POST"])
def update_status():
    """Update state manually"""
    data = request.json
    state = load_state()
    
    if "active_agent" in data:
        state["active_agent"] = data["active_agent"]
    if "agent_states" in data:
        state["agent_states"].update(data["agent_states"])
    if "detail" in data:
        state["detail"] = data["detail"]
    if "progress" in data:
        state["progress"] = data["progress"]
    
    save_state(state)
    return jsonify({"success": True, "state": state})

@app.route("/agents", methods=["GET"])
def get_agents():
    """Get all agents info"""
    return jsonify(AGENTS)

@app.route("/meeting/start", methods=["POST"])
def start_meeting():
    """Start a meeting"""
    global meeting_state, meeting_result
    
    if meeting_state["is_running"]:
        return jsonify({"success": False, "error": "会议已在进行中"})
    
    # 获取会议参数
    data = request.json or {}
    meeting_state["topic"] = data.get("topic", "")
    meeting_state["context"] = data.get("context", "")
    
    # 清除之前的会议结果
    meeting_result = None
    state = load_state()
    if "meeting_result" in state:
        del state["meeting_result"]
    save_state(state)
    
    # 启动会议线程
    meeting_state["thread"] = threading.Thread(target=run_meeting)
    meeting_state["thread"].daemon = True
    meeting_state["thread"].start()
    
    return jsonify({"success": True, "message": "八府巡按会议开始"})

@app.route("/meeting/stop", methods=["POST"])
def stop_meeting():
    """Stop the current meeting"""
    global meeting_state
    
    if not meeting_state["is_running"]:
        return jsonify({"success": False, "error": "没有正在进行的会议"})
    
    meeting_state["stop_flag"] = True
    meeting_state["is_running"] = False
    
    # 重置状态
    reset_all_agents()
    
    return jsonify({"success": True, "message": "会议已停止"})

@app.route("/meeting/status", methods=["GET"])
def get_meeting_status():
    """Get meeting status"""
    return jsonify({
        "is_running": meeting_state["is_running"],
        "current_step": meeting_state["current_step"],
        "total_steps": len(MEETING_STEPS),
        "progress": (meeting_state["current_step"] / len(MEETING_STEPS) * 100) if meeting_state["is_running"] else 0
    })

@app.route("/meeting/reset", methods=["POST"])
def reset_meeting():
    """Reset meeting state"""
    global meeting_state, meeting_result
    
    meeting_state["stop_flag"] = True
    meeting_state["is_running"] = False
    meeting_state["current_step"] = 0
    meeting_state["topic"] = ""
    meeting_state["context"] = ""
    meeting_result = None
    
    reset_all_agents()
    
    return jsonify({"success": True, "message": "会议状态已重置"})

@app.route("/meeting/result", methods=["GET"])
def get_meeting_result():
    """Get meeting result"""
    state = load_state()
    result = state.get("meeting_result") or meeting_result
    
    if result:
        return jsonify({"success": True, "result": result})
    else:
        return jsonify({"success": False, "error": "暂无会议结果"})

@app.route("/health", methods=["GET"])
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "agents": len(AGENTS),
        "meeting_running": meeting_state["is_running"],
        "version": "1.0.0-8agent"
    })

if __name__ == "__main__":
    print("=" * 60)
    print("8-AGENT 像素办公室可视化监控面板")
    print("基于 Star-Office-UI 复现")
    print("=" * 60)
    print(f"State file: {STATE_FILE}")
    print("Listening on: http://0.0.0.0:18791")
    print("=" * 60)
    print("API 端点:")
    print("  GET  /status          - 获取当前状态")
    print("  POST /status          - 更新状态")
    print("  POST /meeting/start   - 开始会议")
    print("  POST /meeting/stop    - 停止会议")
    print("  GET  /meeting/status  - 获取会议状态")
    print("  POST /meeting/reset   - 重置会议")
    print("=" * 60)
    
    app.run(host="0.0.0.0", port=18791, debug=False, threaded=True)
