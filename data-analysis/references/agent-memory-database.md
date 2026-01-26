# Agent记忆数据库设计文档

## 目录
1. [概述](#概述)
2. [设计原则](#设计原则)
3. [数据库结构](#数据库结构)
4. [表结构详解](#表结构详解)
5. [API接口](#api接口)
6. [使用示例](#使用示例)
7. [性能优化](#性能优化)
8. [扩展开发](#扩展开发)

## 概述

### 背景与目标
在8-Agent协作架构中，Agent间需要高效地共享记忆和信息流转。数据库作为中央记忆存储，解决了以下核心问题：

1. **任务记忆**：记录完整任务生命周期，支持状态追踪和回溯
2. **上下文记忆**：保存Agent间的信息传递，确保上下文一致性
3. **历史记忆**：存储知识卡片和历史案例，支持知识沉淀
4. **状态记忆**：实时跟踪各Agent状态，支持负载均衡和异常处理

### 核心价值
- **数据一致性**：集中管理，避免数据分散和冲突
- **可追溯性**：完整记录所有操作，便于调试和分析
- **性能优化**：通过索引和缓存提升查询效率
- **扩展性**：模块化设计，易于添加新的Agent和功能

## 设计原则

### 1. 轻量级与端侧部署
- 使用SQLite数据库，无需额外服务
- 单文件存储，便于备份和迁移
- 适合Windows ARM64端侧环境

### 2. 结构化与灵活性
- 关系型表结构保证数据一致性
- JSON字段存储复杂数据，保持灵活性
- 支持版本管理和历史记录

### 3. 实时性与可靠性
- 支持高频读写操作
- 事务机制保证数据完整性
- 上下文管理器防止连接泄漏

### 4. 关联性与完整性
- 外键约束确保数据完整性
- 索引优化查询性能
- 支持级联删除

## 数据库结构

### 核心表概览

| 表名 | 用途 | 关键字段 | 索引数量 |
|------|------|----------|----------|
| tasks | 任务主表 | task_id, status, priority | 3 |
| agent_executions | Agent执行记录 | execution_id, task_id, agent_name | 4 |
| message_logs | 消息流转日志 | log_id, task_id, from_agent, to_agent | 5 |
| knowledge_cards | 知识卡片表 | card_id, task_id, card_type | 5 |
| agent_states | Agent状态表 | state_id, agent_name, status | 3 |

### ER关系图

```
tasks (1) ─── (N) agent_executions
  │
  ├── (N) message_logs
  │
  └── (N) knowledge_cards

agent_states (独立)
```

## 表结构详解

### 1. tasks表 - 任务主表

#### 字段说明

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| task_id | TEXT | PRIMARY KEY | 任务ID，格式：T{timestamp}_{hash} |
| user_query | TEXT | NOT NULL | 用户原始查询 |
| task_type | TEXT | NOT NULL | 任务类型（趋势分析/异常检测/风险评估等） |
| status | TEXT | NOT NULL, CHECK | 任务状态（pending/running/completed/failed） |
| priority | TEXT | NOT NULL, CHECK | 优先级（high/medium/low） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |
| completed_at | TIMESTAMP | NULLABLE | 完成时间 |
| final_result | TEXT | NULLABLE | 最终结果（JSON格式） |

#### 索引

```sql
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

#### 使用场景

- 锦衣卫总指挥使创建新任务
- 跟踪任务进度和状态
- 存储最终分析结果

### 2. agent_executions表 - Agent执行记录表

#### 字段说明

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| execution_id | TEXT | PRIMARY KEY | 执行ID，格式：E{timestamp}_{agent}_{hash} |
| task_id | TEXT | NOT NULL, FOREIGN KEY | 关联任务ID |
| agent_name | TEXT | NOT NULL | Agent名称（mijuanfang/tongzhengsi等） |
| agent_type | TEXT | NOT NULL | Agent类型（preprocessor/fact_generator等） |
| status | TEXT | NOT NULL, CHECK | 执行状态（pending/running/completed/failed/retry） |
| input_data | TEXT | NULLABLE | 输入数据（JSON格式） |
| output_data | TEXT | NULLABLE | 输出数据（JSON格式） |
| error_message | TEXT | NULLABLE | 错误信息 |
| execution_time | INTEGER | NULLABLE | 执行时长（毫秒） |
| started_at | TIMESTAMP | NOT NULL | 开始时间 |
| completed_at | TIMESTAMP | NULLABLE | 完成时间 |
| retry_count | INTEGER | NOT NULL DEFAULT 0 | 重试次数 |
| dependencies | TEXT | NULLABLE | 依赖的Agent（JSON数组） |

#### 索引

```sql
CREATE INDEX idx_executions_task_id ON agent_executions(task_id);
CREATE INDEX idx_executions_agent_name ON agent_executions(agent_name);
CREATE INDEX idx_executions_status ON agent_executions(status);
CREATE INDEX idx_executions_started_at ON agent_executions(started_at);
```

#### 使用场景

- 记录每个Agent的执行过程
- 支持执行历史查询和分析
- 跟踪Agent执行时间和性能

### 3. message_logs表 - 消息流转日志表

#### 字段说明

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| log_id | TEXT | PRIMARY KEY | 日志ID，格式：L{timestamp}_{hash} |
| task_id | TEXT | NOT NULL, FOREIGN KEY | 关联任务ID |
| from_agent | TEXT | NOT NULL | 发送方Agent |
| to_agent | TEXT | NOT NULL | 接收方Agent |
| message_type | TEXT | NOT NULL | 消息类型（task/result/error/heartbeat等） |
| message_content | TEXT | NULLABLE | 消息内容（JSON格式） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| processed_at | TIMESTAMP | NULLABLE | 处理时间 |
| status | TEXT | NOT NULL, CHECK | 处理状态（pending/processed/failed） |

#### 索引

```sql
CREATE INDEX idx_logs_task_id ON message_logs(task_id);
CREATE INDEX idx_logs_from_agent ON message_logs(from_agent);
CREATE INDEX idx_logs_to_agent ON message_logs(to_agent);
CREATE INDEX idx_logs_created_at ON message_logs(created_at);
CREATE INDEX idx_logs_status ON message_logs(status);
```

#### 使用场景

- 记录Agent间的消息流转
- 支持消息审计和调试
- 跟踪消息处理状态

### 4. knowledge_cards表 - 知识卡片表

#### 字段说明

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| card_id | TEXT | PRIMARY KEY | 卡片ID，格式：C{timestamp}_{type}_{hash} |
| task_id | TEXT | NOT NULL, FOREIGN KEY | 关联任务ID |
| agent_name | TEXT | NOT NULL | 创建者Agent |
| card_type | TEXT | NOT NULL, CHECK | 卡片类型（blue/green/yellow/red） |
| card_content | TEXT | NOT NULL | 卡片内容（JSON格式） |
| tags | TEXT | NULLABLE | 标签（JSON数组） |
| related_cards | TEXT | NULLABLE | 关联卡片（JSON数组） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |
| vector_embedding | BLOB | NULLABLE | 向量嵌入（用于向量检索） |

#### 索引

```sql
CREATE INDEX idx_cards_task_id ON knowledge_cards(task_id);
CREATE INDEX idx_cards_agent_name ON knowledge_cards(agent_name);
CREATE INDEX idx_cards_card_type ON knowledge_cards(card_type);
CREATE INDEX idx_cards_tags ON knowledge_cards(tags);
CREATE INDEX idx_cards_created_at ON knowledge_cards(created_at);
```

#### 使用场景

- 存储四色卡片（蓝/绿/黄/红）
- 支持知识沉淀和检索
- 实现卡片关联和标签管理

### 5. agent_states表 - Agent状态表

#### 字段说明

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| state_id | TEXT | PRIMARY KEY | 状态ID，格式：S{timestamp}_{agent_name} |
| agent_name | TEXT | UNIQUE, NOT NULL | Agent名称 |
| current_task_id | TEXT | NULLABLE, FOREIGN KEY | 当前任务ID |
| status | TEXT | NOT NULL, CHECK | Agent状态（idle/busy/error） |
| last_heartbeat | TIMESTAMP | NOT NULL | 最后心跳时间 |
| metrics | TEXT | NULLABLE | 性能指标（JSON格式） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 索引

```sql
CREATE INDEX idx_states_agent_name ON agent_states(agent_name);
CREATE INDEX idx_states_status ON agent_states(status);
CREATE INDEX idx_states_last_heartbeat ON agent_states(last_heartbeat);
```

#### 使用场景

- 实时跟踪Agent状态
- 支持负载均衡和任务分配
- 监控Agent健康状态

## API接口

### AgentMemoryDB类

#### 初始化

```python
from scripts.agent_memory_db import AgentMemoryDB

db = AgentMemoryDB("./agent_memory.db")
```

### Tasks操作

#### 创建任务

```python
task_id = db.create_task(
    user_query="分析上个月销售趋势",
    task_type="趋势分析",
    priority="high"
)
```

#### 更新任务状态

```python
db.update_task_status(task_id, "running")
```

#### 更新任务结果

```python
final_result = {
    "summary": "销售趋势分析完成",
    "metrics": {"total_sales": 1200000}
}
db.update_task_result(task_id, final_result)
```

#### 查询任务

```python
# 获取单个任务
task = db.get_task(task_id)

# 获取所有任务
all_tasks = db.get_all_tasks()

# 按状态过滤
running_tasks = db.get_all_tasks(status="running")
```

### Agent执行记录操作

#### 创建执行记录

```python
execution_id = db.create_agent_execution(
    task_id="T20260124114206_7d21bca6",
    agent_name="mijuanfang",
    agent_type="preprocessor",
    input_data={"data": "sales_data.csv"}
)
```

#### 开始执行

```python
db.start_execution(execution_id)
```

#### 完成执行

```python
output_data = {
    "cleaned_data": [1, 2, 3, 4, 5],
    "quality": 0.98
}
db.complete_execution(execution_id, output_data, execution_time=1500)
```

#### 标记失败

```python
db.fail_execution(execution_id, "数据处理失败")
```

#### 查询执行记录

```python
# 获取任务的所有执行记录
executions = db.get_task_executions(task_id)

# 获取Agent的执行历史
history = db.get_agent_executions("mijuanfang", limit=50)
```

### 消息流转操作

#### 记录消息

```python
log_id = db.log_message(
    task_id="T20260124114206_7d21bca6",
    from_agent="mijuanfang",
    to_agent="tongzhengsi",
    message_type="result",
    message_content={"data": "cleaned_data"}
)
```

#### 标记消息已处理

```python
db.mark_message_processed(log_id)
```

#### 查询消息

```python
# 获取任务的所有消息
messages = db.get_task_messages(task_id)

# 获取Agent的消息
agent_messages = db.get_agent_messages("mijuanfang")

# 按类型过滤
result_messages = db.get_agent_messages("mijuanfang", message_type="result")
```

### 知识卡片操作

#### 创建知识卡片

```python
card_id = db.create_knowledge_card(
    task_id="T20260124114206_7d21bca6",
    agent_name="tongzhengsi",
    card_type="blue",
    card_content={
        "title": "12月销售数据统计",
        "content": {"sales": 1200000, "growth": -0.15}
    },
    tags=["销售", "数据", "12月"]
)
```

#### 更新知识卡片

```python
# 更新内容
db.update_knowledge_card(
    card_id, 
    card_content={"title": "更新后的标题"}
)

# 添加关联
db.update_knowledge_card(
    card_id,
    related_cards=["C20260124114206_G_xxx"]
)
```

#### 查询知识卡片

```python
# 获取任务的所有卡片
cards = db.get_task_cards(task_id)

# 按标签搜索
results = db.search_cards_by_tags(["销售", "风险"])
```

### Agent状态操作

#### 更新Agent状态

```python
db.update_agent_state(
    agent_name="mijuanfang",
    status="busy",
    current_task_id="T20260124114206_7d21bca6",
    metrics={"cpu": 50, "memory": 60}
)
```

#### 查询Agent状态

```python
# 获取单个Agent状态
state = db.get_agent_state("mijuanfang")

# 获取所有Agent状态
all_states = db.get_all_agent_states()
```

## 使用示例

### 完整任务流程示例

```python
from scripts.agent_memory_db import AgentMemoryDB

# 初始化数据库
db = AgentMemoryDB("./agent_memory.db")

# 1. 锦衣卫总指挥使创建任务
task_id = db.create_task("分析销售趋势", "趋势分析", "high")
db.update_task_status(task_id, "running")

# 2. 密卷房执行
execution_id = db.create_agent_execution(
    task_id, "mijuanfang", "preprocessor", {"data": "sales.csv"}
)
db.start_execution(execution_id)
# ... 处理数据 ...
db.complete_execution(execution_id, {"cleaned_data": "xxx"}, 1200)

# 3. 通政司执行
execution_id = db.create_agent_execution(
    task_id, "tongzhengsi", "fact_generator", {"data": "cleaned_data"}
)
db.start_execution(execution_id)
# ... 生成事实 ...
db.complete_execution(execution_id, {"facts": "销售下降15%"}, 800)

# 4. 创建知识卡片
card_id = db.create_knowledge_card(
    task_id, "tongzhengsi", "blue",
    {"title": "销售事实", "content": "销售下降15%"},
    ["销售", "事实"]
)

# 5. 完成任务
final_result = {
    "cards": db.get_task_cards(task_id),
    "executions": db.get_task_executions(task_id)
}
db.update_task_result(task_id, final_result)
```

### 消息流转示例

```python
# 总指挥使下发任务
db.log_message(
    task_id, "orchestrator", "mijuanfang", "task",
    {"instruction": "处理销售数据"}
)

# 密卷房返回结果
db.log_message(
    task_id, "mijuanfang", "orchestrator", "result",
    {"data": "cleaned_data"}
)

# 查询消息流转
messages = db.get_task_messages(task_id)
for msg in messages:
    print(f"{msg['from_agent']} -> {msg['to_agent']}: {msg['message_type']}")
```

### Agent状态监控示例

```python
# 更新Agent状态
db.update_agent_state("mijuanfang", "busy", task_id, {"cpu": 50})
db.update_agent_state("tongzhengsi", "idle")

# 查询所有Agent状态
states = db.get_all_agent_states()
for state in states:
    if state['status'] == 'busy':
        print(f"{state['agent_name']} 正在执行任务 {state['current_task_id']}")
    elif state['status'] == 'error':
        print(f"{state['agent_name']} 处于错误状态，需要处理")
```

## 性能优化

### 1. 索引优化

已创建23个索引，覆盖主要查询场景：

```sql
-- 任务查询优化
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Agent执行查询优化
CREATE INDEX idx_executions_task_id ON agent_executions(task_id);
CREATE INDEX idx_executions_agent_name ON agent_executions(agent_name);

-- 消息查询优化
CREATE INDEX idx_logs_from_agent ON message_logs(from_agent);
CREATE INDEX idx_logs_to_agent ON message_logs(to_agent);

-- 卡片查询优化
CREATE INDEX idx_cards_tags ON knowledge_cards(tags);
CREATE INDEX idx_cards_card_type ON knowledge_cards(card_type);
```

### 2. 查询优化建议

#### 使用索引字段过滤

```python
# 好的查询（使用索引）
running_tasks = db.get_all_tasks(status="running")
agent_messages = db.get_agent_messages("mijuanfang", message_type="result")

#no 避免的查询（全表扫描）
all_tasks = db.get_all_tasks()  # 应该添加limit或status过滤
```

#### 限制返回数量

```python
# 好的做法
tasks = db.get_all_tasks(limit=100)
executions = db.get_agent_executions("mijuanfang", limit=50)

#no 避免返回大量数据
all_tasks = db.get_all_tasks()  # 不推荐
```

### 3. 数据清理策略

#### 定期清理历史数据

```python
import sqlite3
from datetime import datetime, timedelta

def cleanup_old_data(db_path: str, days: int = 90):
    """
    清理N天前的已完成任务数据
    
    参数：
        db_path: 数据库路径
        days: 保留天数
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d %H:%M:%S")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 删除已完成且超期的任务（级联删除关联数据）
    cursor.execute("""
    DELETE FROM tasks 
    WHERE status = 'completed' AND completed_at < ?
    """, (cutoff_str,))
    
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"已清理 {deleted_count} 条历史任务数据")
```

## 扩展开发

### 1. 添加向量检索支持

```python
def search_cards_by_vector(self, query_embedding: bytes, 
                         top_k: int = 10) -> List[Dict]:
    """
    基于向量嵌入搜索知识卡片
    
    参数：
        query_embedding: 查询向量嵌入
        top_k: 返回Top-K结果
    
    返回：
        卡片列表
    """
    with self._get_connection() as conn:
        cursor = conn.cursor()
        # 使用余弦相似度
        cursor.execute("""
        SELECT card_id, task_id, agent_name, card_type, card_content, tags,
               (vector_embedding <#> ?) as similarity
        FROM knowledge_cards
        WHERE vector_embedding IS NOT NULL
        ORDER BY similarity ASC
        LIMIT ?
        """, (query_embedding, top_k))
        
        results = []
        for row in cursor.fetchall():
            card = dict(row)
            card['similarity'] = float(card['similarity'])
            results.append(card)
        
        return results
```

### 2. 添加任务模板

```python
def create_task_from_template(self, template_name: str, 
                           params: Dict) -> str:
    """
    基于模板创建任务
    
    参数：
        template_name: 模板名称
        params: 参数字典
    
    返回：
        task_id
    """
    # 模板定义
    templates = {
        "sales_analysis": {
            "task_type": "趋势分析",
            "priority": "medium"
        },
        "risk_detection": {
            "task_type": "风险评估",
            "priority": "high"
        }
    }
    
    template = templates.get(template_name, {})
    user_query = params.get("query", "")
    
    return self.create_task(
        user_query=user_query,
        task_type=template.get("task_type", "通用分析"),
        priority=template.get("priority", "medium")
    )
```

### 3. 添加任务依赖管理

```python
def get_task_dependencies(self, task_id: str) -> List[Dict]:
    """
    获取任务的依赖关系
    
    参数：
        task_id: 任务ID
    
    返回：
        依赖列表
    """
    with self._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT ae.execution_id, ae.agent_name, ae.dependencies,
               ae.status, ae.started_at, ae.completed_at
        FROM agent_executions ae
        WHERE ae.task_id = ?
        ORDER BY ae.started_at ASC
        """, (task_id,))
        
        return [dict(row) for row in cursor.fetchall()]
```

### 4. 添加性能监控

```python
def get_performance_metrics(self, agent_name: str, 
                         days: int = 7) -> Dict:
    """
    获取Agent性能指标
    
    参数：
        agent_name: Agent名称
        days: 统计天数
    
    返回：
        性能指标字典
    """
    with self._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT 
            COUNT(*) as total_executions,
            AVG(execution_time) as avg_execution_time,
            MAX(execution_time) as max_execution_time,
            MIN(execution_time) as min_execution_time,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
        FROM agent_executions
        WHERE agent_name = ? 
          AND started_at >= datetime('now', '-{} days')
        """.format(days), (agent_name,))
        
        row = cursor.fetchone()
        metrics = dict(row) if row else {}
        
        # 计算成功率
        total = metrics.get('total_executions', 0)
        if total > 0:
            metrics['success_rate'] = metrics.get('success_count', 0) / total
        else:
            metrics['success_rate'] = 0.0
        
        return metrics
```

## 注意事项

1. **数据库文件位置**
   - 默认位置：`./agent_memory.db`
   - 建议放在项目根目录或专门的data目录
   - 定期备份数据库文件

2. **并发控制**
   - SQLite支持读并发，写操作会加锁
   - 避免长时间持有数据库连接
   - 使用上下文管理器确保连接释放

3. **JSON数据处理**
   - 所有JSON字段使用`json.dumps()`存储
   - 读取后使用`json.loads()`解析
   - 确保数据可序列化

4. **事务管理**
   - 数据库类自动处理事务提交和回滚
   - 单个方法调用是原子的
   - 批量操作可使用显式事务

5. **索引维护**
   - 索引会占用额外空间
   - 频繁更新可能影响写入性能
   - 根据查询模式调整索引

## 总结

Agent记忆数据库通过5个核心表和23个索引，实现了完整的Agent间记忆共享和流转功能。它支持：

- 任务生命周期管理
- Agent执行记录追踪
- 消息流转日志审计
- 知识卡片持久化
- Agent状态实时监控

该设计满足了8-Agent协作架构的需求，为端侧智能数据工作站提供了可靠的数据支撑。
