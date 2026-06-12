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

            # 6. 知识卡片表 - VCP TagMemo 风格 (增强版)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    card_type TEXT DEFAULT 'blue',
                    category TEXT,
                    topic_id INTEGER,
                    related_topics TEXT,
                    
                    -- TagMemo 风格标签系统
                    tags TEXT DEFAULT '[]',  -- JSON数组: 普通标签
                    core_tags TEXT DEFAULT '[]',  -- JSON数组: 核心标签(虚拟召回/权重豁免)
                    tag_weights TEXT DEFAULT '{}',  -- JSON对象: {tag: weight}
                    
                    -- 语义记忆相关
                    memory_type TEXT DEFAULT 'light',  -- light/deep/mesh
                    coherence_score REAL DEFAULT 0.0,  -- 相干性分析分数
                    last_accessed TEXT,
                    access_count INTEGER DEFAULT 0,
                    
                    -- 关联知识
                    related_cards TEXT DEFAULT '[]',  -- JSON数组
                    
                    -- 向量嵌入 (简化版)
                    embedding TEXT,
                    
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
                    completed_at TEXT,
                    project_id INTEGER,
                    assigned_to INTEGER,
                    assigned_to_name TEXT
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
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN assigned_to INTEGER")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN assigned_to_name TEXT")
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
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN project_id INTEGER")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN source_context TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN source_card_id INTEGER")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE gtd_tasks ADD COLUMN kanban_status TEXT DEFAULT 'backlog'")
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

            # 11. 协作文档表（维度2：智能关联 + 维度5：架构扩展性）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS collaborative_documents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    space_id TEXT,  -- 关联的知识空间ID
                    owner_id TEXT NOT NULL,
                    last_edited_by TEXT NOT NULL,
                    last_edited_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1,
                    is_locked BOOLEAN DEFAULT 0,
                    lock_by TEXT,  -- 锁定用户ID
                    lock_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT  -- JSON: 访问控制、标签等
                )
            """)

            # 12. 文档版本历史表（支持回滚）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    edited_by TEXT NOT NULL,
                    edited_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    change_summary TEXT,  -- 变更说明
                    parent_version INTEGER,  -- 父版本ID（用于回滚）
                    operation_type TEXT DEFAULT 'edit',  -- edit/rollback/merge
                    FOREIGN KEY (doc_id) REFERENCES collaborative_documents(id)
                )
            """)

            # 13. 文档操作日志表（OT/CRDT 操作记录）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_operations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    operation_type TEXT NOT NULL,  -- insert/delete/replace/lock/unlock
                    position INTEGER,  -- 操作位置（字符索引）
                    content TEXT,  -- 插入/删除的内容
                    length INTEGER,  -- 操作长度
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    vector_clock TEXT,  -- OT 向量时钟
                    FOREIGN KEY (doc_id) REFERENCES collaborative_documents(id)
                )
            """)

            # 14. 文档访问权限表（基于知识空间的权限控制）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    permission TEXT CHECK(permission IN ('read', 'edit', 'admin')),
                    granted_by TEXT,
                    granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    expires_at TEXT,  -- 过期时间（NULL=永久）
                    FOREIGN KEY (doc_id) REFERENCES collaborative_documents(id)
                )
            """)

            # 15. 文档评论表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    user_avatar TEXT,
                    content TEXT NOT NULL,
                    position INTEGER,  -- 评论位置（字符索引）
                    parent_id INTEGER,  -- 回复的评论ID
                    is_resolved BOOLEAN DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (doc_id) REFERENCES collaborative_documents(id)
                )
            """)

            # 16. 远程光标位置表（临时存储，用于断线重连后恢复）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cursor_positions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    user_avatar TEXT,
                    selection_start INTEGER,
                    selection_end INTEGER,
                    color TEXT,
                    last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (doc_id) REFERENCES collaborative_documents(id)
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
            
            # VCP TagMemo 风格字段迁移
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN tags TEXT DEFAULT '[]'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN core_tags TEXT DEFAULT '[]'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN tag_weights TEXT DEFAULT '{}'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN memory_type TEXT DEFAULT 'light'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN coherence_score REAL DEFAULT 0.0")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN last_accessed TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN access_count INTEGER DEFAULT 0")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN related_cards TEXT DEFAULT '[]'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN explore_status TEXT DEFAULT 'pending'")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN explore_notes TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN embedding TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN address TEXT")
            except:
                pass
            try:
                cursor.execute("ALTER TABLE knowledge_cards ADD COLUMN images TEXT DEFAULT '[]'")
            except:
                pass
            
            # 数据修复：将 topic_id 有值但 project_id 为空的卡片统一
            try:
                cursor.execute("UPDATE knowledge_cards SET project_id = topic_id WHERE project_id IS NULL AND topic_id IS NOT NULL")
            except:
                pass
            try:
                cursor.execute("UPDATE knowledge_cards SET topic_id = project_id WHERE topic_id IS NULL AND project_id IS NOT NULL")
            except:
                pass

            # 注意：knowledge_cards 表已在上方 (#6) 定义，此处不再重复创建
            # 旧版 (#8) 定义缺少 tags/core_tags/tag_weights/memory_type 等字段，已通过 ALTER TABLE 迁移

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
                    project_id INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 迁移：为会议表添加 project_id 字段
            try:
                cursor.execute("ALTER TABLE meetings ADD COLUMN project_id INTEGER")
            except:
                pass

            # 12. 思维导图表 - 支持节点与卡片关联
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mindmaps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    root_node TEXT NOT NULL,  -- JSON: 根节点及整个树结构
                    created_by TEXT,
                    card_ids TEXT DEFAULT '[]',  -- 关联的卡片ID列表
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 12.1 思维导图节点关联表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mindmap_node_cards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mindmap_id INTEGER NOT NULL,
                    node_id TEXT NOT NULL,
                    card_id INTEGER NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
                    FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE,
                    UNIQUE(mindmap_id, node_id, card_id)
                )
            """)

            # 13. 任务-笔记双向链接关联表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS card_task_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    card_id INTEGER NOT NULL,
                    task_id INTEGER NOT NULL,
                    relation_type TEXT NOT NULL,  -- extracted_from: 任务从笔记提取; referenced: 笔记引用任务
                    extract_paragraph TEXT,  -- 提取的原文段落
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE,
                    FOREIGN KEY (task_id) REFERENCES gtd_tasks(id) ON DELETE CASCADE,
                    UNIQUE(card_id, task_id)
                )
            """)

            # 14. 源文件表 - 存储用户导入的原始文件
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS source_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_file_id TEXT NOT NULL UNIQUE,  -- 唯一标识符
                    original_name TEXT NOT NULL,  -- 原始文件名
                    stored_path TEXT NOT NULL,   -- 存储路径
                    file_type TEXT NOT NULL,     -- 文件类型 (pdf/docx/txt等)
                    file_size INTEGER,           -- 文件大小(字节)
                    content_hash TEXT,            -- 内容哈希，用于去重
                    markdown_content TEXT,        -- 提取的完整文本内容（Markdown格式，用于溯源高亮）
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 14.1 卡片-源文件关联表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS card_source_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_file_id TEXT NOT NULL,
                    card_id INTEGER NOT NULL,
                    location_in_source TEXT,  -- 来源位置 (如: "第3段" 或 "page:2,line:10")
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE,
                    UNIQUE(source_file_id, card_id)
                )
            """)

            # 15. 日历事件表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    start_time TEXT NOT NULL,  -- ISO 8601 格式
                    end_time TEXT NOT NULL,
                    is_all_day BOOLEAN DEFAULT 0,
                    location TEXT,
                    category TEXT DEFAULT 'default',
                    color TEXT,
                    source_card_id INTEGER,  -- 来源笔记卡片
                    source_paragraph TEXT,  -- 来源笔记段落
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    is_completed BOOLEAN DEFAULT 0,
                    FOREIGN KEY (source_card_id) REFERENCES knowledge_cards(id) ON DELETE SET NULL
                )
            """)

            # 15. 卡片反向链接表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS card_backlinks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_card_id INTEGER NOT NULL,
                    target_card_id INTEGER NOT NULL,
                    link_text TEXT,
                    link_type TEXT DEFAULT 'manual',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source_card_id, target_card_id),
                    FOREIGN KEY (source_card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_card_id) REFERENCES knowledge_cards(id) ON DELETE CASCADE
                )
            """)
            
            # 迁移：为 card_backlinks 添加 link_type 字段
            try:
                cursor.execute("ALTER TABLE card_backlinks ADD COLUMN link_type TEXT DEFAULT 'manual'")
            except:
                pass

            # 迁移：为 source_files 添加 markdown_content 字段（用于溯源查看）
            try:
                cursor.execute("ALTER TABLE source_files ADD COLUMN markdown_content TEXT")
            except:
                pass

            conn.commit()

        # 初始化新服务的表结构
        self._init_service_tables()

        # 插入默认数据（只插入一次）
        self.insert_default_data()

    def _init_service_tables(self):
        """初始化新服务所需的表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 知识图谱实体表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    description TEXT,
                    properties TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1
                )
            """)

            # 知识图谱关系表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    relation_id TEXT UNIQUE NOT NULL,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    properties TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 接入文档表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ingested_documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT UNIQUE NOT NULL,
                    source TEXT NOT NULL,
                    content TEXT,
                    format TEXT,
                    metadata TEXT,
                    content_hash TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 推荐历史表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS recommendation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    recommendation_type TEXT,
                    content_id TEXT,
                    action TEXT,
                    feedback TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 用户上下文表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_contexts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    context_key TEXT NOT NULL,
                    context_value TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 审计日志表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    action TEXT NOT NULL,
                    result TEXT DEFAULT 'success',
                    details TEXT
                )
            """)

            # 可视化知识图谱状态表（节点位置、连线、自定义布局）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_graph_state (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    nodes TEXT NOT NULL DEFAULT '[]',
                    links TEXT NOT NULL DEFAULT '[]',
                    categories TEXT NOT NULL DEFAULT '[]',
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

            # 知识图谱工作流状态表（跟踪每个Agent的输出）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_workflow_state (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    workflow_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    output TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(workflow_id, agent_name, stage)
                )
            """)

            conn.commit()
            logger.info("[GraphState] 知识图谱状态表初始化完成")

            # 文件索引表 - 文件浏览器 + 卡片索引联动层
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS file_index (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT NOT NULL UNIQUE,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER DEFAULT 0,
                    indexed_at TEXT,
                    card_ids TEXT DEFAULT '[]',
                    card_count INTEGER DEFAULT 0,
                    last_modified TEXT,
                    is_deleted INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()
            logger.info("[FileIndex] 文件索引表初始化完成")
            # 16. 发票表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER,
                invoice_number TEXT,
                invoice_code TEXT,
                invoice_date TEXT,
                seller_name TEXT,
                seller_tax_id TEXT,
                buyer_name TEXT,
                buyer_tax_id TEXT,
                total_amount REAL,
                amount REAL,
                tax_amount REAL,
                is_excluded INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                error_message TEXT,
                engine_used TEXT,
                raw_text TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 17. 发票明细表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS invoice_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                name TEXT,
                specification TEXT,
                unit TEXT,
                quantity REAL,
                unit_price REAL,
                amount REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            )
        """)

        # 全文搜索虚拟表 (FTS5)
        try:
            cursor.executescript("""
                CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_cards_fts USING fts5(
                    title, content, card_type UNINDEXED,
                    content=knowledge_cards,
                    content_rowid=id,
                    tokenize='unicode61 tokenchars '''
                );

                CREATE TRIGGER IF NOT EXISTS knowledge_cards_ai AFTER INSERT ON knowledge_cards BEGIN
                    INSERT INTO knowledge_cards_fts(rowid, title, content, card_type)
                    VALUES (new.id, new.title, new.content, new.card_type);
                END;

                CREATE TRIGGER IF NOT EXISTS knowledge_cards_ad AFTER DELETE ON knowledge_cards BEGIN
                    INSERT INTO knowledge_cards_fts(knowledge_cards_fts, rowid)
                    VALUES ('delete', old.id);
                END;

                CREATE TRIGGER IF NOT EXISTS knowledge_cards_au AFTER UPDATE ON knowledge_cards BEGIN
                    INSERT INTO knowledge_cards_fts(knowledge_cards_fts, rowid)
                    VALUES ('delete', old.id);
                    INSERT INTO knowledge_cards_fts(rowid, title, content, card_type)
                    VALUES (new.id, new.title, new.content, new.card_type);
                END;
            """)
            logger.info("[FTS5] 全文搜索索引已创建")
        except Exception as e:
            logger.warning(f"[FTS5] 创建失败（可能已存在）: {e}")

        conn.commit()

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
                        email: Optional[str] = None, contribution: int = 0,
                        permissions: Optional[List[str]] = None) -> Dict[str, Any]:
        """添加团队成员"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            perms = json.dumps(permissions or ['read', 'write'])
            cursor.execute("""
                INSERT INTO team_members (name, role, avatar, online, join_date,
                                          last_active, permissions, contribution, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, role, avatar, True, now, now,
                  perms, contribution, email))
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
                if key == 'permissions' and isinstance(value, list):
                    updates.append("permissions = ?")
                    values.append(json.dumps(value))
                else:
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
    def get_gtd_tasks(self, category: Optional[str] = None, source_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取GTD任务，可按分类或来源类型过滤"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM gtd_tasks WHERE 1=1"
            params = []
            if category:
                query += " AND category = ?"
                params.append(category)
            if source_type:
                query += " AND source_type = ?"
                params.append(source_type)
            query += " ORDER BY created_at DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_gtd_tasks_by_source(self, source_type: str, source_id: int) -> List[Dict[str, Any]]:
        """根据来源类型和ID获取任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM gtd_tasks WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC"
            cursor.execute(query, (source_type, source_id))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def add_gtd_task(self, title: str, description: Optional[str], priority: str, category: str, due_date: Optional[str] = None, source_type: Optional[str] = None, source_id: Optional[int] = None, source_context: Optional[str] = None, source_card_id: Optional[int] = None) -> Dict[str, Any]:
        """添加GTD任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO gtd_tasks (title, description, priority, category, due_date, source_type, source_id, source_context, source_card_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (title, description, priority, category, due_date, source_type, source_id, source_context, source_card_id))
            task_id = cursor.lastrowid
            conn.commit()
            cursor.execute("SELECT * FROM gtd_tasks WHERE id = ?", (task_id,))
            return dict(cursor.fetchone())
    
    def check_task_exists(self, title: str, source_type: Optional[str] = None) -> bool:
        """检查任务是否已存在（优化版）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT COUNT(*) FROM gtd_tasks WHERE title = ?"
            params = [title]
            if source_type:
                query += " AND source_type = ?"
                params.append(source_type)
            cursor.execute(query, params)
            return cursor.fetchone()[0] > 0

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

    def get_research_project_stats(self, project_id: int) -> Dict[str, Any]:
        """获取专题统计信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            stats = {}
            # 卡片统计
            cursor.execute("""
                SELECT card_type, COUNT(*) as cnt FROM knowledge_cards
                WHERE project_id = ? GROUP BY card_type
            """, (project_id,))
            card_stats = {row['card_type']: row['cnt'] for row in cursor.fetchall()}
            stats['cards'] = card_stats
            stats['total_cards'] = sum(card_stats.values())

            # 任务统计
            cursor.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
                FROM gtd_tasks WHERE source_type = 'project' AND source_id = ?
            """, (project_id,))
            row = cursor.fetchone()
            task_total = row['total'] if row else 0
            task_completed = row['completed'] if row else 0
            stats['tasks'] = {'total': task_total, 'completed': task_completed,
                              'pending': task_total - task_completed}
            stats['task_progress'] = round(task_completed / task_total * 100) if task_total > 0 else 0

            # 日历事件统计
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM calendar_events
                WHERE source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
            """, (project_id,))
            cal_row = cursor.fetchone()
            stats['calendar_events'] = cal_row['cnt'] if cal_row else 0

            # 反向链接统计
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM card_backlinks
                WHERE target_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
                   OR source_card_id IN (SELECT id FROM knowledge_cards WHERE project_id = ?)
            """, (project_id, project_id))
            row = cursor.fetchone()
            stats['backlinks'] = row['cnt'] if row else 0

            return stats

    def add_audit_log(self, event_type: str, actor: str, resource: str,
                      action: str, result: str = 'success', details: str = None):
        """添加审计日志"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_logs (event_type, actor, resource, action, result, details)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (event_type, actor, resource, action, result, details))
            conn.commit()

    def check_member_permission(self, member_id: int, required_permission: str) -> bool:
        """检查成员是否拥有指定权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT permissions FROM team_members WHERE id = ?", (member_id,))
            row = cursor.fetchone()
            if not row:
                return False
            perms = row['permissions']
            if isinstance(perms, str):
                try:
                    perms = json.loads(perms)
                except:
                    perms = []
            return 'admin' in perms or required_permission in perms

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

    # ========== 思维导图管理 ==========
    def save_mindmap(self, name: str, root_node: Dict, description: str = None, 
                   created_by: str = None, card_ids: List[int] = None) -> Dict[str, Any]:
        """保存思维导图"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mindmaps (name, description, root_node, created_by, card_ids)
                VALUES (?, ?, ?, ?, ?)
            """, (name, description, json.dumps(root_node, ensure_ascii=False), 
                  created_by, json.dumps(card_ids or [])))
            mindmap_id = cursor.lastrowid
            conn.commit()
            return self.get_mindmap(mindmap_id)

    def get_mindmap(self, mindmap_id: int) -> Optional[Dict[str, Any]]:
        """获取思维导图"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mindmaps WHERE id = ?", (mindmap_id,))
            row = cursor.fetchone()
            if row:
                m = dict(row)
                m['root_node'] = json.loads(m['root_node'])
                m['card_ids'] = json.loads(m['card_ids']) if m['card_ids'] else []
                m['cards'] = self._get_cards_for_mindmap(mindmap_id, m['root_node'])
                return m
            return None

    def get_all_mindmaps(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取所有思维导图"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mindmaps ORDER BY updated_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def update_mindmap(self, mindmap_id: int, name: str = None, root_node: Dict = None,
                    description: str = None) -> Optional[Dict[str, Any]]:
        """更新思维导图"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            if name:
                updates.append("name = ?")
                params.append(name)
            if root_node:
                updates.append("root_node = ?")
                params.append(json.dumps(root_node, ensure_ascii=False))
            if description:
                updates.append("description = ?")
                params.append(description)
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(mindmap_id)
            
            cursor.execute(f"UPDATE mindmaps SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
            return self.get_mindmap(mindmap_id)

    def delete_mindmap(self, mindmap_id: int) -> bool:
        """删除思维导图"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM mindmaps WHERE id = ?", (mindmap_id,))
            conn.commit()
            return cursor.rowcount > 0

    def _get_cards_for_mindmap(self, mindmap_id: int, node: Dict) -> List[Dict]:
        """递归获取节点关联的卡片"""
        cards = []
        node_id = node.get('id')
        if node_id:
            cursor = self.get_connection().cursor()
            cursor.execute("""
                SELECT k.* FROM knowledge_cards k
                JOIN mindmap_node_cards m ON k.id = m.card_id
                WHERE m.mindmap_id = ? AND m.node_id = ?
            """, (mindmap_id, node_id))
            for row in cursor.fetchall():
                cards.append(dict(row))
        
        for child in node.get('children', []):
            cards.extend(self._get_cards_for_mindmap(mindmap_id, child))
        return cards

    def link_card_to_node(self, mindmap_id: int, node_id: str, card_id: int) -> bool:
        """关联卡片到思维导图节点"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO mindmap_node_cards (mindmap_id, node_id, card_id)
                    VALUES (?, ?, ?)
                """, (mindmap_id, node_id, card_id))
                conn.commit()
                return cursor.rowcount > 0
            except:
                return False

    def unlink_card_from_node(self, mindmap_id: int, node_id: str, card_id: int) -> bool:
        """取消关联卡片与思维导图节点"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM mindmap_node_cards 
                WHERE mindmap_id = ? AND node_id = ? AND card_id = ?
            """, (mindmap_id, node_id, card_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_node_cards(self, mindmap_id: int, node_id: str) -> List[Dict]:
        """获取节点关联的卡片"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT k.* FROM knowledge_cards k
                JOIN mindmap_node_cards m ON k.id = m.card_id
                WHERE m.mindmap_id = ? AND m.node_id = ?
            """, (mindmap_id, node_id))
            return [dict(row) for row in cursor.fetchall()]

    def get_card_mindmaps(self, card_id: int) -> List[Dict]:
        """获取卡片关联的思维导图和节点"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.id, m.name, mnc.node_id, mnc.created_at
                FROM mindmaps m
                JOIN mindmap_node_cards mnc ON m.id = mnc.mindmap_id
                WHERE mnc.card_id = ?
                ORDER BY mnc.created_at DESC
            """, (card_id,))
            rows = cursor.fetchall()
            result = {}
            for row in rows:
                mid = row['id']
                if mid not in result:
                    result[mid] = {'id': mid, 'name': row['name'], 'nodes': []}
                result[mid]['nodes'].append({'node_id': row['node_id'], 'created_at': row['created_at']})
            return list(result.values())

    # ========== 任务-笔记双向链接 ==========
    def create_task_from_card(self, card_id: int, title: str, description: str = None, 
                               priority: str = 'high', category: str = 'inbox', 
                               due_date: str = None, extract_paragraph: str = None) -> Dict[str, Any]:
        """从知识卡片创建GTD任务，建立双向链接"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 创建GTD任务
            cursor.execute("""
                INSERT INTO gtd_tasks (title, description, priority, category, due_date, source_type, source_id)
                VALUES (?, ?, ?, ?, ?, 'card', ?)
            """, (title, description, priority, category, due_date, card_id))
            task_id = cursor.lastrowid
            
            # 创建双向链接关系
            if extract_paragraph is not None:
                cursor.execute("""
                    INSERT OR IGNORE INTO card_task_relations (card_id, task_id, relation_type, extract_paragraph)
                    VALUES (?, ?, 'extracted_from', ?)
                """, (card_id, task_id, extract_paragraph))
            else:
                cursor.execute("""
                    INSERT OR IGNORE INTO card_task_relations (card_id, task_id, relation_type)
                    VALUES (?, ?, 'extracted_from')
                """, (card_id, task_id))
            
            conn.commit()
            
            # 获取创建的任务
            cursor.execute("SELECT * FROM gtd_tasks WHERE id = ?", (task_id,))
            return dict(cursor.fetchone())

    def get_tasks_for_card(self, card_id: int) -> List[Dict[str, Any]]:
        """获取知识卡片关联的所有任务"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT t.*, r.relation_type, r.extract_paragraph
                FROM gtd_tasks t
                JOIN card_task_relations r ON t.id = r.task_id
                WHERE r.card_id = ?
                ORDER BY t.created_at DESC
            """, (card_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_cards_for_task(self, task_id: int) -> List[Dict[str, Any]]:
        """获取任务关联的所有知识卡片"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT k.*, r.relation_type, r.extract_paragraph
                FROM knowledge_cards k
                JOIN card_task_relations r ON k.id = r.card_id
                WHERE r.task_id = ?
                ORDER BY k.created_at DESC
            """, (task_id,))
            return [dict(row) for row in cursor.fetchall()]

    def remove_card_task_relation(self, card_id: int, task_id: int) -> bool:
        """移除卡片和任务的关联"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM card_task_relations WHERE card_id = ? AND task_id = ?
            """, (card_id, task_id))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 日历事件 ==========
    def add_calendar_event(self, title: str, description: str = None,
                         start_time: str = None, end_time: str = None,
                         is_all_day: bool = False, location: str = None,
                         category: str = 'default', color: str = None,
                         source_card_id: int = None, source_paragraph: str = None) -> Dict[str, Any]:
        """添加日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO calendar_events (
                    title, description, start_time, end_time, is_all_day,
                    location, category, color, source_card_id, source_paragraph
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (title, description, start_time, end_time,
                  1 if is_all_day else 0, location, category, color,
                  source_card_id, source_paragraph))
            event_id = cursor.lastrowid
            conn.commit()
            
            cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
            return dict(cursor.fetchone())

    def get_calendar_events(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """获取日期范围内的日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM calendar_events
                WHERE (start_time BETWEEN ? AND ? OR end_time BETWEEN ? AND ?)
                   OR (start_time <= ? AND end_time >= ?)
                ORDER BY start_time ASC
            """, (start_date, end_date, start_date, end_date, start_date, end_date))
            return [dict(row) for row in cursor.fetchall()]

    def get_all_calendar_events(self) -> List[Dict[str, Any]]:
        """获取所有日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM calendar_events
                ORDER BY start_time ASC
            """)
            return [dict(row) for row in cursor.fetchall()]

    def get_calendar_event(self, event_id: int) -> Optional[Dict[str, Any]]:
        """获取单个日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_calendar_event(self, event_id: int, **kwargs) -> bool:
        """更新日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            values = []
            for key, value in kwargs.items():
                if key == 'is_all_day':
                    updates.append(f"{key} = ?")
                    values.append(1 if value else 0)
                else:
                    updates.append(f"{key} = ?")
                    values.append(value)
            updates.append("updated_at = datetime('now')")
            values.append(event_id)
            
            cursor.execute(f"UPDATE calendar_events SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
            return cursor.rowcount > 0

    def delete_calendar_event(self, event_id: int) -> bool:
        """删除日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_events_by_source_card(self, card_id: int) -> List[Dict[str, Any]]:
        """获取知识卡片关联的所有日历事件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM calendar_events
                WHERE source_card_id = ?
                ORDER BY start_time ASC
            """, (card_id,))
            return [dict(row) for row in cursor.fetchall()]

    # ========== 卡片双向链接 ==========
    def add_backlink(self, source_card_id: int, target_card_id: int, link_text: str = None, link_type: str = 'manual') -> bool:
        """添加双向链接：从 source_card 链接到 target_card"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # 如果已存在同方向的链接，更新 link_type 和 link_text
                cursor.execute("""
                    SELECT id, link_type FROM card_backlinks 
                    WHERE source_card_id = ? AND target_card_id = ?
                """, (source_card_id, target_card_id))
                existing = cursor.fetchone()
                if existing:
                    # 更新现有链接的link_type（优先保留更具体的类型）
                    type_priority = {'supports': 5, 'contradicts': 4, 'examples': 3, 'background': 2, 'same_project': 1, 'manual': 0}
                    old_priority = type_priority.get(existing['link_type'] or 'manual', 0)
                    new_priority = type_priority.get(link_type or 'manual', 0)
                    if new_priority > old_priority:
                        cursor.execute("""
                            UPDATE card_backlinks SET link_type = ?, link_text = ? 
                            WHERE source_card_id = ? AND target_card_id = ?
                        """, (link_type, link_text, source_card_id, target_card_id))
                        conn.commit()
                    return True
                else:
                    cursor.execute("""
                        INSERT INTO card_backlinks (source_card_id, target_card_id, link_text, link_type)
                        VALUES (?, ?, ?, ?)
                    """, (source_card_id, target_card_id, link_text, link_type))
                    conn.commit()
                    return cursor.rowcount > 0
            except:
                return False

    def remove_backlink(self, source_card_id: int, target_card_id: int) -> bool:
        """移除双向链接"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM card_backlinks 
                WHERE source_card_id = ? AND target_card_id = ?
            """, (source_card_id, target_card_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_backlinks(self, card_id: int) -> List[Dict[str, Any]]:
        """获取指向本卡片的所有反向链接（哪些卡片链接到了我）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT k.id, k.title, k.card_type, k.created_at, r.link_text, r.link_type
                FROM knowledge_cards k
                JOIN card_backlinks r ON k.id = r.source_card_id
                WHERE r.target_card_id = ?
                ORDER BY k.created_at DESC
            """, (card_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_forwardlinks(self, card_id: int) -> List[Dict[str, Any]]:
        """获取从本卡片发出的所有正向链接（我链接到了哪些卡片）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT k.id, k.title, k.card_type, k.created_at, r.link_text, r.link_type
                FROM knowledge_cards k
                JOIN card_backlinks r ON k.id = r.target_card_id
                WHERE r.source_card_id = ?
                ORDER BY k.created_at DESC
            """, (card_id,))
            return [dict(row) for row in cursor.fetchall()]

    def get_backlink_graph(self, card_id: int, max_depth: int = 2) -> Dict[str, Any]:
        """获取卡片的双向链接图谱（用于可视化）"""
        # 获取当前卡片信息
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM knowledge_cards WHERE id = ?", (card_id,))
            current = cursor.fetchone()
            if not current:
                return {"nodes": [], "links": []}
            
            nodes = [{
                "id": current["id"],
                "title": current["title"],
                "type": current.get("card_type", current.get("type", "blue")),
                "is_current": True
            }]
            
            links = []
            
            # 获取反向链接
            backlinks = self.get_backlinks(card_id)
            for bl in backlinks:
                nodes.append({
                    "id": bl["id"],
                    "title": bl["title"],
                    "type": bl["card_type"],
                    "is_current": False
                })
                links.append({
                    "source": bl["id"],
                    "target": card_id,
                    "type": "backlink"
                })
            
            # 获取正向链接
            forwardlinks = self.get_forwardlinks(card_id)
            for fl in forwardlinks:
                nodes.append({
                    "id": fl["id"],
                    "title": fl["title"],
                    "type": fl["card_type"],
                    "is_current": False
                })
                links.append({
                    "source": card_id,
                    "target": fl["id"],
                    "type": "forwardlink"
                })
            
            return {
                "nodes": nodes,
                "links": links
            }

    def save_graph_state(self, name: str, nodes: List[Dict], links: List[Dict], categories: List[Dict] = None) -> bool:
        """保存可视化知识图谱状态（节点/连线/分类）"""
        import json
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                nodes_json = json.dumps(nodes, ensure_ascii=False)
                links_json = json.dumps(links, ensure_ascii=False)
                cats_json = json.dumps(categories or [], ensure_ascii=False)
                cursor.execute("""
                    INSERT OR REPLACE INTO knowledge_graph_state (id, name, nodes, links, categories, updated_at)
                    VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (name, nodes_json, links_json, cats_json))
                conn.commit()
                logger.info(f"[GraphState] 已保存图谱状态: {name}, {len(nodes)} 节点")
                return True
        except Exception as e:
            logger.error(f"[GraphState] 保存失败: {e}")
            return False

    def load_graph_state(self, name: str = "default") -> Optional[Dict[str, Any]]:
        """加载可视化知识图谱状态"""
        import json
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT name, nodes, links, categories, updated_at FROM knowledge_graph_state WHERE id = 1",
                )
                row = cursor.fetchone()
                if not row:
                    return None
                return {
                    "name": row["name"],
                    "nodes": json.loads(row["nodes"]),
                    "links": json.loads(row["links"]),
                    "categories": json.loads(row["categories"]),
                    "updated_at": row["updated_at"]
                }
        except Exception as e:
            logger.error(f"[GraphState] 加载失败: {e}")
            return None

    # ========== 知识图谱工作流协调 ==========

    def save_workflow_stage(
        self,
        workflow_id: str,
        agent_name: str,
        stage: str,
        output: str,
        status: str = "done"
    ) -> bool:
        """保存工作流中某个Agent的执行结果"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO kg_workflow_state
                        (workflow_id, agent_name, stage, output, status, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (workflow_id, agent_name, stage, output, status))
                conn.commit()
                logger.info(f"[KG-Workflow] {agent_name}.{stage} -> {status}")
                return True
        except Exception as e:
            logger.error(f"[KG-Workflow] 保存失败: {e}")
            return False

    def get_workflow_state(self, workflow_id: str) -> List[Dict[str, Any]]:
        """获取某个工作流的所有阶段状态"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT agent_name, stage, output, status, created_at, updated_at
                    FROM kg_workflow_state
                    WHERE workflow_id = ?
                    ORDER BY created_at ASC
                """, (workflow_id,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"[KG-Workflow] 读取失败: {e}")
            return []

    def get_workflow_status(self, workflow_id: str) -> str:
        """获取工作流整体状态：running / done / failed"""
        rows = self.get_workflow_state(workflow_id)
        if not rows:
            return "not_found"
        statuses = {r["status"] for r in rows}
        if "failed" in statuses:
            return "failed"
        if all(s == "done" for s in statuses):
            return "done"
        return "running"

    def get_workflow_results(self, workflow_id: str, stage: str = None) -> Dict[str, str]:
        """获取工作流各阶段的输出，格式 {agent_name.stage: output}"""
        rows = self.get_workflow_state(workflow_id)
        if stage:
            rows = [r for r in rows if r["stage"] == stage]
        return {f"{r['agent_name']}.{r['stage']}": r["output"] or "" for r in rows}

    def clear_workflow(self, workflow_id: str) -> bool:
        """清除工作流记录"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM kg_workflow_state WHERE workflow_id = ?", (workflow_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"[KG-Workflow] 清除失败: {e}")
            return False

    def save_knowledge_graph(
        self,
        workflow_id: str,
        nodes: List[Dict],
        links: List[Dict],
        categories: List[Dict] = None
    ) -> bool:
        """将工作流最终结果（节点+连线）保存到图谱状态表"""
        return self.save_graph_state(f"kg_{workflow_id}", nodes, links, categories)

    def load_knowledge_graph(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """加载指定工作流生成的图谱"""
        return self.load_graph_state(f"kg_{workflow_id}")

    # ========== 协作文档管理 ==========
    
    def get_collab_documents(self, space_id: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取协作文档列表，可按知识空间或用户过滤"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM collaborative_documents WHERE 1=1"
            params = []
            if space_id:
                query += " AND space_id = ?"
                params.append(space_id)
            if user_id:
                query += " AND (owner_id = ? OR id IN (SELECT doc_id FROM document_permissions WHERE user_id = ?))"
                params.extend([user_id, user_id])
            query += " ORDER BY last_edited_at DESC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_collab_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """获取单个协作文档"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM collaborative_documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def create_collab_document(self, doc_id: str, title: str, content: str, space_id: str, owner_id: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """创建协作文档"""
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO collaborative_documents 
                (id, title, content, space_id, owner_id, last_edited_by, last_edited_at, version, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, title, content, space_id, owner_id, owner_id, now, 1, now, now, json.dumps(metadata or {})))
            conn.commit()
            # 创建初始版本记录
            self.create_document_version(doc_id, 1, content, owner_id, "初始创建", None, "create")
            cursor.execute("SELECT * FROM collaborative_documents WHERE id = ?", (doc_id,))
            return dict(cursor.fetchone())

    def update_collab_document(self, doc_id: str, content: str, edited_by: str, change_summary: str = "") -> Dict[str, Any]:
        """更新协作文档内容（创建新版本）"""
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # 获取当前版本
            cursor.execute("SELECT version FROM collaborative_documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("文档不存在")
            new_version = row["version"] + 1
            
            # 更新文档
            cursor.execute("""
                UPDATE collaborative_documents 
                SET content = ?, last_edited_by = ?, last_edited_at = ?, version = ?, updated_at = ?
                WHERE id = ?
            """, (content, edited_by, now, new_version, now, doc_id))
            
            # 创建版本记录
            self.create_document_version(doc_id, new_version, content, edited_by, change_summary, new_version - 1, "edit")
            
            conn.commit()
            cursor.execute("SELECT * FROM collaborative_documents WHERE id = ?", (doc_id))
            return dict(cursor.fetchone())

    def lock_document(self, doc_id: str, user_id: str, user_name: str) -> bool:
        """锁定文档"""
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE collaborative_documents SET is_locked = 1, lock_by = ?, lock_at = ? WHERE id = ?
            """, (user_id, now, doc_id))
            conn.commit()
            # 记录操作
            self.log_document_operation(doc_id, user_id, user_name, "lock", None, None, None)
            return cursor.rowcount > 0

    def unlock_document(self, doc_id: str, user_id: str, user_name: str) -> bool:
        """解锁文档"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE collaborative_documents SET is_locked = 0, lock_by = NULL, lock_at = NULL WHERE id = ?
            """, (doc_id,))
            conn.commit()
            self.log_document_operation(doc_id, user_id, user_name, "unlock", None, None, None)
            return cursor.rowcount > 0

    def delete_collab_document(self, doc_id: str) -> bool:
        """删除协作文档"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM collaborative_documents WHERE id = ?", (doc_id,))
            cursor.execute("DELETE FROM document_versions WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM document_operations WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM document_permissions WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM document_comments WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM cursor_positions WHERE doc_id = ?", (doc_id,))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 文档版本历史 ==========

    def create_document_version(self, doc_id: str, version: int, content: str, edited_by: str, 
                                 change_summary: str, parent_version: Optional[int], operation_type: str = "edit") -> int:
        """创建文档版本记录"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO document_versions (doc_id, version, content, edited_by, change_summary, parent_version, operation_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, version, content, edited_by, change_summary, parent_version, operation_type))
            conn.commit()
            return cursor.lastrowid

    def get_document_versions(self, doc_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """获取文档版本历史"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM document_versions WHERE doc_id = ? ORDER BY version DESC LIMIT ?
            """, (doc_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def get_document_version(self, doc_id: str, version: int) -> Optional[Dict[str, Any]]:
        """获取特定版本"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM document_versions WHERE doc_id = ? AND version = ?
            """, (doc_id, version))
            row = cursor.fetchone()
            return dict(row) if row else None

    def rollback_document(self, doc_id: str, target_version: int, user_id: str, user_name: str) -> Dict[str, Any]:
        """回滚到指定版本"""
        target = self.get_document_version(doc_id, target_version)
        if not target:
            raise ValueError(f"版本 {target_version} 不存在")
        
        # 获取当前版本
        current = self.get_collab_document(doc_id)
        if not current:
            raise ValueError("文档不存在")
        
        # 更新文档内容
        new_version = current["version"] + 1
        now = datetime.now().isoformat()
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE collaborative_documents 
                SET content = ?, last_edited_by = ?, last_edited_at = ?, version = ?, updated_at = ?
                WHERE id = ?
            """, (target["content"], user_id, now, new_version, now, doc_id))
            
            # 创建回滚版本记录
            self.create_document_version(doc_id, new_version, target["content"], user_id, 
                                         f"回滚到版本 {target_version}", new_version - 1, "rollback")
            conn.commit()
            
            # 记录操作
            self.log_document_operation(doc_id, user_id, user_name, "rollback", None, None, 
                                       json.dumps({"target_version": target_version}))
            
            cursor.execute("SELECT * FROM collaborative_documents WHERE id = ?", (doc_id,))
            return dict(cursor.fetchone())

    # ========== 文档操作日志（OT/CRDT）==========

    def log_document_operation(self, doc_id: str, user_id: str, user_name: str, 
                                operation_type: str, position: Optional[int], 
                                content: Optional[str], metadata: Optional[str]) -> int:
        """记录文档操作（用于OT/CRDT冲突解决）"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO document_operations (doc_id, user_id, user_name, operation_type, position, content, length, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, user_id, user_name, operation_type, position, content, 
                  len(content) if content else 0, metadata))
            conn.commit()
            return cursor.lastrowid

    def get_document_operations(self, doc_id: str, since_timestamp: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取文档操作历史"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM document_operations WHERE doc_id = ?"
            params = [doc_id]
            if since_timestamp:
                query += " AND timestamp > ?"
                params.append(since_timestamp)
            query += " ORDER BY timestamp ASC"
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    # ========== 文档权限控制 ==========

    def get_document_permissions(self, doc_id: str) -> List[Dict[str, Any]]:
        """获取文档权限列表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM document_permissions WHERE doc_id = ?
            """, (doc_id,))
            return [dict(row) for row in cursor.fetchall()]

    def check_document_permission(self, doc_id: str, user_id: str, required_permission: str = "read") -> bool:
        """检查用户是否有权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 首先检查文档是否存在
            cursor.execute("SELECT owner_id, metadata FROM collaborative_documents WHERE id = ?", (doc_id,))
            doc = cursor.fetchone()
            if not doc:
                return False
            
            # 文档所有者始终有权限
            if doc["owner_id"] == user_id:
                return True
            
            # 检查权限表
            cursor.execute("""
                SELECT permission FROM document_permissions 
                WHERE doc_id = ? AND user_id = ? 
                AND (expires_at IS NULL OR expires_at > ?)
            """, (doc_id, user_id, datetime.now().isoformat()))
            row = cursor.fetchone()
            if not row:
                return False
            
            # 权限等级：admin > edit > read
            permission_levels = {"read": 1, "edit": 2, "admin": 3}
            granted_level = permission_levels.get(row["permission"], 0)
            required_level = permission_levels.get(required_permission, 0)
            
            return granted_level >= required_level

    def grant_document_permission(self, doc_id: str, user_id: str, permission: str, 
                                   granted_by: str, expires_at: Optional[str] = None) -> bool:
        """授予文档权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO document_permissions (doc_id, user_id, permission, granted_by, granted_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (doc_id, user_id, permission, granted_by, datetime.now().isoformat(), expires_at))
            conn.commit()
            return cursor.rowcount > 0

    def revoke_document_permission(self, doc_id: str, user_id: str) -> bool:
        """撤销文档权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM document_permissions WHERE doc_id = ? AND user_id = ?", (doc_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 文档评论 ==========

    def get_document_comments(self, doc_id: str, parent_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """获取文档评论"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM document_comments WHERE doc_id = ?"
            params = [doc_id]
            if parent_id is not None:
                query += " AND parent_id = ?"
                params.append(parent_id)
            query += " ORDER BY created_at ASC"
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def add_document_comment(self, doc_id: str, user_id: str, user_name: str, user_avatar: str,
                              content: str, position: Optional[int] = None, 
                              parent_id: Optional[int] = None) -> Dict[str, Any]:
        """添加文档评论"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO document_comments (doc_id, user_id, user_name, user_avatar, content, position, parent_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, user_id, user_name, user_avatar, content, position, parent_id))
            conn.commit()
            cursor.execute("SELECT * FROM document_comments WHERE id = ?", (cursor.lastrowid,))
            return dict(cursor.fetchone())

    def resolve_document_comment(self, comment_id: int) -> bool:
        """标记评论为已解决"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE document_comments SET is_resolved = 1, updated_at = ? WHERE id = ?", 
                          (datetime.now().isoformat(), comment_id))
            conn.commit()
            return cursor.rowcount > 0

    # ========== 远程光标位置 ==========

    def update_cursor_position(self, doc_id: str, user_id: str, user_name: str, user_avatar: str,
                                selection_start: Optional[int], selection_end: Optional[int], color: str) -> bool:
        """更新远程光标位置"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO cursor_positions (doc_id, user_id, user_name, user_avatar, 
                                                         selection_start, selection_end, color, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, user_id, user_name, user_avatar, selection_start, selection_end, color, datetime.now().isoformat()))
            conn.commit()
            return True

    def get_cursor_positions(self, doc_id: str) -> List[Dict[str, Any]]:
        """获取所有远程光标位置"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM cursor_positions WHERE doc_id = ? AND last_seen > ?
            """, (doc_id, datetime.now().isoformat()))
            return [dict(row) for row in cursor.fetchall()]

    # ========== 文件索引管理 ==========

    def get_indexed_files(self, file_type: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """获取已索引的文件列表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM file_index WHERE is_deleted = 0"
            params = []
            if file_type:
                query += " AND file_type = ?"
                params.append(file_type)
            query += " ORDER BY file_path ASC LIMIT ?"
            params.append(limit)
            cursor.execute(query, params)
            rows = cursor.fetchall()
            result = []
            for row in rows:
                item = dict(row)
                if isinstance(item.get('card_ids'), str):
                    try:
                        item['card_ids'] = json.loads(item['card_ids'])
                    except:
                        item['card_ids'] = []
                result.append(item)
            return result

    def get_file_by_id(self, file_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取索引文件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM file_index WHERE id = ?", (file_id,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                if isinstance(item.get('card_ids'), str):
                    try:
                        item['card_ids'] = json.loads(item['card_ids'])
                    except:
                        item['card_ids'] = []
                return item
            return None

    def get_file_by_path(self, file_path: str) -> Optional[Dict[str, Any]]:
        """根据路径获取索引文件"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM file_index WHERE file_path = ?", (file_path,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                if isinstance(item.get('card_ids'), str):
                    try:
                        item['card_ids'] = json.loads(item['card_ids'])
                    except:
                        item['card_ids'] = []
                return item
            return None

    def upsert_file_index(self, file_path: str, file_name: str, file_type: str,
                          file_size: int = 0, last_modified: str = "") -> Dict[str, Any]:
        """插入或更新文件索引"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO file_index (file_path, file_name, file_type, file_size, indexed_at, last_modified)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(file_path) DO UPDATE SET
                    file_name = excluded.file_name,
                    file_type = excluded.file_type,
                    file_size = excluded.file_size,
                    indexed_at = excluded.indexed_at,
                    last_modified = excluded.last_modified,
                    is_deleted = 0
            """, (file_path, file_name, file_type, file_size, now, last_modified))
            conn.commit()
            return self.get_file_by_path(file_path) or {}

    def mark_file_deleted(self, file_path: str) -> bool:
        """标记文件为已删除"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE file_index SET is_deleted = 1 WHERE file_path = ?", (file_path,))
            conn.commit()
            return cursor.rowcount > 0

    def update_file_card_ids(self, file_path: str, card_ids: List[int]) -> bool:
        """更新文件的关联卡片ID列表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE file_index SET card_ids = ?, card_count = ? WHERE file_path = ?
            """, (json.dumps(card_ids), len(card_ids), file_path))
            conn.commit()
            return cursor.rowcount > 0

    def sync_source_to_file_index(self, source_file_id: str, card_ids: List[int]) -> Optional[Dict[str, Any]]:
        """将 source_files 中的导入记录同步到 file_index，确保文件浏览器能识别"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT source_file_id, original_name, stored_path, file_type, file_size
                FROM source_files WHERE source_file_id = ?
            """, (source_file_id,))
            row = cursor.fetchone()
            if not row:
                return None
            sf = dict(row)
            fname = sf["original_name"]
            ftype = sf["file_type"]
            fsize = sf.get("file_size", 0)
            stored = sf.get("stored_path", "")

            rel_path = fname

            now = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO file_index (file_path, file_name, file_type, file_size, indexed_at, last_modified,
                                        card_ids, card_count, is_deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                ON CONFLICT(file_path) DO UPDATE SET
                    file_name = excluded.file_name,
                    file_type = excluded.file_type,
                    file_size = excluded.file_size,
                    indexed_at = excluded.indexed_at,
                    last_modified = excluded.last_modified,
                    card_ids = excluded.card_ids,
                    card_count = excluded.card_count,
                    is_deleted = 0
            """, (rel_path, fname, ftype, fsize, now, now,
                  json.dumps(card_ids), len(card_ids)))
            conn.commit()
            cursor.execute("SELECT * FROM file_index WHERE file_path = ?", (rel_path,))
            return dict(cursor.fetchone()) if cursor.fetchone() else None

    def search_files_and_cards(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """搜索文件和关联卡片"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            search_term = f"%{query}%"

            # 搜索文件
            cursor.execute("""
                SELECT * FROM file_index 
                WHERE is_deleted = 0 AND (file_name LIKE ? OR file_path LIKE ?)
                ORDER BY file_path ASC LIMIT ?
            """, (search_term, search_term, limit))
            files = [dict(row) for row in cursor.fetchall()]
            for f in files:
                if isinstance(f.get('card_ids'), str):
                    try:
                        f['card_ids'] = json.loads(f['card_ids'])
                    except:
                        f['card_ids'] = []

            # 搜索关联的卡片
            cursor.execute("""
                SELECT id, title, content, card_type, created_at
                FROM knowledge_cards
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY updated_at DESC LIMIT ?
            """, (search_term, search_term, limit))
            cards = [dict(row) for row in cursor.fetchall()]

            return {"files": files, "cards": cards}
