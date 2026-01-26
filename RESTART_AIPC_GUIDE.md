# 🔄 AIPC 重启后快速启动指南

## 📋 重启原因

**NPU 设备创建失败（错误 14001）**
```
[ERROR] "Failed to create device: 14001"
[ERROR] "Device Creation failure"
Failure to initialize model.
```

**解决方案：** 重启 AIPC 以完全释放 NPU 资源

---

## 🚀 重启后启动步骤

### 第一步：重启 AIPC
1. 保存所有工作
2. 关闭所有应用程序
3. 重启电脑

### 第二步：启动后端服务（NPU 模式）

打开命令提示符或 PowerShell，执行：

```batch
cd C:\test\antinet
start_backend_venv.bat
```

**预期输出：**
```
[INFO] Activating ARM64 virtual environment...
[INFO] Python version: Python 3.12.10
[INFO] Checking qai_appbuilder...
[OK] qai_appbuilder installed
[INFO] Starting backend service...
[SETUP] NPU library paths configured
[INFO] 正在加载模型: Qwen2.0-7B-SSD...
[INFO] 创建 GenieContext: C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json
[INFO] "Using create From Binary"
[INFO] "Allocated total size = 175915520 across 10 buffers"
[OK] NPU 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 运行设备: NPU (Hexagon)
  - 加载时间: ~10s
```

**关键成功标志：**
- ✅ 没有 "Failed to create device: 14001" 错误
- ✅ 显示 "[OK] NPU 模型加载成功"
- ✅ 显示 "运行设备: NPU (Hexagon)"

### 第三步：验证后端服务

打开新的命令提示符，执行：

```batch
curl http://localhost:8000/
```

**预期响应：**
```json
{
  "app": "Antinet智能知识管家",
  "version": "1.0.0",
  "status": "running",
  "model_loaded": true,
  "device": "NPU"
}
```

**关键验证点：**
- ✅ `"status": "running"`
- ✅ `"model_loaded": true`
- ✅ `"device": "NPU"`

### 第四步：启动前端服务（如需要）

如果前端也需要重启：

```batch
cd C:\test\antinet
npm run dev
```

或者：

```batch
cd C:\test\antinet
pnpm dev
```

**预期输出：**
```
VITE v6.2.0  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 第五步：最终验证

访问以下地址确认所有服务正常：

1. **后端 API：** http://localhost:8000
   - 应返回 JSON 状态信息
   - `model_loaded: true`

2. **API 文档：** http://localhost:8000/docs
   - 应显示 Swagger UI

3. **前端页面：** http://localhost:3000
   - 应正常加载主页

---

## ✅ 成功标志

### 后端服务
- [x] 服务启动无错误
- [x] NPU 模型加载成功（约 10 秒）
- [x] 没有 "14001" 错误
- [x] API 响应正常
- [x] `model_loaded: true`
- [x] `device: "NPU"`

### 前端服务
- [x] Vite 服务启动
- [x] 页面正常加载
- [x] 无控制台错误

---

## 🐛 如果重启后仍然失败

### 检查 1：NPU 驱动状态

```powershell
Get-PnpDevice -FriendlyName "*NPU*"
```

**预期输出：**
```
Status: OK
FriendlyName: Snapdragon(R) X Elite - X1E78100 - Qualcomm(R) Hexagon(TM) NPU
```

如果状态不是 OK，需要检查驱动安装。

### 检查 2：QNN 库路径

确认以下路径存在：
- `C:\ai-engine-direct-helper\samples\qai_libs`
- `C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc`

### 检查 3：模型文件

确认模型路径存在：
- `C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json`

### 检查 4：虚拟环境

确认虚拟环境和依赖：
```batch
cd C:\test\antinet
call venv_arm64\Scripts\activate.bat
python -c "import qai_appbuilder; print('OK')"
```

---

## 📝 重启后检查清单

### 系统环境
- [ ] AIPC 已重启
- [ ] 登录到系统
- [ ] 网络连接正常

### 后端服务
- [ ] 进入项目目录：`cd C:\test\antinet`
- [ ] 运行启动脚本：`start_backend_venv.bat`
- [ ] 等待 NPU 加载（约 10-15 秒）
- [ ] 确认无 14001 错误
- [ ] 验证 API：`curl http://localhost:8000/`
- [ ] 确认 `model_loaded: true`

### 前端服务（可选）
- [ ] 运行：`npm run dev` 或 `pnpm dev`
- [ ] 访问：http://localhost:3000
- [ ] 确认页面正常加载

### 功能测试
- [ ] API 文档可访问：http://localhost:8000/docs
- [ ] 前端页面可访问：http://localhost:3000
- [ ] NPU 状态显示正常

---

## 🎬 重启后录屏演示准备

重启后，如果 NPU 加载成功，你可以立即开始录屏演示：

### 快速验证命令

```batch
# 1. 检查后端
curl http://localhost:8000/

# 2. 检查 NPU 状态
# 应该看到 "model_loaded": true, "device": "NPU"

# 3. 访问前端
# 打开浏览器访问 http://localhost:3000
```

### 演示文档

重启后可以参考这些文档进行演示：

1. **完整检查报告：** `DEMO_COMPLETE_REPORT.md`
2. **录屏指南：** `DEMO_RECORDING_GUIDE.md`
3. **检查清单：** `DEMO_FINAL_CHECKLIST.md`
4. **测试计划：** `DEMO_TEST_PLAN.md`

---

## 💡 重启的好处

1. **完全释放 NPU 资源**
   - 清除所有占用 NPU 的进程
   - 重新初始化 NPU 驱动

2. **清理系统状态**
   - 释放内存
   - 清除临时文件
   - 重置网络连接

3. **确保干净的启动**
   - 没有遗留进程
   - 没有资源冲突
   - 最佳性能状态

---

## 🚨 重要提示

### 重启前
- ✅ 保存所有工作
- ✅ 关闭所有应用程序
- ✅ 记录当前配置（如有修改）

### 重启后
- ✅ 等待系统完全启动
- ✅ 先启动后端服务
- ✅ 等待 NPU 加载完成（约 10 秒）
- ✅ 再启动前端服务

---

## 📞 如果需要帮助

重启后如果遇到问题，请提供：

1. **后端启动日志**
   - 特别是 NPU 加载部分
   - 是否有错误代码

2. **API 响应**
   - `curl http://localhost:8000/` 的输出
   - `model_loaded` 的值

3. **NPU 设备状态**
   - `Get-PnpDevice -FriendlyName "*NPU*"` 的输出

---

**准备好重启了吗？** 🔄

**重启后立即执行：**
```batch
cd C:\test\antinet
start_backend_venv.bat
```

**祝重启顺利！** 🎉

