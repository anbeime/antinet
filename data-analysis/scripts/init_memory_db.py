"""
Agent记忆数据库初始化脚本
创建用于Agent间流转记忆的数据库表结构
"""
import sqlite3
import os
from datetime import datetime


def init_database(db_path: str = "./agent_memory.db"):
    """
    初始化数据库表结构
    
    参数：
        db_path: 数据库文件路径
    """
    # 确保数据库目录存在
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. 创建tasks表（任务主表）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT PRIMARY KEY,
        user_query TEXT NOT NULL,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        final_result TEXT,
        CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        CHECK(priority IN ('high', 'medium', 'low'))
    )
    """)
    
    # 2. 创建agent_executions表（Agent执行记录表）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_executions (
        execution_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        input_data TEXT,
        output_data TEXT,
        error_message TEXT,
        execution_time INTEGER,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        retry_count INTEGER NOT NULL DEFAULT 0,
        dependencies TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CHECK(status IN ('pending', 'running', 'completed', 'failed', 'retry'))
    )
    """)
    
    # 3. 创建message_logs表（消息流转日志表）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS message_logs (
        log_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        message_type TEXT NOT NULL,
        message_content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CHECK(status IN ('pending', 'processed', 'failed'))
    )
    """)
    
    # 4. 创建knowledge_cards表（知识卡片表）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_cards (
        card_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        card_type TEXT NOT NULL,
        card_content TEXT NOT NULL,
        tags TEXT,
        related_cards TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        vector_embedding BLOB,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CHECK(card_type IN ('blue', 'green', 'yellow', 'red'))
    )
    """)
    
    # 5. 创建agent_states表（Agent状态表）
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_states (
        state_id TEXT PRIMARY KEY,
        agent_name TEXT UNIQUE NOT NULL,
        current_task_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metrics TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK(status IN ('idle', 'busy', 'error'))
    )
    """)
    
    # 创建索引以提升查询性能
    # tasks表索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)")
    
    # agent_executions表索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_task_id ON agent_executions(task_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_agent_name ON agent_executions(agent_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_executions(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_started_at ON agent_executions(started_at)")
    
    # message_logs表索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_task_id ON message_logs(task_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_from_agent ON message_logs(from_agent)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_to_agent ON message_logs(to_agent)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON message_logs(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_status ON message_logs(status)")
    
    # knowledge_cards表索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_task_id ON knowledge_cards(task_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_agent_name ON knowledge_cards(agent_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_card_type ON knowledge_cards(card_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_tags ON knowledge_cards(tags)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cards_created_at ON knowledge_cards(created_at)")
    
    # agent_states表索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_states_agent_name ON agent_states(agent_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_states_status ON agent_states(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_states_last_heartbeat ON agent_states(last_heartbeat)")
    
    conn.commit()
    conn.close()
    
    print(f"数据库初始化成功: {db_path}")
    print(f"📊 已创建5个表和23个索引")


def drop_database(db_path: str = "./agent_memory.db"):
    """
    删除数据库（用于测试）
    
    参数：
        db_path: 数据库文件路径
    """
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"数据库已删除: {db_path}")
    else:
        print(f"[WARN] 数据库不存在: {db_path}")


if __name__ == "__main__":
    # 初始化数据库
    init_database()
    
    # 查看表结构
    print("\n" + "=" * 80)
    print("数据库表结构")
    print("=" * 80)
    
    conn = sqlite3.connect("./agent_memory.db")
    cursor = conn.cursor()
    
    tables = ["tasks", "agent_executions", "message_logs", "knowledge_cards", "agent_states"]
    
    for table in tables:
        print(f"\n【{table}】")
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  - {col[1]}: {col[2]} ({'主键' if col[5] == 1 else ''})")
    
    conn.close()
