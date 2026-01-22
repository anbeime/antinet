# 🔌 前后端对接指南

## ✅ 已完成的更改

### 1. 前端 API 服务更新 (`src/services/npuService.ts`)

#### 更改前（旧 API）
```typescript
const API_BASE = 'http://localhost:8000/api/npu';

async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/analyze`, { ... });
}
```

#### 更改后（新 API）
```typescript
const API_BASE = 'http://localhost:8000/api';

async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  // 调用新的 8-Agent 系统
  const response = await fetch(`${API_BASE}/generate/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: request.query,
      data_source: request.data_source,
      analysis_type: request.analysis_type,
    }),
  });
  // ... 返回格式适配
}
```

### 2. 新增的 API 方法

```typescript
// 生成完整报告
async generateReport(request: AnalyzeRequest): Promise<any>

// 获取所有卡片
async getCards(limit: number, offset: number): Promise<{ cards: Card[]; total: number }>

// 创建卡片
async createCard(card: Partial<Card>): Promise<Card>

// 更新卡片
async updateCard(id: string, card: Partial<Card>): Promise<Card>

// 删除卡片
async deleteCard(id: string): Promise<void>

// 获取知识图谱
async getKnowledgeGraph(limit: number, offset: number): Promise<{ nodes: KnowledgeNode[]; edges: any[]; total: number }>

// 搜索知识
async searchKnowledge(keyword: string, limit: number): Promise<{ results: any[]; total: number }>

// 健康检查
async getHealth(): Promise<any>

// 系统信息
async getSystemInfo(): Promise<any>
```

### 3. 组件更新

#### FourColorCards 组件 (`src/components/FourColorCards.tsx`)

**更改前**：
- 只接受 `CardType[]` 数组

**更改后**：
- 接受多种格式：`CardType[]` 或 `Record<string, CardType[]>`
- 支持显示事实、解释、风险、行动四个分类
- 添加统计信息显示
- 自动合并所有卡片类型

#### NPUAnalysis 页面 (`src/pages/NPUAnalysis.tsx`)

**更改**：
- 更新 API 调用，使用新的 `/api/generate/cards` 端点
- 改进 UI，添加更多视觉反馈
- 显示性能数据（推理延迟、总耗时、设备等）
- 传递完整的 8-Agent 结果（facts, explanations, risks, actions）

## 📊 API 端点对照表

| 功能 | 旧端点 | 新端点 | 状态 |
|------|--------|--------|------|
| 生成卡片 | `POST /api/npu/analyze` | `POST /api/generate/cards` | ✅ 已实现 |
| 生成报告 | - | `POST /api/generate/report` | ✅ 已实现 |
| 批量生成 | - | `POST /api/generate/batch` | ✅ 已实现 |
| 获取卡片列表 | - | `GET /api/cards` | ✅ 已实现 |
| 创建卡片 | - | `POST /api/cards` | ✅ 已实现 |
| 更新卡片 | - | `PUT /api/cards/{id}` | ✅ 已实现 |
| 删除卡片 | - | `DELETE /api/cards/{id}` | ✅ 已实现 |
| 知识图谱 | - | `GET /api/knowledge/graph` | ✅ 已实现 |
| 搜索知识 | - | `GET /api/knowledge/search` | ✅ 已实现 |
| 健康检查 | - | `GET /health` | ✅ 已实现 |
| 系统信息 | - | `GET /` | ✅ 已实现 |

## 🔄 数据格式变化

### 旧 API 响应格式
```json
{
  "success": true,
  "query": "分析销售数据",
  "cards": [
    {
      "color": "blue",
      "category": "事实",
      "title": "销售增长",
      "content": "..."
    }
  ],
  "performance": {
    "inference_time_ms": 1234,
    "total_time_ms": 2345
  }
}
```

### 新 API 响应格式
```json
{
  "cards": {
    "blue": [...],
    "green": [...],
    "yellow": [...],
    "red": [...]
  },
  "facts": {
    "blue": [...],
    "green": [...]
  },
  "explanations": {
    "blue": [...],
    "green": [...]
  },
  "risks": {
    "high": [...],
    "medium": [...],
    "low": [...]
  },
  "actions": {
    "urgent": [...],
    "important": [...],
    "normal": [...]
  },
  "execution_time": 15.3,
  "generated_at": "2026-01-22T10:30:00.000Z"
}
```

**前端自动适配**：`npuService.ts` 会自动转换格式，保持与旧接口的兼容性。

## 🚀 如何启动

### 方式1：一键启动（推荐）

```powershell
cd c:\test\antinet
start_all.bat
```

这会启动：
- 后端服务（端口 8000）
- 前端服务（端口 3000）

### 方式2：分别启动

**窗口1 - 后端：**
```powershell
cd c:\test\antinet\data-analysis-iteration
start.bat
```

**窗口2 - 前端：**
```powershell
cd c:\test\antinet
npm run dev
```

## 🧪 测试对接

### 1. 测试后端 API

```powershell
cd c:\test\antinet
test_frontend_backend.bat
```

### 2. 手动测试 API

```powershell
# 测试健康检查
curl http://localhost:8000/health

# 测试生成卡片
curl -X POST http://localhost:8000/api/generate/cards `
  -H "Content-Type: application/json" `
  -d "{\"query\": \"分析销售数据\"}"
```

### 3. 在浏览器中测试

1. 启动前后端
2. 访问 http://localhost:3000/npu-analysis
3. 输入查询，点击"开始分析"
4. 查看结果和性能数据

## 📱 前端页面说明

### 首页 (`/`)
- 知识卡片管理
- 四色卡片系统
- GTD 系统
- 团队协作
- 数据分析面板

### NPU 智能分析 (`/npu-analysis`)
- 输入查询
- 调用 8-Agent 协作
- 显示四色卡片结果
- 显示性能数据
- 实时状态反馈

### NPU 仪表板 (`/npu-dashboard`)
- NPU 性能监控
- 实时指标展示

## ⚙️ 配置说明

### 后端配置 (`data-analysis-iteration/config.py`)
```python
# API 地址
app_host: str = "0.0.0.0"
app_port: int = 8000

# CORS 配置
cors_origins: List[str] = ["http://localhost:3000"]
```

### 前端配置 (`src/services/npuService.ts`)
```typescript
// API 基础地址
const API_BASE = 'http://localhost:8000/api';
```

如果需要更改端口，请同步修改这两个配置。

## 🔍 故障排除

### 问题1：前端无法连接后端

**症状**：浏览器控制台显示连接错误

**解决方案**：
1. 确保后端正在运行（访问 http://localhost:8000/health）
2. 检查 CORS 配置
3. 检查浏览器控制台的错误信息

### 问题2：API 返回 404

**症状**：请求返回 404 Not Found

**解决方案**：
1. 确认 API 端点正确
2. 确认后端服务已启动
3. 检查 URL 是否正确（例如 `/api/generate/cards` 而不是 `/api/npu/analyze`）

### 问题3：API 返回 500

**症状**：请求返回 500 Internal Server Error

**解决方案**：
1. 查看后端日志
2. 检查 NPU 是否正常加载
3. 检查模型文件是否存在

## 📚 相关文档

- `START_GUIDE.md` - 完整启动指南
- `data-analysis-iteration/8_AGENT_IMPLEMENTATION_COMPLETE.md` - 8-Agent 实现文档
- `data-analysis-iteration/TROUBLESHOOTING.md` - 故障排除指南

## ✨ 下一步

1. **启动系统**：运行 `start_all.bat`
2. **测试前端**：访问 http://localhost:3000/npu-analysis
3. **提交查询**：输入查询并点击"开始分析"
4. **查看结果**：查看 8-Agent 生成的四色卡片
5. **探索功能**：尝试其他页面和功能

---

**前后端已完全对接！** 🎉
