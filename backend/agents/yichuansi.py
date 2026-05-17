"""
驿传司（消息层）
唯一信息枢纽：指令转发 → 真实调用Agent → 成果收集 → 状态查询
"""
import logging
import json
import time
import asyncio
from typing import Dict, List, Any, Optional, Callable
from fastapi import FastAPI, Body, HTTPException

logger = logging.getLogger(__name__)
app = FastAPI(title="驿传司接口层")

# ====== 数据库管理器（由 main.py 注入）======
db_manager = None

def set_db_manager(manager):
    global db_manager
    db_manager = manager

# ====== Agent 注册表 ======
# 格式：agent_name -> agent_instance
_agent_registry: Dict[str, Any] = {}

def register_agent(name: str, agent_instance: Any):
    """向驿传司注册一个 Agent 实例"""
    _agent_registry[name] = agent_instance
    logger.info(f"[驿传司] Agent注册: {name}")

def get_agent(name: str) -> Optional[Any]:
    return _agent_registry.get(name)

# ====== 内存缓存（仅用于调试/无数据库时降级）======
task_storage: Dict[str, Dict] = {}
result_storage: Dict[str, Dict] = {}
log_storage: List[Dict] = []


def _persist_stage(workflow_id: str, agent_name: str, stage: str,
                   output: str, status: str):
    """尝试持久化到数据库，失败则静默降级到内存"""
    if db_manager:
        db_manager.save_workflow_stage(workflow_id, agent_name, stage, output, status)
    task_storage[f"{workflow_id}_{agent_name}"] = {
        "task": stage, "output": output, "status": status,
        "create_time": time.strftime("%Y-%m-%d %H:%M:%S")
    }


async def _execute_agent(agent_name: str, task: str, material: Any = None) -> Dict:
    """真实调用 Agent，返回执行结果"""
    agent = get_agent(agent_name)
    if agent is None:
        return {"status": "failed", "error": f"Agent '{agent_name}' 未注册"}

    try:
        # Agent 必须有 execute(task, context) 方法
        if hasattr(agent, "execute"):
            result = agent.execute(task, material or {})
            # 如果是 async 方法
            if asyncio.iscoroutine(result):
                result = await result
            return {"status": "success", "result": result}
        elif hasattr(agent, "process"):
            # 备用方法名
            result = agent.process(task, material or {})
            if asyncio.iscoroutine(result):
                result = await result
            return {"status": "success", "result": result}
        else:
            return {"status": "failed",
                    "error": f"Agent '{agent_name}' 既无 execute 也无 process 方法"}
    except Exception as e:
        logger.error(f"[驿传司] Agent '{agent_name}' 执行失败: {e}", exc_info=True)
        return {"status": "failed", "error": str(e)}


# ====== API 路由 ======

@app.post("/yichuansi/send_task")
async def send_task(
    task_instructions: Dict = Body(...),
    sender: str = Body(...)
):
    """
    接收总指挥使任务 → 真实调用各 Agent → 收集结果 → 持久化
    """
    workflow_id = task_instructions.get("task_id", f"W{int(time.time())}")
    forward_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    sub_tasks = task_instructions.get("sub_tasks", [])

    results = {}
    for sub in sub_tasks:
        agent_name = sub["agent"]
        task_desc = sub.get("task", "")
        material = sub.get("material", "")

        logger.info(f"[驿传司] → {agent_name}: {task_desc[:80]}")
        _persist_stage(workflow_id, agent_name, "start", task_desc, "running")

        exec_result = await _execute_agent(agent_name, task_desc, material)
        output = json.dumps(exec_result, ensure_ascii=False)
        status = "done" if exec_result.get("status") == "success" else "failed"
        _persist_stage(workflow_id, agent_name, "done", output, status)
        results[agent_name] = exec_result

        log_storage.append({
            "log_type": "agent_exec",
            "agent": agent_name,
            "task": task_desc[:100],
            "status": status,
            "workflow_id": workflow_id,
            "time": forward_time
        })

    return {
        "forward_status": "success",
        "workflow_id": workflow_id,
        "forward_time": forward_time,
        "results": {k: v.get("status") for k, v in results.items()},
        "task_ids": [f"{workflow_id}_{sub['agent']}" for sub in sub_tasks]
    }


@app.post("/yichuansi/execute_single")
async def execute_single(
    agent_name: str = Body(...),
    task: str = Body(...),
    material: Any = Body(None),
    workflow_id: str = Body(default="default")
):
    """单独调用一个 Agent（用于测试/调试）"""
    logger.info(f"[驿传司] 单独调用 → {agent_name}: {task[:80]}")
    _persist_stage(workflow_id, agent_name, "start", task, "running")
    exec_result = await _execute_agent(agent_name, task, material)
    output = json.dumps(exec_result, ensure_ascii=False)
    status = "done" if exec_result.get("status") == "success" else "failed"
    _persist_stage(workflow_id, agent_name, "done", output, status)
    return {"agent": agent_name, "workflow_id": workflow_id, "result": exec_result}


@app.post("/yichuansi/receive_result")
async def receive_result(
    agent_result: Dict = Body(...),
    sender: str = Body(...)
):
    """接收 Agent 回传成果"""
    task_id = agent_result.get("task_id", "unknown")
    receive_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

    result_storage[task_id] = {
        "agent": sender,
        "result": agent_result.get("result"),
        "receive_time": receive_time,
        "status": "completed"
    }
    if db_manager:
        db_manager.save_workflow_stage(
            task_id, sender, "result_received",
            json.dumps(agent_result.get("result", {}), ensure_ascii=False),
            "done"
        )
    log_storage.append({
        "log_type": "result_receive", "sender": sender,
        "task_id": task_id, "time": receive_time
    })
    return {"receive_status": "success", "task_id": task_id, "receive_time": receive_time}


@app.post("/yichuansi/get_task_status")
async def get_task_status(task_id: str = Body(...)):
    """查询任务状态"""
    if db_manager:
        status = db_manager.get_workflow_status(task_id)
        return {"task_id": task_id, "status": status}
    return {"task_id": task_id, "status": task_storage.get(task_id, {}).get("status", "not_found")}


@app.get("/yichuansi/workflow/{workflow_id}")
async def get_workflow(workflow_id: str):
    """获取工作流完整状态（各 Agent 输出）"""
    if db_manager:
        stages = db_manager.get_workflow_state(workflow_id)
        status = db_manager.get_workflow_status(workflow_id)
        return {"workflow_id": workflow_id, "status": status, "stages": stages}
    return {"error": "数据库未连接"}, status_code=500


@app.post("/yichuansi/call_knowledge")
async def call_knowledge(
    knowledge_request: Dict = Body(...),
    requester: str = Body(...)
):
    """代理知识检索 → 太史阁"""
    keywords = knowledge_request.get("keywords", "")
    if db_manager:
        try:
            from agents.memory import MemoryAgent
            mem = get_agent("taishige")
            if mem:
                result = mem.retrieve_knowledge("conversation", keywords, limit=5)
                return {"call_status": "success", "knowledge": result}
        except Exception as e:
            logger.warning(f"[驿传司] 太史阁调用失败: {e}")
    return {
        "call_status": "mock",
        "related_cases": [{"case_id": "C001", "similarity": 0.9, "content": "同类案例（太史阁未连接）"}]
    }


@app.get("/yichuansi/get_log")
async def get_log():
    return {"logs": log_storage[-100:]}


@app.get("/yichuansi/get_all_tasks")
async def get_all_tasks():
    return {"tasks": task_storage}


@app.get("/yichuansi/get_all_results")
async def get_all_results():
    return {"results": result_storage}


@app.get("/yichuansi/agents")
async def list_agents():
    """列出所有已注册的 Agent"""
    return {"agents": list(_agent_registry.keys())}


# 启动命令：cd backend && python -m uvicorn agents.yichuansi:app --host 0.0.0.0 --port 8000
# 注意：实际由 main.py 通过 router 挂载，不需要独立运行
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)