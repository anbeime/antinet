# 🚀 向量搜索 + RAG 溯源 - 一键部署指南

## 📋 快速开始（30分钟完成）

### Step 1: 安装依赖（10分钟）

```bash
cd C:\test\antinet

# 激活虚拟环境
venv_arm64\Scripts\activate

# 安装 sentence-transformers（会自动安装 torch）
pip install sentence-transformers

# 验证安装
python -c "from sentence_transformers import SentenceTransformer; print('OK')"
```

**注意**: 首次运行会下载模型文件（约 90MB），需要网络连接。

---

### Step 2: 创建向量表（1分钟）

```bash
python backend\database_vector.py
```

**预期输出**:
```
Creating vector table...
  Total cards: 12
  Embedded cards: 0
  Coverage: 0.0%
Vector table created successfully!
```

---

### Step 3: 生成向量（5分钟）

```bash
python backend\scripts\generate_embeddings.py
```

**预期输出**:
```
==============================================================
Antinet 向量生成工具
==============================================================

1. 初始化数据库...
   OK 向量表已创建

2. 初始化嵌入服务...
   OK 模型: all-MiniLM-L6-v2
   OK 维度: 384

3. 获取知识卡片...
   OK 找到 12 张卡片

4. 生成向量嵌入...
   ID     标题                           状态       时间
   --------------------------------------------------------------
   1      Antinet系统核心功能            OK         0.234s
   2      一键启动Antinet系统            OK         0.187s
   ...
   12     系统API接口文档                OK         0.201s

==============================================================
生成完成！
==============================================================
  成功: 12/12
  总耗时: 2.45s
  平均: 0.204s/卡片

5. 验证向量数据...
   总卡片: 12
   已生成向量: 12
   覆盖率: 100.0%

6. 测试向量搜索...
   查询: Antinet系统功能
   找到 3 个相似结果:
   1. Antinet系统核心功能 (相似度: 0.892)
   2. 一键启动Antinet系统 (相似度: 0.765)
   3. 系统API接口文档 (相似度: 0.654)

==============================================================
✓ 全部完成！
==============================================================
```

---

### Step 4: 修改 main.py 启用向量搜索（5分钟）

在 `backend/main.py` 中添加以下代码：

```python
# 在导入部分添加
from routes.chat_vector_patch import init_vector_search

# 在注册聊天路由后添加（约第120行）
if chat_router is not None:
    app.include_router(chat_router)
    import routes.chat_routes as chat_routes_module
    chat_routes_module.db_manager = db_manager
    
    # 🆕 初始化向量搜索
    try:
        vector_enabled = init_vector_search(chat_routes_module, db_manager)
        if vector_enabled:
            logger.info("[OK] 向量搜索已启用")
        else:
            logger.warning("[Warning] 向量搜索初始化失败，使用关键词搜索")
    except Exception as e:
        logger.error(f"[Error] 向量搜索初始化异常: {e}")
    
    logger.info("[OK] 聊天机器人路由已注册")
```

---

### Step 5: 修改聊天查询接口使用混合搜索（5分钟）

在 `backend/routes/chat_routes.py` 的 `chat_query` 函数中：

```python
@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    知识库查询接口（支持向量搜索）
    """
    try:
        query = request.query.strip()
        
        if not query:
            raise HTTPException(status_code=400, detail="查询不能为空")
        
        logger.info(f"[ChatRoutes] 收到查询: {query}")
        
        # 🆕 使用混合搜索（如果可用）
        if hasattr(sys.modules[__name__], '_hybrid_search'):
            relevant_cards = _hybrid_search(query, limit=10)
            logger.info(f"[ChatRoutes] 混合搜索找到 {len(relevant_cards)} 张卡片")
        else:
            # 降级到关键词搜索
            relevant_cards = _search_cards_by_keyword(query, limit=10)
            logger.info(f"[ChatRoutes] 关键词搜索找到 {len(relevant_cards)} 张卡片")
        
        # 🆕 生成带来源的回答（如果可用）
        if hasattr(sys.modules[__name__], '_generate_response_with_sources'):
            response_data = _generate_response_with_sources(query, relevant_cards)
            response_text = response_data['text']
            sources = response_data['sources']
        else:
            # 降级到原来的回答生成
            response_text = _generate_response(query, relevant_cards)
            sources = []
        
        # 生成推荐问题
        suggested_questions = _generate_suggested_questions(query, relevant_cards)
        
        return ChatResponse(
            response=response_text,
            sources=sources,  # 🆕 返回来源信息
            cards=relevant_cards,
            suggested_questions=suggested_questions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ChatRoutes] 查询失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
```

---

### Step 6: 重启后端测试（5分钟）

```bash
# 停止当前服务（Ctrl+C）

# 重新启动
python -m backend.main
```

**查看日志，应该看到**:
```
[OK] 嵌入服务已初始化
[OK] 数据库向量方法已添加
[OK] 向量搜索功能已启用
[OK] 向量搜索已启用
[OK] 聊天机器人路由已注册
```

---

### Step 7: 测试向量搜索（5分钟）

```bash
# 新终端运行测试
python C:\test\test_vector_search.py
```

测试脚本会自动创建（见下方）

---

## 🧪 测试脚本

创建 `C:\test\test_vector_search.py`:

```python
import requests
import json

url = "http://localhost:8000/api/chat/query"

test_queries = [
    "如何优化NPU性能",
    "团队如何协作",
    "系统有哪些功能",
    "数据安全如何保证"
]

print("=== 测试向量搜索 ===\n")

for query in test_queries:
    print(f"查询: {query}")
    
    response = requests.post(url, json={"query": query})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ 找到 {len(data['cards'])} 张卡片")
        print(f"  来源数: {len(data.get('sources', []))}")
        
        # 显示相似度
        for card in data['cards'][:3]:
            print(f"  - {card['title']}: {card.get('similarity', 0):.3f}")
        
        # 显示来源
        if data.get('sources'):
            print(f"\n  来源:")
            for src in data['sources'][:2]:
                print(f"    {src['id']} {src['title']} ({src['similarity']:.3f})")
    else:
        print(f"✗ 失败: {response.status_code}")
    
    print("-" * 60)
```

---

## 📊 预期效果

### 向量搜索 vs 关键词搜索

**查询**: "如何提升性能"

**关键词搜索**:
- 找到 0-1 张卡片（必须包含"性能"关键词）

**向量搜索**:
- 找到 5-8 张卡片
- 包含"NPU优化"、"推理加速"、"系统调优"等语义相关内容
- 相似度分数: 0.65-0.92

### RAG 溯源效果

**回答示例**:
```
根据知识库，关于「如何优化NPU性能」的信息如下：

[1] 📊 **NPU推理性能优化**
   通过BURST模式和量化技术可以显著提升NPU推理速度...
   _相似度: 89.2%_

[2] 💡 **性能优化原理**
   NPU采用专用硬件加速，相比CPU有10-50倍性能提升...
   _相似度: 76.5%_

[3] 🎯 **优化步骤**
   1. 启用BURST模式 2. 使用INT8量化 3. 批处理优化...
   _相似度: 68.3%_

💡 **提示**: 点击来源标记可查看完整卡片内容
```

---

## ⚠️ 常见问题

### Q1: sentence-transformers 安装失败
**A**: Windows ARM64 可能需要先安装 torch:
```bash
pip install torch torchvision torchaudio
pip install sentence-transformers
```

### Q2: 模型下载慢
**A**: 首次运行会下载模型（90MB），耐心等待。可以设置镜像：
```bash
set HF_ENDPOINT=https://hf-mirror.com
```

### Q3: 向量搜索没有生效
**A**: 检查日志是否有 "[OK] 向量搜索已启用"

### Q4: 相似度都很低
**A**: 正常，中文+英文混合查询相似度通常在 0.5-0.8 之间

---

## 🎯 下一步优化

1. **使用 NPU 生成向量** (可选)
   - 将 sentence-transformers 替换为 NPU 模型
   - 速度提升 5-10 倍

2. **增量更新向量** (推荐)
   - 新增卡片时自动生成向量
   - 修改卡片时更新向量

3. **前端显示来源** (必须)
   - 在聊天界面显示来源标记
   - 点击跳转到卡片详情

---

准备好了吗？开始执行 Step 1！🚀
