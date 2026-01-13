# 远程 AIPC NPU 推理任务清单 - 2026-01-14（修正版）

## ⚠️ 重要说明

**架构已修正**：已回退到正确的 `qai_appbuilder` 直接调用架构，放弃 GenieAPIService 方案。

### 为什么回退？

**错误的架构**（已废弃）:
- 通过 GenieAPIService HTTP API 调用
- GenieAPIService.exe 找不到
- 最终回退到模拟模式 ❌

**正确的架构**（当前）:
- 直接使用 `qai_appbuilder` Python SDK
- 直接加载 QNN 模型到 NPU
- 真正的 NPU 推理 ✅

---

## 🎯 核心任务（必须使用真实 NPU）

### 任务 1: 环境验证（30分钟）⏰ 立即执行

#### 1.1 拉取最新代码
```bash
cd C:\Users\AI-PC-19\Desktop\antinet
git pull origin main
```

**重要**：确认 `backend/models/model_loader.py` 已回退到使用 `qai_appbuilder`

#### 1.2 检查依赖

```bash
cd backend

# 检查 QAI AppBuilder
pip show qai-appbuilder

# 如果未安装
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl
```

#### 1.3 验证模型文件

```bash
# 检查预装模型
dir C:\model\Qwen2.0-7B-SSD-8380-2.34

# 如果是 .zip 压缩包，需要解压
cd C:\model
powershell Expand-Archive -Path "Qwen2.0-7B-SSD-8380-2.34.zip" -DestinationPath "Qwen2.0-7B-SSD-8380-2.34"
```

**验证标准**:
- ✅ `qai_appbuilder` 已安装
- ✅ 模型目录存在且包含 `.bin` 或 `.qnn` 文件
- ✅ 代码使用 `from qai_appbuilder import QNNContext, QNNConfig`

---

### 任务 2: 直接 NPU 推理测试（1小时）⏰ 高优先级

#### 2.1 创建简单测试脚本

**文件**: `backend/test_qai_direct.py`

```python
"""
直接测试 QAI AppBuilder NPU 推理
"""
import sys
import time
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from models.model_loader import NPUModelLoader

print("=" * 60)
print("QAI AppBuilder NPU 直接推理测试")
print("=" * 60)

# 1. 加载模型
print("\n[1/3] 加载模型...")
try:
    loader = NPUModelLoader()  # 使用默认推荐模型
    model = loader.load()
    print("[OK] 模型加载成功")

    stats = loader.get_performance_stats()
    print(f"  - 模型: {stats['model_name']}")
    print(f"  - 参数: {stats['params']}")
    print(f"  - 设备: {stats['device']}")
    print(f"  - 状态: {'已加载' if stats['is_loaded'] else '未加载'}")

except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 2. 测试推理
print("\n[2/3] NPU 推理测试...")
test_prompts = [
    "分析这段数据的趋势",
    "总结关键信息",
    "提供解决方案"
]

latencies = []
for i, prompt in enumerate(test_prompts, 1):
    print(f"\n测试 {i}/{len(test_prompts)}: {prompt}")

    start_time = time.time()
    result = loader.infer(prompt, max_new_tokens=64, temperature=0.7)
    latency = (time.time() - start_time) * 1000

    latencies.append(latency)

    status = "[OK]" if latency < 500 else "[WARNING]"
    print(f"  - 延迟: {latency:.2f}ms {status}")
    print(f"  - 输出: {result[:80]}...")

# 3. 统计结果
print("\n[3/3] 性能统计...")
avg_latency = sum(latencies) / len(latencies)
min_latency = min(latencies)
max_latency = max(latencies)

print(f"  - 平均延迟: {avg_latency:.2f}ms")
print(f"  - 最小延迟: {min_latency:.2f}ms")
print(f"  - 最大延迟: {max_latency:.2f}ms")
print(f"  - 达标状态: {'[OK] 通过' if avg_latency < 500 else '[FAIL] 超标'}")

print("\n" + "=" * 60)
print("测试完成！")
print("=" * 60)
```

#### 2.2 运行测试

```bash
cd backend
python test_qai_direct.py
```

**预期输出**:
```
============================================================
QAI AppBuilder NPU 直接推理测试
============================================================

[1/3] 加载模型...
[OK] 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数: 7B
  - 设备: NPU (Hexagon)
  - 状态: 已加载

[2/3] NPU 推理测试...

测试 1/3: 分析这段数据的趋势
  - 延迟: XXXms [OK]
  - 输出: ...

[3/3] 性能统计...
  - 平均延迟: XXXms
  - 达标状态: [OK] 通过

============================================================
测试完成！
============================================================
```

#### 2.3 记录性能数据

**创建文件**: `backend/NPU_REAL_PERFORMANCE.txt`

```
# NPU 真实性能测试 - 2026-01-14

## 环境
- 设备: 骁龙 X Elite AIPC
- 模型: Qwen2.0-7B-SSD-8380-2.34
- SDK: QAI AppBuilder (qai_appbuilder)
- 量化: QNN INT8
- 性能模式: BURST

## QAI AppBuilder 直接推理结果

测试 1: "分析这段数据的趋势"
  - 延迟: ___ms

测试 2: "总结关键信息"
  - 延迟: ___ms

测试 3: "提供解决方案"
  - 延迟: ___ms

平均延迟: ___ms
最小延迟: ___ms
最大延迟: ___ms
达标状态: [通过/超标]

## 备注
[记录任何问题或观察]
```

---

### 任务 3: 后端 API 集成测试（1小时）⏰ 中优先级

#### 3.1 启动后端服务

```bash
cd backend
python main.py
```

**检查日志**:
```
============================================================
Antinet智能知识管家 v1.0.0
============================================================
运行环境: NPU
数据不出域: True

INFO - 正在加载模型: Qwen2.0-7B-SSD...
INFO - 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 运行设备: NPU (Hexagon)
```

**关键**：日志必须显示 "NPU (Hexagon)"，不能是 "Mock" 或 "模拟"

#### 3.2 测试 API 端点

```bash
# 测试状态
curl http://localhost:8000/api/npu/status

# 预期输出:
# {
#   "loaded": true,
#   "model_name": "Qwen2.0-7B-SSD",
#   "device": "NPU (Hexagon)",  <-- 必须是 NPU
#   "message": "模型已加载"
# }

# 测试数据分析
curl -X POST http://localhost:8000/api/npu/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"分析销售数据\",\"max_tokens\":64}"
```

**验证**:
- ✅ 返回 200 状态码
- ✅ `performance.device` = "NPU (Hexagon)"
- ✅ `performance.inference_time_ms` < 500
- ✅ `cards` 数组包含 4 张卡片

---

### 任务 4: 前端端到端测试（1小时）⏰ 中优先级

#### 4.1 启动前端

```bash
cd C:\Users\AI-PC-19\Desktop\antinet
pnpm install  # 如需要
pnpm dev
```

#### 4.2 测试数据分析页面

1. 访问 `http://localhost:3000/npu-analysis`
2. 输入: "分析上个月的销售数据趋势"
3. 点击"开始分析"
4. **验证**:
   - ✅ 显示 4 张四色卡片
   - ✅ 性能数据中 "设备" 显示 "NPU (Hexagon)"
   - ✅ 推理延迟 < 500ms
   - ✅ 达标状态显示 "✓ 是"

#### 4.3 测试性能监控页面

1. 访问 `http://localhost:3000/npu-dashboard`
2. 页面自动运行基准测试
3. 点击"运行测试"多次
4. **验证**:
   - ✅ 平均延迟 < 500ms
   - ✅ CPU vs NPU 加速比 > 2x
   - ✅ 延迟历史图更新正常

---

### 任务 5: 问题排查（根据需要）⏰ 低优先级

#### 问题 1: QAI AppBuilder 未安装

```bash
# 查找 whl 文件
dir /s /b C:\*qai_appbuilder*.whl

# 安装
pip install <找到的whl文件路径>
```

#### 问题 2: 模型加载失败（路径不存在）

```bash
# 检查模型
dir C:\model

# 如果模型是压缩包
cd C:\model
powershell Expand-Archive -Path "Qwen2.0-7B-SSD-8380-2.34.zip" -DestinationPath "."
```

#### 问题 3: 推理延迟超过 500ms

**方案 1**: 确认性能模式
```python
# backend/config.py
QNN_PERFORMANCE_MODE = "BURST"  # 必须是 BURST
```

**方案 2**: 减少 tokens
```python
# 在测试和前端调用中
max_new_tokens=64  # 从 128 改为 64
```

**方案 3**: 预热模型
```python
# 第一次推理可能较慢，运行几次预热
for _ in range(3):
    loader.infer("test", max_new_tokens=32)
```

#### 问题 4: 仍然显示模拟模式

**检查**:
```bash
# 查看代码是否正确
grep -n "QAI_AVAILABLE" backend/models/model_loader.py
grep -n "QNNContext" backend/models/model_loader.py

# 应该看到：
# from qai_appbuilder import QNNContext, QNNConfig
# self.model = QNNContext(...)
```

---

### 任务 6: Git 提交（30分钟）⏰ 最后执行

```bash
git status
git diff

git add backend/test_qai_direct.py
git add backend/NPU_REAL_PERFORMANCE.txt

git commit -m "test: 完成 NPU 真实推理测试（QAI AppBuilder）

工作时段: 2026-01-14 [时间]

测试方式:
- 使用 QAI AppBuilder 直接调用 NPU
- 不使用 GenieAPIService 中间层
- 不使用模拟模式

测试结果:
- ✓ 模型加载成功（QNNContext）
- ✓ NPU 推理正常（真实 NPU）
- ✓ 后端 API 集成测试通过
- ✓ 前端端到端测试通过

性能数据（AIPC 实测）:
- 模型: Qwen2.0-7B-SSD-8380-2.34
- 设备: NPU (Hexagon Tensor Processor)
- 平均延迟: ___ms (目标 < 500ms)
- 最小延迟: ___ms
- 最大延迟: ___ms
- 达标状态: [✓ 通过 / ✗ 超标]

API 端点验证:
- POST /api/npu/analyze: ✓
- GET /api/npu/status: ✓
- GET /api/npu/models: ✓
- GET /api/npu/benchmark: ✓

前端功能验证:
- /npu-analysis 页面: ✓
- /npu-dashboard 页面: ✓
- 四色卡片展示: ✓
- 性能数据显示: ✓

重要说明:
- 已放弃 GenieAPIService 方案
- 使用 qai_appbuilder 直接调用
- 所有测试均在真实 NPU 上完成
- 无模拟模式

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## ⏰ 时间规划

| 时间 | 任务 | 检查点 |
|------|------|--------|
| 00:00-00:30 | 任务 1: 环境验证 | qai_appbuilder 可用 |
| 00:30-01:30 | 任务 2: NPU 直接测试 | 真实推理成功 |
| 01:30-02:30 | 任务 3: 后端 API 测试 | API 返回真实 NPU 数据 |
| 02:30-03:30 | 任务 4: 前端测试 | 端到端功能正常 |
| 03:30-04:00 | 任务 5: 问题排查（可选） | - |
| 04:00-04:30 | 任务 6: Git 提交 | 推送成功 |

**总计**: 约 4-4.5 小时

---

## 📊 成功标准

### 必须达成（不接受模拟模式）
- ✅ QAI AppBuilder 成功安装和导入
- ✅ QNN 模型成功加载到 NPU
- ✅ 真实 NPU 推理（不是模拟）
- ✅ 设备显示 "NPU (Hexagon)"
- ✅ 所有日志不包含 "Mock" 或 "模拟"
- ✅ 真实性能数据记录

### 理想标准
- ⭐ NPU 推理延迟 < 500ms
- ⭐ CPU vs NPU 加速比 > 4x
- ⭐ 所有 API 端点测试通过
- ⭐ 前端功能完全正常

---

## 🔍 验证真实 NPU 的方法

### 代码层面
```python
# backend/models/model_loader.py 必须包含:
from qai_appbuilder import QNNContext, QNNConfig
self.model = QNNContext(...)
result = self.model.generate(...)
```

### 日志层面
```
✓ 应该看到: "运行设备: NPU (Hexagon)"
✗ 不应看到: "Mock", "模拟", "GenieAPIService"
```

### API 响应层面
```json
{
  "performance": {
    "device": "NPU (Hexagon)",  // 必须是这个
    "inference_time_ms": 450    // 应该 < 500
  }
}
```

---

## ⚠️ 绝对禁止

1. ❌ **禁止使用模拟模式** - 如果 QAI AppBuilder 不可用，必须报告问题
2. ❌ **禁止使用 GenieAPIService** - 已证实不可行
3. ❌ **禁止编造数据** - 所有性能数据必须来自真实测试
4. ❌ **禁止跳过验证** - 每个步骤必须验证设备是 NPU

---

**重点：必须使用真实 NPU，不接受任何模拟模式！** 🚀
