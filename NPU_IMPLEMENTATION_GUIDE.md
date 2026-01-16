# NPU 推理实现指南 - 重要更新

## ⚠️ 关键发现（2026-01-16 10:22）

### ❌ 错误做法
```python
# 不要使用 QNNContext 用于大模型（7B+）
from qai_appbuilder import QNNContext
model = QNNContext("Qwen2.0-7B-SSD", r"C:\model\Qwen2.0-7B-SSD-8380-2.34")
# ❌ 会报错：Unable to load model. pal::dynamicloading::dlError(): load library failed
```

### ✅ 正确做法
```python
# 使用 GenieContext 用于大模型（7B+）
from qai_appbuilder import GenieContext

# 模型配置文件路径（不是 .bin 文件）
config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"

# 创建 GenieContext
dialog = GenieContext(config)

# 执行推理（需要回调函数）
def response_callback(text):
    print(text, end='', flush=True)
    return True

prompt = "分析销售数据"
dialog.Query(prompt, response_callback)
```

## 📁 模型文件结构

```
C:\model\Qwen2.0-7B-SSD-8380-2.34\
├── config.json              ← GenieContext 需要（正确）
├── model-1.bin             ← 二进制模型文件（不是 .so）
├── model-2.bin
├── model-3.bin
├── model-4.bin
├── model-5.bin
├── tokenizer.json
└── prompt.json
```

**关键点**：
- ✅ 模型是 `.bin` 格式，不是 `.so` 格式
- ✅ 使用 `config.json` 路径创建 GenieContext
- ✅ GenieContext 会自动加载 `.bin` 文件

## 🎯 官方示例参考

### CV 模型（小模型）- 使用 QNNContext
```python
# C:\ai-engine-direct-helper\samples\python\aotgan\aotgan.py
from qai_appbuilder import QNNContext

class AotGan(QNNContext):
    def Inference(self, input_data, input_mask):
        # 实现推理逻辑
        pass

model_path = "models/aotgan.bin"  # ← .bin 文件
aotgan = AotGan("aotgan", str(model_path))
```

### LLM 模型（大模型）- 使用 GenieContext
```python
# C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py
from qai_appbuilder import GenieContext

config = "genie/python/models/IBM-Granite-v3.1-8B/config.json"  # ← config.json
dialog = GenieContext(config)

dialog.Query(prompt, response_callback)
```

## 🔧 环境配置

### 设置 PATH 环境变量（必需）
```python
import os

lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
```

### 依赖库（无需额外安装）
- ✅ `qai_appbuilder` - 已安装（2.31.0）
- ✅ `QAI库路径` - 已存在（`C:\ai-engine-direct-helper\samples\qai_libs`）

## 📊 性能要求

### 目标指标
- **推理延迟**：< 500ms
- **运行设备**：NPU (Hexagon Tensor Processor)
- **数据隐私**：数据不出域

### 性能模式设置
```python
from qai_appbuilder import PerfProfile

# 设置高性能模式
PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)

# 执行推理
dialog.Query(prompt, callback)

# 恢复性能配置
PerfProfile.RelPerfProfileGlobal()
```

## 🚀 集成到后端API

### 正确的集成方式
```python
# backend/main.py
from fastapi import FastAPI
from qai_appbuilder import GenieContext
import os

# 设置PATH
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

app = FastAPI()

# 全局模型实例（避免重复加载）
_model = None

def get_model():
    global _model
    if _model is None:
        config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
        _model = GenieContext(config)
    return _model

@app.post("/api/npu/analyze")
async def analyze(query: str):
    model = get_model()
    
    # 收集推理结果
    result = []
    def callback(text):
        result.append(text)
        return True
    
    # 执行推理
    start = time.time()
    model.Query(query, callback)
    latency = (time.time() - start) * 1000
    
    return {
        "result": "".join(result),
        "latency": latency,
        "device": "NPU (Hexagon)"
    }
```

## ⚠️ 常见错误

### 错误1：使用 QNNContext 加载大模型
```python
# ❌ 错误
from qai_appbuilder import QNNContext
model = QNNContext("Qwen2.0-7B-SSD", r"C:\model\Qwen2.0-7B-SSD-8380-2.34")
# 错误：Unable to load model. pal::dynamicloading::dlError(): load library failed

# ✅ 正确
from qai_appbuilder import GenieContext
model = GenieContext(r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json")
```

### 错误2：模型路径错误
```python
# ❌ 错误：指向 .bin 文件
config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\model-1.bin"

# ✅ 正确：指向 config.json
config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
```

### 错误3：忘记设置 PATH
```python
# ❌ 错误：未设置PATH会找不到库
model = GenieContext(config)

# ✅ 正确：先设置PATH
os.environ['PATH'] = r"C:\ai-engine-direct-helper\samples\qai_libs" + ";" + os.getenv('PATH', '')
model = GenieContext(config)
```

## 📝 工作清单

### AI-1（NPU推理核心）
- [x] 创建 `backend/npu_core.py`（使用 GenieContext）
- [ ] 测试 NPU 推理延迟
- [ ] 优化性能（目标 < 500ms）
- [ ] 输出性能数据

### AI-2（后端API集成）
- [ ] 停止当前测试
- [ ] 读取本指南
- [ ] 在 `backend/main.py` 中集成 GenieContext
- [ ] 创建 `/api/npu/analyze` 端点
- [ ] 测试 API 端点

## 🎯 下一步行动

### 立即执行
1. **AI-1**：等待 AI-2 完成当前测试
2. **AI-2**：阅读本指南，使用 GenieContext 重新实现

### 避免冲突
- ❌ 不要修改 `backend/npu_core.py`（AI-1 负责）
- ❌ 不要同时修改 `backend/main.py`（AI-2 负责）
- ✅ 先沟通再修改共同文件

---

**创建时间**: 2026-01-16 10:22
**状态**: 已完成实现指南，等待 AI-2 集成
