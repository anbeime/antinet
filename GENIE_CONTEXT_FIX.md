# GenieContext 正确使用方式 - 立即解决DLL加载问题

## ✅ 正确的初始化方式

### 官方代码参考
**文件**: `C:\ai-engine-direct-helper\samples\genie\python\ChainUtils.py`
**行数**: 第103行

```python
class GenieModel():
    def __init__(self, model_name, ...):
        # 拼接路径
        model_path = os.path.join(APP_PATH, "models", model_name)
        config_path = os.path.join(model_path, "config.json")

        # 直接创建 GenieContext（不需要 QNNConfig）
        self.d = GenieContext(config_path, DEBUG_GENIE)
        if not self.d:
            print("[Error] model load failed.")
            return
```

### 官方 GenieSample.py（简单版本）
**文件**: `C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py`

```python
import os
from qai_appbuilder import (GenieContext)

# 设置PATH（必需！）
lib_path = "qai_libs"
if not lib_path in os.getenv('PATH'):
    lib_path = os.getenv('PATH') + ";" + lib_path + ";"
    os.environ['PATH'] = lib_path

# 使用相对路径
config = os.path.join("genie", "python", "models", "IBM-Granite-v3.1-8B", "config.json")

# 创建 GenieContext（只传一个参数也行）
dialog = GenieContext(config)

# 执行推理
def response(text):
    print(text, end='', flush=True)
    return True

dialog.Query(prompt, response)
```

## 🔧 立即可用的测试脚本

### 测试脚本1：最简单版本（推荐）
```python
# test_genie_simple.py
import os
from qai_appbuilder import GenieContext

# 1. 设置PATH（绝对路径）
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')

# 2. 配置路径（绝对路径）
config_path = r'C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json'

print(f'Config exists: {os.path.exists(config_path)}')
print(f'Lib path exists: {os.path.exists(lib_path)}')

# 3. 创建 GenieContext（两个参数）
try:
    print('Creating GenieContext...')
    dialog = GenieContext(config_path, False)
    print('✅ GenieContext 创建成功！')
except Exception as e:
    print(f'❌ 失败: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
```

### 测试脚本2：完整推理测试
```python
# test_genie_full.py
import os
from qai_appbuilder import GenieContext
import time

# 1. 设置PATH
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')
print(f'[OK] PATH设置完成')

# 2. 创建 GenieContext
config_path = r'C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json'
print(f'[OK] 配置路径: {config_path}')

dialog = GenieContext(config_path, False)
print('[OK] GenieContext 创建成功')

# 3. 测试推理
prompt = "分析销售数据，给出关键趋势"
result = []

def callback(text):
    result.append(text)
    print(text, end='', flush=True)
    return True

print('\n[INFO] 开始推理...')
start = time.time()
dialog.Query(prompt, callback)
latency = (time.time() - start) * 1000

print(f'\n[OK] 推理完成: {latency:.2f}ms')
print(f'[INFO] 完整结果: {"".join(result)}')
```

## ⚠️ 常见错误及解决方案

### 错误1：dlopen error #126
```
[ERROR] "Unable to load backend. dlerror(): dlopen error #126"
```

**原因**：找不到DLL文件

**解决方案**：
1. 检查PATH设置
```python
import os
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')

# 验证
print(os.path.exists(r'C:\ai-engine-direct-helper\samples\qai_libs\QnnHtp.dll'))
```

2. 检查DLL依赖
```bash
# 使用dumpbin检查DLL依赖（如果有Visual Studio）
dumpbin /DEPENDENTS QnnHtp.dll
```

3. 安装Visual C++ Redistributable（如果缺少MSVC运行库）
```
下载地址：https://aka.ms/vs/17/release/vc_redist.x64.exe
```

### 错误2：程序卡住
```
Creating GenieContext...
(程序无输出，卡住)
```

**原因**：可能是模型初始化耗时，或者有错误但没抛出

**解决方案**：
1. 添加超时机制
2. 使用try-except捕获所有异常
3. 打印详细日志

### 错误3：QNNConfig 不必要
```python
# ❌ 错误：GenieContext 不需要 QNNConfig
from qai_appbuilder import QNNContext, QNNConfig
QNNConfig.Config(...)
dialog = GenieContext(config_path)

# ✅ 正确：直接使用 GenieContext
from qai_appbuilder import GenieContext
dialog = GenieContext(config_path, False)
```

## 🚀 立即行动

### 给另一个AI的建议
1. **停止当前的测试**
2. **运行 test_genie_simple.py**
3. **如果失败，运行 test_genie_full.py**
4. **记录错误信息**

### 给AI-1的建议
1. **更新 backend/npu_core.py**：移除 QNNConfig 调用
2. **使用正确的 GenieContext 初始化**

## 📁 文件对比

| 特性 | QNNContext | GenieContext |
|------|------------|-------------|
| **初始化** | 需要 QNNConfig.Config() | 直接创建 |
| **参数** | (model_name, model_path, ...) | (config_path, debug) |
| **适用模型** | CV模型（小） | LLM模型（7B+） |
| **推理方式** | model.Inference(data) | model.Query(prompt, callback) |
| **PATH设置** | 需要 | 需要 |

## 🎯 关键发现总结

1. ✅ **GenieContext 不需要 QNNConfig**
2. ✅ **必须设置 PATH 环境变量**
3. ✅ **config.json 必须存在**
4. ✅ **可以传入debug参数（False/True）**
5. ⚠️ **DLL加载问题可能需要系统依赖**

---

**创建时间**: 2026-01-16 10:45
**状态**: 已发现正确的初始化方式，等待测试
