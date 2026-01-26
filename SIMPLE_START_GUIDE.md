# 🚀 最简单的启动方式

## ✅ 已完成的准备工作

1. ✅ 修复了 `backend/main.py` 的导入路径
2. ✅ 禁用了 `codebuddy_chat_routes.py`
3. ✅ 虚拟环境中已安装 `qai_appbuilder`

---

## 🎯 现在只需 3 步启动

### 方法 1：使用 PowerShell（最简单）

打开 PowerShell，复制粘贴以下命令：

```powershell
cd C:\test\antinet
.\quick_start.ps1
```

### 方法 2：手动命令（最直接）

打开 PowerShell 或命令提示符，复制粘贴：

```powershell
cd C:\test\antinet\backend
..\venv_arm64\Scripts\python.exe main.py
```

### 方法 3：使用完整脚本

```powershell
cd C:\test\antinet
.\start_backend.ps1
```

---

## ✅ 预期输出

启动成功后你会看到：

```
[SETUP] QNN 日志级别设置为: DEBUG
[SETUP] NPU library paths configured:
  - qai_libs: C:/ai-engine-direct-helper/samples/qai_libs
  - bridge libs: C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc
  - PATH updated: True

INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**关键成功标志：**
- ✅ 没有 "No module named" 错误
- ✅ 没有 CodeBuddy 警告
- ✅ 服务运行在 http://0.0.0.0:8000

---

## 🧪 验证服务

打开新的 PowerShell 窗口：

```powershell
# 检查服务状态
curl http://localhost:8000/

# 检查健康状态
curl http://localhost:8000/api/health

# 打开 API 文档
start http://localhost:8000/docs
```

---

## 📝 创建的文件

1. **`quick_start.ps1`** - 最简单的启动脚本（推荐）
2. **`start_backend.ps1`** - 完整的启动脚本（带检查）
3. **`START_COMMAND.txt`** - 手动启动命令
4. **`SIMPLE_START_GUIDE.md`** - 本文档

---

## 🎯 推荐启动方式

**最简单：**
```powershell
cd C:\test\antinet
.\quick_start.ps1
```

**最直接：**
```powershell
cd C:\test\antinet\backend
..\venv_arm64\Scripts\python.exe main.py
```

---

## ✅ 已修复的问题

1. ✅ 模块导入路径 - 已修复 `backend/main.py`
2. ✅ CodeBuddy 依赖 - 已禁用 `codebuddy_chat_routes.py`
3. ✅ 虚拟环境 - 脚本直接使用 `venv_arm64\Scripts\python.exe`
4. ✅ qai_appbuilder - 已在虚拟环境中安装

---

## 🚀 立即启动

复制以下命令到 PowerShell：

```powershell
cd C:\test\antinet
.\quick_start.ps1
```

或者最直接的方式：

```powershell
cd C:\test\antinet\backend
..\venv_arm64\Scripts\python.exe main.py
```

---

**准备好了吗？启动吧！** 🎉

---

**创建时间：** 2026-01-26
**状态：** ✅ 所有问题已修复
**下一步：** 运行启动命令
