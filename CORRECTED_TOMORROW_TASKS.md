# 明天任务清单 - 2026-01-15（修正版）

## 🚨 发现的关键问题

### 问题1: 架构不统一 ⚠️⚠️⚠️

**远程AI说的和做的不一致！**

远程AI的声明：
> "已回退到正确的 qai_appbuilder 直接调用架构"

**实际情况**：
1. ✅ **test_genie_context.py** - 使用 `GenieContext`（独立测试脚本）
2. ❌ **backend/models/model_loader.py** - 使用 `QNNContext`（后端代码）

**代码证据**：
```python
# test_genie_context.py (第12行)
from qai_appbuilder import GenieContext
genie = GenieContext(str(config_path))  # ✅ 正确

# backend/models/model_loader.py (第13行、139行)
from qai_appbuilder import QNNContext, Runtime, LogLevel, ProfilingLevel, PerfProfile
class LLMModel(QNNContext):  # ❌ 不一致
    def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7):
        return f"[Mock] Response to: {prompt[:50]}..."  # ❌ 仍然是Mock！
```

### 问题2: 推理仍然是Mock

**backend/models/model_loader.py 第188行**：
```python
# TODO: 实现 LLM 推理逻辑
# 需要根据具体的 QNN 模型格式实现
return f"[Mock] Response to: {prompt[:50]}..."
```

**结论**: model_loader.py 即使加载成功，推理输出仍然是假的！

### 问题3: 测试脚本过多，混乱

远程AI创建了太多测试脚本：
- test_genie_context.py ✅ (使用 GenieContext，可能有效)
- test_qnn_model.py
- backend/test_qai_direct.py
- backend/test_npu_real.py
- backend/test_qnn_simple.py
- backend/test_npu_direct.py
- quick_npu_test.py

**问题**: 哪个才是真正能工作的？需要明确。

---

## 🎯 明天的修正任务（按优先级）

### 任务0: 验证真相 ⭐⭐⭐⭐ (必须第一步)

**目标**: 找出哪个测试脚本真的能跑

**步骤**:
```bash
cd C:/test/antinet  # 或实际路径

# 1. 先运行 GenieContext 版本（最有希望）
python test_genie_context.py

# 2. 观察输出
# - 如果模型加载成功 → 记录加载时间
# - 如果推理成功 → 记录延迟和输出内容
# - 如果失败 → 记录错误信息
```

**成功标准**:
- ✅ 模型加载成功（无报错）
- ✅ 推理输出**不是** "[Mock]" 或 "[模拟]" 开头
- ✅ 延迟 < 1000ms（首次可以慢一点）
- ✅ 输出是真实的中文回答

**如果失败**，依次测试：
```bash
python backend/test_qai_direct.py
python backend/test_npu_real.py
```

---

### 任务1: 修复 model_loader.py ⭐⭐⭐ (高优先级)

**前提**: 任务0中找到了能工作的方案

**目标**: 统一使用 GenieContext（如果任务0验证成功）

**修改步骤**:

**1.1 更新导入**
```python
# backend/models/model_loader.py 第13行
# 修改前
from qai_appbuilder import QNNContext, Runtime, LogLevel, ProfilingLevel, PerfProfile

# 修改后
from qai_appbuilder import GenieContext, Runtime, LogLevel, ProfilingLevel, PerfProfile
```

**1.2 重写 load() 方法**

参考 test_genie_context.py 的实现（第21-51行），改写为：

```python
def load(self) -> Any:
    if self.is_loaded:
        logger.info(f"[OK] 模型已加载: {self.model_config['name']}")
        return self.model

    # 验证模型路径
    config_path = Path(self.model_config['path']) / "config.json"
    if not config_path.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    # 检查 QAI AppBuilder
    if not QAI_AVAILABLE:
        logger.warning("[WARNING] QAI AppBuilder 不可用")
        self.model = self._create_mock_model()
        self.is_loaded = True
        return self.model

    try:
        start_time = time.time()

        # 使用 GenieContext 加载
        self.model = GenieContext(str(config_path))

        load_time = time.time() - start_time
        logger.info(f"[OK] 模型加载成功")
        logger.info(f"  - 加载时间: {load_time:.2f}s")
        logger.info(f"  - 运行设备: NPU (GenieContext)")

        self.is_loaded = True
        return self.model
    except Exception as e:
        logger.error(f"[ERROR] 模型加载失败: {e}")
        raise
```

**1.3 重写 infer() 方法**

参考 test_genie_context.py 的实现（第54-80行）：

```python
def infer(self, prompt: str, max_new_tokens: int = 512, temperature: float = 0.7) -> str:
    if not self.is_loaded:
        self.load()

    try:
        # 设置推理参数
        self.model.SetParams(
            max_length=max_new_tokens,
            temperature=temperature,
            top_k=40,
            top_p=0.95
        )

        # 构造完整 prompt
        formatted_prompt = f"User: {prompt}\nAssistant: "

        # 执行推理（使用回调函数收集输出）
        response_text = ""
        def callback(text):
            nonlocal response_text
            response_text += text

        start_time = time.time()
        self.model.Query(formatted_prompt, callback)
        inference_time = (time.time() - start_time) * 1000

        logger.info(f"[OK] 推理完成: {inference_time:.2f}ms")

        if inference_time > 500:
            logger.warning(f"[WARNING] 延迟超标: {inference_time:.2f}ms")

        return response_text

    except Exception as e:
        logger.error(f"[ERROR] 推理失败: {e}")
        raise
```

**文件位置**: [backend/models/model_loader.py](backend/models/model_loader.py)

---

### 任务2: 端到端集成测试 ⭐⭐ (高优先级)

**前提**: 任务1完成，model_loader.py 已修复

**目标**: 验证整个后端 API 能正常工作

**2.1 启动后端**
```bash
cd backend
python main.py
```

**2.2 观察启动日志**
```
应该看到:
============================================================
Antinet智能知识管家 v1.0.0
============================================================
INFO - 正在加载模型: Qwen2.0-7B-SSD...
INFO - [OK] 模型加载成功
INFO -   - 加载时间: X.XX s
INFO -   - 运行设备: NPU (GenieContext)  ← 关键！

不应该看到:
- "Mock"
- "模拟"
- "QNNContext"
```

**2.3 测试 API**
```bash
# 终端2
curl http://localhost:8000/api/npu/status

# 预期返回
{
  "loaded": true,
  "model_name": "Qwen2.0-7B-SSD",
  "device": "NPU (GenieContext)",  ← 关键！
  "message": "模型已加载"
}

# 测试推理
curl -X POST http://localhost:8000/api/npu/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"分析销售数据趋势\",\"max_tokens\":64}"

# 检查返回
{
  "cards": [...],  // 应该有4张卡片
  "performance": {
    "device": "NPU (GenieContext)",  ← 必须
    "inference_time_ms": XXX,  ← 应该 < 500
    ...
  }
}
```

**验证点**:
- ✅ device 显示 "NPU (GenieContext)"
- ✅ 推理延迟 < 500ms
- ✅ 返回的文本**不是** Mock 数据
- ✅ 卡片内容是真实的中文回答

---

### 任务3: 前端测试 ⭐ (中优先级)

**前提**: 任务2通过，后端API正常

**3.1 启动前端**
```bash
cd C:/test/antinet
pnpm dev
```

**3.2 测试页面**

访问: http://localhost:3000/npu-analysis

输入: "分析上个月的销售数据"

**验证**:
- ✅ 显示4张卡片（趋势、洞察、建议、风险）
- ✅ 性能面板显示 "设备: NPU (GenieContext)"
- ✅ 延迟 < 500ms
- ✅ 卡片内容是真实的中文（不是Mock）

---

### 任务4: 记录性能数据 ⭐ (必须完成)

**目标**: 创建真实的性能测试报告

**创建文件**: `NPU_PERFORMANCE_RESULTS.md`

**内容模板**:
```markdown
# NPU 真实性能测试结果 - 2026-01-15

## ⚠️ 架构修正
- 原架构: QNNContext（无法实现真实推理）
- 修正后: GenieContext（真实NPU推理）

## 测试环境
- 设备: 骁龙 X Elite AIPC
- Python: 3.12.x
- QAI AppBuilder: 2.31.0
- 模型: Qwen2.0-7B-SSD
- 量化: QNN 2.34
- 架构: GenieContext

## test_genie_context.py 独立测试

### 模型加载
- 加载时间: ___ s
- 状态: ✅ 成功 / ❌ 失败

### 推理测试（3轮）
| 轮次 | 查询 | 延迟(ms) | 输出示例 | 状态 |
|-----|------|---------|---------|-----|
| 1 | 介绍AIPC | ___ | ___ | ✅/❌ |
| 2 | 端侧AI优势 | ___ | ___ | ✅/❌ |
| 3 | 数据趋势 | ___ | ___ | ✅/❌ |

平均延迟: ___ ms
达标状态: ✅ < 500ms / ❌ 超标

## backend API 集成测试

### /api/npu/status
- 响应: ✅ 正常 / ❌ 错误
- device 字段: "___"

### /api/npu/analyze
- 推理延迟: ___ ms
- 卡片数量: ___
- 内容质量: ✅ 真实 / ❌ Mock

## 前端端到端测试

### /npu-analysis 页面
- 四色卡片: ✅ 显示正常 / ❌ 异常
- 性能数据: ✅ 真实NPU / ❌ Mock
- 用户体验: ✅ 流畅 / ❌ 卡顿

## 问题记录

### 发现的问题
1. ___
2. ___

### 解决方案
1. ___
2. ___

## 结论

- 真实NPU推理: ✅ / ❌
- 性能达标: ✅ / ❌
- 可投入使用: ✅ / ❌
```

---

### 任务5: Git提交 ⭐ (必须完成)

**前提**: 所有测试通过

```bash
git status
git diff backend/models/model_loader.py

git add backend/models/model_loader.py
git add NPU_PERFORMANCE_RESULTS.md

git commit -m "fix: 修正 NPU 架构使用 GenieContext 实现真实推理

工作时段: 2026-01-15
问题修正:
- 发现 model_loader.py 使用 QNNContext，无法实现真实推理
- 修改为使用 GenieContext（与 test_genie_context.py 一致）
- 实现真实的 NPU 推理（非 Mock）

修改内容:
- 更新 load() 方法使用 GenieContext
- 重写 infer() 方法调用 GenieContext.Query()
- 移除所有 Mock 返回

测试结果:
- test_genie_context.py: ✅/❌
- 后端 API: ✅/❌
- 前端页面: ✅/❌

性能数据（AIPC 实测）:
- 平均延迟: ___ ms
- 设备: NPU (GenieContext)
- 达标状态: ✅/❌ (目标 < 500ms)

架构统一:
- 测试脚本: GenieContext ✅
- 后端代码: GenieContext ✅
- 推理输出: 真实 ✅

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## 🔍 关键验证点（明天必查）

### 1. 代码一致性
```bash
# 检查 backend/models/model_loader.py
grep "GenieContext" backend/models/model_loader.py
# 必须看到 GenieContext，不能只有 QNNContext

# 检查是否还有 Mock
grep "Mock" backend/models/model_loader.py
# 只能在 _create_mock_model() 里有，infer() 不能有
```

### 2. 运行验证
```python
# 后端启动后，日志必须显示
"运行设备: NPU (GenieContext)"
# 不能是
"运行设备: NPU (Hexagon)"  # 这是 QNNContext
"运行设备: Mock"
```

### 3. API验证
```bash
# /api/npu/status 返回必须是
{"device": "NPU (GenieContext)"}
# 不能是
{"device": "NPU (Hexagon)"}
{"device": "Mock"}
```

---

## 📝 给远程AI的反馈

### 已完成（好的方面）
- ✅ 创建了 test_genie_context.py（这个可能有效）
- ✅ 识别了 GenieContext 是正确方案
- ✅ 提供了详细的任务指南

### 存在问题（需要修正）
- ❌ **backend/models/model_loader.py 仍然使用 QNNContext**
- ❌ **推理方法仍然返回 Mock 数据**
- ❌ **架构不统一**（测试用GenieContext，后端用QNNContext）
- ❌ 创建了过多测试脚本，没有明确哪个有效
- ❌ 任务清单说"已修正"，但实际代码没有修正

---

## 🎯 明天成功的唯一标准

**运行这个命令**:
```bash
python test_genie_context.py
```

**看到这个输出**:
```
[OK] 模型加载成功！
    设备: NPU (GenieContext)

[4] 执行推理...
    查询: 你好，请简单介绍一下高通骁龙 X Elite AIPC。
    回答: 高通骁龙 X Elite AIPC是一款...（真实的中文回答）

[OK] 推理完成！
    推理延迟: 450.32ms  ← 必须 < 1000ms
```

**如果看到这个** → 任务0成功 → 继续任务1-5
**如果看不到** → 调试 test_genie_context.py → 找到问题根源

---

**关键**: 不要相信文档说的，要相信代码跑出来的结果！

**预计工作时间**: 4-6小时（如果test_genie_context.py能跑通）
**关键里程碑**: test_genie_context.py 运行成功 = 50%进度
