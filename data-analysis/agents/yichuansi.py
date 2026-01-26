"""
驿传司（接口层）
唯一信息枢纽，负责指令转发、成果接收、知识检索代理、日志记录
"""
from fastapi import FastAPI, Body
import json
import time
from typing import Dict, List

app = FastAPI(title="驿传司接口层")

# 真实数据库存储
import sys
from pathlib import Path

# 添加backend到路径
backend_path = Path(__file__).parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

try:
    from database import DatabaseManager
    from config import settings
    db_manager = DatabaseManager(settings.DB_PATH)
    print("[Yichuansi] 使用真实数据库")
except ImportError as e:
    raise RuntimeError(f"数据库模块导入失败，请确保backend/database.py存在: {e}") from e


@app.post("/yichuansi/send_task")
async def send_task(
    task_instructions: Dict = Body(...),
    sender: str = Body(...)
):
    """接收总指挥使任务，转发至对应Agent"""
    task_id = task_instructions["task_id"]
    forward_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    target_agents = [sub["agent"] for sub in task_instructions["sub_tasks"]]

    try:
        # 使用真实数据库存储任务
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            for sub in task_instructions["sub_tasks"]:
                sub_task_id = f"{task_id}_{sub['agent']}"
                cursor.execute("""
                    INSERT INTO collaboration_activities
                    (user_name, action, content, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    sender,
                    "send_task",
                    json.dumps({"task": sub["task"], "material": sub["material"]}),
                    forward_time,
                    json.dumps({"task_id": sub_task_id, "status": "pending"})
                ))
            conn.commit()

        return {
            "forward_status": "success",
            "forward_time": forward_time,
            "target_agents": target_agents,
            "task_ids": [f"{task_id}_{agent}" for agent in target_agents]
        }
    except Exception as e:
        raise RuntimeError(f"任务存储失败: {e}") from e


@app.post("/yichuansi/receive_result")
async def receive_result(
    agent_result: Dict = Body(...),
    sender: str = Body(...)
):
    """接收执行Agent成果，存储到数据库"""
    task_id = agent_result["task_id"]
    receive_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

    try:
        # 使用真实数据库存储结果
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO collaboration_activities
                (user_name, action, content, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (
                sender,
                "receive_result",
                json.dumps(agent_result["result"]),
                receive_time,
                json.dumps({"task_id": task_id, "status": "completed"})
            ))
            conn.commit()

        return {
            "receive_status": "success",
            "receive_time": receive_time,
            "task_id": task_id
        }
    except Exception as e:
        raise RuntimeError(f"结果存储失败: {e}") from e


@app.post("/yichuansi/get_task_status")
async def get_task_status(
    task_id: str = Body(...)
):
    """查询任务状态"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT metadata FROM collaboration_activities
                WHERE metadata LIKE ?
                ORDER BY timestamp DESC
                LIMIT 1
            """, (f"%{task_id}%",))

            row = cursor.fetchone()
            if row:
                metadata = json.loads(row["metadata"])
                return {
                    "task_id": task_id,
                    "status": metadata.get("status", "unknown")
                }
            else:
                return {
                    "task_id": task_id,
                    "status": "not_found"
                }
    except Exception as e:
        raise RuntimeError(f"任务状态查询失败: {e}") from e


@app.post("/yichuansi/call_knowledge")
async def call_knowledge(
    knowledge_request: Dict = Body(...),
    requester: str = Body(...)
):
    """代理知识检索请求，调用太史阁接口"""
    # TODO: 实现真实太史阁接口调用
    raise RuntimeError("太史阁知识检索接口尚未实现，请联系开发人员")


@app.get("/yichuansi/get_log")
async def get_log():
    """获取全流程日志"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, action, content, timestamp, metadata
                FROM collaboration_activities
                ORDER BY timestamp DESC
                LIMIT 100
            """)
            logs = []
            for row in cursor.fetchall():
                logs.append({
                    "user_name": row["user_name"],
                    "action": row["action"],
                    "content": row["content"],
                    "timestamp": row["timestamp"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None
                })
            return {"logs": logs}
    except Exception as e:
        raise RuntimeError(f"日志查询失败: {e}") from e


@app.get("/yichuansi/get_all_tasks")
async def get_all_tasks():
    """获取所有任务"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, action, content, timestamp, metadata
                FROM collaboration_activities
                WHERE action = 'send_task'
                ORDER BY timestamp DESC
                LIMIT 50
            """)
            tasks = []
            for row in cursor.fetchall():
                tasks.append({
                    "sender": row["user_name"],
                    "content": json.loads(row["content"]) if row["content"] else None,
                    "timestamp": row["timestamp"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None
                })
            return {"tasks": tasks}
    except Exception as e:
        raise RuntimeError(f"任务查询失败: {e}") from e


@app.get("/yichuansi/get_all_results")
async def get_all_results():
    """获取所有成果"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT user_name, action, content, timestamp, metadata
                FROM collaboration_activities
                WHERE action = 'receive_result'
                ORDER BY timestamp DESC
                LIMIT 50
            """)
            results = []
            for row in cursor.fetchall():
                results.append({
                    "sender": row["user_name"],
                    "content": json.loads(row["content"]) if row["content"] else None,
                    "timestamp": row["timestamp"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None
                })
            return {"results": results}
    except Exception as e:
        raise RuntimeError(f"结果查询失败: {e}") from e


# 启动命令：uvicorn yichuansi:app --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
