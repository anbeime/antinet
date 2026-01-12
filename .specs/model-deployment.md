# 模型部署规范

## 概述

本文档说明如何将 Qwen2-1.5B 模型部署到骁龙 AIPC 的 NPU,包括模型转换、配置和测试。

## 前置条件

### 硬件要求

- ✅ 骁龙 X Elite AIPC
- ✅ 至少 16GB RAM
- ✅ 至少 20GB 可用磁盘空间

### 软件要求

- ✅ Windows 11
- ✅ Python 3.10 或 3.12
- ✅ Node.js 18+
- ✅ QAI AppBuilder SDK 2.31.0

### 安装 QAI AppBuilder

```bash
# 在 AIPC 上安装 QAI AppBuilder
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 验证安装
python -c "import qai_appbuilder; print(qai_appbuilder.__version__)"
```

## 模型转换流程

### 步骤 1: 下载 Hugging Face 模型

**在本地 PC 上执行** (可选,可跳过直接下载 ONNX):

```bash
cd backend
python model_converter.py --model qwen2-1.5b --output ./models
```

**输出**:
- `models/pytorch/qwen2-1.5b/` - PyTorch 模型
- `models/onnx/qwen2-1.5b.onnx` - ONNX 模型
- `models/onnx/qwen2-1.5b_quantized.onnx` - 量化 ONNX 模型

### 步骤 2: 转换为 QNN 格式

**必须在 AIPC 上执行**:

```bash
cd backend/models
python convert_to_qnn_on_aipc.py
```

**输出**:
- `models/qnn/qwen2-1.5b.bin` - QNN 模型 (可在 NPU 上运行)

### 步骤 3: 验证 QNN 模型

```bash
cd backend
python model_converter.py --test-qnn --model-path ./models/qnn/qwen2-1.5b.bin
```

**预期输出**:
```
加载QNN模型: models/qnn/qwen2-1.5b.bin
✓ 模型加载成功
推理测试: 64 tokens
✓ 推理测试成功, 延迟: 230.45ms
```

## 配置后端

### 修改 config.py

```python
# backend/config.py

# 模型配置
MODEL_NAME: str = "qwen2-1.5b"
MODEL_PATH: Path = Path("./models/qnn/qwen2-1.5b-npu.bin")  # QNN 模型路径
USE_NPU: bool = True

# QNN 配置
QNN_BACKEND: str = "QNN"  # QNN | CPU | GPU
QNN_DEVICE: str = "NPU"   # NPU | GPU | CPU

# 数据不出域
DATA_STAYS_LOCAL: bool = True
```

### 验证配置

```python
# 检查配置
from backend.config import settings

print(f"模型路径: {settings.MODEL_PATH}")
print(f"QNN 设备: {settings.QNN_DEVICE}")
print(f"数据不出域: {settings.DATA_STAYS_LOCAL}")
```

## 启动后端服务

### 开发模式

```bash
cd backend
python main.py
```

**预期输出**:
```
============================================================
Antinet智能知识管家 v1.0.0
端侧智能数据中枢与协同分析平台
============================================================
运行环境: NPU
数据不出域: True

正在加载QNN模型...
✓ 模型加载成功 (设备: NPU)
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 生产模式

```bash
# 安装 gunicorn
pip install gunicorn

# 启动生产服务器
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

## 验证部署

### 1. 健康检查

```bash
curl http://localhost:8000/api/health
```

**预期响应**:
```json
{
  "status": "healthy",
  "model": "qwen2-1.5b",
  "model_loaded": true,
  "device": "NPU",
  "data_stays_local": true
}
```

### 2. 性能基准测试

```bash
curl http://localhost:8000/api/performance/benchmark
```

**预期响应**:
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
      "sequence_length": 128,
      "avg_latency_ms": 450.2,
      "throughput_qps": 2.2
    }
  ]
}
```

### 3. 数据分析测试

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "分析上个月的销售数据趋势",
    "data_source": "local",
    "context": {}
  }'
```

**预期响应**:
```json
{
  "query": "分析上个月的销售数据趋势",
  "cards": [
    {
      "color": "blue",
      "title": "数据事实",
      "content": "基于NPU分析,上个月销售数据...",
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
  "performance": {
    "total_time_ms": 500.12,
    "inference_time_ms": 450.23,
    "device": "NPU"
  }
}
```

## 性能调优

### 1. 模型量化

如果推理延迟 > 500ms,尝试更激进的量化:

```python
# 在 model_converter.py 中
# 使用混合量化
quantize_dynamic(
    "models/onnx/qwen2-1.5b.onnx",
    "models/onnx/qwen2-1.5b_quantized.onnx",
    weight_type=QuantType.QUInt8,
    per_channel=True,  # 启用逐通道量化
    reduce_range=True,  # 减小量化范围
)
```

### 2. 输入优化

减小输入长度以提升性能:

```python
# 限制输入长度
MAX_SEQUENCE_LENGTH = 128  # 默认
# 或 64 (更快但精度略降)
```

### 3. 批处理

端侧推荐使用 Batch Size = 1:

```python
# 单次推理
input_ids = input_ids[:1, :128]  # Batch=1, Seq=128
```

### 4. 模型预热

避免首次推理延迟:

```python
# 在应用启动时预热
for _ in range(3):
    test_input = np.random.randint(0, 1000, (1, 128), dtype=np.int64)
    model.infer(input_ids=test_input)
```

## 监控与日志

### 性能监控

使用 NPU 性能监控仪表板:

1. 访问 http://localhost:3000
2. 点击 "NPU性能" 标签
3. 点击 "运行基准测试"
4. 查看实时性能指标

### 日志查看

```bash
# 查看后端日志
tail -f backend/logs/app.log

# 查看推理延迟
grep "NPU推理延迟" backend/logs/app.log
```

### 性能告警

配置日志告警:

```python
# backend/main.py
if inference_time > 500:
    logger.warning(f"推理延迟超标: {inference_time:.2f}ms")
    # 发送告警 (如需要)
```

## 故障排查

### 问题 1: 模型加载失败

**错误**: `模型文件不存在: ./models/qwen2-1.5b-npu.bin`

**解决**:
```bash
# 检查模型文件
dir backend\models\qnn\

# 重新转换模型
cd backend\models
python convert_to_qnn_on_aipc.py

# 验证模型
python -c "import qai_appbuilder; model = qai_appbuilder.load_model('models/qnn/qwen2-1.5b.bin', device='NPU'); print('✓ 模型加载成功')"
```

### 问题 2: QAI AppBuilder 导入失败

**错误**: `ModuleNotFoundError: No module named 'qai_appbuilder'`

**解决**:
```bash
# 检查 Python 版本 (必须是 3.12)
python --version

# 重新安装 QAI AppBuilder
pip install --force-reinstall C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 验证安装
python -c "import qai_appbuilder; print(qai_appbuilder.__version__)"
```

### 问题 3: 推理延迟过高

**错误**: 推理延迟 > 500ms

**解决**:
```bash
# 检查模型是否量化
# 确保使用 INT8 量化模型

# 检查输入长度
# 减小到 128 或 64 tokens

# 检查 NPU 状态
# 使用性能监控仪表板

# 运行基准测试
python backend/verify_compliance.py
```

### 问题 4: 内存不足

**错误**: `RuntimeError: 内存不足`

**解决**:
```python
# 减小批处理
batch_size = 1

# 释放内存
import torch
torch.cuda.empty_cache()

# 使用更小的模型
# Qwen2-0.5B (如 Qwen2-1.5B 内存不足)
```

## 部署检查清单

部署前请检查:

- [ ] QAI AppBuilder 已安装 (版本 2.31.0)
- [ ] Python 版本正确 (3.10 或 3.12)
- [ ] QNN 模型已转换 (`.bin` 文件存在)
- [ ] `backend/config.py` 配置正确
- [ ] 模型路径正确
- [ ] `DATA_STAYS_LOCAL = True`
- [ ] 后端服务正常启动
- [ ] 健康检查通过 (`/api/health`)
- [ ] 性能基准测试通过 (延迟 < 500ms)
- [ ] 数据分析测试正常

## 自动化部署脚本

### 一键部署脚本 (deploy-to-aipc.ps1)

```powershell
# 复制项目到 AIPC
xcopy "\\tsclient\C\D\compet\xiaolong" "C:\workspace\antinet" /E /I /Y

# 安装依赖
cd C:\workspace\antinet
pnpm install
pip install -r backend/requirements.txt
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 转换模型
cd backend\models
python convert_to_qnn_on_aipc.py

# 启动服务
# 前端
pnpm run dev
# 后端 (新窗口)
python backend/main.py
```

### 快速测试脚本 (quick-test-aipc.ps1)

```powershell
# 启动后端
cd backend
python main.py

# 等待启动
Start-Sleep -Seconds 5

# 运行健康检查
curl http://localhost:8000/api/health

# 运行性能测试
curl http://localhost:8000/api/performance/benchmark
```

## 持续集成

### GitHub Actions 示例

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt

      - name: Run tests
        run: |
          python backend/verify_compliance.py

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: self-hosted  # AIPC runner
    steps:
      - name: Deploy to AIPC
        run: |
          # 部署逻辑
          ./deploy-to-aipc.ps1
```

## 总结

模型部署流程:

1. **安装 QAI AppBuilder** - 在 AIPC 上安装 SDK
2. **转换模型** - ONNX → QNN (在 AIPC 上执行)
3. **配置后端** - 设置模型路径和 NPU 设备
4. **启动服务** - 运行后端 API 服务
5. **验证部署** - 健康检查、性能测试
6. **监控优化** - 持续监控和调优

**关键要点**:

- ✅ QNN 模型必须在 AIPC 上转换
- ✅ 推理延迟目标 < 500ms
- ✅ 数据不出域原则
- ✅ 性能监控和日志记录
- ✅ 自动化部署脚本
