# 向量搜索替代方案 - Windows ARM64

## 问题
`sentence-transformers` 依赖 `torch`，但 PyTorch 没有 Windows ARM64 的官方支持

## 解决方案

### 方案 A: 使用 OpenAI Embeddings API ✅ 推荐

**优点:**
- 无需本地模型
- 质量高（text-embedding-3-small）
- 速度快

**缺点:**
- 需要 API key
- 需要网络连接
- 有成本（但很低）

**实施:**
```bash
pip install openai
```

### 方案 B: 使用简化的 TF-IDF 向量 ✅ 完全本地

**优点:**
- 无需外部依赖
- 完全本地运行
- 速度快

**缺点:**
- 语义理解能力较弱
- 效果不如深度学习模型

**实施:**
```bash
pip install scikit-learn
```

### 方案 C: 使用 ONNX Runtime（推荐尝试）

**优点:**
- 支持 ARM64
- 性能好
- 可以运行转换后的模型

**缺点:**
- 需要手动转换模型

---

## 立即实施：方案 B（TF-IDF）

我会创建一个基于 TF-IDF 的轻量级嵌入服务，完全本地运行，无需 PyTorch。

虽然效果不如深度学习模型，但：
1. 完全本地，数据不出域
2. 速度快
3. 比纯关键词搜索好很多
4. 可以后续升级到 OpenAI API 或 ONNX

---

需要我现在创建 TF-IDF 版本的嵌入服务吗？
