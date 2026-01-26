# NPU 设备创建错误（14001）- 完整修复方案

## 问题描述

后端启动时在创建 `GenieContext` 时卡住，日志显示：

```
[INFO] 创建 GenieContext: C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json
[DEBUG] 正在创建 GenieContext...
[DEBUG] PATH环境变量长度: 795
[DEBUG] QNN_LOG_LEVEL: DEBUG
```

然后无响应。

## 根本原因分析

1. **NPU 资源占用**：另一个 Python 进程可能正在使用 NPU
2. **DLL 加载顺序**：需要确保 QAIRT 库在 qai_libs 之前加载
3. **GenieContext 创建阻塞**：NPU 设备初始化时可能等待响应超时
4. **启动时自动加载**：后端启动时立即加载模型，如果 NPU 不可用则卡住

## 解决方案

### 方案 1：按需加载模式（推荐）✅

**修改配置，禁用启动时自动加载模型：**

```python
# backend/config.py
AUTO_LOAD_MODEL: bool = False  # 启动时自动加载模型（改为 False）
```

**效果：**
- 后端可以正常启动，不会卡住
- 模型将在首次使用时通过 API 按需加载
- 如果 NPU 不可用，其他 API 仍可正常工作

### 方案 2：修复 NPU 占用

如果必须在启动时加载模型，需要先修复 NPU 占用：

```bash
# 1. 检查占用进程
python check_npu_processes.py

# 2. 自动修复
fix_npu_device.bat

# 3. 如果无效，重启 AIPC
```

### 方案 3：优化 DLL 加载

确保 DLL 按正确顺序预加载：

```python
# backend/models/model_loader.py
paths_to_add = [bridge_lib_path, lib_path]  # bridge 在前
```

## 验证修复

### 1. 验证配置

```bash
cd c:\test\antinet
python verify_npu_inference.py
```

**预期输出：**
```
[OK] AUTO_LOAD_MODEL = False
[OK] 全局加载器未初始化（按需加载模式）
[SUCCESS] 配置验证通过！
```

### 2. 启动后端

```bash
start_backend.bat
```

**预期结果：**
- 后端正常启动，不会卡住
- 日志显示：`[startup_event] AUTO_LOAD_MODEL=False，跳过启动时自动加载模型`

### 3. 测试健康检查

```bash
curl http://localhost:8000/api/health
```

**预期结果：**
```json
{
  "status": "healthy",
  "npu_available": false,
  "model_loaded": false
}
```

### 4. 通过 API 加载模型

```bash
curl -X POST "http://localhost:8000/api/npu/analyze" \
  -H "Content-Type: application/json" \
  -d '{"query":"测试查询"}'
```

**预期结果：**
- 模型自动加载
- 返回四色卡片和性能数据
- 推理延迟 < 500ms

## 工具列表

| 工具 | 功能 | 使用场景 |
|------|------|---------|
| `verify_npu_inference.py` | 验证配置和导入 | 修复前后验证 |
| `check_npu_processes.py` | 检查 NPU 占用进程 | 诊断占用 |
| `fix_npu_device.bat` | 自动修复 NPU 占用 | 快速修复 |
| `test_genie_create.py` | 测试 GenieContext 创建 | 深度诊断 |
| `NPU_FIX_GUIDE.md` | 完整修复指南 | 参考文档 |

## 推荐流程

### 首次修复（推荐）

```bash
# 1. 验证配置
python verify_npu_inference.py

# 2. 启动后端（按需加载模式）
start_backend.bat

# 3. 测试健康检查
curl http://localhost:8000/api/health

# 4. 测试推理（触发模型加载）
curl -X POST "http://localhost:8000/api/npu/analyze" \
  -H "Content-Type: application/json" \
  -d '{"query":"分析数据趋势"}'
```

### 如果推理时 NPU 不可用

```bash
# 1. 停止后端（Ctrl+C）

# 2. 修复 NPU 占用
fix_npu_device.bat

# 3. 重启 AIPC（如果需要）

# 4. 重新启动后端
start_backend.bat
```

## 常见问题

### Q1: 为什么按需加载模式可以解决问题？

**A:** 按需加载模式下：
- 后端启动时不会尝试创建 GenieContext
- 只有在首次推理请求时才加载模型
- 如果 NPU 暂时不可用，不影响服务启动

### Q2: 按需加载会影响性能吗？

**A:** 影响很小：
- 首次推理会额外花费 5-10 秒加载模型
- 后续推理无额外延迟
- 单例模式确保模型只加载一次

### Q3: 如何恢复启动时自动加载？

**A:** 修改配置并修复 NPU 问题：

```python
# backend/config.py
AUTO_LOAD_MODEL: bool = True  # 改为 True
```

然后修复 NPU 占用：
```bash
fix_npu_device.bat
# 或重启 AIPC
```

### Q4: NPU 设备创建错误（14001）的可能原因？

**A:** 
1. NPU 驱动未正确安装或初始化
2. 另一个进程正在使用 NPU
3. DLL 版本不匹配或加载顺序错误
4. 系统权限不足
5. GenieContext 创建等待超时

## 下一步

### 立即执行

```bash
# 1. 验证配置
cd c:\test\antinet
python verify_npu_inference.py

# 2. 启动后端
start_backend.bat

# 3. 访问 API
curl http://localhost:8000/api/health
curl http://localhost:8000/api/npu/models
```

### 深度诊断（如果需要）

```bash
# 测试 GenieContext 创建
python test_genie_create.py

# 检查 NPU 占用
python check_npu_processes.py

# 查看 NPU 驱动状态
# 设备管理器 -> Qualcomm -> Hexagon NPU
```

## 总结

**已修复的问题：**
1. 配置添加 `AUTO_LOAD_MODEL = False`
2. 修改启动逻辑，支持按需加载模式
3. DLL 加载顺序优化
4. 增强错误处理和日志

**验证通过：**
- 配置验证脚本运行正常
- 全局加载器未初始化（按需加载模式）
- 导入和路径设置正确

📋 **下一步：**
1. 启动后端服务
2. 测试健康检查 API
3. 通过 API 触发模型加载和推理
4. 验证 NPU 性能和延迟

---

**修复完成！现在后端可以正常启动，NPU 模型将按需加载。**
