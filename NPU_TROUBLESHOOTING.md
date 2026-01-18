# NPU 故障排查指南

## 目录
- [错误 1: 变量作用域冲突](#错误-1-变量作用域冲突)
- [错误 2: DLL 加载失败](#错误-2-dll-加载失败)
- [错误 3: 模型加载失败](#错误-3-模型加载失败)
- [错误 4: 推理失败](#错误-4-推理失败)
- [性能问题: 推理延迟超标](#性能问题推理延迟超标)
- [环境配置问题](#环境配置问题)
- [快速诊断工具](#快速诊断工具)

---

## 错误 1: 变量作用域冲突

### 错误信息
```
UnboundLocalError: local variable 'QNNConfig' referenced before assignment
cannot access local variable 'QNNConfig' where it is not associated with a value
```

### 原因
函数内部的 `import` 语句会创建局部变量，遮蔽同名的模块级变量。当 Python 编译器看到函数内有 `import` 语句时，会假设该变量是局部的，但在实际使用前未正确赋值。

### 解决方案
1. **检查局部导入**
   ```bash
   cd c:\test\antinet
   grep -n "from qai_appbuilder import" backend/models/model_loader.py
   ```

2. **确保模块级导入**
   ```python
   # backend/models/model_loader.py 第13行
   try:
       from qai_appbuilder import QNNContext, GenieContext, Runtime, LogLevel, ProfilingLevel, PerfProfile, QNNConfig
       QAI_AVAILABLE = True
   except ImportError:
       QAI_AVAILABLE = False
   ```

3. **移除局部导入**
   - 检查第156行和第198行是否有局部导入
   - 删除这些导入，直接使用模块级变量

### 验证修复
```bash
python -c "
import sys
sys.path.insert(0, 'backend')
from models.model_loader import load_model_if_needed
model = load_model_if_needed()
print('✓ Model loaded successfully')
"
```

---

## 错误 2: DLL 加载失败

### 错误信息
```
OSError: Unable to load backend: QnnHtp.dll
OSError: dlopen error #126: The specified module could not be found
DLL load failed: Unable to find QnnHtpPrepare.dll
```

### 原因
1. PATH 环境变量未设置
2. 缺少运行时依赖 (Visual C++ Redistributable)
3. DLL 文件缺失或损坏
4. 权限问题

### 解决方案

#### 1. 检查 PATH 环境变量
```bash
# 检查 qai_libs 是否在 PATH 中
echo %PATH% | findstr qai_libs

# 应该看到:
# C:\ai-engine-direct-helper\samples\qai_libs;...
```

#### 2. 设置 PATH
```python
import os
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
```

#### 3. 检查 DLL 文件
```bash
# 验证关键 DLL 存在
dir C:\ai-engine-direct-helper\samples\qai_libs\QnnHtp.dll
dir C:\ai-engine-direct-helper\samples\qai_libs\QnnHtpPrepare.dll
dir C:\ai-engine-direct-helper\samples\qai_libs\QnnSystem.dll
```

#### 4. 安装运行时依赖
下载并安装 Visual C++ Redistributable 2015-2022 x64:
```
https://aka.ms/vs/17/release/vc_redist.x64.exe
```

#### 5. 以管理员身份运行
- 以管理员身份运行 PowerShell
- 或右键点击 PowerShell -> "以管理员身份运行"

### 验证修复
```bash
python -c "
import os
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;' + os.getenv('PATH', '')
from qai_appbuilder import QNNContext, Runtime, LogLevel, ProfilingLevel
QNNConfig.Config('C:/ai-engine-direct-helper/samples/qai_libs', Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC, 'None')
print('✓ QNN configuration successful')
"
```

---

## 错误 3: 模型加载失败

### 错误信息
```
FileNotFoundError: 模型路径不存在: C:/model/Qwen2.0-7B-SSD-8380-2.34
OSError: [Errno 2] No such file or directory: 'config.json'
RuntimeError: 模型加载失败: 无法初始化 QNNContext
```

### 原因
1. 模型文件未解压
2. 路径错误
3. 模型文件损坏
4. NPU 驱动问题

### 解决方案

#### 1. 检查模型目录
```bash
# 检查模型目录是否存在
dir C:\model

# 应该看到:
# Qwen2.0-7B-SSD-8380-2.34
# llama3.1-8b-8380-qnn2.38
# llama3.2-3b-8380-qnn2.37
```

#### 2. 解压模型文件
```powershell
# 如果是 .zip 文件，解压
cd C:\model
powershell Expand-Archive -Path "Qwen2.0-7B-SSD-8380-2.34.zip" -DestinationPath ".\"
```

#### 3. 检查配置文件
```bash
# 验证 config.json 存在
dir "C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"

# 查看配置内容
type "C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
```

#### 4. 使用不同模型
```python
from models.model_loader import NPUModelLoader

# 使用 llama3.2-3b (更小，更容易加载)
loader = NPUModelLoader(model_key="llama3.2-3b")
model = loader.load()
```

### 验证修复
```bash
python -c "
import sys
sys.path.insert(0, 'backend')
from models.model_loader import NPUModelLoader
loader = NPUModelLoader()
model = loader.load()
print('✓ Model loaded successfully')
print('  - Device:', model.get_performance_stats()['device'])
"
```

---

## 错误 4: 推理失败

### 错误信息
```
RuntimeError: 推理失败: Query method not found
AttributeError: 'GenieContext' object has no attribute 'Query'
TypeError: 'NoneType' object is not callable
Exception: callback function not provided
```

### 原因
1. 使用了错误的模型类 (QNNContext 而非 GenieContext)
2. 回调函数未正确定义
3. 模型未正确加载
4. 参数传递错误

### 解决方案

#### 1. 检查模型类
```python
# 应该使用 GenieContext，而非 QNNContext
from qai_appbuilder import GenieContext

# backend/models/model_loader.py 应该:
self.model = GenieContext(config_path)  # 正确
# 而非:
self.model = QNNContext(name, path)    # 错误 (仅用于图像模型)
```

#### 2. 检查回调函数
```python
# 正确的回调函数
def response(text):
    print(text, end='', flush=True)
    return True  # 必须返回 True

# 错误的回调函数
def response(text):
    print(text)
    # 缺少 return True 会导致错误
```

#### 3. 测试推理流程
```python
from models.model_loader import NPUModelLoader

loader = NPUModelLoader()
model = loader.load()

# 测试推理
def callback(text):
    print(text, end='', flush=True)
    return True

model.Query("测试", callback)  # GenieContext 使用 Query()
# 而非: model.infer(prompt)  # 这是包装方法
```

### 验证修复
```bash
python simple_npu_test_v2.py
# 预期输出:
# [OK] 模型加载成功
# [OK] 推理完成: 450ms [OK]
# 输出: 端侧AI的优势包括...
```

---

## 性能问题: 推理延迟超标

### 症状
推理延迟 >= 500ms，不满足目标要求

### 原因
1. 未使用 NPU (回退到 CPU)
2. max_tokens 过大
3. 未使用 BURST 性能模式
4. 模型选择不当

### 解决方案

#### 1. 检查设备信息
```python
from models.model_loader import load_model_if_needed
import logging
logging.basicConfig(level=logging.INFO)
model = load_model_if_needed()
stats = model.get_performance_stats()
print(f"设备: {stats['device']}")
```

**预期输出**:
```
设备: NPU (Hexagon)  # 正确
设备: Mock              # 错误 - 使用了模拟模式
设备: CPU (回退模式)     # 错误 - NPU 不可用
```

#### 2. 启用 BURST 模式
```python
from qai_appbuilder import PerfProfile

# 在推理前设置 BURST 模式
PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)

# 执行推理
result = loader.infer(prompt, max_new_tokens=128)

# 推理后重置
PerfProfile.RelPerfProfileGlobal()
```

#### 3. 减少 max_tokens
```python
# 默认值可能过大，减少到 128
result = loader.infer(prompt, max_new_tokens=128)  # 从 512 减到 128

# 或者更激进
result = loader.infer(prompt, max_new_tokens=64)  # 仅用于快速验证
```

#### 4. 使用更小模型
```python
from models.model_loader import NPUModelLoader

# 使用 llama3.2-3b (更快，但能力稍弱)
loader = NPUModelLoader(model_key="llama3.2-3b")
model = loader.load()

# 预期性能: ~280ms (比 7B 模型快 40%)
```

#### 5. 性能基准对比
基于 QAI AppBuilder 官方测试数据:

| 模型 | 参数量 | 预期延迟 | 说明 |
|------|--------|----------|------|
| Qwen2.0-7B-SSD | 7B | ~450ms | 推荐，平衡性能和质量 |
| llama3.1-8b | 8B | ~520ms | 更强能力，稍慢 |
| llama3.2-3b | 3B | ~280ms | 最快，能力稍弱 |

### 验证优化
```bash
python simple_npu_test_v2.py
# 检查输出:
# - 推理延迟: XXXms
# - [OK] 性能达标 (< 500ms)  # 应该看到这个
```

---

## 环境配置问题

### Python 版本不正确

**问题**: 需要使用 Python 3.12.x

**检查**:
```bash
python --version
# 应该输出: Python 3.12.x
```

**安装**:
```bash
# 从 Microsoft Store 安装
ms-windows-store://search/?query=python3.12
```

### QAI AppBuilder 未安装

**问题**: 缺少 qai_appbuilder 包

**检查**:
```bash
pip list | findstr qai_appbuilder
# 应该看到: qai_appbuilder  2.31.0
```

**安装**:
```bash
pip install "C:/ai-engine-direct-helper/samples/qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### NPU 驱动问题

**检查驱动**:
```bash
# 检查 NPU 驱动是否安装
dir C:\model\Qualcomm_Hexagon_NPU_Driver*

# 检查注册表
reg query "HKLM\SOFTWARE\Qualcomm\Hexagon NPU Driver"
```

**解决**:
- 驱动已预装在远程 AIPC
- 如果缺失，联系 AIPC 管理员安装

---

## 快速诊断工具

### 一键诊断脚本
```bash
# 运行验证脚本
.\verify-npu-on-aipc.ps1
```

该脚本会自动检查:
1. Python 版本
2. QAI AppBuilder 安装
3. 模型文件存在性
4. QNN 库文件存在性
5. NPU 性能测试

### 手动诊断命令

#### 诊断 1: 导入测试
```bash
python -c "
import sys
import os
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;' + os.getenv('PATH', '')
try:
    from qai_appbuilder import GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
    print('[OK] QAI AppBuilder 导入成功')
    print('[OK] 导入组件: GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel')
except ImportError as e:
    print(f'[ERROR] 导入失败: {e}')
    sys.exit(1)
"
```

#### 诊断 2: 模型加载测试
```bash
python -c "
import sys
sys.path.insert(0, 'backend')
from models.model_loader import load_model_if_needed
import logging
logging.basicConfig(level=logging.INFO)
try:
    model = load_model_if_needed()
    print('[OK] 模型加载成功')
except Exception as e:
    print(f'[ERROR] 加载失败: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"
```

#### 诊断 3: 推理测试
```bash
python simple_npu_test_v2.py
# 预期输出:
# [步骤 6/6] 创建加载器并加载模型...
#   - [OK] 加载器创建成功
#   - [OK] 模型加载成功
#   - [INFO] 加载时间: 5.23s
#   - [INFO] 设备: NPU (Hexagon)
# [推理结果]
# ...
# [性能指标]
#   - 推理延迟: 450.32ms
#   - [OK] 性能达标 (< 500ms)
```

### 日志分析

#### 查看测试日志
```bash
# 查看最新的测试日志
type npu_test_*.log | findstr "[ERROR]"
```

#### 查看后端日志
```bash
# 查看后端日志中的错误
type backend.log | findstr "[ERROR]"
type backend_error.log
```

---

## 常见问题 FAQ

### Q1: 为什么模型加载很慢？
**A**: 首次加载 7B 模型需要 5-10 秒，这是正常的。后续加载会更快。

### Q2: 如何确认使用 NPU 而非 CPU？
**A**: 检查 `get_performance_stats()` 返回的 `device` 字段:
- `NPU (Hexagon)` - 使用 NPU
- `CPU (回退模式)` - 使用 CPU
- `Mock` - 使用模拟模式

### Q3: 可以同时测试多个模型吗？
**A**: 可以，但建议先验证推荐模型 (Qwen2.0-7B-SSD)，再测试其他模型。

### Q4: 推理结果不准确怎么办？
**A**: 
1. 检查 prompt 格式
2. 尝试增加 max_tokens
3. 调整 temperature 参数
4. 使用更适合的模型

### Q5: 如何提升推理速度？
**A**:
1. 使用 BURST 性能模式
2. 减少 max_tokens (128-256)
3. 使用更小模型 (llama3.2-3b)
4. 优化输入 prompt

---

## 联系支持

如果以上方法都无法解决问题：

1. **查看官方文档**
   - QAI AppBuilder 文档: `C:/ai-engine-direct-helper/docs/`
   - Python 示例: `C:/ai-engine-direct-helper/samples/python/`
   - Genie 示例: `C:/ai-engine-direct-helper/samples/genie/python/`

2. **在线资源**
   - 高通开发者论坛: https://bbs.csdn.net/forums/qualcomm
   - AI-Hub: https://aihub.qualcomm.com

3. **提交 Bug**
   - 在项目 GitHub 提交 Issue: https://github.com/anbeime/antinet/issues
   - 包含完整的错误日志和系统信息

---

**文档版本**: 1.0
**更新时间**: 2026-01-17
**适用于**: Antinet 项目 - 骁龙 X Elite AIPC
