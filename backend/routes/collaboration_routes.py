"""
协作实时通信路由
- WebSocket: ws://host/ws/collaboration/{user_id}
- REST: /api/activities, /api/team-members, /api/comments
所有在线用户通过 WebSocket 实时接收他人消息
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from collections import defaultdict

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

logger = logging.getLogger("collaboration")
router = APIRouter(prefix="/api", tags=["协作"])

# 数据库管理器（由 main.py 自动注入）
db_manager = None

def set_db_manager(dbm):
    """设置数据库管理器（由 main.py 调用）"""
    global db_manager
    db_manager = dbm
    logger.info("Collaboration 路由数据库管理器已设置")


# ============== 数据模型 ==============

class TeamMember(BaseModel):
    id: int
    name: str
    avatar: str = "👤"
    role: str = "成员"
    status: str = "offline"
    lastActive: Optional[str] = None


class Activity(BaseModel):
    id: str
    user: str
    userId: str
    avatar: str
    action: str
    content: str
    timestamp: str
    type: str = "message"


class Comment(BaseModel):
    id: int
    user: str
    userId: str
    avatar: str
    content: str
    parentId: Optional[int] = None
    targetId: int
    targetType: str = "space"
    timestamp: str


# ============== 内存存储 ==============

class CollaborationStore:
    """内存存储，局域网共享"""

    def __init__(self):
        # 在线用户: user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        # 团队成员
        self.members: Dict[str, TeamMember] = {}
        # 活动消息历史 (最近200条)
        self.activities: List[Dict] = []
        # 评论
        self.comments: Dict[int, Comment] = {}
        self._comment_id_counter = 1
        self._lock = asyncio.Lock()

        # 初始化默认成员
        self._init_default_members()

    def _init_default_members(self):
        defaults = [
            TeamMember(id=1, name="张三", avatar="👨‍💻", role="开发者", status="online"),
            TeamMember(id=2, name="李四", avatar="👩‍🎨", role="设计师", status="offline"),
            TeamMember(id=3, name="王五", avatar="👨‍🔬", role="研究员", status="offline"),
            TeamMember(id=4, name="赵六", avatar="👩‍💼", role="产品经理", status="offline"),
        ]
        for m in defaults:
            self.members[str(m.id)] = m

    # ---- WebSocket 连接管理 ----

    async def connect(self, user_id: str, websocket: WebSocket, nickname: str = "", avatar: str = "👤"):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        display_name = nickname.strip() or f"用户{user_id}"
        if user_id in self.members:
            self.members[user_id].status = "online"
        self.members[user_id] = TeamMember(
            id=int(user_id) if user_id.isdigit() else hash(user_id) % 10000,
            name=display_name,
            avatar=avatar or "👤",
            status="online",
            lastActive=datetime.now().isoformat()
        )
# 连接后立即推送历史数据（刷新后恢复记录）
        try:
            history = await self._get_history_data()
            await websocket.send_json(history)
        except Exception as e:
            logger.warning(f"发送历史数据失败: {e}")
        try:
            await self._broadcast({
                "type": "user_online",
                "userId": user_id,
                "userName": display_name,
                "avatar": avatar or "👤",
                "timestamp": datetime.now().isoformat()
            }, exclude=None)
        except Exception as e:
            logger.warning(f"广播用户上线失败: {e}")
        logger.info(f"用户 {user_id} 连接 WebSocket，当前在线: {len(self.active_connections)}")

    async def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.members:
            self.members[user_id].status = "offline"
        await self._broadcast({
            "type": "user_offline",
            "userId": user_id,
            "timestamp": datetime.now().isoformat()
        }, exclude=None)
        logger.info(f"用户 {user_id} 断开连接")

    async def _broadcast(self, message: Dict, exclude: Optional[str] = None):
        """广播消息给所有连接的用户"""
        if not self.active_connections:
            return
        data = json.dumps(message, ensure_ascii=False)
        tasks = []
        for uid, ws in list(self.active_connections.items()):
            if uid != exclude:
                try:
                    tasks.append(ws.send_text(data))
                except Exception:
                    pass
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to(self, user_id: str, message: Dict):
        """发送给指定用户"""
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast_activity(self, activity: Dict):
        """广播新活动消息给所有用户"""
        self.activities.append(activity)
        if len(self.activities) > 200:
            self.activities = self.activities[-200:]
        await self._broadcast({
            "type": "new_activity",
            "activity": activity
        })

    async def _get_history_data(self) -> Dict:
        """获取历史数据（用于 WebSocket 连接时推送）"""
        activities = await self.get_activities(50)
        members = await self.get_members()
        return {
            "type": "history",
            "activities": activities,
            "members": members,
            "timestamp": datetime.now().isoformat(),
        }

    # ---- REST API 实现（DB持久化 ｜ 内存广播） ----

    async def get_members(self) -> List[Dict]:
        """从数据库读取团队成员，降级到内存"""
        if db_manager:
            try:
                rows = db_manager.get_all_team_members()
                if rows:
                    return [
                        {
                            "id": m["id"],
                            "name": m["name"],
                            "avatar": m.get("avatar", "👤"),
                            "role": m.get("role", "成员"),
                            "status": "online" if m.get("online") else "offline",
                            "lastActive": m.get("last_active"),
                        }
                        for m in rows
                    ]
            except Exception as e:
                logger.error(f"从数据库读取成员失败: {e}")
        # 降级到内存
        return [
            {**m.model_dump(), "id": int(k)} 
            for k, m in self.members.items()
        ]

    async def add_activity(self, data: Dict) -> Dict:
        activity = {
            "id": str(uuid.uuid4()),
            "user": data.get("user", "未知"),
            "userId": data.get("userId", ""),
            "avatar": data.get("avatar", "👤"),
            "action": data.get("action", "发言"),
            "content": data.get("content", ""),
            "timestamp": datetime.now().isoformat(),
            "type": data.get("type", "message"),
        }
        # 持久化到数据库
        if db_manager:
            try:
                db_manager.add_activity(
                    user_name=activity["user"],
                    action=activity["action"],
                    content=activity["content"],
                    metadata={
                        "user_id": activity["userId"],
                        "avatar": activity["avatar"],
                        "type": activity["type"],
                        "activity_id": activity["id"],
                    }
                )
            except Exception as e:
                logger.error(f"保存活动到数据库失败: {e}")
        # 内存中保留用于广播
        await self.broadcast_activity(activity)
        return activity

    async def get_activities(self, limit: int = 50) -> List[Dict]:
        """从数据库读取历史活动，合并内存中未写入的最新活动"""
        db_activities = []
        if db_manager:
            try:
                rows = db_manager.get_recent_activities(limit)
                for row in rows:
                    meta = {}
                    if row.get('metadata'):
                        try:
                            meta = json.loads(row['metadata'])
                        except:
                            pass
                    db_activities.append({
                        "id": meta.get("activity_id", str(row["id"])),
                        "user": row["user_name"],
                        "userId": meta.get("user_id", ""),
                        "avatar": meta.get("avatar", "👤"),
                        "action": row["action"],
                        "content": row["content"],
                        "timestamp": row.get("timestamp", row.get("created_at", "")),
                        "type": meta.get("type", "message"),
                    })
            except Exception as e:
                logger.error(f"从数据库读取活动失败: {e}")
        # 合并内存中尚未写入 DB 的活动
        seen_ids = {a["id"] for a in db_activities}
        for a in reversed(self.activities):
            if a["id"] not in seen_ids:
                db_activities.append(a)
                seen_ids.add(a["id"])
        return list(reversed(db_activities[-limit:]))

    async def get_comments(self, target_id: int, target_type: str = "space") -> List[Dict]:
        """从数据库读取评论，合并内存中的最新评论"""
        db_comments = []
        if db_manager:
            try:
                rows = db_manager.get_comments(target_id, target_type)
                for row in rows:
                    meta = {}
                    if row.get('metadata'):
                        try:
                            meta = json.loads(row['metadata'])
                        except:
                            pass
                    db_comments.append({
                        "id": row["id"],
                        "user": row["user_name"],
                        "userId": meta.get("user_id", ""),
                        "avatar": row.get("user_avatar", "👤"),
                        "content": row["content"],
                        "parentId": row.get("parent_id"),
                        "targetId": row.get("target_id"),
                        "targetType": row.get("target_type"),
                        "timestamp": row.get("created_at", ""),
                    })
            except Exception as e:
                logger.error(f"从数据库读取评论失败: {e}")
        # 合并内存中的评论
        seen_ids = {c["id"] for c in db_comments}
        for cid, c in sorted(self.comments.items()):
            if cid not in seen_ids:
                d = c.model_dump()
                d["user"] = d.pop("user")
                db_comments.append(d)
                seen_ids.add(cid)
        return [
            c for c in db_comments
            if c.get("targetId") == target_id and c.get("targetType") == target_type
        ]

    async def add_comment(self, data: Dict) -> Dict:
        comment_id = self._comment_id_counter
        self._comment_id_counter += 1
        comment = Comment(
            id=comment_id,
            user=data.get("user", "未知"),
            userId=data.get("userId", ""),
            avatar=data.get("avatar", "👤"),
            content=data.get("content", ""),
            parentId=data.get("parentId"),
            targetId=data.get("targetId", 0),
            targetType=data.get("targetType", "space"),
            timestamp=datetime.now().isoformat(),
        )
        # 持久化到数据库
        if db_manager:
            try:
                db_manager.add_comment(
                    user_name=comment.user,
                    user_avatar=comment.avatar,
                    content=comment.content,
                    target_id=comment.targetId,
                    target_type=comment.targetType,
                    parent_id=comment.parentId,
                )
            except Exception as e:
                logger.error(f"保存评论到数据库失败: {e}")
        self.comments[comment_id] = comment
        # 通过 WebSocket 广播新评论
        await self._broadcast({
            "type": "new_comment",
            "comment": {**comment.model_dump()}
        })
        return {**comment.model_dump()}


# 全局单例
store = CollaborationStore()


# ============== WebSocket 路由 ==============

@router.websocket("/ws/collaboration/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, nickname: str = "", avatar: str = "👤"):
    """WebSocket 端点，客户端连接后可接收和发送实时消息
    支持 query 参数 nickname 和 avatar，例如：
    ws://host/api/ws/collaboration/{user_id}?nickname=张三&avatar=🐶
    """
    try:
        await store.connect(user_id, websocket, nickname, avatar)
    except Exception as e:
        logger.error(f"WebSocket connect 失败: {e}")
        return
    try:
        while True:
            # 接收客户端消息（心跳/发送）
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "send_activity":
                    # 用户发送新消息
                    activity = await store.add_activity({
                        "user": msg.get("user", "未知"),
                        "userId": msg.get("userId", user_id),
                        "avatar": msg.get("avatar", "👤"),
                        "action": msg.get("action", "发言"),
                        "content": msg.get("content", ""),
                        "type": msg.get("type_", "message"),
                    })

                elif msg_type == "send_comment":
                    comment = await store.add_comment({
                        "user": msg.get("user", "未知"),
                        "userId": msg.get("userId", user_id),
                        "avatar": msg.get("avatar", "👤"),
                        "content": msg.get("content", ""),
                        "parentId": msg.get("parentId"),
                        "targetId": msg.get("targetId", 0),
                        "targetType": msg.get("targetType", "space"),
                    })

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        await store.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket 连接异常: {e}")


# ============== REST 路由 ==============

@router.get("/team-members")
async def get_team_members():
    """获取团队成员列表"""
    return await store.get_members()


@router.post("/team-members")
async def add_team_member(member: TeamMember):
    """添加团队成员"""
    key = str(member.id)
    store.members[key] = member
    await store._broadcast({
        "type": "member_added",
        "member": {**member.model_dump(), "id": member.id}
    })
    return {"id": member.id, "status": "ok"}


@router.get("/activities")
async def get_activities(limit: int = Query(50, ge=1, le=200)):
    """获取最近的协作活动"""
    return await store.get_activities(limit)


@router.post("/activities")
async def create_activity(data: Dict[str, Any]):
    """创建新的协作活动"""
    return await store.add_activity(data)


@router.get("/comments/{target_id}")
async def get_comments(target_id: int, target_type: str = "space"):
    """获取某个目标的所有评论"""
    return await store.get_comments(target_id, target_type)


@router.post("/comments")
async def create_comment(data: Dict[str, Any]):
    """创建评论"""
    return await store.add_comment(data)


@router.get("/collaboration/status")
async def collaboration_status():
    """实时协作状态"""
    return {
        "online_users": len(store.active_connections),
        "total_members": len(store.members),
        "total_activities": len(store.activities),
        "total_comments": len(store.comments),
    }


@router.post("/hybrid/question")
async def hybrid_answer_question(data: Dict[str, Any]):
    """
    混合模式下人类提问，智能体基于知识库回答
    """
    question = data.get("question", "")
    topic = data.get("topic", "")  # 会议主题，用于上下文
    
    if not question:
        return {"error": "问题不能为空"}
    
    logger.info(f"[Hybrid] 收到人类问题: {question[:50]}...")
    
    try:
        # 1. 搜索知识库卡片
        from routes import vector_search
        cards = vector_search.search_hybrid(question, limit=5)
        
        if not cards:
            return {
                "answer": "抱歉，我在知识库中没有找到与您问题相关的信息。",
                "sources": []
            }
        
        # 2. 构建上下文
        context_parts = ["【相关知识】"]
        for card in cards[:3]:
            context_parts.append(f"- {card.title}: {card.content[:100]}...")
        
        context = "\n".join(context_parts)
        
        # 3. 生成回答
        prompt = f"""基于以下知识库信息，回答用户问题。如果知识库中没有相关信息，请如实说明。

知识库：
{context}

用户问题：{question}

请生成一个准确、简洁的回答："""
        
        # 调用本地模型
        from services.ai import AIServiceFactory
        llm = AIServiceFactory.get_default()
        if llm:
            result = llm.chat(prompt)
            answer = result.content if result and hasattr(result, 'content') else "生成回答失败"
        else:
            # Fallback: 简单拼接
            answer = "，".join([f"关于{c.title}" for c in cards[:2]]) + "等知识可供参考"
        
        logger.info(f"[Hybrid] 生成回答: {answer[:50]}...")
        
        return {
            "answer": answer,
            "sources": [
                {"card_id": str(c.id), "title": c.title, "similarity": c.score}
                for c in cards[:3]
            ]
        }
        
    except Exception as e:
        logger.error(f"[Hybrid] 处理问题失败: {e}")
        return {"error": str(e)}