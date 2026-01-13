# 远程 AIPC 紧急修复和后续任务 - 2026-01-14

## 📊 远程 AI 前期工作总结

### ✅ 已完成的工作（提交 598f2be）

**1. 重构 NPU 模型加载器** (`backend/models/model_loader.py`)
- 从直接使用 qai_appbuilder 改为 GenieAPIService 架构
- 添加服务检查机制 (`_check_service()`)
- 支持模拟模式（fallback）
- 保留三个预装模型配置

**2. 创建直接测试脚本** (`backend/test_npu_direct.py`)
- 独立的 NPU 测试脚本（不依赖 FastAPI）
- 包含多个测试用例
- 性能基准测试

**3. 前端页面实现** (与本地 Claude Code 同时完成)
- NPU 数据分析页面
- NPU 性能监控仪表板

### ❌ 遇到的问题

**问题 1: 代码错误 - 重复的方法定义** 🔴 **严重**
```
backend/models/model_loader.py:
- 第 139 行: def infer(...)
- 第 192 行: def infer(...)  # 重复定义！
- 第 245-257 行: 残留的代码片段（不完整的 try-except 块）
```

**问题 2: GenieAPIService 未运行** 🟡 **中等**
- 服务检查失败（http://127.0.0.1:8910/v1/models）
- 回退到模拟模式
- 无法进行真实 NPU 推理测试

**问题 3: Unicode 编码错误** 🟡 **中等**
```
UnicodeEncodeError: 'gbk' codec can't encode character '\u2713' in position 8
```
- Windows GBK 环境无法处理特殊字符（✓, ⚠️, ❌）
- 影响测试脚本输出

**问题 4: 依赖缺失** 🟢 **轻微**
- 可能缺少 `openai` Python 包
- 可能缺少 `requests` Python 包

---

## 🎯 远程 AIPC 紧急任务（优先级排序）

### 任务 0: 修复代码错误（30分钟）⏰ 立即执行

#### 0.1 删除重复的 infer 方法

**文件**: `backend/models/model_loader.py`

**操作**: 删除第 192-257 行的重复代码

```python
# 删除从第 192 行到第 257 行的内容
# 保留第 139-190 行的第一个 infer 方法实现
```

**验证**:
```bash
# 检查是否只有一个 infer 方法
grep -n "def infer" backend/models/model_loader.py
# 应该只输出一行: 139:    def infer(...)
```

#### 0.2 修复 Unicode 编码问题

**文件**: `backend/test_npu_direct.py`

在文件开头添加:
```python
import sys
import io

# 修复 Windows GBK 编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
```

**或者**: 移除所有特殊字符（✓, ⚠️, ❌），使用文本替代:
- `✓` → `[OK]`
- `⚠️` → `[WARNING]`
- `❌` → `[ERROR]`

**验证**:
```bash
cd backend
python test_npu_direct.py
# 应该能够正常输出，没有编码错误
```

---

### 任务 1: 定位和启动 GenieAPIService（1小时）⏰ 高优先级

#### 1.1 查找 GenieAPIService

**可能的位置**:
```bash
# 搜索整个 C 盘
dir /s /b C:\*Genie*.exe

# 搜索常见位置
dir C:\Program Files\Qualcomm\*Genie*
dir C:\Qualcomm\*Genie*
dir C:\ai-engine-direct-helper\*Genie*
dir C:\Users\AI-PC-19\Desktop\*Genie*

# 检查 QAI AppBuilder 安装路径
pip show qai-appbuilder
```

**预期结果**: 找到 `GenieAPIService.exe` 的完整路径

#### 1.2 启动服务

**如果找到服务**:
```bash
# 直接启动
.\GenieAPIService.exe

# 或者指定端口
.\GenieAPIService.exe --port 8910
```

**验证服务运行**:
```bash
# 测试 API 端点
curl http://127.0.0.1:8910/v1/models
# 应该返回模型列表 JSON

# 或使用 Python
python -c "import requests; print(requests.get('http://127.0.0.1:8910/v1/models').json())"
```

#### 1.3 更新启动逻辑

**文件**: `backend/models/model_loader.py`

找到 `_start_service()` 方法（第 102 行），替换为:
```python
def _start_service(self):
    """启动 GenieAPIService"""
    import subprocess
    import time

    # GenieAPIService 可执行文件路径（根据实际情况修改）
    service_exe = r"C:\path\to\GenieAPIService.exe"  # <-- 填入实际路径

    if not Path(service_exe).exists():
        logger.error(f"GenieAPIService 不存在: {service_exe}")
        return False

    try:
        # 后台启动服务
        subprocess.Popen(
            [service_exe, "--port", "8910"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW  # Windows 后台运行
        )

        # 等待服务启动
        for i in range(10):
            time.sleep(1)
            if self._check_service():
                logger.info("✓ GenieAPIService 启动成功")
                self.is_service_running = True
                return True

        logger.warning("GenieAPIService 启动超时")
        return False

    except Exception as e:
        logger.error(f"启动 GenieAPIService 失败: {e}")
        return False
```

**如果找不到服务**: 记录详细信息，继续使用模拟模式，跳到任务 3

---

### 任务 2: NPU 真实推理测试（1小时）⏰ 高优先级

**前提**: GenieAPIService 已成功启动

#### 2.1 测试基本推理

```bash
cd backend
python test_npu_direct.py
```

**预期输出**:
```
======================================================================
测试 1: 模型加载
======================================================================
[OK] 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 运行设备: NPU (通过 GenieAPIService)

======================================================================
测试 2: NPU 推理性能（目标 < 500ms）
======================================================================

测试 1/3: 分析这段数据的趋势
  - 延迟: XXXms [OK] / [WARNING] 超标
  - 输出预览: ...

平均延迟: XXXms
[OK] 性能测试通过（< 500ms）
```

#### 2.2 记录性能数据

**创建文件**: `backend/NPU_PERFORMANCE_RESULTS.txt`

```
# NPU 性能测试结果 - 2026-01-14

## 测试环境
- 设备: 骁龙 X Elite AIPC
- 模型: Qwen2.0-7B-SSD-8380-2.34
- 服务: GenieAPIService (端口 8910)
- 量化: QNN INT8
- 性能模式: BURST

## 直接测试结果 (test_npu_direct.py)
测试 1: "分析这段数据的趋势"
  - 延迟: ___ms
  - 状态: ___

测试 2: "总结一下关键信息"
  - 延迟: ___ms
  - 状态: ___

测试 3: "这个问题的解决方案是什么"
  - 延迟: ___ms
  - 状态: ___

平均延迟: ___ms
达标状态: [✓ 通过 / ✗ 超标]

## 问题记录
[如果有问题，在这里详细记录]
```

---

### 任务 3: 端到端前后端集成测试（1小时）⏰ 中优先级

#### 3.1 启动后端服务

```bash
cd backend
python main.py
```

**检查启动日志**:
```
============================================================
Antinet智能知识管家 v1.0.0
端侧智能数据中枢与协同分析平台
============================================================
运行环境: NPU
数据不出域: True

[INFO] GenieAPIService 正在运行: Qwen2.0-7B-SSD
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 运行设备: NPU (通过 GenieAPIService)
```

#### 3.2 测试 API 端点

```bash
# 测试模型列表
curl http://localhost:8000/api/npu/models

# 测试模型状态
curl http://localhost:8000/api/npu/status

# 测试数据分析（POST请求）
curl -X POST http://localhost:8000/api/npu/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"分析上个月的销售数据\", \"max_tokens\": 64, \"temperature\": 0.7}"
```

**预期**: 所有 API 调用返回 200 状态码和正确的 JSON 数据

#### 3.3 前端功能测试

```bash
# 新开终端
cd C:\Users\AI-PC-19\Desktop\antinet
pnpm dev
```

**测试流程**:
1. 访问 `http://localhost:3000/npu-analysis`
   - 输入: "分析上个月的销售数据趋势"
   - 点击"开始分析"
   - 检查: 是否显示四色卡片
   - 检查: 性能数据是否正确

2. 访问 `http://localhost:3000/npu-dashboard`
   - 检查: 自动运行基准测试
   - 检查: 4个指标卡片显示
   - 检查: CPU vs NPU 对比图
   - 点击: "运行测试"
   - 检查: 延迟历史图更新

**记录测试结果**:
```
## 前端功能测试

### 数据分析页面
- 查询输入: ✓ / ✗
- API 调用: ✓ / ✗
- 四色卡片显示: ✓ / ✗
- 性能数据显示: ✓ / ✗
- 推理延迟: ___ms

### 性能监控页面
- 自动测试: ✓ / ✗
- 关键指标: ✓ / ✗
- 对比图表: ✓ / ✗
- 手动测试: ✓ / ✗
- 平均延迟: ___ms
```

---

### 任务 4: 修复和优化（根据需要）⏰ 低优先级

#### 4.1 安装缺失的依赖

```bash
# 检查并安装
pip list | findstr openai
pip list | findstr requests

# 如果缺失
pip install openai requests
```

#### 4.2 优化推理延迟（如果超标）

**方案 1**: 降低 max_tokens
```python
# 在 src/pages/NPUAnalysis.tsx 中修改
max_tokens: 64  # 从 128 改为 64
```

**方案 2**: 使用更小模型
```python
# 在 backend/config.py 中修改
MODEL_PATH = Path("C:/model/llama3.2-3b-8380-qnn2.37")
```

**方案 3**: 确认性能模式
```python
# backend/config.py
QNN_PERFORMANCE_MODE = "BURST"  # 必须是 BURST
```

---

### 任务 5: Git 提交和推送（30分钟）⏰ 最后执行

```bash
# 检查修改
git status
git diff

# 添加文件
git add backend/models/model_loader.py
git add backend/test_npu_direct.py
git add backend/NPU_PERFORMANCE_RESULTS.txt

git commit -m "fix: 修复代码错误并完成 NPU 端到端测试

工作时段: 2026-01-14 [开始时间]-[结束时间]

修复内容:
1. 删除重复的 infer 方法定义 (model_loader.py)
2. 修复 Unicode 编码错误 (test_npu_direct.py)
3. 更新 GenieAPIService 启动逻辑

测试完成:
- ✓ NPU 模型加载测试
- ✓ NPU 推理性能测试
- ✓ 后端 API 端点测试
- ✓ 前端页面功能测试
- ✓ 端到端集成测试

性能数据（AIPC 实测）:
- NPU 平均延迟: ___ms (目标 < 500ms) [✓/✗]
- 最小延迟: ___ms
- 最大延迟: ___ms
- GenieAPIService 状态: [运行中/模拟模式]

遇到的问题和解决方案:
[详细记录]

下一步建议:
- [根据实际情况填写]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## ⚠️ 重要注意事项

### 关于 GenieAPIService

**如果找不到 GenieAPIService.exe**:
1. 记录搜索过程和结果
2. 检查 QAI AppBuilder 文档
3. 询问设备管理员
4. 继续使用模拟模式完成其他测试

**可能的替代方案**:
- 直接使用 `qai_appbuilder` Python API（如果可用）
- 使用 QNN 命令行工具
- 联系技术支持获取正确的服务路径

### 代码修复优先级

**必须修复**（阻断问题）:
- ✓ 重复的 infer 方法定义
- ✓ Unicode 编码错误

**应该修复**（影响功能）:
- GenieAPIService 启动逻辑
- 依赖安装

**可以优化**（改进体验）:
- 推理延迟优化
- 错误处理改进

---

## 📊 成功标准

### 最低标准（必须达成）
- ✅ 代码错误已修复（无重复方法）
- ✅ 测试脚本可以正常运行（无编码错误）
- ✅ 后端服务可以启动
- ✅ 前端页面可以访问
- ✅ 记录了详细的测试结果和问题

### 理想标准（努力达成）
- ⭐ GenieAPIService 成功启动
- ⭐ NPU 真实推理测试完成
- ⭐ 推理延迟 < 500ms
- ⭐ 端到端功能完全正常
- ⭐ 性能数据完整记录

---

## 🆘 遇到问题怎么办

### 问题排查顺序

1. **代码修复失败**
   - 备份原文件
   - 逐行检查修改
   - 使用 Python 语法检查: `python -m py_compile backend/models/model_loader.py`

2. **找不到 GenieAPIService**
   - 记录详细搜索结果
   - 继续使用模拟模式
   - 在提交信息中说明情况

3. **服务启动失败**
   - 检查端口占用: `netstat -ano | findstr 8910`
   - 尝试不同端口
   - 查看服务日志

4. **推理延迟超标**
   - 确认性能模式为 BURST
   - 减少 max_tokens
   - 尝试更小模型
   - 记录实际延迟数据

5. **前端 API 调用失败**
   - 检查 CORS 配置
   - 确认后端正在运行
   - 查看浏览器控制台错误
   - 查看后端日志

---

## ⏰ 时间规划

| 时间 | 任务 | 检查点 |
|------|------|--------|
| 00:00-00:30 | 任务 0: 修复代码错误 | 代码语法正确 |
| 00:30-01:30 | 任务 1: 查找和启动服务 | 服务运行或确认不可用 |
| 01:30-02:30 | 任务 2: NPU 推理测试 | 性能数据记录 |
| 02:30-03:30 | 任务 3: 端到端测试 | 所有功能验证 |
| 03:30-04:00 | 任务 4: 优化（可选） | 延迟优化 |
| 04:00-04:30 | 任务 5: Git 提交 | 推送成功 |

**总计**: 约 4-4.5 小时

---

## 📞 需要记录的信息

### 环境信息
```bash
# Python 版本
python --version

# 已安装包
pip list > installed_packages.txt

# QAI AppBuilder 信息
pip show qai-appbuilder

# 系统信息
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

### 搜索结果（如果找不到服务）
```
搜索命令: dir /s /b C:\*Genie*.exe
搜索结果: [详细列出]

检查位置:
- C:\Program Files\Qualcomm\: [有/无]
- C:\Qualcomm\: [有/无]
- C:\ai-engine-direct-helper\: [有/无]

QAI AppBuilder 路径: [pip show 结果]
```

---

**专注于修复错误和功能验证，记录真实数据最重要！** 🚀
