# NPU 模型加载问题总结 - 请另一个AI协助

## 📋 我尝试过的方法

### 方法1：QNNContext + .so 文件（❌ 失败）
```python
from qai_appbuilder import QNNContext

QNNConfig.Config(
    r"C:\ai-engine-direct-helper\samples\qai_libs",
    'Htp',
    LogLevel.INFO,
    ProfilingLevel.BASIC,
    ''
)

model = QNNContext('Qwen2.0-7B-SSD', r'C:\model\Qwen2.0-7B-SSD-8380-2.34')
```

**错误信息**：
```
[ ERROR ] Unable to load model. pal::dynamicloading::dlError(): load library failed
[ ERROR ] Error initializing QNN Function Pointers: could not load model
```

**原因**：
- QNNContext 期望加载 `.so` 文件
- 但模型目录下只有 `.bin` 文件
- 模型文件：`model-1.bin`, `model-2.bin`, `model-3.bin`, `model-4.bin`, `model-5.bin`

---

### 方法2：GenieContext + config.json（⚠️ 未测试）
```python
from qai_appbuilder import GenieContext
import os

# 设置PATH
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

# 使用 config.json
config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
dialog = GenieContext(config)

# 执行推理
def callback(text):
    print(text, end='', flush=True)
    return True

dialog.Query(prompt, callback)
```

**状态**：
- ✅ 代码已创建：`backend/npu_core.py`
- ⚠️ 未实际运行测试（另一个AI正在运行后端）
- ✅ 参考官方示例：`C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py`

---

## 🎯 你的尝试方向

我看到你在尝试使用 `GenieAPIService.py`，这是一个不同的方案。

### 你遇到的问题
```
ModuleNotFoundError: No module named 'json_repair'
ModuleNotFoundError: No module named 'sse_starlette'
```

### 依赖安装
```bash
pip install json-repair sse-starlette
```

### GenieAPIService 的工作原理
从目录结构看：
```
C:\ai-engine-direct-helper\samples\genie\
├─python\
│  ├─GenieAPIService.py      # 后端服务
│  ├─GenieAPIClient.py      # 客户端
│  └─models\
│     ├─Qwen2.0-7B-SSD\
│     │  ├─config.json
│     │  └─prompt.json
```

**GenieAPIService.py** 可能：
- 作为独立的后端服务运行
- 提供HTTP API接口
- 内部使用 GenieContext

---

## 🤔 建议的解决路径

### 路径A：直接使用 GenieContext（推荐）
**优点**：
- ✅ 简单直接，不依赖额外服务
- ✅ 官方示例支持
- ✅ 性能最优（直接调用）

**需要做的**：
1. 测试 `backend/npu_core.py` 是否能正常运行
2. 如果成功，集成到 FastAPI 后端
3. 如果失败，检查具体错误信息

**关键验证**：
```python
# 测试脚本
import os
from qai_appbuilder import GenieContext

# 1. 验证文件存在
config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
assert os.path.exists(config), f"配置文件不存在: {config}"

# 2. 设置PATH
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

# 3. 尝试加载
try:
    dialog = GenieContext(config)
    print("✅ GenieContext 加载成功")
except Exception as e:
    print(f"❌ 加载失败: {e}")
```

---

### 路径B：使用 GenieAPIService（备选）
**优点**：
- ✅ 可能已经解决了模型加载问题
- ✅ 提供开箱即用的API

**缺点**：
- ❌ 需要启动额外的服务
- ❌ 有额外的依赖（json-repair, sse-starlette）
- ❌ 可能增加延迟

**需要做的**：
1. 安装依赖：`pip install json-repair sse-starlette`
2. 启动 GenieAPIService
3. 通过客户端调用

---

### 路径C：混合方案（最优）
**思路**：
- 使用 GenieAPIService 作为参考
- 提取其中的 GenieContext 调用代码
- 直接集成到我们的 FastAPI 后端

**步骤**：
1. 阅读并理解 GenieAPIService.py 的实现
2. 提取 GenieContext 的正确使用方式
3. 在 `backend/main.py` 中直接实现

---

## 📊 已知的成功案例

### 官方 GenieSample.py（✅ 验证可用）
```python
# C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py
from qai_appbuilder import GenieContext

config = os.path.join("genie", "python", "models", "IBM-Granite-v3.1-8B", "config.json")
dialog = GenieContext(config)

prompt = "How to fish?"
dialog.Query(prompt, response)
```

**关键点**：
- ✅ 使用 `config.json` 路径
- ✅ 使用 GenieContext（不是 QNNContext）
- ✅ 回调函数收集输出

### 官方 AOTGAN 样本（✅ CV模型使用QNNContext）
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

**关键点**：
- ✅ CV模型使用 QNNContext
- ✅ 模型是 `.bin` 文件
- ✅ 需要继承并重写 Inference 方法

---

## 🎯 关键区别

| 特性 | QNNContext | GenieContext |
|------|------------|-------------|
| **适用模型** | CV模型（小） | LLM模型（7B+） |
| **模型格式** | `.bin` 或 `.so` | `config.json` |
| **推理方式** | `model.Inference(data)` | `model.Query(prompt, callback)` |
| **是否继承** | 是，需要重写 Inference | 否，直接使用 |
| **性能** | 更快 | 标准 |

**我们的模型**：
- ✅ Qwen2.0-7B-SSD（7B参数）→ 应该用 **GenieContext**

---

## 🚀 立即行动建议

### 给另一个AI的任务
1. **停止当前的后端测试**
2. **阅读本总结**（NPU_PROBLEM_SUMMARY.md）
3. **选择路径**：
   - 路径A：测试我的 `backend/npu_core.py`
   - 路径B：尝试 GenieAPIService
   - 路径C：混合方案（推荐）

### 协作方式
- 我负责：提供技术总结和发现
- 你负责：实际测试和验证
- 遇到问题：立即在对话中沟通

---

## 📁 相关文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 我的实现 | `backend/npu_core.py` | GenieContext 封装 |
| 我的指南 | `NPU_IMPLEMENTATION_GUIDE.md` | 详细的实现指南 |
| 协同指南 | `COLLABORATION_GUIDE.md` | 分工和协作方式 |
| 本总结 | `NPU_PROBLEM_SUMMARY.md` | 问题汇总（本文件） |
| 官方示例 | `C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py` | GenieContext 参考 |
| 官方服务 | `C:\ai-engine-direct-helper\samples\genie\python\GenieAPIService.py` | GenieAPIService 参考 |

---

**创建时间**: 2026-01-16 10:30
**状态**: AI-1 已总结，等待 AI-2 测试和验证
