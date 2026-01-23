# backend/database.py - 数据库管理
"""
初始化和管理SQLite数据库，处理硬编码的默认数据
"""
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self, db_path: Path):
        """初始化数据库管理器"""
        self.db_path = db_path
        self.init_database()

    def get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        """初始化数据库表结构"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. 团队成员表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS team_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    avatar TEXT,
                    online BOOLEAN DEFAULT 0,
                    join_date TEXT,
                    last_active TEXT,
                    permissions TEXT,  -- JSON数组
                    contribution INTEGER DEFAULT 0,
                    email TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 2. 知识空间表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_spaces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    members TEXT,  -- JSON数组
                    owner TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    card_count INTEGER DEFAULT 0,
                    is_public BOOLEAN DEFAULT 0
                )
            """)

            # 3. 团队协作活动表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS collaboration_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_name TEXT NOT NULL,
                    action TEXT NOT NULL,
                    content TEXT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    space_id INTEGER,
                    metadata TEXT  -- JSON
                )
            """)

            # 4. 分析报告数据表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analytics_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,  -- growth, network, heatmap, roi
                    data_json TEXT NOT NULL,  -- JSON格式的数据
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 5. 评论表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_name TEXT NOT NULL,
                    user_avatar TEXT,
                    content TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    target_id INTEGER,  -- 关联的目标ID
                    target_type TEXT,  -- space, card, etc.
                    parent_id INTEGER,  -- 父评论ID
                    metadata TEXT  -- JSON
                )
            """)

            conn.commit()

        # 插入默认数据（只插入一次）
        self.insert_default_data()

    def insert_default_data(self):
        """插入默认的硬编码数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 检查是否已经插入过默认数据
            cursor.execute("SELECT COUNT(*) FROM team_members")
            if cursor.fetchone()[0] > 0:
                logger.info("数据库已有默认数据，跳过初始化")
                return

            logger.info("正在插入默认数据...")

            # 1. 默认团队成员
            default_members = [
                {
                    'name': '张明',
                    'role': '项目经理',
                    'avatar': '👨‍💼',
                    'online': True,
                    'join_date': '2024-01-15',
                    'last_active': datetime.now().isoformat(),
                    'permissions': json.dumps(['read', 'write', 'admin']),
                    'contribution': 85,
                    'email': 'zhangming@example.com'
                },
                {
                    'name': '李华',
                    'role': '开发工程师',
                    'avatar': '👨‍💻',
                    'online': True,
                    'join_date': '2024-02-20',
                    'last_active': datetime.now().isoformat(),
                    'permissions': json.dumps(['read', 'write']),
                    'contribution': 72,
                    'email': 'lihua@example.com'
                },
                {
                    'name': '王强',
                    'role': '设计师',
                    'avatar': '👨‍🎨',
                    'online': False,
                    'join_date': '2024-03-10',
                    'last_active': '2024-01-22T10:30:00',
                    'permissions': json.dumps(['read', 'write']),
                    'contribution': 65,
                    'email': 'wangqiang@example.com'
                },
                {
                    'name': '陈静',
                    'role': '产品经理',
                    'avatar': '👩‍💼',
                    'online': True,
                    'join_date': '2024-01-20',
                    'last_active': datetime.now().isoformat(),
                    'permissions': json.dumps(['read', 'write', 'admin']),
                    'contribution': 78,
                    'email': 'chenjing@example.com'
                },
                {
                    'name': '赵伟',
                    'role': '测试工程师',
                    'avatar': '👨‍🔬',
                    'online': True,
                    'join_date': '2024-04-05',
                    'last_active': datetime.now().isoformat(),
                    'permissions': json.dumps(['read', 'write']),
                    'contribution': 60,
                    'email': 'zhaowei@example.com'
                }
            ]

            for member in default_members:
                cursor.execute("""
                    INSERT INTO team_members (name, role, avatar, online, join_date,
                                           last_active, permissions, contribution, email)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    member['name'], member['role'], member['avatar'],
                    member['online'], member['join_date'], member['last_active'],
                    member['permissions'], member['contribution'], member['email']
                ))

            # 2. 默认知识空间
            default_spaces = [
                {
                    'name': '产品研发知识库',
                    'description': '团队产品研发相关的知识文档和经验总结',
                    'members': json.dumps(['张明', '李华', '王强', '陈静']),
                    'owner': '张明',
                    'created_at': '2024-01-15',
                    'updated_at': datetime.now().isoformat(),
                    'card_count': 42,
                    'is_public': True
                },
                {
                    'name': '技术架构设计',
                    'description': '系统架构、技术选型和设计方案',
                    'members': json.dumps(['李华', '王强']),
                    'owner': '李华',
                    'created_at': '2024-02-20',
                    'updated_at': datetime.now().isoformat(),
                    'card_count': 28,
                    'is_public': False
                }
            ]

            for space in default_spaces:
                cursor.execute("""
                    INSERT INTO knowledge_spaces (name, description, members, owner,
                                                 created_at, updated_at, card_count, is_public)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    space['name'], space['description'], space['members'], space['owner'],
                    space['created_at'], space['updated_at'], space['card_count'], space['is_public']
                ))

            # 3. 默认协作活动
            default_activities = [
                {
                    'user_name': '张明',
                    'action': '创建了知识空间',
                    'content': '创建了"产品研发知识库"',
                    'metadata': json.dumps({'space_name': '产品研发知识库'})
                },
                {
                    'user_name': '李华',
                    'action': '添加了卡片',
                    'content': '添加了"微服务架构设计"卡片',
                    'metadata': json.dumps({'card_title': '微服务架构设计'})
                },
                {
                    'user_name': '王强',
                    'action': '上传了设计稿',
                    'content': '上传了"UI设计规范v2.0"',
                    'metadata': json.dumps({'file_name': 'UI设计规范v2.0'})
                },
                {
                    'user_name': '陈静',
                    'action': '更新了需求',
                    'content': '更新了"用户登录功能需求"',
                    'metadata': json.dumps({'requirement': '用户登录功能需求'})
                }
            ]

            for activity in default_activities:
                cursor.execute("""
                    INSERT INTO collaboration_activities (user_name, action, content, metadata)
                    VALUES (?, ?, ?, ?)
                """, (
                    activity['user_name'], activity['action'], activity['content'], activity['metadata']
                ))

            # 4. 默认评论
            default_comments = [
                {
                    'user_name': '张明',
                    'user_avatar': '👨‍💼',
                    'content': '这个知识点总结得很到位，对团队很有帮助！',
                    'target_id': 1,
                    'target_type': 'space',
                    'metadata': json.dumps({})
                },
                {
                    'user_name': '李华',
                    'user_avatar': '👨‍💻',
                    'content': '补充一点：建议增加部署流程的说明',
                    'target_id': 1,
                    'target_type': 'space',
                    'parent_id': None,
                    'metadata': json.dumps({})
                },
                {
                    'user_name': '王强',
                    'user_avatar': '👨‍🎨',
                    'content': '同意，我也会补充UI设计部分',
                    'target_id': 1,
                    'target_type': 'space',
                    'parent_id': None,
                    'metadata': json.dumps({})
                },
                {
                    'user_name': '陈静',
                    'user_avatar': '👩‍💼',
                    'content': '已收到，下周更新时加上',
                    'target_id': 1,
                    'target_type': 'space',
                    'parent_id': None,
                    'metadata': json.dumps({})
                }
            ]

            for comment in default_comments:
                cursor.execute("""
                    INSERT INTO comments (user_name, user_avatar, content, target_id, target_type, parent_id, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    comment['user_name'], comment['user_avatar'], comment['content'],
                    comment['target_id'], comment['target_type'],
                    comment['parent_id'] if comment.get('parent_id') else None,
                    comment['metadata']
                ))

            # 5. 默认分析数据
            default_analytics = [
                {
                    'category': 'growth',
                    'data_json': json.dumps([
                        { 'month': '9月', 'cards': 120, 'connections': 85, 'knowledge': 95 },
                        { 'month': '10月', 'cards': 145, 'connections': 102, 'knowledge': 110 },
                        { 'month': '11月', 'cards': 178, 'connections': 125, 'knowledge': 138 },
                        { 'month': '12月', 'cards': 210, 'connections': 148, 'knowledge': 165 },
                        { 'month': '1月', 'cards': 256, 'connections': 172, 'knowledge': 198 }
                    ])
                },
                {
                    'category': 'network',
                    'data_json': json.dumps([
                        { 'name': '张明', 'cards': 42, 'connections': 85 },
                        { 'name': '李华', 'cards': 38, 'connections': 72 },
                        { 'name': '王强', 'cards': 35, 'connections': 65 },
                        { 'name': '陈静', 'cards': 41, 'connections': 78 }
                    ])
                }
            ]

            for analytics in default_analytics:
                cursor.execute("""
                    INSERT INTO analytics_data (category, data_json)
                    VALUES (?, ?)
                """, (analytics['category'], analytics['data_json']))

            conn.commit()
            logger.info(f"默认数据插入完成：{len(default_members)}个成员, {len(default_spaces)}个空间, "
                       f"{len(default_activities)}个活动, {len(default_comments)}个评论")

    # ========== 团队成员管理 ==========
    def get_all_team_members(self) -> List[Dict[str, Any]]:
        """获取所有团队成员"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM team_members ORDER BY contribution DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_team_member(self, name: str, role: str, avatar: str = '👤',
                        email: Optional[str] = None, contribution: int = 0) -> Dict[str, Any]:
        """添加团队成员"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO team_members (name, role, avatar, online, join_date,
                                          last_active, permissions, contribution, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, role, avatar, True, now, now,
                  json.dumps(['read', 'write']), contribution, email))
            member_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM team_members WHERE id = ?", (member_id,))
            return dict(cursor.fetchone())

    def update_team_member(self, member_id: int, **kwargs) -> bool:
        """更新团队成员信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            values = []
            for key, value in kwargs.items():
                updates.append(f"{key} = ?")
                values.append(value)
            values.append(member_id)
            cursor.execute(f"UPDATE team_members SET {', '.join(updates)}, updated_at = ? WHERE id = ?",
                          values + [datetime.now().isoformat()])
            conn.commit()
            return cursor.rowcount > 0

    def delete_team_member(self, member_id: int) -> bool:
        """删除团队成员"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM team_members WHERE id = ?", (member_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 知识空间管理 ==========
    def get_all_knowledge_spaces(self) -> List[Dict[str, Any]]:
        """获取所有知识空间"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM knowledge_spaces ORDER BY card_count DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_knowledge_space(self, name: str, description: str, owner: str,
                            members: List[str] = None, is_public: bool = True) -> Dict[str, Any]:
        """添加知识空间"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO knowledge_spaces (name, description, members, owner,
                                             created_at, updated_at, card_count, is_public)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, description, json.dumps(members or []), owner,
                  now, now, 0, is_public))
            space_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM knowledge_spaces WHERE id = ?", (space_id,))
            return dict(cursor.fetchone())

    # ========== 协作活动管理 ==========
    def get_recent_activities(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取最近的协作活动"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM collaboration_activities
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_activity(self, user_name: str, action: str, content: str,
                    space_id: Optional[int] = None, metadata: Dict = None) -> Dict[str, Any]:
        """添加协作活动"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO collaboration_activities (user_name, action, content, space_id, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (user_name, action, content, space_id, json.dumps(metadata or {})))
            activity_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM collaboration_activities WHERE id = ?", (activity_id,))
            return dict(cursor.fetchone())

    # ========== 评论管理 ==========
    def get_comments(self, target_id: int, target_type: str = 'space') -> List[Dict[str, Any]]:
        """获取评论"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM comments
                WHERE target_id = ? AND target_type = ?
                ORDER BY created_at ASC
            """, (target_id, target_type))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_comment(self, user_name: str, user_avatar: str, content: str,
                   target_id: int, target_type: str = 'space',
                   parent_id: Optional[int] = None) -> Dict[str, Any]:
        """添加评论"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO comments (user_name, user_avatar, content, target_id, target_type, parent_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_name, user_avatar, content, target_id, target_type, parent_id, json.dumps({})))
            comment_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
            return dict(cursor.fetchone())

    # ========== 分析数据管理 ==========
    def get_analytics_data(self, category: str) -> Optional[Dict[str, Any]]:
        """获取分析数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM analytics_data
                WHERE category = ?
                ORDER BY updated_at DESC
                LIMIT 1
            """, (category,))
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['data'] = json.loads(data['data_json'])
                return data
            return None

    def update_analytics_data(self, category: str, data: Any) -> Dict[str, Any]:
        """更新分析数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO analytics_data (category, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            """, (category, json.dumps(data), now, now))
            data_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM analytics_data WHERE id = ?", (data_id,))
            return dict(cursor.fetchone())
