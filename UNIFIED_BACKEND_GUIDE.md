# 后端统一说明

## 问题

项目之前有两套后端：
1. `backend/main.py` - 旧后端
2. `data-analysis-iteration/main.py` - 新后端（正确的）

## 解决方案

统一使用 `data-analysis-iteration/main.py` 作为唯一后端。

### 为什么使用 data-analysis-iteration？

1. **完整的知识库支持**：
   - 有完整的 `DatabaseManager` 实现
   - 有 `MemoryAgent` 支持向量检索
   - 有完整的 `agents` 架构

2. **已启动的服务**：
   - `start_simple.bat` 启动的是 `data-analysis-iteration/main.py`
   - 使用 `venv_arm64` 虚拟环境
   - 已配置 NPU 加速

3. **完整的API路由**：
   - `/api/cards` - 卡片管理
   - `/api/knowledge` - 知识图谱
   - `/api/rules` - 规则管理
   - `/api/generate` - 生成式AI
   - `/api/chat` - 聊天机器人（新增）

## 项目结构

```
antinet/
├── backend/                      # 旧后端（不再使用）
│   ├── main.py                  # ❌ 旧后端主文件
│   ├── routes/
│   │   └── chat_routes.py       # ❌ 已迁移到 data-analysis-iteration
│   └── database.py              # ❌ 旧数据库管理器
│
├── data-analysis-iteration/      # ✅ 正确的后端
│   ├── main.py                  # ✅ 唯一的后端入口
│   ├── api/
│   │   ├── cards.py             # 卡片管理API
│   │   ├── knowledge.py         # 知识图谱API
│   │   ├── rules.py             # 规则管理API
│   │   ├── generate.py          # 生成式AI API
│   │   └── chat.py             # ✅ 聊天机器人API（新增）
│   ├── agents/
│   │   ├── memory.py            # ✅ 太史阁（知识管理）
│   │   └── ...                 # 其他智能体
│   ├── database/
│   │   ├── database_manager.py  # ✅ 数据库管理器
│   │   ├── schema.sql          # ✅ SQLite知识库schema
│   │   └── duckdb_schema.sql   # ✅ DuckDB分析库schema
│   └── data/
│       ├── knowledge.db         # ✅ SQLite知识库
│       └── analysis.db         # ✅ DuckDB分析库
│
├── src/                        # ✅ 前端
│   ├── services/
│   │   └── chatService.ts      # ✅ 聊天服务（已更新）
│   └── components/
│       └── ChatBotModal.tsx    # ✅ 对话机器人组件（已更新）
│
└── venv_arm64/                # ✅ 正确的虚拟环境
```

## 启动后端

### 方法1：使用启动脚本（推荐）
```bash
start_simple.bat
```

### 方法2：手动启动
```bash
cd data-analysis-iteration
..\venv_arm64\Scripts\python.exe main.py
```

## 验证后端

1. 检查后端是否运行：
```bash
curl http://localhost:8000/
```

2. 检查API文档：
```
http://localhost:8000/docs
```

3. 测试聊天API：
```bash
python test_chat_api.py
```

## 新增的聊天API

### POST /api/chat/query
知识库查询接口

```json
{
  "query": "什么是风险等级？",
  "conversation_history": [],
  "context": {}
}
```

### POST /api/chat/search
卡片搜索接口

```json
{
  "query": "风险",
  "card_type": "yellow",
  "limit": 10
}
```

### GET /api/chat/cards
列出知识卡片

```
GET /api/chat/cards?card_type=blue&limit=10&offset=0
```

### GET /api/chat/card/{card_id}
获取单个卡片详情

```
GET /api/chat/card/card_001
```

### GET /api/chat/health
健康检查

```
GET /api/chat/health
```

## 前端配置

前端服务 `chatService.ts` 已配置为使用：
```
http://localhost:8000/api/chat
```

## 清理旧代码

可以考虑删除或归档：
- `backend/` 目录（如果确认不再使用）
- `backend/routes/chat_routes.py`（已迁移到 `data-analysis-iteration/api/chat.py`）

## 注意事项

1. **虚拟环境**：使用 `venv_arm64` 而不是 `venv`
2. **NPU依赖**：必须安装 NPU SDK（qai_appbuilder 2.38.0 ARM64）
3. **数据库路径**：
   - SQLite: `data-analysis-iteration/data/knowledge.db`
   - DuckDB: `data-analysis-iteration/data/analysis.db`

## 测试

运行测试脚本验证聊天功能：
```bash
python test_chat_api.py
```

测试前端：
1. 启动前端：`npm run dev`
2. 打开浏览器：`http://localhost:3000`
3. 点击对话机器人图标
4. 输入问题进行测试
