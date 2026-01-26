# 后端API接口规范

## 目录
- [技术栈](#技术栈)
- [API概览](#api概览)
- [接口详细说明](#接口详细说明)
- [错误处理](#错误处理)
- [性能优化](#性能优化)

## 技术栈

- **框架**：FastAPI 0.104+
- **Python版本**：Python 3.10+
- **数据库**：SQLite（元数据）+ DuckDB（分析数据）
- **向量检索**：BGE-M3 + FAISS/Chroma
- **ORM**：SQLAlchemy（可选）

### 依赖安装

```bash
pip install fastapi uvicorn sqlalchemy
pip install duckdb pandas numpy
pip install sentence-transformers faiss-cpu
```

## API概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cards | 获取所有知识卡片 |
| GET | /api/cards/{card_id} | 获取单个卡片详情 |
| POST | /api/cards | 创建新卡片 |
| GET | /api/activities | 获取最近活动记录 |
| POST | /api/knowledge/graph | 获取关联图谱 |
| POST | /api/upload | 上传文件 |
| POST | /api/query | 自然语言查询 |
| GET | /api/health | 健康检查 |
| GET | /api/performance | 性能监控 |

## 接口详细说明

### 1. 获取所有知识卡片

**接口：** `GET /api/cards`

**请求参数：**
```json
{
  "type": "fact | explanation | risk | action",  // 可选，过滤卡片类型
  "limit": 100,                                  // 可选，限制返回数量
  "offset": 0                                    // 可选，分页偏移
}
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "card_20250121_001",
      "type": "fact",
      "title": "12月销售数据统计",
      "summary": "销量环比下降15%，北京区域下滑最明显（22%），上海区域下滑8%",
      "content": {
        "total_sales": 1200000,
        "growth_rate": "15%",
        "statistics": {
          "daily_average": 38710,
          "max": 50000,
          "min": 25000
        }
      },
      "source": "database",
      "related_ids": ["card_20250121_002", "card_20250121_003"],
      "confidence": 0.98,
      "created_at": "2025-01-21T10:00:00Z",
      "updated_at": "2025-01-21T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 25
}
```

**实现代码：**
```python
from fastapi import FastAPI, Query
from typing import Optional, List

app = FastAPI()

@app.get("/api/cards")
async def get_cards(
    type: Optional[str] = Query(None, description="卡片类型过滤"),
    limit: int = Query(100, le=1000, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="分页偏移")
):
    """获取所有知识卡片"""
    # 从数据库查询卡片
    query = db.query(Card)
    
    if type:
        query = query.filter(Card.type == type)
    
    total = query.count()
    cards = query.offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": [card.to_dict() for card in cards],
        "total": total,
        "page": offset // limit + 1,
        "page_size": limit
    }
```

### 2. 获取单个卡片详情

**接口：** `GET /api/cards/{card_id}`

**路径参数：**
- `card_id`: 卡片ID

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "card_20250121_001",
    "type": "fact",
    "title": "12月销售数据统计",
    "summary": "...",
    "content": {...},
    "source": "database",
    "related_ids": ["card_20250121_002"],
    "confidence": 0.98,
    "created_at": "2025-01-21T10:00:00Z",
    "updated_at": "2025-01-21T10:00:00Z"
  }
}
```

**实现代码：**
```python
@app.get("/api/cards/{card_id}")
async def get_card(card_id: str):
    """获取单个卡片详情"""
    card = db.query(Card).filter(Card.id == card_id).first()
    
    if not card:
        return {"success": False, "error": "卡片不存在"}
    
    return {
        "success": True,
        "data": card.to_dict()
    }
```

### 3. 创建新卡片

**接口：** `POST /api/cards`

**请求体：**
```json
{
  "type": "fact",
  "title": "卡片标题",
  "summary": "卡片摘要",
  "content": {...},
  "source": "api",
  "related_ids": ["card_xxx"]
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "card_20250121_005",
    "type": "fact",
    "title": "卡片标题",
    ...
  }
}
```

**实现代码：**
```python
from pydantic import BaseModel

class CardCreate(BaseModel):
    type: str
    title: str
    summary: str
    content: dict
    source: str
    related_ids: List[str] = []

@app.post("/api/cards")
async def create_card(card_data: CardCreate):
    """创建新卡片"""
    # 调用Card Classifier生成卡片
    card = Card(
        type=card_data.type,
        title=card_data.title,
        summary=card_data.summary,
        content=card_data.content,
        source=card_data.source,
        related_ids=card_data.related_ids
    )
    
    db.add(card)
    db.commit()
    
    # 存储到知识库
    await memory_service.store_card(card.to_dict())
    
    return {
        "success": True,
        "data": card.to_dict()
    }
```

### 4. 获取最近活动记录

**接口：** `GET /api/activities`

**请求参数：**
```json
{
  "limit": 10,     // 可选，返回数量
  "type": null     // 可选，活动类型过滤
}
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "act_20250121_001",
      "title": "新增销售数据分析卡片",
      "type": "事实卡片",
      "time": "2026-01-21 14:30",
      "description": "从销售数据库提取12月数据生成事实卡片"
    }
  ]
}
```

**实现代码：**
```python
@app.get("/api/activities")
async def get_activities(
    limit: int = Query(10, le=100),
    type: Optional[str] = Query(None)
):
    """获取最近活动记录"""
    query = db.query(Activity).order_by(Activity.time.desc())
    
    if type:
        query = query.filter(Activity.type == type)
    
    activities = query.limit(limit).all()
    
    return {
        "success": True,
        "data": [activity.to_dict() for activity in activities]
    }
```

### 5. 获取关联图谱

**接口：** `POST /api/knowledge/graph`

**请求体：**
```json
{
  "card_id": "card_20250121_001",
  "type": "semantic",  // semantic | topic | logic | attribute | user
  "depth": 2,         // 可选，图谱深度
  "limit": 20         // 可选，节点数量限制
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "card_20250121_001",
        "label": "12月销售数据统计",
        "type": "fact",
        "color": "#3b82f6"
      },
      {
        "id": "card_20250121_002",
        "label": "销售下滑原因分析",
        "type": "explanation",
        "color": "#22c55e"
      }
    ],
    "edges": [
      {
        "from": "card_20250121_001",
        "to": "card_20250121_002",
        "label": "关联",
        "weight": 0.85
      }
    ]
  }
}
```

**实现代码：**
```python
@app.post("/api/knowledge/graph")
async def get_graph(
    card_id: str,
    type: str = "semantic",
    depth: int = 2,
    limit: int = 20
):
    """获取关联图谱"""
    # 从Memory检索相关卡片
    related_cards = await memory_service.retrieve_related(
        card_id=card_id,
        retrieval_type=type,
        top_k=limit
    )
    
    # 构建图谱数据
    nodes = []
    edges = []
    visited = {card_id}
    
    for card in related_cards:
        if card['id'] not in visited:
            nodes.append({
                "id": card['id'],
                "label": card['title'],
                "type": card['type'],
                "color": get_card_color(card['type'])
            })
            visited.add(card['id'])
    
    for card in related_cards:
        for related_id in card.get('related_ids', []):
            if related_id in visited:
                edges.append({
                    "from": card['id'],
                    "to": related_id,
                    "label": "关联",
                    "weight": 0.85
                })
    
    return {
        "success": True,
        "data": {
            "nodes": nodes[:limit],
            "edges": edges[:limit * 2]
        }
    }

def get_card_color(card_type):
    color_map = {
        'fact': '#3b82f6',
        'explanation': '#22c55e',
        'risk': '#eab308',
        'action': '#ef4444'
    }
    return color_map.get(card_type, '#666666')
```

### 6. 上传文件

**接口：** `POST /api/upload`

**请求：** `multipart/form-data`

**字段：**
- `files`: 文件列表（支持多文件）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "processed_files": [
      {
        "filename": "sales_data.csv",
        "type": "csv",
        "rows": 365,
        "columns": 10,
        "status": "success"
      }
    ],
    "generated_cards": ["card_20250121_006", "card_20250121_007"]
  }
}
```

**实现代码：**
```python
from fastapi import UploadFile, File

@app.post("/api/upload")
async def upload_files(
    files: List[UploadFile] = File(..., description="文件列表")
):
    """批量上传文件"""
    processed_files = []
    generated_cards = []
    
    for file in files:
        # 保存文件
        file_path = f"./user-data/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # 处理文件
        result = await process_file(file_path)
        processed_files.append(result)
        
        # 如果生成了卡片，记录ID
        if result.get('card_ids'):
            generated_cards.extend(result['card_ids'])
    
    return {
        "success": True,
        "data": {
            "processed_files": processed_files,
            "generated_cards": generated_cards
        }
    }

async def process_file(file_path: str) -> dict:
    """处理单个文件"""
    import pandas as pd
    
    # 读取文件
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    elif file_path.endswith('.xlsx'):
        df = pd.read_excel(file_path)
    elif file_path.endswith('.json'):
        df = pd.read_json(file_path)
    else:
        return {"status": "error", "message": "不支持的文件格式"}
    
    # 调用7-Agent处理数据
    cards = await orchestrator_agent.process_data(df)
    
    # 保存卡片
    card_ids = []
    for card in cards:
        db.add(card)
        card_ids.append(card.id)
    
    db.commit()
    
    return {
        "status": "success",
        "filename": file_path.split('/')[-1],
        "type": file_path.split('.')[-1],
        "rows": len(df),
        "columns": len(df.columns),
        "card_ids": card_ids
    }
```

### 7. 自然语言查询

**接口：** `POST /api/query`

**请求体：**
```json
{
  "query": "分析上个月销售趋势"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "card_20250121_008",
        "type": "fact",
        "title": "12月销售数据",
        ...
      }
    ],
    "structured_query": {
      "metrics": ["sales"],
      "time_range": {"start": "2024-12-01", "end": "2024-12-31"}
    },
    "processing_time": 0.48
  }
}
```

**实现代码：**
```python
from pydantic import BaseModel

class QueryRequest(BaseModel):
    query: str

@app.post("/api/query")
async def query_nlp(request: QueryRequest):
    """自然语言查询"""
    import time
    start_time = time.time()
    
    # 1. Orchestrator解析意图
    intent = await orchestrator_agent.parse_intent(request.query)
    
    # 2. Preprocessor生成结构化查询
    structured_query = await preprocessor_agent.extract_query(
        request.query,
        current_date="2025-01-21"
    )
    
    # 3. Query Builder执行查询
    data = await query_builder_agent.execute_query(structured_query)
    
    # 4. Card Classifier生成四色卡片
    cards = await card_classifier_agent.generate_cards(data, intent)
    
    # 5. 保存卡片
    card_ids = []
    for card in cards:
        db.add(card)
        card_ids.append(card.id)
    db.commit()
    
    # 6. 存储到知识库
    for card in cards:
        await memory_service.store_card(card.to_dict())
    
    processing_time = time.time() - start_time
    
    return {
        "success": True,
        "data": {
            "cards": [card.to_dict() for card in cards],
            "structured_query": structured_query,
            "processing_time": processing_time
        }
    }
```

### 8. 健康检查

**接口：** `GET /api/health`

**响应示例：**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:00:00Z",
  "version": "1.0.0",
  "components": {
    "database": "ok",
    "npu": "ok",
    "vector_db": "ok"
  }
}
```

**实现代码：**
```python
@app.get("/api/health")
async def health_check():
    """健康检查"""
    components = {
        "database": "ok",
        "npu": "ok",
        "vector_db": "ok"
    }
    
    # 检查数据库连接
    try:
        db.execute("SELECT 1")
    except Exception as e:
        components["database"] = f"error: {str(e)}"
    
    # 检查NPU状态
    try:
        npu_status = check_npu_status()
        components["npu"] = npu_status
    except Exception as e:
        components["npu"] = f"error: {str(e)}"
    
    return {
        "status": "healthy" if all(v == "ok" for v in components.values()) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "components": components
    }
```

### 9. 性能监控

**接口：** `GET /api/performance`

**响应示例：**
```json
{
  "npu": {
    "latency": 0.48,
    "throughput": 2083,
    "memory_usage": "2.1GB"
  },
  "database": {
    "query_time": 0.015,
    "connection_pool": "5/10"
  },
  "vector_db": {
    "index_size": "50MB",
    "query_time": 0.05
  }
}
```

## 错误处理

### 统一错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {...}
  }
}
```

### 错误码定义

| 错误码 | 说明 |
|--------|------|
| INVALID_REQUEST | 请求参数错误 |
| CARD_NOT_FOUND | 卡片不存在 |
| FILE_UPLOAD_FAILED | 文件上传失败 |
| NPU_ERROR | NPU推理错误 |
| DATABASE_ERROR | 数据库错误 |
| VECTOR_DB_ERROR | 向量数据库错误 |

### 全局异常处理器

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse

class APIException(Exception):
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "内部服务器错误",
                "details": str(exc)
            }
        }
    )
```

## 性能优化

### 1. 响应缓存

```python
from fastapi_cache import FastAPICache, InMemoryCache
from fastapi_cache.decorator import cache

@app.get("/api/cards")
@cache(expire=300)  # 缓存5分钟
async def get_cards_cached():
    """带缓存的卡片列表"""
    return await get_cards()
```

### 2. 异步数据库查询

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine("sqlite+aiosqlite:///./antinet.db")
async_session = AsyncSession(engine)

async def get_cards_async():
    async with async_session() as session:
        result = await session.execute(select(Card))
        return result.scalars().all()
```

### 3. NPU批处理

```python
async def batch_generate_cards(data_list: List[dict]) -> List[Card]:
    """批量生成卡片"""
    # 批量调用NPU推理
    batch_results = await npu_model.batch_inference(data_list)
    
    cards = []
    for result in batch_results:
        cards.append(Card.from_npu_result(result))
    
    return cards
```

## 注意事项

- 所有接口应添加适当的错误处理和日志记录
- NPU推理应设置超时机制
- 大文件上传应使用流式处理
- 敏感信息应在日志中脱敏
- 定期清理过期的缓存数据
- 监控API响应时间和错误率
