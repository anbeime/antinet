"""
驿传司（接口层）
唯一信息枢纽，负责指令转发、成果接收、知识检索代理、日志记录
"""
from fastapi import FastAPI, Body
import json
import time
from typing import Dict, List

app = FastAPI(title="驿传司接口层")

# ====== MOCK START ======
# 内存暂存任务/成果（实际使用时替换为Agent记忆数据库）
# TODO: 替换为真实的数据库操作
# 示例代码：
# from scripts.agent_memory_db import AgentMemoryDB
# db = AgentMemoryDB("./agent_memory.db")
# task_id = db.create_task(...)
# ====== MOCK END ======
task_storage = {}
result_storage = {}
log_storage = []


@app.post("/yichuansi/send_task")
async def send_task(
    task_instructions: Dict = Body(...),
    sender: str = Body(...)
):
    """接收总指挥使任务，转发至对应Agent"""
    task_id = task_instructions["task_id"]
    forward_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    target_agents = [sub["agent"] for sub in task_instructions["sub_tasks"]]
    
    # 暂存任务
    for sub in task_instructions["sub_tasks"]:
        sub_task_id = f"{task_id}_{sub['agent']}"
        task_storage[sub_task_id] = {
            "task": sub["task"],
            "material": sub["material"],
            "status": "pending",
            "create_time": forward_time
        }
    
    # 记录日志
    log_storage.append({
        "log_type": "task_forward",
        "sender": sender,
        "task_id": task_id,
        "target_agents": target_agents,
        "time": forward_time
    })
    
    return {
        "forward_status": "success",
        "forward_time": forward_time,
        "target_agents": target_agents,
        "task_ids": [f"{task_id}_{agent}" for agent in target_agents]
    }


@app.post("/yichuansi/receive_result")
async def receive_result(
    agent_result: Dict = Body(...),
    sender: str = Body(...)
):
    """接收执行Agent成果，暂存并可被总指挥使查询"""
    task_id = agent_result["task_id"]
    receive_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    
    # 暂存成果
    result_storage[task_id] = {
        "agent": sender,
        "result": agent_result["result"],
        "receive_time": receive_time,
        "status": "completed"
    }
    
    # 更新任务状态
    if task_id in task_storage:
        task_storage[task_id]["status"] = "completed"
    
    # 记录日志
    log_storage.append({
        "log_type": "result_receive",
        "sender": sender,
        "task_id": task_id,
        "time": receive_time
    })
    
    return {
        "receive_status": "success",
        "receive_time": receive_time,
        "task_id": task_id
    }


@app.post("/yichuansi/get_task_status")
async def get_task_status(
    task_id: str = Body(...)
):
    """查询任务状态"""
    if task_id in task_storage:
        return {
            "task_id": task_id,
            "status": task_storage[task_id]["status"]
        }
    else:
        return {
            "task_id": task_id,
            "status": "not_found"
        }


@app.post("/yichuansi/call_knowledge")
async def call_knowledge(
    knowledge_request: Dict = Body(...),
    requester: str = Body(...)
):
    """代理知识检索请求，调用太史阁接口"""
    # 实际开发中替换为太史阁真实接口调用
    knowledge_result = {
        "related_cases": [{"case_id": "C001", "similarity": 0.9, "content": "同类项目进度滞后案例"}],
        "retrieval_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
    
    # 记录日志
    log_storage.append({
        "log_type": "knowledge_call",
        "requester": requester,
        "keywords": knowledge_request["keywords"],
        "time": knowledge_result["retrieval_time"]
    })
    
    return {
        "call_status": "success",
        "knowledge_result": knowledge_result
    }


@app.get("/yichuansi/get_log")
async def get_log():
    """获取全流程日志（仅用于调试）"""
    return {"logs": log_storage}


@app.get("/yichuansi/get_all_tasks")
async def get_all_tasks():
    """获取所有任务（仅用于调试）"""
    return {"tasks": task_storage}


@app.get("/yichuansi/get_all_results")
async def get_all_results():
    """获取所有成果（仅用于调试）"""
    return {"results": result_storage}


# 启动命令：uvicorn yichuansi:app --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
