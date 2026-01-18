# AIPC NPU 功能测试指南

## 测试环境
- 设备: 骁龙 X Elite AIPC
- Python 版本: 3.12.10 ✅
- QAI AppBuilder: 2.31.0 ✅
- 模型: Qwen2.0-7B-SSD (11 个文件) ✅

## 快速验证（推荐）

### 方式 1: 使用 PowerShell 验证脚本
```powershell
cd C:\workspace\antinet
.\verify-npu-on-aipc.ps1
```

**预期结果**:
```
==============================================================================
NPU 环境验证 - 骁龙 X Elite AIPC
==============================================================================

[1] 检查 Python 环境...
    Python 版本: Python 3.12.10
    [OK] Python 版本符合要求 (3.12.x)

[2] 检查 QAI AppBuilder...
    [OK] QAI AppBuilder 已安装
    Version: 2.31.0

[3] 检查模型文件...
    [OK] 模型目录存在: C:\model\Qwen2.0-7B-SSD-8380-2.34
    文件数量: 11
    [OK] 配置文件存在: config.json

[4] 检查 QNN 库文件...
    [OK] QNN 库目录存在: C:\ai-engine-direct-helper\samples\qai_libs
    [OK] QnnHtp.dll 存在
    [OK] QnnHtpPrepare.dll 存在
    [OK] QnnSystem.dll 存在

[5] 运行 NPU 性能测试...
    (这可能需要 1-2 分钟)

    执行: python simple_npu_test_v2.py
    ------------------------------------------------------------------------------
    [步骤 6/6] 创建加载器并加载模型...
      - [OK] 加载器创建成功
      - [OK] 模型加载成功
      - [INFO] 加载时间: 5.23s
      - [INFO] 设备: NPU (Hexagon)
      - [INFO] 模型: Qwen2.0-7B-SSD

    执行推理测试...
    输入: 分析一下端侧AI的优势

    [推理结果]
    端侧AI的优势包括...

    [性能指标]
      - 推理延迟: 450.32ms
      - [OK] 性能达标 (< 500ms)

    ------------------------------------------------------------------------------

    [OK] 模型加载成功
    [OK] 推理完成
    推理延迟: 450ms
    [OK] 性能达标 (< 500ms)

==============================================================================
验证完成
==============================================================================
```

### 方式 2: 手动运行 Python 测试
```bash
cd C:\workspace\antinet
python simple_npu_test_v2.py
```

### 方式 3: 使用快速测试脚本
```bash
cd C:\workspace\antinet
python quick_test.py
```

## 性能基准

| 指标 | 目标 | 预期 |
|------|------|------|
| Python 版本 | 3.12.x | 3.12.10 ✅ |
| QAI AppBuilder | 2.31.0 | 2.31.0 ✅ |
| 模型加载时间 | < 10s | ~5s |
| 推理延迟 | < 500ms | ~450ms ✅ |
| 运行设备 | NPU (Hexagon) | NPU (Hexagon) ✅ |

## 异构计算架构验证

执行以下命令验证算力分配：
```python
from models.model_loader import load_model_if_needed
import logging
logging.basicConfig(level=logging.INFO)

model = load_model_if_needed()
stats = model.get_performance_stats()

print(f"设备: {stats['device']}")
print(f"模型: {stats['model_name']}")
```

**预期输出**:
```
设备: NPU (Hexagon)
模型: Qwen2.0-7B-SSD
```

**架构说明**:
- **NPU (60-70%)**: 核心模型推理 (Qwen2.0-7B-SSD)
- **CPU (20%)**: 控制逻辑、数据预处理
- **GPU (10%)**: 图像处理、并行计算（如有）

## 故障排查

如果测试失败，请查看：
- **故障排查指南**: [NPU_TROUBLESHOOTING.md](./NPU_TROUBLESHOOTING.md)
- **性能数据**: [backend/PERFORMANCE_RESULTS.md](./backend/PERFORMANCE_RESULTS.md)

常见问题：

### 问题 1: 模型加载失败
```bash
# 检查模型文件
dir C:\model\Qwen2.0-7B-SSD-8380-2.34

# 应该看到 11 个文件
```

### 问题 2: 推理延迟 > 500ms
```python
# 启用 BURST 模式
from qai_appbuilder import PerfProfile
PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
```

### 问题 3: DLL 加载失败
```bash
# 检查 PATH 环境变量
echo %PATH% | findstr qai_libs

# 应该包含:
# C:\ai-engine-direct-helper\samples\qai_libs
```

## 测试完成后

### 1. 记录性能数据
将以下信息记录到 `backend/PERFORMANCE_RESULTS.md`:
- 模型加载时间
- 推理延迟
- 设备信息
- CPU vs NPU 加速比

### 2. 验证文档更新
确保以下文档已更新：
- ✅ README.md (添加 NPU 性能验证章节)
- ✅ NPU_TROUBLESHOOTING.md (完整的故障排查指南)
- ✅ backend/PERFORMANCE_RESULTS.md (性能数据)

### 3. 准备演示视频
录制 NPU 性能演示（<= 3 分钟）：
1. 运行验证脚本
2. 展示性能数据
3. 说明 NPU 优势

### 4. 准备 PPT
添加 AIPC 技术适配章节：
- 模型运行算力单元说明
- 算力选择理由
- 端侧运行效果（NPU vs CPU）
- 异构计算使用情况

## 提交检查清单

测试完成后，确保：
- ✅ NPU 推理延迟 < 500ms
- ✅ 所有测试脚本运行成功
- ✅ 文档更新完整
- ✅ 性能数据已记录
- ✅ 演示视频已准备（如需要）

---

**创建时间**: 2026-01-18
**适用于**: 骁龙 X Elite AIPC
**Python 版本**: 3.12.x
**QAI AppBuilder**: 2.31.0
