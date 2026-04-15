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
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL")
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

            # 6. 知识卡片表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    card_type TEXT DEFAULT 'blue',
                    category TEXT,
                    similarity REAL DEFAULT 0.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 7. 检查清单数据表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS checklist_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_json TEXT NOT NULL,  -- sections数组的JSON
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 8. GTD任务表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS gtd_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
                    due_date TEXT,
                    category TEXT CHECK(category IN ('inbox', 'today', 'later', 'archive', 'projects')),
                    source_type TEXT,
                    source_id INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    remind_at TEXT,
                    remind_before_minutes INTEGER DEFAULT 0,
                    reminder_enabled BOOLEAN DEFAULT 0,
                    recurrence TEXT DEFAULT 'none',
                    recurrence_end_date TEXT,
                    is_completed BOOLEAN DEFAULT 0,
                    completed_at TEXT
                )
            """)
            
            # 迁移：为旧表添加新字段
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN source_type TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN source_id INTEGER")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN remind_at TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN remind_before_minutes INTEGER DEFAULT 0")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN reminder_enabled BOOLEAN DEFAULT 0")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN recurrence TEXT DEFAULT 'none'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN recurrence_end_date TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN is_completed BOOLEAN DEFAULT 0")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN completed_at TEXT")
            except:
                pass

            # 9. 专题研究表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS research_projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    color TEXT DEFAULT 'blue',
                    icon TEXT DEFAULT '📚',
                    status TEXT DEFAULT 'active',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 10. 团队协作项目管理表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS team_projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'completed')),
                    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
                    start_date TEXT,
                    end_date TEXT,
                    progress INTEGER DEFAULT 0,
                    assigned_members TEXT,
                    tasks_json TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 检查并添加 knowledge_cards 表的缺失字段
            try:
                cursor.execute("SELECT * FROM knowledge_cards LIMIT 1")
                columns = [desc[0] for desc in cursor.description]
                for col, col_type in [("type", "TEXT"), ("category", "TEXT"), ("similarity", "REAL")]:
                    if col not in columns:
                        cursor.execute(f"ALTER TABLE knowledge_cards ADD COLUMN {col} {col_type}")
            except:
                pass
            
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN project_id INTEGER")
            except:
                pass

            # 8. 知识库卡片表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT CHECK(type IN ('blue', 'green', 'yellow', 'red')),
                    category TEXT CHECK(category IS NULL OR category IN ('事实', '解释', '风险', '行动')),
                    similarity REAL DEFAULT 0.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 11. 会议记录表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS meetings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    meeting_id TEXT NOT NULL UNIQUE,
                    topic TEXT NOT NULL,
                    context TEXT,
                    card_ids TEXT,
                    rounds INTEGER NOT NULL,
                    participants TEXT NOT NULL,
                    summary TEXT,
                    decision TEXT,
                    action_items TEXT,
                    all_speeches TEXT,
                    all_rounds TEXT,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    duration_seconds REAL NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

            # 6. 默认检查清单数据
            default_checklist_data = [
                {
                    'data_json': json.dumps([
                        {
                            'id': 'philosophy',
                            'title': '系统哲学',
                            'icon': '📚',
                            'items': [
                                {'id': 'phil1', 'title': '理解Zettelkasten核心思想', 'icon': '', 'description': '掌握卢曼卡片系统的核心理念和方法论', 'status': 'completed', 'details': '已完成学习'},
                                {'id': 'phil2', 'title': '建立知识连接网络', 'icon': '🔗', 'description': '理解卡片间如何形成有机的知识网络', 'status': 'partial', 'details': '部分完成'}
                            ]
                        },
                        {
                            'id': 'implementation',
                            'title': '系统实现',
                            'icon': '🛠️',
                            'items': [
                                {'id': 'impl1', 'title': '创建卡片数据结构', 'icon': '🗂️', 'description': '设计卡片的基本数据模型和存储结构', 'status': 'completed'},
                                {'id': 'impl2', 'title': '实现双向链接功能', 'icon': '↔️', 'description': '支持卡片间的相互引用和链接', 'status': 'partial'}
                            ]
                        },
                        {
                            'id': 'workflow',
                            'title': '工作流程',
                            'icon': '[LIST]',
                            'items': [
                                {'id': 'work1', 'title': '设计卡片创建流程', 'icon': '[WRITE]', 'description': '定义从想法到卡片的标准化流程', 'status': 'completed'},
                                {'id': 'work2', 'title': '建立定期回顾机制', 'icon': '[REFRESH]', 'description': '设置定期回顾和更新卡片的机制', 'status': 'missing'}
                            ]
                        }
                    ])
                }
            ]

            for checklist in default_checklist_data:
                cursor.execute("""
                    INSERT INTO checklist_data (data_json)
                    VALUES (?)
                """, (checklist['data_json'],))

            # 7. 默认GTD任务数据
            default_gtd_tasks = [
                {'title': '完成项目文档', 'description': '编写项目API文档和用户手册', 'priority': 'high', 'category': 'today'},
                {'title': '测试聊天机器人', 'description': '验证ChatBotModal输入框功能', 'priority': 'high', 'category': 'inbox'},
                {'title': '学习向量检索', 'description': '研究向量数据库和相似度搜索技术', 'priority': 'medium', 'category': 'later'},
                {'title': '优化前端性能', 'description': '分析并优化React组件渲染性能', 'priority': 'medium', 'category': 'projects'},
                {'title': '整理会议记录', 'description': '整理上周团队会议的重要决策', 'priority': 'low', 'category': 'archive'}
            ]

            for task in default_gtd_tasks:
                cursor.execute("""
                    INSERT INTO gtd_tasks (title, description, priority, category)
                    VALUES (?, ?, ?, ?)
                """, (task['title'], task['description'], task['priority'], task['category']))

            conn.commit()
            logger.info(f"默认数据插入完成：{len(default_members)}个成员, {len(default_spaces)}个空间, "
                       f"{len(default_activities)}个活动, {len(default_comments)}个评论, "
                       f"{len(default_checklist_data)}个检查清单, {len(default_gtd_tasks)}个GTD任务")

    # ========== 团队成员管理 ==========
    def get_all_team_members(self) -> List[Dict[str, Any]]:
        """获取所有团队成员"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM team_members ORDER BY contribution DESC")
            rows = cursor.fetchall()
            members = []
            for row in rows:
                member = dict(row)
                # 解析 JSON 字段
                if member.get('permissions') and isinstance(member['permissions'], str):
                    try:
                        member['permissions'] = json.loads(member['permissions'])
                    except:
                        member['permissions'] = ['read']
                members.append(member)
            return members

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
            member = dict(cursor.fetchone())
            # 解析 JSON 字段
            if member.get('permissions') and isinstance(member['permissions'], str):
                try:
                    member['permissions'] = json.loads(member['permissions'])
                except:
                    member['permissions'] = ['read', 'write']
            return member

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
            spaces = []
            for row in rows:
                space = dict(row)
                # 解析 JSON 字段
                if space.get('members') and isinstance(space['members'], str):
                    try:
                        space['members'] = json.loads(space['members'])
                    except:
                        space['members'] = []
                spaces.append(space)
            return spaces

    def add_knowledge_space(self, name: str, description: str, owner: str,
                            members: Optional[List[str]] = None, is_public: bool = True) -> Dict[str, Any]:
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
            space_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM knowledge_spaces WHERE id = ?", (space_id,))
            space = dict(cursor.fetchone())
            # 解析 JSON 字段
            if space.get('members') and isinstance(space['members'], str):
                try:
                    space['members'] = json.loads(space['members'])
                except:
                    space['members'] = []
            return space

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
                    space_id: Optional[int] = None, metadata: Optional[Dict] = None) -> Dict[str, Any]:
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

    # ========== 检查清单管理 ==========
    def get_checklist_data(self) -> Optional[Dict[str, Any]]:
        """获取检查清单数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM checklist_data
                ORDER BY updated_at DESC
                LIMIT 1
            """)
            row = cursor.fetchone()
            if row:
                data = dict(row)
                data['data'] = json.loads(data['data_json'])
                return data
            return None

    def update_checklist_data(self, data_json: str) -> Dict[str, Any]:
        """更新检查清单数据"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO checklist_data (data_json, created_at, updated_at)
                VALUES (?, ?, ?)
            """, (data_json, now, now))
            data_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM checklist_data WHERE id = ?", (data_id,))
            return dict(cursor.fetchone())

    # ========== GTD任务管理 ==========
    def get_gtd_tasks(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute("""
                    SELECT * FROM gtd_tasks
                    WHERE category = ?
                    ORDER BY created_at DESC
                """, (category,))
            else:
                cursor.execute("""
                    SELECT * FROM gtd_tasks
                    ORDER BY created_at DESC
                """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_gtd_task(self, title: str, description: Optional[str], priority: str, category: str, due_date: Optional[str] = None, source_type: Optional[str] = None, source_id: Optional[int] = None) -> Dict[str, Any]:
        """添加GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO gtd_tasks (title, description, priority, category, due_date, source_type, source_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (title, description, priority, category, due_date, source_type, source_id))
            task_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM gtd_tasks WHERE id = ?", (task_id,))
            return dict(cursor.fetchone())

    def update_gtd_task(self, task_id: int, **kwargs) -> bool:
        """更新GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            values = []
            for key, value in kwargs.items():
                updates.append(f"{key} = ?")
                values.append(value)
            values.append(datetime.now().isoformat())
            values.append(task_id)
            cursor.execute(f"UPDATE gtd_tasks SET {', '.join(updates)}, updated_at = ? WHERE id = ?",
                          values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_gtd_task(self, task_id: int) -> bool:
        """删除GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM gtd_tasks WHERE id = ?", (task_id,))
            conn.commit()
            return cursor.rowcount > 0

    def sync_card_to_gtd(self, card_id: int) -> Optional[Dict[str, Any]]:
        """将行动卡片同步到GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 获取卡片信息
            cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
            card = cursor.fetchone()
            if not card:
                return None
            
            card_dict = dict(card)
            card_type = card_dict.get('card_type', card_dict.get('type', ''))
            
            # 只同步行动卡片（红色）
            if card_type != 'red':
                return None
            
            # 检查是否已同步
            cursor.execute("SELECT id FROM gtd_tasks WHERE source_type = 'card' AND source_id = ?", (card_id,))
            existing = cursor.fetchone()
            if existing:
                return {'status': 'already_synced', 'task_id': existing[0]}
            
            # 确定优先级（行动卡片设为高优先级）
            priority = 'high'
            category = 'inbox'
            
            # 创建GTD任务
            cursor.execute("""
                INSERT INTO gtd_tasks (title, description, priority, category, source_type, source_id)
                VALUES (?, ?, ?, ?, 'card', ?)
            """, (card_dict['title'], card_dict['content'], priority, category, card_id))
            
            task_id = cursor.lastrowid
            conn.commit()
            
            return {'status': 'synced', 'task_id': task_id, 'card_id': card_id}

    def sync_all_cards_to_gtd(self) -> Dict[str, Any]:
        """同步所有卡片到GTD（导入时用户选择同步）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 获取所有卡片（不再按类型过滤，导入时用户主动选择同步）
            cursor.execute("""
                SELECT * FROM knowledge_cards 
            """)
            cards = cursor.fetchall()
            
            synced = 0
            skipped = 0
            
            for card in cards:
                result = self.sync_card_to_gtd(card['id'])
                if result and result.get('status') == 'synced':
                    synced += 1
                else:
                    skipped += 1
            
            return {'synced': synced, 'skipped': skipped, 'total': len(cards)}

    def search_cards(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """根据关键词搜索知识卡片"""
        if not query or not query.strip():
            return []
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            search_term = f"%{query}%"
            cursor.execute("""
                SELECT id, title, content, card_type, category, created_at
                FROM knowledge_cards
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY updated_at DESC
                LIMIT ?
            """, (search_term, search_term, limit))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    # ========== 专题研究管理 ==========
    def get_all_research_projects(self) -> List[Dict[str, Any]]:
        """获取所有专题研究"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM research_projects
                WHERE status = 'active'
                ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_research_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        """获取单个专题研究详情"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_research_project(self, name: str, description: Optional[str] = None, 
                             color: str = 'blue', icon: str = '📚') -> Dict[str, Any]:
        """添加专题研究"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO research_projects (name, description, color, icon, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, description, color, icon, now, now))
            project_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM research_projects WHERE id = ?", (project_id,))
            return dict(cursor.fetchone())

    def update_research_project(self, project_id: int, **kwargs) -> bool:
        """更新专题研究"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            values = []
            for key, value in kwargs.items():
                updates.append(f"{key} = ?")
                values.append(value)
            values.append(datetime.now().isoformat())
            values.append(project_id)
            cursor.execute(f"UPDATE research_projects SET {', '.join(updates)}, updated_at = ? WHERE id = ?",
                          values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_research_project(self, project_id: int) -> bool:
        """删除专题研究（软删除）"""
        return self.update_research_project(project_id, status='deleted')

    def get_project_tasks(self, project_id: int) -> List[Dict[str, Any]]:
        """获取专题下的所有任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM gtd_tasks
                WHERE source_type = 'project' AND source_id = ?
                ORDER BY created_at DESC
            """, (project_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_task_to_project(self, project_id: int, title: str, description: Optional[str] = None,
                           priority: str = 'medium', category: str = 'inbox') -> Dict[str, Any]:
        """添加任务到专题"""
        return self.add_gtd_task(
            title=title,
            description=description,
            priority=priority,
            category=category,
            source_type='project',
            source_id=project_id
        )

    def move_task_to_project(self, task_id: int, project_id: Optional[int]) -> bool:
        """移动任务到专题（或从专题移出）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if project_id:
                cursor.execute("""
                    UPDATE gtd_tasks 
                    SET source_type = 'project', source_id = ?
                    WHERE id = ?
                """, (project_id, task_id))
            else:
                cursor.execute("""
                    UPDATE gtd_tasks 
                    SET source_type = NULL, source_id = NULL
                    WHERE id = ?
                """, (task_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 团队协作项目管理 ==========
    def get_all_team_projects(self) -> List[Dict[str, Any]]:
        """获取所有团队项目"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM team_projects
                ORDER BY updated_at DESC
            """)
            rows = cursor.fetchall()
            projects = []
            for row in rows:
                project = dict(row)
                # 解析 JSON 字段
                if project.get('assigned_members'):
                    try:
                        project['assigned_members'] = json.loads(project['assigned_members'])
                    except:
                        project['assigned_members'] = []
                if project.get('tasks_json'):
                    try:
                        project['tasks'] = json.loads(project['tasks_json'])
                    except:
                        project['tasks'] = []
                else:
                    project['tasks'] = []
                projects.append(project)
            return projects

    def get_team_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        """获取单个项目详情"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM team_projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            if not row:
                return None
            project = dict(row)
            if project.get('assigned_members'):
                try:
                    project['assigned_members'] = json.loads(project['assigned_members'])
                except:
                    project['assigned_members'] = []
            if project.get('tasks_json'):
                try:
                    project['tasks'] = json.loads(project['tasks_json'])
                except:
                    project['tasks'] = []
            else:
                project['tasks'] = []
            return project

    def add_team_project(self, name: str, description: str = '', status: str = 'pending',
                        priority: str = 'medium', start_date: Optional[str] = None, end_date: Optional[str] = None,
                        progress: int = 0, assigned_members: Optional[List[int]] = None,
                        tasks: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """添加团队项目"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            if assigned_members is None:
                assigned_members = []
            if tasks is None:
                tasks = []
            cursor.execute("""
                INSERT INTO team_projects (name, description, status, priority, start_date, 
                end_date, progress, assigned_members, tasks_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, description, status, priority, start_date, end_date, progress,
                  json.dumps(assigned_members), json.dumps(tasks), now, now))
            project_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM team_projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            project = dict(row)
            project['assigned_members'] = assigned_members
            project['tasks'] = tasks
            return project

    def update_team_project(self, project_id: int, **kwargs) -> bool:
        """更新团队项目"""
        # 驼峰转蛇形命名字段映射
        field_mapping = {
            'startDate': 'start_date',
            'endDate': 'end_date',
            'assignedMembers': 'assigned_members',
        }
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            values = []
            for key, value in kwargs.items():
                # 转换字段名
                db_key = field_mapping.get(key, key)
                if db_key == 'assigned_members':
                    updates.append('assigned_members = ?')
                    values.append(json.dumps(value) if value else '[]')
                elif db_key == 'tasks':
                    updates.append('tasks_json = ?')
                    values.append(json.dumps(value) if value else '[]')
                else:
                    updates.append(f'{db_key} = ?')
                    values.append(value)
            values.append(datetime.now().isoformat())
            values.append(project_id)
            cursor.execute(f"UPDATE team_projects SET {', '.join(updates)}, updated_at = ? WHERE id = ?",
                          values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_team_project(self, project_id: int) -> bool:
        """删除团队项目"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM team_projects WHERE id = ?", (project_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 会议记录管理 ==========
    def save_meeting(self, meeting_id: str, topic: str, context: str, card_ids: List[str],
                     rounds: int, participants: List[str], summary: str, decision: str,
                     action_items: List[str], all_speeches: List[Dict], all_rounds: List[Dict],
                     start_time: str, end_time: str, duration_seconds: float) -> Dict[str, Any]:
        """保存会议记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO meetings (meeting_id, topic, context, card_ids, rounds, participants,
                                      summary, decision, action_items, all_speeches, all_rounds,
                                      start_time, end_time, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (meeting_id, topic, context, json.dumps(card_ids), rounds, json.dumps(participants),
                  summary, decision, json.dumps(action_items), json.dumps(all_speeches, ensure_ascii=False),
                  json.dumps(all_rounds, ensure_ascii=False), start_time, end_time, duration_seconds))
            meeting_db_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM meetings WHERE id = ?", (meeting_db_id,))
            row = dict(cursor.fetchone())
            row['card_ids'] = json.loads(row['card_ids'])
            row['participants'] = json.loads(row['participants'])
            row['action_items'] = json.loads(row['action_items'])
            row['all_speeches'] = json.loads(row['all_speeches'])
            row['all_rounds'] = json.loads(row['all_rounds'])
            return row

    def get_all_meetings(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取所有会议记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, meeting_id, topic, context, rounds, participants,
                       summary, decision, action_items, start_time, end_time, duration_seconds, created_at
                FROM meetings
                ORDER BY start_time DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            meetings = []
            for row in rows:
                m = dict(row)
                m['participants'] = json.loads(m['participants']) if isinstance(m['participants'], str) else m['participants']
                m['action_items'] = json.loads(m['action_items']) if isinstance(m['action_items'], str) else m['action_items']
                meetings.append(m)
            return meetings

    def get_meeting(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """获取单个会议详情"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM meetings WHERE meeting_id = ?", (meeting_id,))
            row = cursor.fetchone()
            if row:
                m = dict(row)
                m['card_ids'] = json.loads(m['card_ids']) if m['card_ids'] else []
                m['participants'] = json.loads(m['participants'])
                m['action_items'] = json.loads(m['action_items'])
                m['all_speeches'] = json.loads(m['all_speeches'])
                m['all_rounds'] = json.loads(m['all_rounds'])
                return m
            return None

    def delete_meeting(self, meeting_id: str) -> bool:
        """删除会议记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM meetings WHERE meeting_id = ?", (meeting_id,))
            conn.commit()
            return cursor.rowcount > 0
