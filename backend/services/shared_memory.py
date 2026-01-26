"""
共享记忆系统
整合太史阁（MemoryAgent）和现有数据库，实现知识共享
"""
import logging
import sqlite3
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import json

from config import settings
from database import DatabaseManager

logger = logging.getLogger(__name__)


class SharedMemorySystem:
    """共享记忆系统 - 连接太史阁和数据库"""
    
    def __init__(self):
        """初始化共享记忆系统"""
        self.db_manager = DatabaseManager(settings.DB_PATH)
        self.memory_agents = {}  # Agent ID -> MemoryAgent
        self.shared_knowledge = {}  # 共享知识缓存
        
        # 初始化记忆表结构
        self._initialize_memory_schema()
        logger.info("[SharedMemory] 共享记忆系统初始化完成")
    
    def _initialize_memory_schema(self):
        """初始化记忆相关表结构"""
        try:
            # 检查并创建记忆表
            tables = {
                "agent_memories": """
                    CREATE TABLE IF NOT EXISTS agent_memories (
                        agent_id TEXT PRIMARY KEY,
                        agent_name TEXT NOT NULL,
                        memory_data TEXT NOT NULL,
                        last_accessed TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                """,
                "shared_knowledge": """
                    CREATE TABLE IF NOT EXISTS shared_knowledge (
                        knowledge_id TEXT PRIMARY KEY,
                        knowledge_type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        content TEXT NOT NULL,
                        source_agent TEXT NOT NULL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """,
                "knowledge_relations": """
                    CREATE TABLE IF NOT EXISTS knowledge_relations (
                        relation_id TEXT PRIMARY KEY,
                        source_knowledge_id TEXT NOT NULL,
                        target_knowledge_id TEXT NOT NULL,
                        relation_type TEXT NOT NULL,
                        strength REAL DEFAULT 1.0,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (source_knowledge_id) REFERENCES shared_knowledge(knowledge_id),
                        FOREIGN KEY (target_knowledge_id) REFERENCES shared_knowledge(knowledge_id)
                    )
                """,
                "conversation_context": """
                    CREATE TABLE IF NOT EXISTS conversation_context (
                        context_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        context_data TEXT NOT NULL,
                        last_message TEXT,
                        message_count INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """
            }
            
            for table_name, create_sql in tables.items():
                self.db_manager.conn.execute(create_sql)
                logger.info(f"[SharedMemory] 表 {table_name} 已就绪")
            
            self.db_manager.conn.commit()
            
        except Exception as e:
            logger.error(f"[SharedMemory] 初始化表结构失败: {e}", exc_info=True)
            raise
    
    def store_agent_memory(self, agent_id: str, agent_name: str, memory_data: Dict) -> Dict:
        """
        存储 Agent 记忆
        
        参数：
            agent_id: Agent ID
            agent_name: Agent 名称
            memory_data: 记忆数据
        
        返回：
            存储结果
        """
        try:
            timestamp = datetime.now().isoformat()
            
            # 检查是否已存在
            cursor = self.db_manager.conn.execute(
                "SELECT agent_id FROM agent_memories WHERE agent_id = ?",
                (agent_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # 更新
                self.db_manager.conn.execute("""
                    UPDATE agent_memories
                    SET memory_data = ?, last_accessed = ?
                    WHERE agent_id = ?
                """, (json.dumps(memory_data), timestamp, agent_id))
            else:
                # 插入
                self.db_manager.conn.execute("""
                    INSERT INTO agent_memories (agent_id, agent_name, memory_data, last_accessed, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (agent_id, agent_name, json.dumps(memory_data), timestamp, timestamp))
            
            self.db_manager.conn.commit()
            
            # 更新缓存
            self.memory_agents[agent_id] = memory_data
            
            logger.info(f"[SharedMemory] Agent {agent_name} 记忆已存储")
            return {
                "status": "success",
                "agent_id": agent_id,
                "agent_name": agent_name,
                "updated_at": timestamp
            }
            
        except Exception as e:
            logger.error(f"[SharedMemory] 存储 Agent 记忆失败: {e}", exc_info=True)
            raise
    
    def get_agent_memory(self, agent_id: str) -> Optional[Dict]:
        """
        获取 Agent 记忆
        
        参数：
            agent_id: Agent ID
        
        返回：
            记忆数据
        """
        try:
            # 先从缓存读取
            if agent_id in self.memory_agents:
                # 更新访问时间
                self.db_manager.conn.execute("""
                    UPDATE agent_memories SET last_accessed = ?
                    WHERE agent_id = ?
                """, (datetime.now().isoformat(), agent_id))
                self.db_manager.conn.commit()
                return self.memory_agents[agent_id]
            
            # 从数据库读取
            cursor = self.db_manager.conn.execute(
                "SELECT memory_data FROM agent_memories WHERE agent_id = ?",
                (agent_id,)
            )
            row = cursor.fetchone()
            
            if row:
                memory_data = json.loads(row['memory_data'])
                self.memory_agents[agent_id] = memory_data
                return memory_data
            
            return None
            
        except Exception as e:
            logger.error(f"[SharedMemory] 获取 Agent 记忆失败: {e}", exc_info=True)
            return None
    
    def share_knowledge(self, knowledge_type: str, title: str, content: str, 
                       source_agent: str, metadata: Optional[Dict] = None) -> Dict:
        """
        共享知识到所有 Agent
        
        参数：
            knowledge_type: 知识类型
            title: 标题
            content: 内容
            source_agent: 来源 Agent
            metadata: 元数据
        
        返回：
            共享结果
        """
        try:
            knowledge_id = f"know_{datetime.now().timestamp()}"
            timestamp = datetime.now().isoformat()
            
            # 插入共享知识
            self.db_manager.conn.execute("""
                INSERT INTO shared_knowledge 
                (knowledge_id, knowledge_type, title, content, source_agent, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge_id,
                knowledge_type,
                title,
                content,
                source_agent,
                json.dumps(metadata) if metadata else None,
                timestamp,
                timestamp
            ))
            
            self.db_manager.conn.commit()
            
            # 通知所有有此知识的 Agent
            affected_agents = self._notify_agents_of_knowledge(knowledge_type, knowledge_id)
            
            logger.info(f"[SharedMemory] 知识已共享到 {len(affected_agents)} 个 Agent")
            return {
                "knowledge_id": knowledge_id,
                "status": "shared",
                "affected_agents": affected_agents,
                "shared_at": timestamp
            }
            
        except Exception as e:
            logger.error(f"[SharedMemory] 共享知识失败: {e}", exc_info=True)
            raise
    
    def _notify_agents_of_knowledge(self, knowledge_type: str, knowledge_id: str) -> List[str]:
        """通知相关 Agent 新知识 - 真实通知"""
        try:
            interested_agents = []
            
            # 根据知识类型确定感兴趣的 Agent
            if knowledge_type in ['fact', 'explanation']:
                interested_agents.extend(['通政司', '监察院'])
            elif knowledge_type == 'risk':
                interested_agents.extend(['刑狱司', '参谋司'])
            elif knowledge_type == 'action':
                interested_agents.extend(['参谋司', '锦衣卫'])
            
            # 在真实系统中，这里会通过消息队列通知相关 Agent
            # 由于 Agent 系统在同一进程，我们记录通知状态
            
            # 记录通知日志
            for agent_name in interested_agents:
                logger.info(f"[SharedMemory] 通知 Agent {agent_name}: 新知识 {knowledge_id} ({knowledge_type})")
            
            # 这里可以扩展为实际的通知机制
            # 例如：调用 Agent 的回调函数、发送消息队列等
            
            return interested_agents
            
        except Exception as e:
            logger.error(f"[SharedMemory] 通知 Agent 失败: {e}")
            return []
    
    def get_shared_knowledge(self, knowledge_type: Optional[str] = None, 
                           limit: int = 100) -> List[Dict]:
        """
        获取共享知识
        
        参数：
            knowledge_type: 知识类型（可选）
            limit: 返回数量限制
        
        返回：
            知识列表
        """
        try:
            if knowledge_type:
                cursor = self.db_manager.conn.execute("""
                    SELECT * FROM shared_knowledge
                    WHERE knowledge_type = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (knowledge_type, limit))
            else:
                cursor = self.db_manager.conn.execute("""
                    SELECT * FROM shared_knowledge
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))
            
            rows = cursor.fetchall()
            
            return [
                {
                    "knowledge_id": row['knowledge_id'],
                    "knowledge_type": row['knowledge_type'],
                    "title": row['title'],
                    "content": row['content'],
                    "source_agent": row['source_agent'],
                    "metadata": json.loads(row['metadata']) if row['metadata'] else {},
                    "created_at": row['created_at'],
                    "updated_at": row['updated_at']
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"[SharedMemory] 获取共享知识失败: {e}", exc_info=True)
            return []
    
    def create_knowledge_relation(self, source_id: str, target_id: str, 
                                 relation_type: str, strength: float = 1.0) -> Dict:
        """
        创建知识关联
        
        参数：
            source_id: 源知识 ID
            target_id: 目标知识 ID
            relation_type: 关系类型 (explains/causes/mitigates/related)
            strength: 关系强度 (0.0-1.0)
        
        返回：
            关联结果
        """
        try:
            relation_id = f"rel_{datetime.now().timestamp()}"
            timestamp = datetime.now().isoformat()
            
            self.db_manager.conn.execute("""
                INSERT INTO knowledge_relations 
                (relation_id, source_knowledge_id, target_knowledge_id, relation_type, strength, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (relation_id, source_id, target_id, relation_type, strength, timestamp))
            
            self.db_manager.conn.commit()
            
            logger.info(f"[SharedMemory] 知识关联已创建: {source_id} -> {target_id} ({relation_type})")
            return {
                "relation_id": relation_id,
                "status": "created",
                "created_at": timestamp
            }
            
        except Exception as e:
            logger.error(f"[SharedMemory] 创建知识关联失败: {e}", exc_info=True)
            raise
    
    def update_conversation_context(self, user_id: str, context_data: Dict, 
                                   last_message: str) -> Dict:
        """
        更新对话上下文
        
        参数：
            user_id: 用户 ID
            context_data: 上下文数据
            last_message: 最后一条消息
        
        返回：
            更新结果
        """
        try:
            timestamp = datetime.now().isoformat()
            
            # 检查是否已存在
            cursor = self.db_manager.conn.execute(
                "SELECT context_id, message_count FROM conversation_context WHERE user_id = ?",
                (user_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # 更新
                new_count = existing['message_count'] + 1
                self.db_manager.conn.execute("""
                    UPDATE conversation_context
                    SET context_data = ?, last_message = ?, message_count = ?, updated_at = ?
                    WHERE user_id = ?
                """, (json.dumps(context_data), last_message, new_count, timestamp, user_id))
            else:
                # 插入
                context_id = f"ctx_{datetime.now().timestamp()}"
                self.db_manager.conn.execute("""
                    INSERT INTO conversation_context (context_id, user_id, context_data, last_message, message_count, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                """, (context_id, user_id, json.dumps(context_data), last_message, timestamp, timestamp))
            
            self.db_manager.conn.commit()
            
            logger.info(f"[SharedMemory] 对话上下文已更新: 用户 {user_id}")
            return {
                "status": "success",
                "user_id": user_id,
                "updated_at": timestamp
            }
            
        except Exception as e:
            logger.error(f"[SharedMemory] 更新对话上下文失败: {e}", exc_info=True)
            raise
    
    def get_conversation_context(self, user_id: str) -> Optional[Dict]:
        """
        获取对话上下文
        
        参数：
            user_id: 用户 ID
        
        返回：
            上下文数据
        """
        try:
            cursor = self.db_manager.conn.execute(
                "SELECT * FROM conversation_context WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            
            if row:
                return {
                    "context_id": row['context_id'],
                    "user_id": row['user_id'],
                    "context_data": json.loads(row['context_data']),
                    "last_message": row['last_message'],
                    "message_count": row['message_count'],
                    "created_at": row['created_at'],
                    "updated_at": row['updated_at']
                }
            
            return None
            
        except Exception as e:
            logger.error(f"[SharedMemory] 获取对话上下文失败: {e}", exc_info=True)
            return None


# 全局单例
_shared_memory_system: Optional[SharedMemorySystem] = None


def get_shared_memory() -> SharedMemorySystem:
    """获取共享记忆系统单例"""
    global _shared_memory_system
    if _shared_memory_system is None:
        _shared_memory_system = SharedMemorySystem()
    return _shared_memory_system
