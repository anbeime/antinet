# Antinet 向量搜索 + RAG 溯源开发计划

## Phase 0: 紧急修复 - 聊天机器人能正常工作 ✅

### 任务清单
- [x] 检查数据库卡片数据（12张卡片）
- [x] 验证搜索逻辑（正常）
- [x] 检查 db_manager 初始化（正常）
- [ ] 测试 API 端点
- [ ] 检查前端调用

### 测试步骤
```bash
# 1. 启动后端
cd C:\test\antinet
python -m backend.main

# 2. 测试 API（新终端）
curl -X POST http://localhost:8000/api/chat/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"Antinet系统\"}"

# 3. 检查返回结果
```

---

## Phase 1: 向量搜索系统（预计 3-5 天）

### Day 1: 环境准备和数据库升级

#### Task 1.1: 安装依赖（30分钟）
```bash
pip install sqlite-vec sentence-transformers
```

#### Task 1.2: 升级数据库结构（1小时）
**文件：** `backend/database.py`

**修改内容：**
1. 添加向量表
```python
# 在 init_database() 中添加
cursor.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS card_embeddings 
    USING vec0(
        card_id INTEGER PRIMARY KEY,
        embedding FLOAT[384]  -- 使用 384 维向量（all-MiniLM-L6-v2）
    )
""")
```

2. 添加向量操作方法
```python
def add_card_embedding(self, card_id: int, embedding: List[float]):
    """添加卡片向量"""
    pass

def search_similar_cards(self, query_embedding: List[float], limit: int = 10):
    """向量相似度搜索"""
    pass
```

#### Task 1.3: 创建向量嵌入服务（2小时）
**新文件：** `backend/services/embedding_service.py`

```python
from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingService:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
    
    def encode_text(self, text: str) -> np.ndarray:
        """文本转向量"""
        return self.model.encode(text)
    
    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """批量文本转向量"""
        return self.model.encode(texts)
```

#### Task 1.4: 为现有卡片生成向量（1小时）
**新文件：** `backend/scripts/generate_embeddings.py`

```python
import sys
sys.path.insert(0, 'C:/test/antinet')

from backend.database import DatabaseManager
from backend.services.embedding_service import EmbeddingService
from pathlib import Path

db = DatabaseManager(Path('C:/test/antinet/data/antinet.db'))
embedding_service = EmbeddingService()

# 获取所有卡片
conn = db.get_connection()
cursor = conn.cursor()
cursor.execute("SELECT id, title, content FROM knowledge_cards")
cards = cursor.fetchall()

# 生成并存储向量
for card_id, title, content in cards:
    text = f"{title} {content}"
    embedding = embedding_service.encode_text(text)
    db.add_card_embedding(card_id, embedding.tolist())
    print(f"✓ 卡片 {card_id} 向量已生成")

print(f"✅ 完成！共生成 {len(cards)} 个向量")
```

---

### Day 2-3: 向量搜索 API 开发

#### Task 1.5: 升级聊天路由（3小时）
**文件：** `backend/routes/chat_routes.py`

**修改内容：**
1. 添加向量搜索函数
```python
def _search_cards_by_vector(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """使用向量相似度搜索"""
    global db_manager, embedding_service
    
    # 1. 生成查询向量
    query_embedding = embedding_service.encode_text(query)
    
    # 2. 向量搜索
    similar_cards = db_manager.search_similar_cards(
        query_embedding.tolist(), 
        limit=limit
    )
    
    return similar_cards
```

2. 修改 chat_query 接口
```python
@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    # 混合搜索：向量搜索 + 关键词搜索
    vector_cards = _search_cards_by_vector(request.query, limit=5)
    keyword_cards = _search_cards_by_keyword(request.query, limit=5)
    
    # 合并去重
    cards = _merge_and_deduplicate(vector_cards, keyword_cards)
    
    # 生成回复（带来源）
    response = _generate_response_with_sources(request.query, cards)
    
    return ChatResponse(
        response=response['text'],
        sources=response['sources'],
        cards=cards
    )
```

#### Task 1.6: 测试向量搜索（1小时）
```python
# 测试脚本
import requests

response = requests.post(
    "http://localhost:8000/api/chat/query",
    json={"query": "如何优化NPU性能"}
)

print(response.json())
```

---

## Phase 2: RAG 精确溯源系统（预计 2-3 天）

### Day 4: 来源追踪系统

#### Task 2.1: 修改回复生成逻辑（2小时）
**文件：** `backend/routes/chat_routes.py`

```python
def _generate_response_with_sources(query: str, cards: List[Dict]) -> Dict:
    """生成带精确来源的回复"""
    
    response_parts = []
    sources = []
    
    for idx, card in enumerate(cards[:5]):
        source_id = f"[{idx+1}]"
        
        # 添加来源标记
        response_parts.append(f"{source_id} {card['title']}")
        response_parts.append(f"   {card['content']['description']}")
        
        # 记录来源
        sources.append({
            "id": source_id,
            "card_id": card['card_id'],
            "title": card['title'],
            "excerpt": card['content']['description'][:100],
            "similarity": card.get('similarity', 0.0)
        })
    
    return {
        "text": "\n\n".join(response_parts),
        "sources": sources
    }
```

#### Task 2.2: 升级响应模型（30分钟）
```python
class SourceReference(BaseModel):
    """来源引用"""
    id: str  # [1], [2] 等
    card_id: str
    title: str
    excerpt: str
    similarity: float

class ChatResponse(BaseModel):
    """聊天响应"""
    response: str
    sources: List[SourceReference]  # 精确来源列表
    cards: List[Dict[str, Any]]
    suggested_questions: List[str]
```

---

### Day 5: 前端集成

#### Task 2.3: 前端显示来源引用（2小时）
**文件：** `src/components/ChatBotModal.tsx`

```typescript
// 渲染来源引用
{response.sources.map((source, idx) => (
  <div key={idx} className="source-reference">
    <span className="source-id">{source.id}</span>
    <a 
      href="#" 
      onClick={() => jumpToCard(source.card_id)}
      className="source-link"
    >
      {source.title}
    </a>
    <span className="similarity">
      相似度: {(source.similarity * 100).toFixed(1)}%
    </span>
  </div>
))}
```

#### Task 2.4: 实现点击跳转（1小时）
```typescript
const jumpToCard = (cardId: string) => {
  // 1. 关闭聊天窗口
  setShowChat(false);
  
  // 2. 打开卡片详情
  fetchCardDetail(cardId).then(card => {
    setSelectedCard(card);
    setShowCardDetail(true);
  });
};
```

---

## Phase 3: 可视化增强（预计 3-4 天）

### Day 6-7: 思维导图生成

#### Task 3.1: 安装依赖（30分钟）
```bash
npm install react-flow-renderer
```

#### Task 3.2: 创建思维导图组件（3小时）
**新文件：** `src/components/MindMapGenerator.tsx`

```typescript
import ReactFlow from 'react-flow-renderer';

const MindMapGenerator = ({ cards }) => {
  // 1. 将卡片转换为节点
  const nodes = cards.map((card, idx) => ({
    id: card.id,
    type: 'default',
    data: { label: card.title },
    position: { x: idx * 200, y: idx * 100 }
  }));
  
  // 2. 根据关联关系生成边
  const edges = generateEdges(cards);
  
  return <ReactFlow nodes={nodes} edges={edges} />;
};
```

#### Task 3.3: 集成到主界面（1小时）
```typescript
// 在 Home.tsx 中添加按钮
<button onClick={generateMindMap}>
  🧠 生成思维导图
</button>
```

---

### Day 8-9: 结构化笔记生成

#### Task 3.4: 创建笔记生成服务（2小时）
**新文件：** `backend/services/note_generator.py`

```python
class NoteGenerator:
    def generate_structured_note(self, cards: List[Dict]) -> str:
        """从卡片生成结构化笔记"""
        
        # 1. 按类型分组
        blue_cards = [c for c in cards if c['card_type'] == 'blue']
        green_cards = [c for c in cards if c['card_type'] == 'green']
        
        # 2. 生成大纲
        outline = self._generate_outline(cards)
        
        # 3. 填充内容
        note = self._fill_content(outline, cards)
        
        return note
```

#### Task 3.5: 添加 API 端点（1小时）
```python
@router.post("/generate-note")
async def generate_note(card_ids: List[str]):
    """生成结构化笔记"""
    cards = [get_card(cid) for cid in card_ids]
    note = note_generator.generate_structured_note(cards)
    return {"note": note}
```

---

## 🎯 优先级排序

### 🔴 **立即执行（本周）**
1. ✅ Phase 0: 修复聊天机器人
2. 🔴 Phase 1: 向量搜索（Day 1-3）
3. 🔴 Phase 2: RAG 溯源（Day 4-5）

### 🟡 **下周执行**
4. 🟡 Phase 3: 可视化增强（Day 6-9）

---

## 📊 进度追踪

| Phase | 任务 | 状态 | 预计时间 | 实际时间 |
|-------|------|------|---------|---------|
| 0 | 聊天机器人修复 | ✅ | 1天 | - |
| 1.1 | 安装依赖 | ⏳ | 30分钟 | - |
| 1.2 | 数据库升级 | ⏳ | 1小时 | - |
| 1.3 | 嵌入服务 | ⏳ | 2小时 | - |
| 1.4 | 生成向量 | ⏳ | 1小时 | - |
| 1.5 | 搜索API | ⏳ | 3小时 | - |
| 1.6 | 测试 | ⏳ | 1小时 | - |
| 2.1 | 来源追踪 | ⏳ | 2小时 | - |
| 2.2 | 响应模型 | ⏳ | 30分钟 | - |
| 2.3 | 前端显示 | ⏳ | 2小时 | - |
| 2.4 | 点击跳转 | ⏳ | 1小时 | - |
| 3.1-3.5 | 可视化 | 📋 | 2-3天 | - |

---

## 🚀 快速开始

### 1. 测试当前聊天功能
```bash
# 启动后端
cd C:\test\antinet
python -m backend.main

# 测试 API
curl -X POST http://localhost:8000/api/chat/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"Antinet\"}"
```

### 2. 开始 Phase 1
```bash
# 安装依赖
pip install sqlite-vec sentence-transformers

# 运行数据库升级脚本
python backend/scripts/upgrade_database.py

# 生成向量
python backend/scripts/generate_embeddings.py
```

---

## 📝 注意事项

1. **数据备份**：升级数据库前先备份
   ```bash
   copy C:\test\antinet\data\antinet.db C:\test\antinet\data\antinet.db.backup
   ```

2. **渐进式开发**：每个 Task 完成后立即测试

3. **版本控制**：每个 Phase 完成后提交 Git

4. **性能监控**：记录向量搜索的响应时间

---

需要我开始实施 Phase 1 吗？
