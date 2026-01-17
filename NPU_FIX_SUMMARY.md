# NPU 模型加载器修复总结

## 问题描述
**错误**: `cannot access local variable 'QNNConfig' where it is not associated with a value`

**位置**: `backend/models/model_loader.py` 第125行和第140行

**根本原因**: 局部导入遮蔽了模块级变量

## 修复步骤

### 1. 移除局部导入 QNNConfig
**修改前** (第198行):
```python
try:
    logger.info("[INFO] 尝试CPU模式...")
    from qai_appbuilder import QNNConfig  # ❌ 局部导入导致作用域冲突
    qnn_libs_path = Path(ModelConfig.QNN_LIBS_PATH)
```

**修改后**:
```python
try:
    logger.info("[INFO] 尝试CPU模式...")
    qnn_libs_path = Path(ModelConfig.QNN_LIBS_PATH)  # ✅ 使用模块级导入
```

### 2. 移除局部导入 GenieContext
**修改前** (第156行):
```python
# 加载模型（使用 GenieContext，适用于7B+大模型）
from qai_appbuilder import GenieContext  # ❌ 局部导入
```

**修改后**:
```python
# 加载模型（使用 GenieContext，适用于7B+大模型）
# GenieContext 已在模块顶部导入  # ✅ 使用模块级导入
```

### 3. 确保模块级导入
**顶部导入** (第13行):
```python
try:
    from qai_appbuilder import QNNContext, GenieContext, Runtime, LogLevel, ProfilingLevel, PerfProfile, QNNConfig
    QAI_AVAILABLE = True
except ImportError:
    QAI_AVAILABLE = False
```

## 技术原理

### Python 变量作用域规则
当函数内部有变量赋值（包括 import）时，Python 会将该变量视为局部变量。如果在引用前没有赋值，就会抛出 `UnboundLocalError`。

**错误示例**:
```python
x = 10  # 全局变量

def func():
    print(x)  # 引用全局变量
    x = 20    # 赋值创建局部变量
    
func()  # ❌ UnboundLocalError: local variable 'x' referenced before assignment
```

**正确示例**:
```python
x = 10  # 全局变量

def func():
    global x  # 声明使用全局变量
    print(x)  # 引用全局变量
    x = 20    # 修改全局变量
    
func()  # ✅ 正常工作
```

### 导入语句的作用域
`import` 语句会创建局部变量，即使模块已经全局导入：

```python
from qai_appbuilder import QNNConfig  # 模块级导入

def load():
    # QNNConfig 应该引用模块级变量
    QNNConfig.Config(...)  # 但如果后面有局部导入...
    
    try:
        # ...Python 可能认为 QNNConfig 是局部变量
        from qai_appbuilder import QNNConfig  # 这会遮蔽模块级变量
        QNNConfig.Config(...)
    except:
        # 在这里引用 QNNConfig 时可能出错
        QNNConfig.Config(...)  # ❌ 可能抛出 UnboundLocalError
```

## 验证修复

### 测试 1: 验证 QNNConfig 可访问
```bash
cd c:\test\antinet
python test_fix.py
```

**预期输出**:
```
QAI_AVAILABLE: True
QNNConfig type: <class 'type'>
[OK] QNNConfig.Config 调用成功
```

### 测试 2: 完整模型加载
```bash
python -c "
import sys; sys.path.insert(0, 'backend')
from models.model_loader import load_model_if_needed
import logging
logging.basicConfig(level=logging.INFO)
model = load_model_if_needed()
print('✓ Model loaded successfully')
"
```

**预期输出**:
```
INFO:backend.models.model_loader:正在加载模型: Qwen2.0-7B-SSD...
INFO:backend.models.model_loader:[INFO] 尝试HTP模式（NPU）...
INFO:backend.models.model_loader:[OK] QNN HTP配置成功
INFO:backend.models.model_loader:[OK] 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 量化版本: QNN 2.34
  - 运行设备: NPU (Hexagon)
✓ Model loaded successfully
```

### 测试 3: 推理性能
```bash
python simple_npu_test.py
```

**预期输出**:
```
[OK] 模型加载成功
[OK] 推理完成: 450ms [OK]
输出: 端侧AI的优势包括低延迟、隐私保护、离线可用...
```

## 最佳实践

### ✅ 应该做的
1. **在模块顶部导入所有依赖**
   ```python
   from qai_appbuilder import QNNConfig, GenieContext, Runtime, LogLevel, ProfilingLevel
   ```

2. **在函数内部使用模块级变量**
   ```python
   def load():
       QNNConfig.Config(...)  # 使用模块级导入的 QNNConfig
   ```

3. **使用 try-except 处理导入错误**
   ```python
   try:
       from qai_appbuilder import QNNConfig
       QAI_AVAILABLE = True
   except ImportError:
       QAI_AVAILABLE = False
   ```

### ❌ 不应该做的
1. **避免在函数内部导入已全局导入的模块**
   ```python
   from qai_appbuilder import QNNConfig  # 全局导入
   
   def load():
       from qai_appbuilder import QNNConfig  # ❌ 重复导入，可能导致作用域问题
       QNNConfig.Config(...)
   ```

2. **避免在嵌套 try-except 中导入**
   ```python
   def load():
       try:
           # ...
       except:
           from qai_appbuilder import QNNConfig  # ❌ 局部导入
           QNNConfig.Config(...)  # 可能无法访问
   ```

## 相关文件

- **修复文件**: `backend/models/model_loader.py`
- **性能文档**: `backend/PERFORMANCE_RESULTS.md`
- **测试脚本**: `test_fix.py`, `simple_npu_test.py`
- **提交信息**: `COMMIT_MESSAGE.md`
- **今日进度**: `TODAY_PROGRESS_2026-01-17.md`

## 提交记录

**Commit**: `ccf8e31`
**消息**: feat: 修复 NPU 模型加载器并更新性能文档
**推送**: `git push origin main` (成功)

## 总结

**问题**: 局部导入导致变量作用域冲突
**解决**: 移除局部导入，使用模块级导入
**影响**: 修复 NPU 模型加载，确保真实推理功能正常
**状态**: ✅ 已修复，代码已推送