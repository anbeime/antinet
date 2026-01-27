# 🔧 NPU 性能问题诊断和优化方案

## ⚠️ 问题确认

### 当前状态
- ✅ 后端服务运行正常
- ✅ NPU 模型加载成功（10.65秒）
- ✅ 技能系统：28 个技能已注册
- ❌ **推理延迟：7419.36ms** （严重超标！）

### 性能对比

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 模型加载 | < 20s | 10.65s | ✅ 正常 |
| 推理延迟 | < 500ms | 7419ms | ❌ 超标 14.8 倍 |
| 熔断阈值 | 2000ms | 7419ms | ❌ 超过 3.7 倍 |

---

## 🔍 问题根因分析

### 可能原因

1. **未使用 NPU 加速** ⭐⭐⭐
   - 模型加载到 NPU，但推理时回退到 CPU
   - QNN execution provider 未正确配置

2. **首次推理编译** ⭐⭐
   - 首次推理需要编译，后续会快
   - 需要测试第二次推理

3. **max_new_tokens 过大** ⭐⭐
   - 生成 token 数量过多
   - 每个 token 都需要推理时间

4. **内存分配问题** ⭐
   - NPU 内存不足
   - 频繁的内存交换

---

## 🚀 优化方案

### 方案 1：启用 BURST 性能模式 ⭐⭐⭐

**修改：** `backend/models/model_loader.py`

```python
def load(self):
    """加载 NPU 模型"""
    try:
        logger.info("正在加载模型: Qwen2.0-7B-SSD...")
        
        # ✅ 启用 BURST 性能模式
        try:
            from qai_hub_models.models._shared.perf_profile import PerfProfile
            PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
            logger.info("[NPU] ✓ BURST 性能模式已启用")
        except Exception as e:
            logger.warning(f"[NPU] 无法启用 BURST 模式: {e}")
        
        # 继续加载模型...
        self.context = GenieContext(
            config_path=str(config_path),
            runtime_config={"backend": "qnn_htp"}
        )
```

**预期改善：** 延迟降低 30-50%

---

### 方案 2：减少 max_new_tokens ⭐⭐⭐

**修改：** `backend/routes/npu_routes.py` 或调用处

```python
# 从
response = loader.infer(
    prompt=prompt,
    max_new_tokens=256,  # ❌ 太大
    temperature=0.7
)

# 改为
response = loader.infer(
    prompt=prompt,
    max_new_tokens=32,   # ✅ 减少到 32
    temperature=0.7
)
```

**预期改善：** 延迟降低 70-80%

---

### 方案 3：测试第二次推理 ⭐⭐

**原因：** 首次推理可能包含编译时间

**测试脚本：**
```python
# 第一次推理（包含编译）
start = time.time()
result1 = loader.infer("你好", max_new_tokens=32)
time1 = time.time() - start

# 第二次推理（无编译）
start = time.time()
result2 = loader.infer("你好", max_new_tokens=32)
time2 = time.time() - start

print(f"第一次: {time1*1000:.2f}ms")
print(f"第二次: {time2*1000:.2f}ms")
```

---

### 方案 4：优化 Prompt ⭐⭐

**原则：** 更短的 prompt = 更快的推理

```python
# 从
prompt = "请详细分析以下数据并给出完整的解释..."  # ❌ 太长

# 改为
prompt = "分析数据:"  # ✅ 简短
```

---

### 方案 5：检查 NPU 配置 ⭐⭐⭐

**验证 QNN backend：**

```python
def load(self):
    # 添加详细日志
    logger.info(f"[DEBUG] Backend Type: {self.context.backend_type}")
    logger.info(f"[DEBUG] Device: {self.context.device}")
    
    # 确认使用 QnnHtp
    if "Htp" not in str(self.context.backend_type):
        logger.warning("[WARNING] 未使用 NPU (HTP) backend!")
```

---

## 📋 立即执行的优化步骤

### 步骤 1：快速测试 - 减少 max_new_tokens

**创建测试脚本：**

```python
# test_npu_quick.py
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

from models.model_loader import get_model_loader

loader = get_model_loader()

print("=" * 60)
print("NPU 快速性能测试")
print("=" * 60)

# 测试不同的 max_new_tokens
test_configs = [
    {"max_new_tokens": 8, "name": "极短"},
    {"max_new_tokens": 16, "name": "短"},
    {"max_new_tokens": 32, "name": "中"},
    {"max_new_tokens": 64, "name": "长"}
]

for config in test_configs:
    print(f"\n测试 {config['name']} ({config['max_new_tokens']} tokens):")
    
    start = time.time()
    response = loader.infer(
        prompt="你好",
        max_new_tokens=config['max_new_tokens'],
        temperature=0.7
    )
    latency = (time.time() - start) * 1000
    
    print(f"  延迟: {latency:.2f}ms")
    print(f"  响应: {response[:50]}...")
    
    if latency < 500:
        print(f"  ✅ 达标!")
    else:
        print(f"  ❌ 超标 ({latency/500:.1f}x)")

print("\n" + "=" * 60)
```

**运行：**
```powershell
cd C:\test\antinet
& "venv_arm64\Scripts\python.exe" test_npu_quick.py
```

---

### 步骤 2：启用 BURST 模式

**编辑：** `backend/models/model_loader.py`

找到 `load()` 方法，在创建 GenieContext 之前添加：

```python
# 启用 BURST 性能模式
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
    logger.info("[NPU] BURST 性能模式已启用")
except Exception as e:
    logger.warning(f"[NPU] 无法启用 BURST 模式: {e}")
```

---

### 步骤 3：修改默认 max_new_tokens

**编辑：** `backend/models/model_loader.py`

找到 `infer()` 方法：

```python
def infer(self, prompt: str, max_new_tokens: int = 32, temperature: float = 0.7) -> str:
    # 从 256 改为 32
```

---

### 步骤 4：重启后端测试

```cmd
cd C:\test\antinet
clean_start_backend.bat
```

然后测试：
```powershell
curl http://localhost:8000/api/npu/benchmark
```

---

## 🎯 预期优化效果

### 优化前
- 推理延迟：7419ms
- 状态：❌ 严重超标

### 优化后（预期）

| 优化措施 | 预期延迟 | 改善 |
|---------|---------|------|
| 减少 tokens (256→32) | ~1850ms | 75% ↓ |
| + BURST 模式 | ~925ms | 50% ↓ |
| + 优化 prompt | ~650ms | 30% ↓ |
| + 第二次推理（缓存） | ~400ms | 38% ↓ |

**最终目标：** < 500ms ✅

---

## 🔧 完整优化代码

### 修改 1：model_loader.py

```python
def load(self):
    """加载 NPU 模型"""
    try:
        logger.info("正在加载模型: Qwen2.0-7B-SSD...")
        logger.info(f"模型路径: {self.model_path}")
        
        # ✅ 新增：启用 BURST 性能模式
        try:
            from qai_hub_models.models._shared.perf_profile import PerfProfile
            PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
            logger.info("[NPU] ✓ BURST 性能模式已启用")
        except Exception as e:
            logger.warning(f"[NPU] 无法启用 BURST 模式: {e}")
        
        # 加载配置
        config_path = Path(self.model_path) / "config.json"
        
        # ... 继续原有代码
```

```python
def infer(self, prompt: str, max_new_tokens: int = 32, temperature: float = 0.7) -> str:
    # ✅ 修改：默认从 256 改为 32
    """
    NPU 推理
    
    参数:
        prompt: 输入文本
        max_new_tokens: 最大生成 token 数（默认 32，推荐 8-64）
        temperature: 温度参数
    """
```

---

## 📊 测试计划

### 测试 1：快速性能测试
```powershell
& "venv_arm64\Scripts\python.exe" test_npu_quick.py
```

### 测试 2：API 基准测试
```powershell
curl http://localhost:8000/api/npu/benchmark
```

### 测试 3：实际推理测试
```powershell
$body = @{
    prompt = "你好"
    max_new_tokens = 32
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/npu/infer" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

---

## ✅ 执行检查清单

- [ ] 创建 test_npu_quick.py
- [ ] 运行快速性能测试
- [ ] 修改 model_loader.py（启用 BURST）
- [ ] 修改 max_new_tokens 默认值（256→32）
- [ ] 重启后端服务
- [ ] 运行 API 基准测试
- [ ] 验证延迟 < 500ms

---

## 🚀 立即执行

**第一步：创建并运行快速测试**

```powershell
cd C:\test\antinet
# 创建测试脚本（见上面的代码）
& "venv_arm64\Scripts\python.exe" test_npu_quick.py
```

**第二步：根据测试结果决定优化方案**

如果测试显示：
- 8-16 tokens < 500ms → 只需减少默认 tokens
- 所有配置都 > 500ms → 需要启用 BURST + 减少 tokens
- 第二次推理明显更快 → 首次编译问题，可接受

---

**准备好了吗？先运行快速测试看看结果！** 🚀

---

**创建时间：** 2026-01-27  
**问题：** NPU 推理延迟 7419ms  
**目标：** 优化到 < 500ms  
**状态：** 等待测试
