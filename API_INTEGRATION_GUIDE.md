# 后端API集成指南

## 概述

本项目已完成以下工作：
1. ✅ 创建数据库系统（SQLite）存储硬编码数据
2. ✅ 创建RESTful API接口
3. ✅ 改造3个前端组件连接API

---

## 文件结构

### 后端文件
```
backend/
├── database.py           # 数据库管理器
├── routes/
│   ├── data_routes.py    # 数据管理API路由
│   └── __init__.py       # 路由包初始化
├── main.py              # 主应用（已集成数据路由）
└── data/
    └── antinet.db       # SQLite数据库（自动创建）
```

### 前端文件
```
src/
├── services/
│   └── dataService.ts   # API服务封装
└── components/
    ├── TeamKnowledgeManagement.tsx  # ✅ 已改造
    ├── TeamCollaboration.tsx         # ✅ 已改造
    └── AnalyticsReport.tsx           # ✅ 已改造
```

---

## API端点

### 团队成员API
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/data/team-members` | 获取所有团队成员 |
| POST | `/api/data/team-members` | 添加新成员 |
| PUT | `/api/data/team-members/{id}` | 更新成员信息 |
| DELETE | `/api/data/team-members/{id}` | 删除成员 |

### 知识空间API
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/data/knowledge-spaces` | 获取所有知识空间 |
| POST | `/api/data/knowledge-spaces` | 创建新空间 |

### 协作活动API
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/data/activities` | 获取最近活动 |
| POST | `/api/data/activities` | 添加新活动 |

### 评论API
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/data/comments/{target_id}` | 获取评论 |
| POST | `/api/data/comments` | 添加评论 |

### 分析数据API
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/data/analytics/{category}` | 获取分析数据 |
| PUT | `/api/data/analytics/{category}` | 更新分析数据 |

---

## 默认数据

### 团队成员（5个）
| 姓名 | 角色 | 贡献值 |
|------|------|--------|
| 张明 | 项目经理 | 85 |
| 李华 | 开发工程师 | 72 |
| 王强 | 设计师 | 65 |
| 陈静 | 产品经理 | 78 |
| 赵伟 | 测试工程师 | 60 |

### 知识空间（2个）
| 名称 | 卡片数 | 所有者 |
|------|--------|--------|
| 产品研发知识库 | 42 | 张明 |
| 技术架构设计 | 28 | 李华 |

### 协作活动（4个）
- 张明：创建了知识空间"产品研发知识库"
- 李华：添加了卡片"微服务架构设计"
- 王强：上传了设计稿"UI设计规范v2.0"
- 陈静：更新了需求"用户登录功能需求"

### 评论（4条）
- 张明：这个知识点总结得很到位，对团队很有帮助！
- 李华：补充一点：建议增加部署流程的说明
- 王强：同意，我也会补充UI设计部分
- 陈静：已收到，下周更新时加上

### 分析数据
- Growth：5个月的增长数据（9月-1月）
- Network：4个成员的知识网络数据

---

## 如何使用

### 1. 启动后端服务

**方法1：使用测试脚本（推荐）**
```bash
# Windows
start_backend_test.bat
```

**方法2：手动启动**
```bash
cd backend
python main.py
```

**方法3：使用虚拟环境**
```bash
cd backend
..\venv_arm64\Scripts\python.exe main.py
```

### 2. 测试API

**自动化测试**
```bash
# 需要先安装requests库
pip install requests

# 运行测试脚本
python test_api.py
```

**手动测试（浏览器）**
- 打开 http://localhost:8000/docs
- 在Swagger UI中测试各个API端点

**cURL测试**
```bash
# 健康检查
curl http://localhost:8000/api/health

# 获取团队成员
curl http://localhost:8000/api/data/team-members

# 获取知识空间
curl http://localhost:8000/api/data/knowledge-spaces
```

### 3. 启动前端

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 查看数据

**使用数据库工具**
```bash
# Windows
# 下载并安装 DB Browser for SQLite
# 打开 backend/data/antinet.db

# Mac
brew install --cask db-browser-for-sqlite

# Linux
sudo apt-get install sqlitebrowser
```

---

## 组件改造说明

### TeamKnowledgeManagement.tsx
**改动**：
- 添加dataService导入
- 修改`loadKnowledgeData`函数从API加载数据
- 支持团队成员、知识空间、活动、评论的动态加载

**数据流**：
```
加载 → 并行请求4个API → 设置state → UI显示
```

### TeamCollaboration.tsx
**改动**：
- 添加dataService和toast导入
- 修改`loadCollaborationData`函数从API加载数据
- 基于API数据生成图表数据

**数据流**：
```
加载 → 并行请求2个API → 生成图表数据 → UI显示
```

### AnalyticsReport.tsx
**改动**：
- 添加dataService和toast导入
- 修改`loadData`函数从API加载数据
- 支持growth、network等分析数据的动态获取

**数据流**：
```
加载 → 并行请求3个API → 生成分析数据 → UI显示
```

---

## 数据持久化

所有数据都存储在SQLite数据库中：
- 数据库文件：`backend/data/antinet.db`
- 自动创建和初始化
- 支持增删改查操作
- 重启服务后数据不丢失

---

## 故障排查

### 问题1：后端启动失败
```
错误：找不到模块 'fastapi'
解决：pip install -r backend/requirements.txt
```

### 问题2：前端连接失败
```
错误：Network Error
解决：检查后端是否运行在 http://localhost:8000
```

### 问题3：数据库文件不存在
```
现象：API返回空数据
解决：后端会自动创建数据库，检查 backend/data/ 目录权限
```

### 问题4：CORS错误
```
错误：Access-Control-Allow-Origin
解决：检查backend/main.py中的CORS配置
```

---

## API响应格式

### 成功响应
```json
{
  "id": 1,
  "name": "张明",
  "role": "项目经理",
  "contribution": 85
}
```

### 错误响应
```json
{
  "detail": "成员不存在"
}
```

---

## 下一步计划

1. ✅ 后端API - 已完成
2. ✅ 数据库 - 已完成
3. ✅ 3个组件改造 - 已完成
4. ⏳ 测试验证 - 进行中
5. ⏳ 其他组件改造 - 待定

---

## 技术栈

### 后端
- FastAPI - Web框架
- SQLite - 数据库
- Pydantic - 数据验证

### 前端
- React - UI框架
- TypeScript - 类型安全
- Recharts - 图表库
- Framer Motion - 动画

---

## 文档更新日期

2026-01-23

---

## 联系与支持

如有问题，请查看：
- 后端日志：`backend/logs/`
- 前端控制台：浏览器开发者工具
- API文档：http://localhost:8000/docs
