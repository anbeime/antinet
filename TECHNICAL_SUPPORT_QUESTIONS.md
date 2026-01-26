# 向高通技术咨询的问题清单

## 当前系统情况

### 硬件环境
- **设备**: 骁龙 X Elite AIPC
- **NPU**: Hexagon NPU
- **Python版本**: 3.12.10 (ARM64)
- **操作系统**: Windows 11 ARM64

### 已安装的软件
- **QAI AppBuilder**: 2.38.0
- **QNN SDK**: 2.38.0.250901
- **NPU驱动**: Qualcomm_Hexagon_NPU_Driver-v1.x

### 预装模型（已可用）
1. **Qwen2.0-7B-SSD** (QNN 2.34) - 4.2GB - 推荐使用
2. **llama3.1-8b** (QNN 2.38) - 4.3GB
3. **llama3.2-3b** (QNN 2.37) - 2.3GB

### 当前问题

## 问题1: GenieContext 创建时阻塞/卡住

### 问题描述
在使用 GenieContext 创建NPU推理实例时，程序卡住无响应。

### 复现步骤
```python
from qai_appbuilder import GenieContext
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
genie = GenieContext(config_path, False)  # 此处卡住
```

### 日志输出
```
[INFO] 创建 GenieContext: C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json
[DEBUG] 正在创建 GenieContext...
[DEBUG] PATH环境变量长度: 795
[DEBUG] QNN_LOG_LEVEL: DEBUG
```
（之后无响应）

### 已尝试的解决方法
1. DLL 加载顺序优化：[bridge_lib_path, lib_path]
2. 预加载QNN核心DLL（QnnSystem.dll, QnnModelDlc.dll, QnnHtp.dll）
3. 设置环境变量：QNN_LOG_LEVEL=DEBUG, QNN_DEBUG=1
4. 检查NPU占用进程（无占用）
5. 模型路径验证（config.json存在）

### 环境变量设置
```python
os.environ['PATH'] = bridge_lib_path + ';' + lib_path + ';' + os.environ['PATH']
os.environ['QAI_LIBS_PATH'] = lib_path
os.environ['QNN_LOG_LEVEL'] = "DEBUG"
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"
```

### DLL路径
- **qai_libs**: C:/ai-engine-direct-helper/samples/qai_libs
- **bridge libs**: C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc

### 需要咨询的问题

1. GenieContext 创建卡住的常见原因是什么？
2. 如何获取 GenieContext 创建的详细日志？
3. 是否有推荐的 DLL 加载顺序？
4. 如何验证 NPU 驱动是否正常工作？
5. 是否存在超时机制可以设置？
6. GenieContext(config_path, False) 中的第二个参数具体是什么意思？

---

## 问题2: qai_hub_models 安装问题

### 问题描述
尝试安装 qai_hub_models 时提示需要 C++ 环境，无法直接在 ARM64 AIPC 上安装。

### 安装命令
```bash
pip install qai_hub_models
```

### 错误信息
```
ERROR: Could not build wheels for qai_hub_models, which is required to install pyproject.toml-based projects
```

### 当前解决方法
已将 qai_hub_models 设为可选依赖：
```python
PerfProfile = None
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
    HAS_QAI_HUB = True
    logger.info("[OK] 已导入 qai_hub_models.PerfProfile")
except ImportError:
    logger.warning("[INFO] qai_hub_models 未安装，将使用默认性能配置")
```

### 需要咨询的问题

1. qai_hub_models 是否是必须安装的？
2. 如果不安装，会有什么功能缺失？
3. PerfProfile.BURST 性能模式是必须的吗？
4. 是否有预编译的 ARM64 版本可以直接安装？
5. PerfProfile 可以用其他方式替代吗？
6. 不使用 qai_hub_models 对推理性能有多大影响？

---

## 问题3: NPU 性能模式配置

### 问题描述
qai_hub_models.PerfProfile 提供了三种性能模式，但无法导入：
- BURST（高性能，高功耗）
- DEFAULT（平衡）
- POWER_SAVER（低功耗）

### 需要咨询的问题

1. 如何在 GenieContext 中设置性能模式？
2. 如果不使用 qai_hub_models，性能模式默认是什么？
3. 如何通过环境变量或其他方式设置性能模式？
4. BURST 模式对推理延迟的具体影响是多少？
5. 是否有推荐的性能模式用于比赛演示？

---

## 问题4: EasyOCR 集成问题

### 问题描述
用户提到需要安装 EasyOCR，但不确定是否可以用预装模型替代。

### 当前情况
- **Python EasyOCR**: 主要是CPU推理
- **预装模型**: Qwen2.0-7B-SSD 等大语言模型

### 需要咨询的问题

1. EasyOCR 是否可以通过 NPU 加速？
2. 是否有预装的 OCR 模型可以直接使用？
3. EasyOCR 在 AIPC 上的性能如何（CPU vs NPU）？
4. 如果需要 OCR 功能，推荐用什么方案？
5. QNN 是否提供 OCR 相关的预训练模型？
6. 如何将自定义 OCR 模型转换为 QNN 格式？

---

## 问题5: 推理延迟优化

### 问题描述
目标推理延迟 < 500ms，但不确定当前配置是否能达到。

### 当前配置
- **模型**: Qwen2.0-7B-SSD (INT8 量化)
- **QNN版本**: 2.34
- **性能模式**: 未设置（无法使用 PerfProfile）

### 需要咨询的问题

1. Qwen2.0-7B-SSD 的典型推理延迟是多少？
2. 如何优化推理延迟以达到 < 500ms 的目标？
3. 批处理（batch size）对延迟的影响？
4. 输入长度对延迟的影响？（32/64/128/256 tokens）
5. 如何监控 NPU 的实时性能指标？
6. 是否有推荐的配置参数用于最小化延迟？

---

## 问题6: 模型转换和自定义

### 问题描述
需要了解如何将自定义模型转换为 QNN 格式。

### 需要咨询的问题

1. 模型转换需要什么工具？
2. 从哪些格式可以转换为 QNN？（ONNX/PyTorch/TensorFlow）
3. 模型量化（FP32 -> INT8）是在转换时进行还是之前？
4. 转换后的模型性能如何验证？
5. 转换过程中常见的错误和解决方法？
6. 是否需要 C++ 环境进行模型转换？

---

## 问题7: NPU 资源管理

### 问题描述
多个进程可能同时尝试使用 NPU，需要了解资源管理机制。

### 需要咨询的问题

1. NPU 是否支持多进程并发？
2. 如果不支持，如何检测 NPU 占用？
3. 如何正确释放 NPU 资源？
4. GenieContext 是否需要显式关闭或释放？
5. NPU 重置的推荐方法是什么？
6. 进程异常退出时 NPU 资源会自动释放吗？

---

## 问题8: C++ vs Python 性能对比

### 问题描述
其他 AI 建议使用 C++ 进行推理，不确定是否必要。

### 需要咨询的问题

1. Python (GenieContext) 和 C++ (QNN SDK) 的性能差距有多大？
2. 什么情况下推荐使用 C++ 而不是 Python？
3. Python 方案能否满足 < 500ms 的延迟要求？
4. C++ 开发的难度和工作量评估？
5. 比赛时间紧张（1月27日截止），是否推荐 C++ 方案？
6. 是否有 Python 的性能优化指南？

---

## 附加信息

### 当前工作方式
已采用**按需加载模式**避免启动时卡住：
```python
# backend/config.py
AUTO_LOAD_MODEL: bool = False  # 启动时不自动加载模型
```

模型将在首次推理请求时加载。

### 已验证的功能
Python 环境正常（3.12 ARM64）
QAI AppBuilder 导入成功
预装模型文件存在
DLL 文件完整
配置文件正确
后端 API 服务可正常启动

### 未验证的功能
❌ GenieContext 创建（卡住）
❌ NPU 推理实际延迟
❌ BURST 性能模式
❌ OCR 功能集成

---

## 优先级建议

### 高优先级（必须解决）
1. **问题1**: GenieContext 创建卡住
2. **问题2**: qai_hub_models 是否必须安装
3. **问题5**: 推理延迟优化方案

### 中优先级（影响评分）
4. **问题3**: 性能模式配置
5. **问题4**: OCR 功能实现方案

### 低优先级（可选优化）
6. **问题6**: 模型转换
7. **问题7**: NPU 资源管理
8. **问题8**: C++ vs Python 选择

---

## 联系方式

**推荐咨询渠道**：
1. **高通开发者论坛**: https://bbs.csdn.net/forums/qualcomm?typeId=9305416
2. **微信答疑群**: 复赛官方群
3. **技术文档**: https://docs.qualcomm.com/bundle/publicresource/topics/80-63442-50/introduction.html

**提交问题时建议包含**：
- 完整的错误日志
- 环境信息（Python版本、SDK版本等）
- 复现步骤
- 已尝试的解决方法

---

**更新日期**: 2026-01-26
**系统版本**: Antinet v1.0.0
**截止时间**: 2026-01-27（比赛提交）
