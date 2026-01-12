# 本地模型对接指南

## 概述

Antinet 项目支持使用 `C:/model` 目录中已转换的 QNN 模型，无需重新下载和转换。

## 可用模型

| 模型名称 | 参数量 | 大小 | 类型 | 适用场景 |
|---------|-------|------|------|---------|
| **llama3.2-3b** | 3B | 2.16 GB | Instruct | 轻量级，响应最快，适合实时对话 |
| **llama3.1-8b** | 8B | 4.08 GB | Chat | 平衡性能与速度，适合大多数场景 |
| **qwen2.0-7b** | 7B | 4.01 GB | Base + SSD | 长文本支持，适合数据分析任务 |

## 快速开始

### 1. 验证模型存在

```powershell
# 检查模型目录
ls C:/model

# 应该看到以下目录：
# llama3.2-3b-8380-qnn2.37/
# llama3.1-8b-8380-qnn2.38/
# Qwen2.0-7B-SSD-8380-2.34/
```

### 2. 安装依赖

```powershell
# 安装后端依赖
cd backend
pip install -r requirements.txt

# 安装 QAI AppBuilder（在 AIPC 上）
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 安装 transformers（用于分词器）
pip install transformers
```

### 3. 运行测试

```powershell
# 运行本地模型测试脚本
cd c:/test/antinet
python test_local_models.py
```

### 4. 启动后端服务

```powershell
cd backend
python main.py
```

## API 使用

### 列出可用模型

```bash
GET /api/models
```

响应示例：

```json
{
  "count": 3,
  "models": [
    {
      "name": "llama3.2-3b",
      "params": "3B",
      "size_gb": 2.16,
      "type": "instruct",
      "context_size": 4096,
      "description": "Llama3.2 3B Instruct - 轻量级，响应最快，适合实时对话",
      "path": "C:/model/llama3.2-3b-8380-qnn2.37"
    },
    ...
  ],
  "default": "llama3.2-3b",
  "fastest": "llama3.2-3b",
  "best_quality": "llama3.1-8b"
}
```

### 切换模型

```bash
POST /api/models/switch?model_name=llama3.1-8b
```

响应示例：

```json
{
  "success": true,
  "model": "llama3.1-8b",
  "params": "8B",
  "size_gb": 4.08,
  "description": "Llama3.1 8B Chat - 平衡性能与速度，适合大多数场景"
}
```

### 健康检查

```bash
GET /api/health
```

响应示例：

```json
{
  "status": "healthy",
  "model": "llama3.2-3b",
  "model_loaded": true,
  "device": "NPU",
  "data_stays_local": true,
  "available_models": ["llama3.2-3b", "llama3.1-8b", "qwen2.0-7b"],
  "current_model": "llama3.2-3b"
}
```

## 配置

修改 `backend/config.py` 中的模型配置：

```python
# 使用不同的模型
MODEL_NAME: str = "llama3.1-8b"  # llama3.2-3b | llama3.1-8b | qwen2.0-7b

# 本地模型路径
LOCAL_MODEL_BASE_PATH: str = "C:/model"

# NPU 设备配置
QNN_DEVICE: str = "NPU"  # NPU | GPU | CPU
```

## 模型说明

### Llama3.2-3B

**推荐场景：** 实时对话、快速响应

- **参数量：** 3B
- **大小：** 2.16 GB
- **上下文长度：** 4096 tokens
- **优势：** 响应最快，内存占用最小
- **推理延迟：** ~300-400ms

### Llama3.1-8B

**推荐场景：** 通用数据分析、复杂查询

- **参数量：** 8B
- **大小：** 4.08 GB
- **上下文长度：** 4096 tokens
- **优势：** 平衡性能与速度
- **推理延迟：** ~400-500ms

### Qwen2.0-7B

**推荐场景：** 长文本分析、复杂推理

- **参数量：** 7B
- **大小：** 4.01 GB
- **上下文长度：** 4096 tokens
- **优势：** 长文本支持，SSD 推理
- **推理延迟：** ~450-550ms

## 性能基准测试

运行基准测试：

```bash
curl http://localhost:8000/api/performance/benchmark
```

响应示例：

```json
{
  "model": "llama3.2-3b",
  "model_info": {
    "name": "llama3.2-3b",
    "params": "3B",
    "size_gb": 2.16
  },
  "device": "NPU",
  "benchmark": {
    "avg_latency_ms": 350.0,
    "min_latency_ms": 320.0,
    "max_latency_ms": 380.0,
    "qps": 2.86,
    "pass_500ms": "PASS"
  },
  "detailed_tests": [
    {
      "sequence_length": 32,
      "avg_latency_ms": 280.5,
      "throughput_qps": 3.56
    },
    {
      "sequence_length": 64,
      "avg_latency_ms": 320.2,
      "throughput_qps": 3.12
    },
    ...
  ]
}
```

## 故障排查

### 问题：模型未找到

**错误信息：** `模型不存在: llama3.2-3b`

**解决方案：**

1. 检查 `C:/model` 目录是否存在模型
2. 运行 `python test_local_models.py` 查看可用模型
3. 检查 `backend/config.py` 中的 `MODEL_NAME` 配置

### 问题：QAI AppBuilder 未安装

**错误信息：** `QAI AppBuilder未安装`

**解决方案：**

```powershell
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

### 问题：NPU 驱动未安装

**解决方案：**

1. 解压 `C:/model/Qualcomm_Hexagon_NPU_Driver-v1.0.0.11.zip`
2. 运行安装程序
3. 重启电脑

### 问题：推理延迟 > 500ms

**可能原因：**

1. 输入序列过长（> 128 tokens）
2. 模型参数量过大（> 8B）
3. NPU 被其他应用占用

**解决方案：**

1. 缩短输入文本
2. 切换到更小的模型（如 llama3.2-3b）
3. 关闭其他占用 NPU 的应用

## 技术细节

### 模型格式

所有模型采用 QNN（Qualcomm Neural Network）格式，专为骁龙 NPU 优化：

- **二进制文件：** `.bin` 格式，分片存储
- **配置文件：** `config.json` - 模型架构配置
- **提示词配置：** `prompt.json` - 提示词模板
- **分词器：** `tokenizer.json` - HuggingFace 格式
- **后端扩展：** `htp_backend_ext_config.json` - NPU 后端配置

### 路径转换

模型配置文件中的路径会自动从 Android 路径（`/sdcard/GenieModels/...`）转换为 Windows 路径（`C:/model/...`）。

### 数据不出域

所有模型推理在本地 NPU 上执行，无需云端调用，确保数据隐私。

## 下一步

1. ✅ 验证模型加载：`python test_local_models.py`
2. ✅ 启动后端服务：`cd backend && python main.py`
3. ✅ 测试 API：访问 `http://localhost:8000/docs`
4. ✅ 运行基准测试：访问 `/api/performance/benchmark`
5. ✅ 前端集成：使用 `/api/models` 获取模型列表

## 参考资料

- [NPU 性能说明](NPU_PERFORMANCE.md)
- [端侧隐私合规](PRIVACY_COMPLIANCE.md)
- [API 文档](../../backend/main.py)
- [QAI AppBuilder 文档](../.specs/npu-integration.md)

---

**最后更新：** 2026-01-12
