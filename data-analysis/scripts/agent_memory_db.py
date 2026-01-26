"""
Agent记忆数据库访问类
封装所有数据库CRUD操作，支持Agent间记忆共享和流转
"""
import sqlite3
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import contextmanager


class AgentMemoryDB:
    """Agent记忆数据库访问类"""
    
    def __init__(self, db_path: str = "./agent_memory.db"):
        """
        初始化数据库连接
        
        参数：
            db_path: 数据库文件路径
        """
        self.db_path = db_path
    
    @contextmanager
    def _get_connection(self):
        """获取数据库连接（上下文管理器）"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 返回字典格式
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    # ========== Tasks表操作 ==========
    
    def create_task(self, user_query: str, task_type: str, 
                   priority: str = "medium") -> str:
        """
        创建新任务
        
        参数：
            user_query: 用户原始查询
            task_type: 任务类型
            priority: 优先级
        
        返回：
            task_id: 任务ID
        """
        task_id = f"T{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO tasks (task_id, user_query, task_type, priority)
            VALUES (?, ?, ?, ?)
            """, (task_id, user_query, task_type, priority))
        
        return task_id
    
    def update_task_status(self, task_id: str, status: str) -> bool:
        """
        更新任务状态
        
        参数：
            task_id: 任务ID
            status: 任务状态
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE tasks 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE task_id = ?
            """, (status, task_id))
            return cursor.rowcount > 0
    
    def update_task_result(self, task_id: str, final_result: Dict) -> bool:
        """
        更新任务最终结果
        
        参数：
            task_id: 任务ID
            final_result: 最终结果
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE tasks 
            SET final_result = ?, 
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE task_id = ?
            """, (json.dumps(final_result, ensure_ascii=False), task_id))
            return cursor.rowcount > 0
    
    def get_task(self, task_id: str) -> Optional[Dict]:
        """
        获取任务详情
        
        参数：
            task_id: 任务ID
        
        返回：
            任务信息字典
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def get_all_tasks(self, status: Optional[str] = None, 
                     limit: int = 100) -> List[Dict]:
        """
        获取所有任务
        
        参数：
            status: 过滤状态（可选）
            limit: 返回数量限制
        
        返回：
            任务列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status:
                cursor.execute("""
                SELECT * FROM tasks 
                WHERE status = ? 
                ORDER BY created_at DESC 
                LIMIT ?
                """, (status, limit))
            else:
                cursor.execute("""
                SELECT * FROM tasks 
                ORDER BY created_at DESC 
                LIMIT ?
                """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    # ========== Agent执行记录表操作 ==========
    
    def create_agent_execution(self, task_id: str, agent_name: str, 
                              agent_type: str, input_data: Dict) -> str:
        """
        创建Agent执行记录
        
        参数：
            task_id: 任务ID
            agent_name: Agent名称
            agent_type: Agent类型
            input_data: 输入数据
        
        返回：
            execution_id: 执行ID
        """
        execution_id = f"E{datetime.now().strftime('%Y%m%d%H%M%S')}_{agent_name}_{uuid.uuid4().hex[:6]}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO agent_executions 
            (execution_id, task_id, agent_name, agent_type, input_data, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """, (execution_id, task_id, agent_name, agent_type, 
                  json.dumps(input_data, ensure_ascii=False)))
        
        return execution_id
    
    def start_execution(self, execution_id: str) -> bool:
        """
        开始执行Agent
        
        参数：
            execution_id: 执行ID
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_executions 
            SET status = 'running', 
                started_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
            """, (execution_id,))
            return cursor.rowcount > 0
    
    def complete_execution(self, execution_id: str, 
                         output_data: Dict, execution_time: int) -> bool:
        """
        完成Agent执行
        
        参数：
            execution_id: 执行ID
            output_data: 输出数据
            execution_time: 执行时长（毫秒）
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_executions 
            SET status = 'completed',
                output_data = ?,
                execution_time = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
            """, (json.dumps(output_data, ensure_ascii=False), execution_time, execution_id))
            return cursor.rowcount > 0
    
    def fail_execution(self, execution_id: str, error_message: str) -> bool:
        """
        标记Agent执行失败
        
        参数：
            execution_id: 执行ID
            error_message: 错误信息
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE agent_executions 
            SET status = 'failed',
                error_message = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE execution_id = ?
            """, (error_message, execution_id))
            return cursor.rowcount > 0
    
    def get_agent_execution(self, execution_id: str) -> Optional[Dict]:
        """
        获取Agent执行记录
        
        参数：
            execution_id: 执行ID
        
        返回：
            执行记录字典
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_executions WHERE execution_id = ?", (execution_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def get_task_executions(self, task_id: str) -> List[Dict]:
        """
        获取任务的所有执行记录
        
        参数：
            task_id: 任务ID
        
        返回：
            执行记录列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM agent_executions 
            WHERE task_id = ? 
            ORDER BY started_at ASC
            """, (task_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_agent_executions(self, agent_name: str, 
                            limit: int = 50) -> List[Dict]:
        """
        获取Agent的执行历史
        
        参数：
            agent_name: Agent名称
            limit: 返回数量限制
        
        返回：
            执行记录列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM agent_executions 
            WHERE agent_name = ? 
            ORDER BY started_at DESC 
            LIMIT ?
            """, (agent_name, limit))
            return [dict(row) for row in cursor.fetchall()]
    
    # ========== 消息流转日志表操作 ==========
    
    def log_message(self, task_id: str, from_agent: str, to_agent: str,
                   message_type: str, message_content: Dict) -> str:
        """
        记录消息流转
        
        参数：
            task_id: 任务ID
            from_agent: 发送方Agent
            to_agent: 接收方Agent
            message_type: 消息类型
            message_content: 消息内容
        
        返回：
            log_id: 日志ID
        """
        log_id = f"L{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO message_logs 
            (log_id, task_id, from_agent, to_agent, message_type, message_content)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (log_id, task_id, from_agent, to_agent, message_type, 
                  json.dumps(message_content, ensure_ascii=False)))
        
        return log_id
    
    def mark_message_processed(self, log_id: str) -> bool:
        """
        标记消息已处理
        
        参数：
            log_id: 日志ID
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE message_logs 
            SET status = 'processed',
                processed_at = CURRENT_TIMESTAMP
            WHERE log_id = ?
            """, (log_id,))
            return cursor.rowcount > 0
    
    def get_task_messages(self, task_id: str) -> List[Dict]:
        """
        获取任务的所有消息
        
        参数：
            task_id: 任务ID
        
        返回：
            消息列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM message_logs 
            WHERE task_id = ? 
            ORDER BY created_at ASC
            """, (task_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_agent_messages(self, agent_name: str, 
                          message_type: Optional[str] = None,
                          limit: int = 100) -> List[Dict]:
        """
        获取Agent的消息
        
        参数：
            agent_name: Agent名称
            message_type: 消息类型过滤（可选）
            limit: 返回数量限制
        
        返回：
            消息列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if message_type:
                cursor.execute("""
                SELECT * FROM message_logs 
                WHERE (from_agent = ? OR to_agent = ?) AND message_type = ?
                ORDER BY created_at DESC 
                LIMIT ?
                """, (agent_name, agent_name, message_type, limit))
            else:
                cursor.execute("""
                SELECT * FROM message_logs 
                WHERE from_agent = ? OR to_agent = ?
                ORDER BY created_at DESC 
                LIMIT ?
                """, (agent_name, agent_name, limit))
            return [dict(row) for row in cursor.fetchall()]
    
    # ========== 知识卡片表操作 ==========
    
    def create_knowledge_card(self, task_id: str, agent_name: str,
                            card_type: str, card_content: Dict,
                            tags: List[str] = None) -> str:
        """
        创建知识卡片
        
        参数：
            task_id: 任务ID
            agent_name: 创建者Agent
            card_type: 卡片类型
            card_content: 卡片内容
            tags: 标签列表
        
        返回：
            card_id: 卡片ID
        """
        card_id = f"C{datetime.now().strftime('%Y%m%d%H%M%S')}_{card_type[0].upper()}_{uuid.uuid4().hex[:8]}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO knowledge_cards 
            (card_id, task_id, agent_name, card_type, card_content, tags)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (card_id, task_id, agent_name, card_type, 
                  json.dumps(card_content, ensure_ascii=False),
                  json.dumps(tags or [], ensure_ascii=False)))
        
        return card_id
    
    def update_knowledge_card(self, card_id: str, 
                             card_content: Dict = None,
                             tags: List[str] = None,
                             related_cards: List[str] = None) -> bool:
        """
        更新知识卡片
        
        参数：
            card_id: 卡片ID
            card_content: 卡片内容（可选）
            tags: 标签列表（可选）
            related_cards: 关联卡片ID列表（可选）
        
        返回：
            是否更新成功
        """
        updates = []
        params = []
        
        if card_content is not None:
            updates.append("card_content = ?")
            params.append(json.dumps(card_content, ensure_ascii=False))
        
        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags, ensure_ascii=False))
        
        if related_cards is not None:
            updates.append("related_cards = ?")
            params.append(json.dumps(related_cards, ensure_ascii=False))
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(card_id)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
            UPDATE knowledge_cards 
            SET {', '.join(updates)}
            WHERE card_id = ?
            """, params)
            return cursor.rowcount > 0
    
    def get_knowledge_card(self, card_id: str) -> Optional[Dict]:
        """
        获取知识卡片
        
        参数：
            card_id: 卡片ID
        
        返回：
            卡片字典
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM knowledge_cards WHERE card_id = ?", (card_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def get_task_cards(self, task_id: str) -> List[Dict]:
        """
        获取任务的所有知识卡片
        
        参数：
            task_id: 任务ID
        
        返回：
            卡片列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT * FROM knowledge_cards 
            WHERE task_id = ? 
            ORDER BY card_type, created_at ASC
            """, (task_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def search_cards_by_tags(self, tags: List[str], 
                            limit: int = 20) -> List[Dict]:
        """
        按标签搜索知识卡片
        
        参数：
            tags: 标签列表
            limit: 返回数量限制
        
        返回：
            卡片列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # 使用LIKE模糊匹配标签
            query = "SELECT * FROM knowledge_cards WHERE "
            conditions = []
            params = []
            
            for tag in tags:
                conditions.append("tags LIKE ?")
                params.append(f"%{tag}%")
            
            query += " OR ".join(conditions)
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    # ========== Agent状态表操作 ==========
    
    def update_agent_state(self, agent_name: str, 
                          status: str, 
                          current_task_id: str = None,
                          metrics: Dict = None) -> bool:
        """
        更新Agent状态
        
        参数：
            agent_name: Agent名称
            status: 状态
            current_task_id: 当前任务ID（可选）
            metrics: 性能指标（可选）
        
        返回：
            是否更新成功
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 尝试更新
            cursor.execute("""
            UPDATE agent_states 
            SET status = ?,
                current_task_id = ?,
                metrics = ?,
                last_heartbeat = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE agent_name = ?
            """, (status, current_task_id, 
                  json.dumps(metrics or {}, ensure_ascii=False), agent_name))
            
            # 如果不存在，则插入
            if cursor.rowcount == 0:
                state_id = f"S{datetime.now().strftime('%Y%m%d%H%M%S')}_{agent_name}"
                cursor.execute("""
                INSERT INTO agent_states 
                (state_id, agent_name, status, current_task_id, metrics)
                VALUES (?, ?, ?, ?, ?)
                """, (state_id, agent_name, status, current_task_id, 
                      json.dumps(metrics or {}, ensure_ascii=False)))
            
            return True
    
    def get_agent_state(self, agent_name: str) -> Optional[Dict]:
        """
        获取Agent状态
        
        参数：
            agent_name: Agent名称
        
        返回：
            状态字典
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_states WHERE agent_name = ?", (agent_name,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    def get_all_agent_states(self) -> List[Dict]:
        """
        获取所有Agent状态
        
        返回：
            状态列表
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_states ORDER BY updated_at DESC")
            return [dict(row) for row in cursor.fetchall()]


if __name__ == "__main__":
    # 测试数据库操作
    db = AgentMemoryDB()
    
    # 创建任务
    task_id = db.create_task("分析销售趋势", "趋势分析", "high")
    print(f"创建任务: {task_id}")
    
    # 获取任务
    task = db.get_task(task_id)
    print(f"任务信息: {task['user_query']}")
    
    # 创建Agent执行记录
    execution_id = db.create_agent_execution(
        task_id, "mijuanfang", "preprocessor", {"data": "test"}
    )
    print(f"创建执行记录: {execution_id}")
    
    # 更新任务状态
    db.update_task_status(task_id, "running")
    print(f"更新任务状态: running")
    
    # 记录消息
    log_id = db.log_message(
        task_id, "orchestrator", "mijuanfang", "task", {"instruction": "test"}
    )
    print(f"记录消息: {log_id}")
    
    # 创建知识卡片
    card_id = db.create_knowledge_card(
        task_id, "tongzhengsi", "blue", 
        {"title": "销售数据", "content": "xxx"}, 
        ["销售", "数据"]
    )
    print(f"创建知识卡片: {card_id}")
    
    # 更新Agent状态
    db.update_agent_state("mijuanfang", "busy", task_id, {"cpu": 50})
    print(f"更新Agent状态: busy")
    
    # 查询数据
    print("\n" + "=" * 80)
    print("查询结果")
    print("=" * 80)
    
    print(f"\n任务执行记录: {len(db.get_task_executions(task_id))} 条")
    print(f"任务消息: {len(db.get_task_messages(task_id))} 条")
    print(f"任务知识卡片: {len(db.get_task_cards(task_id))} 张")
    print(f"Agent状态: {len(db.get_all_agent_states())} 个")
