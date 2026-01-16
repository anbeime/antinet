# 远程 AIPC 任务清单 (必须在骁龙本上执行)

## 🚨 核心目标
**在真实的骁龙 X Elite AIPC 上，验证并开启真正的 NPU 推理（非 Mock）。**

## ✅ 任务 1: 验证 NPU 环境

1. **部署代码到 AIPC**:
   - 使用 `deploy-to-aipc.ps1` 或手动复制项目。
   - 确保 `qai_appbuilder` 库已安装 (whl 包在 `C:\ai-engine-direct-helper\samples\`).
   - 确保模型文件存在: `C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json`.

2. **运行独立测试**:
   ```powershell
   python test_genie_context.py
   ```
   **预期结果**:
   - `[OK] 模型加载成功！`
   - `设备: NPU (GenieContext)`
   - `[4] 执行推理...` 输出真实的中文回答。
   - `推理延迟` 应小于 1000ms.

   **如果失败**:
   - 检查 `qai_appbuilder` 是否能 import.
   - 检查 `C:\model` 路径是否正确.

## 🛠️ 任务 2: 修复后端代码 (Critical)

目前 `backend/models/model_loader.py` 仍然使用 `QNNContext` 且返回 Mock 数据。你需要将其修改为使用 `GenieContext`。

**修改文件**: `backend/models/model_loader.py`

1. **修改导入**:
   ```python
   from qai_appbuilder import GenieContext  # 替换 QNNContext
   ```

2. **修改 `load()` 方法**:
   - 使用 `self.model = GenieContext(str(config_path))` 初始化.
   - 移除 `_create_mock_model` 的相关回退逻辑（或者仅在 import 失败时回退）.

3. **修改 `infer()` 方法**:
   - 使用 `self.model.SetParams(...)` 设置参数.
   - 使用 `self.model.Query(prompt, callback)` 获取结果.
   - **严禁** 返回 `f"[Mock]..."` 字符串.

## 🧪 任务 3: 集成测试

1. **启动后端**:
   ```powershell
   cd backend
   python main.py
   ```
   - 观察启动日志，确认显示 "设备: NPU (GenieContext)".

2. **测试 API**:
   - 请求 `http://localhost:8000/api/npu/analyze`.
   - 确认返回的 `performance.device` 是 `NPU (GenieContext)`.

## 📤 任务 4: 提交结果

1. 将修改后的 `backend/models/model_loader.py` 提交到 git.
2. 将 `test_genie_context.py` 的运行日志（截图或文本）保存为 `NPU_TEST_LOG.txt` 并提交.
3. 更新 `TODAY_SUMMARY.md` 汇报进度.
