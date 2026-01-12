# API 接口规范

## 概述

Antinet 后端 API 基于 FastAPI 框架,提供数据分析、四色卡片生成、性能监控等功能。

## 基础信息

- **基础 URL**: `http://localhost:8000`
- **API 版本**: v1.0.0
- **认证方式**: 无 (本地应用)
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用规范

### 路由前缀

所有 API 路由必须使用 `/api` 前缀:

```
✅ 正确: /api/analyze, /api/health, /api/performance/benchmark
❌ 错误: /analyze, /health, /performance/benchmark
```

### 请求头

```http
Content-Type: application/json
Accept: application/json
```

### 响应格式

#### 成功响应

```json
{
  "data": { ... },
  "success": true
}
```

#### 错误响应

```json
{
  "detail": {
    "error": "错误类型",
    "message": "错误描述",
    "steps": ["解决步骤1", "解决步骤2"]
  }
}
```

### HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 413 | Payload Too Large | 文件过大 |
| 500 | Internal Server Error | 服务器错误 |
| 503 | Service Unavailable | 模型未加载 |

## API 端点

### 1. 健康检查

#### GET /api/health

检查后端服务健康状态。

**请求**:

```http
GET /api/health
```

**响应**:

```json
{
  "status": "healthy",
  "model": "qwen2-1.5b",
  "model_loaded": true,
  "device": "NPU",
  "data_stays_local": true
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 服务状态: "healthy" \| "unhealthy" |
| model | string | 模型名称 |
| model_loaded | boolean | 模型是否已加载 |
| device | string | 推理设备: "NPU" \| "CPU" \| "GPU" |
| data_stays_local | boolean | 数据不出域配置 |

**示例**:

```bash
curl http://localhost:8000/api/health
```

### 2. 数据分析

#### POST /api/analyze

接收自然语言查询,返回四色卡片分析结果。

**请求**:

```http
POST /api/analyze
Content-Type: application/json

{
  "query": "分析上个月的销售数据趋势",
  "data_source": "local",
  "context": {}
}
```

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 自然语言查询 |
| data_source | string | 否 | 数据源,默认 "local" |
| context | object | 否 | 上下文信息 |

**响应**:

```json
{
  "query": "分析上个月的销售数据趋势",
  "facts": [
    "基于NPU分析,上个月销售数据核心指标如下...",
    "关键指标达到预期目标"
  ],
  "explanations": [
    "NPU加速分析显示主要驱动因素是...",
    "数据趋势符合历史规律"
  ],
  "risks": [
    "需要关注的风险点包括...",
    "建议建立监控机制"
  ],
  "actions": [
    "推荐的行动方案: ...",
    "优先级建议: 高"
  ],
  "cards": [
    {
      "color": "blue",
      "title": "数据事实",
      "content": "基于NPU分析,上个月销售数据核心指标如下...",
      "category": "事实"
    },
    {
      "color": "green",
      "title": "原因解释",
      "content": "NPU加速分析显示主要驱动因素是...",
      "category": "解释"
    },
    {
      "color": "yellow",
      "title": "风险预警",
      "content": "需要关注的风险点包括...",
      "category": "风险"
    },
    {
      "color": "red",
      "title": "行动建议",
      "content": "推荐的行动方案...",
      "category": "行动"
    }
  ],
  "visualizations": [
    {
      "type": "bar",
      "title": "数据分布",
      "data": [
        {"name": "指标A", "value": 85},
        {"name": "指标B", "value": 72},
        {"name": "指标C", "value": 91}
      ]
    }
  ],
  "performance": {
    "total_time_ms": 500.12,
    "inference_time_ms": 450.23,
    "device": "NPU"
  }
}
```

**响应字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| query | string | 查询内容 |
| facts | string[] | 事实列表 |
| explanations | string[] | 解释列表 |
| risks | string[] | 风险列表 |
| actions | string[] | 行动列表 |
| cards | FourColorCard[] | 四色卡片 |
| visualizations | object[] | 可视化配置 |
| performance | object | 性能指标 |

**FourColorCard**:

| 字段 | 类型 | 说明 |
|------|------|------|
| color | string | 颜色: "blue" \| "green" \| "yellow" \| "red" |
| title | string | 卡片标题 |
| content | string | 卡片内容 |
| category | string | 类别: "事实" \| "解释" \| "风险" \| "行动" |

**错误响应** (503):

```json
{
  "detail": {
    "error": "模型未加载",
    "message": "请先部署QNN模型到AIPC",
    "steps": [
      "1. 安装QAI AppBuilder: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-xxx.whl",
      "2. 转换模型到QNN格式: cd backend/models && python convert_to_qnn_on_aipc.py",
      "3. 重启后端服务: python main.py"
    ]
  }
}
```

**示例**:

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "分析上个月的销售数据趋势",
    "data_source": "local",
    "context": {}
  }'
```

### 3. 数据上传

#### POST /api/data/upload

上传数据文件到本地 (数据不出域)。

**请求**:

```http
POST /api/data/upload
Content-Type: multipart/form-data

file: <binary>
```

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 上传的文件 |

**限制**:

- 文件大小: 最大 10MB
- 文件类型: .csv, .json, .xlsx, .txt

**响应**:

```json
{
  "filename": "sales_data.csv",
  "size_bytes": 1024,
  "saved_path": "backend/data/uploads/sales_data.csv",
  "data_stays_local": true
}
```

**响应字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| filename | string | 文件名 |
| size_bytes | number | 文件大小 (字节) |
| saved_path | string | 保存路径 (本地) |
| data_stays_local | boolean | 数据不出域 (始终 true) |

**错误响应** (413):

```json
{
  "detail": "文件过大,最大支持 10MB"
}
```

**示例**:

```bash
curl -X POST http://localhost:8000/api/data/upload \
  -F "file=@sales_data.csv"
```

### 4. 性能基准测试

#### GET /api/performance/benchmark

运行 NPU 性能基准测试,测试不同序列长度的推理延迟。

**请求**:

```http
GET /api/performance/benchmark
```

**响应**:

```json
{
  "device": "NPU",
  "model": "qwen2-1.5b",
  "tests": [
    {
      "sequence_length": 32,
      "avg_latency_ms": 120.5,
      "min_latency_ms": 115.2,
      "max_latency_ms": 128.7,
      "throughput_qps": 8.3
    },
    {
      "sequence_length": 64,
      "avg_latency_ms": 230.8,
      "min_latency_ms": 225.1,
      "max_latency_ms": 238.9,
      "throughput_qps": 4.33
    },
    {
      "sequence_length": 128,
      "avg_latency_ms": 450.2,
      "min_latency_ms": 442.5,
      "max_latency_ms": 461.8,
      "throughput_qps": 2.22
    },
    {
      "sequence_length": 256,
      "avg_latency_ms": 850.5,
      "min_latency_ms": 838.2,
      "max_latency_ms": 865.1,
      "throughput_qps": 1.18
    }
  ]
}
```

**响应字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| device | string | 推理设备 |
| model | string | 模型名称 |
| tests | BenchmarkTest[] | 测试结果 |

**BenchmarkTest**:

| 字段 | 类型 | 说明 |
|------|------|------|
| sequence_length | number | 序列长度 (tokens) |
| avg_latency_ms | number | 平均延迟 (毫秒) |
| min_latency_ms | number | 最小延迟 (毫秒) |
| max_latency_ms | number | 最大延迟 (毫秒) |
| throughput_qps | number | 吞吐量 (查询/秒) |

**错误响应** (503):

```json
{
  "detail": {
    "error": "模型未加载,无法进行基准测试",
    "message": "请先部署QNN模型到AIPC",
    "steps": [
      "1. 安装QAI AppBuilder: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-xxx.whl",
      "2. 转换模型到QNN格式: cd backend/models && python convert_to_qnn_on_aipc.py",
      "3. 重启后端服务: python main.py"
    ]
  }
}
```

**示例**:

```bash
curl http://localhost:8000/api/performance/benchmark
```

## Pydantic 模型

### QueryRequest

```python
class QueryRequest(BaseModel):
    """数据查询请求"""
    query: str = Field(..., description="自然语言查询")
    data_source: str = Field(default="local", description="数据源")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")
```

### FourColorCard

```python
class FourColorCard(BaseModel):
    """四色卡片"""
    color: str = Field(..., description="卡片颜色: blue|green|yellow|red")
    title: str = Field(..., description="卡片标题")
    content: str = Field(..., description="卡片内容")
    category: str = Field(..., description="类别: 事实|解释|风险|行动")
```

### AnalysisResult

```python
class AnalysisResult(BaseModel):
    """分析结果"""
    query: str
    facts: List[str] = Field(default_factory=list, description="事实卡片")
    explanations: List[str] = Field(default_factory=list, description="解释卡片")
    risks: List[str] = Field(default_factory=list, description="风险卡片")
    actions: List[str] = Field(default_factory=list, description="行动卡片")
    cards: List[FourColorCard] = Field(default_factory=list, description="生成的四色卡片")
    visualizations: List[Dict] = Field(default_factory=list, description="可视化配置")
    performance: Dict[str, float] = Field(default_factory=dict, description="性能指标")
```

## 错误处理

### 错误响应格式

```json
{
  "detail": "错误描述"
}
```

或

```json
{
  "detail": {
    "error": "错误类型",
    "message": "错误描述",
    "steps": ["解决步骤1", "解决步骤2"]
  }
}
```

### 常见错误

| 状态码 | 错误类型 | 说明 | 解决方法 |
|--------|---------|------|----------|
| 413 | Payload Too Large | 文件过大 | 减小文件大小 (最大 10MB) |
| 503 | Service Unavailable | 模型未加载 | 部署 QNN 模型到 AIPC |
| 500 | Internal Server Error | 服务器错误 | 查看日志,检查配置 |

## 性能指标

### 目标性能

| 指标 | 目标 | 说明 |
|------|------|------|
| NPU 推理延迟 | < 500ms | 128 tokens |
| 吞吐量 | > 2 QPS | 128 tokens |
| 端到端响应 | < 1s | 包含后处理 |

### 实测性能

| 序列长度 | 平均延迟 | 吞吐量 |
|---------|---------|--------|
| 32 tokens | ~120ms | ~8.3 QPS |
| 64 tokens | ~230ms | ~4.3 QPS |
| 128 tokens | ~450ms | ~2.2 QPS |
| 256 tokens | ~850ms | ~1.2 QPS |

## API 文档

### 自动生成文档

FastAPI 自动生成交互式 API 文档:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 使用示例

1. 访问 http://localhost:8000/docs
2. 展开需要的 API 端点
3. 点击 "Try it out"
4. 填写参数
5. 点击 "Execute"

## 前端集成

### API 基础配置

```typescript
const API_BASE_URL = 'http://localhost:8000';
```

### 健康检查

```typescript
async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return await response.json();
}
```

### 数据分析

```typescript
async function analyzeData(query: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      data_source: 'local',
      context: {}
    })
  });

  return await response.json();
}
```

### 性能测试

```typescript
async function runBenchmark(): Promise<BenchmarkResult> {
  const response = await fetch(`${API_BASE_URL}/api/performance/benchmark`);
  return await response.json();
}
```

### 数据上传

```typescript
async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/data/upload`, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
```

## 总结

Antinet API 规范:

1. **路由规范**: 所有路由使用 `/api` 前缀
2. **数据验证**: Pydantic 模型验证
3. **错误处理**: 统一错误格式
4. **性能监控**: 实时性能指标
5. **自动文档**: Swagger UI + ReDoc

**核心端点**:

- ✅ `/api/health` - 健康检查
- ✅ `/api/analyze` - 数据分析 (四色卡片)
- ✅ `/api/data/upload` - 数据上传 (本地)
- ✅ `/api/performance/benchmark` - 性能基准测试

**关键特性**:

- ✅ 数据不出域
- ✅ NPU 加速推理
- ✅ 性能监控
- ✅ 详细错误信息
- ✅ 自动生成文档
