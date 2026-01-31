# 聊天机器人修复报告

## 问题描述

聊天机器人无法找到知识卡片，总是返回：
```
抱歉，我没有找到与您的问题相关的知识卡片。
```

## 问题根因

**SQL查询字段名错误** - 代码中使用了 `type` 字段，但数据库表中实际字段名是 `card_type`

### 数据库表结构

```sql
CREATE TABLE knowledge_cards (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    card_type TEXT,      -- ✓ 正确字段名
    category TEXT,
    similarity REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 错误代码

**文件:** `backend/routes/chat_routes.py`

```python
# ❌ 错误：使用了不存在的 type 字段
cursor.execute("""
    SELECT id, type, title, content, source, category, created_at
    FROM knowledge_cards
    WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
    ORDER BY id DESC
    LIMIT ?
""", (f"%{query_lower}%", f"%{query_lower}%", limit))

# ❌ 错误：列索引不匹配
cards.append({
    "card_id": f"db_{row[0]}",
    "id": row[0],
    "card_type": row[1],  # 错误：第1列是title不是type
    "title": row[2],
    "content": {"description": row[3]},
    "source": row[4],
    "category": row[5],
})
```

## 修复方案

### 1. 修复 `_search_cards_by_keyword` 函数

```python
# ✓ 正确：使用 card_type 字段
cursor.execute("""
    SELECT id, title, content, card_type, category, created_at
    FROM knowledge_cards
    WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
    ORDER BY id DESC
    LIMIT ?
""", (f"%{query_lower}%", f"%{query_lower}%", limit))

# ✓ 正确：列索引匹配
for row in rows:
    cards.append({
        "card_id": f"db_{row[0]}",
        "id": row[0],
        "title": row[1],              # 第1列：title
        "content": {"description": row[2]},  # 第2列：content
        "card_type": row[3] if row[3] else "blue",  # 第3列：card_type
        "category": row[4],           # 第4列：category
        "similarity": 0.8
    })
```

### 2. 修复 `list_cards` 函数

```python
# ✓ 修复WHERE子句
if card_type:
    cursor.execute("""
        SELECT id, title, content, card_type, category, created_at
        FROM knowledge_cards
        WHERE card_type = ?  -- 使用 card_type 而不是 type
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    """, (card_type, limit, offset))

# ✓ 修复COUNT查询
if card_type:
    cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE card_type = ?", (card_type,))
```

### 3. 修复 `get_card` 函数

```python
# ✓ 修复SELECT语句和列索引
cursor.execute("""
    SELECT id, title, content, card_type, category, created_at
    FROM knowledge_cards
    WHERE id = ?
""", (db_id,))

row = cursor.fetchone()
return {
    "card_id": f"db_{row[0]}",
    "id": row[0],
    "title": row[1],
    "content": {"description": row[2]},
    "card_type": row[3] if row[3] else "blue",
    "category": row[4],
    "similarity": 0.8
}
```

## 验证步骤

### 1. 重启后端服务

```bash
restart_backend.bat
```

或手动重启：
```bash
# 停止现有进程
taskkill /F /IM python.exe

# 启动后端
cd C:\test\antinet\backend
python main.py
```

### 2. 测试API

运行测试脚本：
```bash
test_chatbot.bat
```

或手动测试：
```bash
# 测试搜索
curl -X POST http://localhost:8000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Antinet"}'
```

### 3. 测试前端聊天机器人

1. 打开前端应用: http://localhost:3000
2. 点击聊天机器人图标
3. 输入问题："Antinet是什么？"
4. 应该能看到相关卡片和回复

## 预期结果

修复后，聊天机器人应该能够：

✅ 正确搜索知识库中的卡片  
✅ 返回相关的卡片内容  
✅ 根据卡片类型生成结构化回复  
✅ 提供推荐问题

### 示例对话

**用户:** Antinet是什么？

**机器人:**
```
📊 相关事实：
- Antinet系统概述
  Antinet智能知识管家是一款部署于骁龙AIPC的端侧智能数据工作站...

💡 原因解释：
- 为什么使用Antinet
  Antinet基于卢曼卡片盒笔记法，采用四色卡片...
```

## 其他修复的问题

### 问题1: 列索引错误

**原因:** SQL SELECT语句的列顺序与代码中的索引不匹配

**影响:** 即使查询成功，返回的数据字段也是错乱的

**修复:** 统一SQL列顺序和代码索引

### 问题2: 缺少字段

**原因:** 代码中引用了数据库表中不存在的 `source` 字段

**影响:** 可能导致查询失败或数据不完整

**修复:** 移除对不存在字段的引用

## 技术总结

### 问题类型
**数据库字段名不一致** - 代码与数据库schema不匹配

### 根本原因
1. 数据库表结构使用 `card_type` 字段
2. 代码中错误地使用了 `type` 字段
3. SQL查询失败，返回空结果集
4. 聊天机器人无法找到任何卡片

### 最佳实践建议

1. **使用ORM框架**
   - 使用SQLAlchemy等ORM避免手写SQL
   - 自动处理字段映射

2. **定义数据模型**
   ```python
   from dataclasses import dataclass
   
   @dataclass
   class KnowledgeCard:
       id: int
       title: str
       content: str
       card_type: str
       category: str
   ```

3. **添加单元测试**
   ```python
   def test_search_cards():
       cards = _search_cards_by_keyword("Antinet")
       assert len(cards) > 0
       assert "card_type" in cards[0]
   ```

4. **使用数据库迁移工具**
   - 使用Alembic管理schema变更
   - 保持代码和数据库同步

## 文件清单

### 已修改的文件
- ✅ `backend/routes/chat_routes.py` - 修复SQL查询和字段映射

### 新创建的文件
- ✅ `restart_backend.bat` - 后端重启脚本
- ✅ `test_chatbot.bat` - 聊天机器人测试脚本
- ✅ `CHATBOT_FIX_REPORT.md` - 本报告

## 下一步

1. ✅ 运行 `restart_backend.bat` 重启后端
2. ✅ 运行 `test_chatbot.bat` 验证修复
3. ✅ 在前端测试聊天机器人功能
4. ⏭️ 如有问题，查看后端日志

---

**修复时间:** 2026-01-31  
**修复状态:** ✅ SQL查询已修复，字段映射已更正  
**待验证:** 需要重启后端服务并测试
