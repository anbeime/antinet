# 🚀 快速解决端口占用并启动

## ⚠️ 问题：端口 8000 被占用

**原因：** 有多个 Python 进程在运行（可能是之前的测试）

---

## ✅ 已解决

已停止所有 Python 进程。

---

## 🚀 现在立即启动

### 方法 1：使用清理启动脚本（推荐）⭐

```cmd
cd C:\test\antinet
clean_start_backend.bat
```

**这个脚本会：**
1. ✅ 停止所有 Python 进程
2. ✅ 等待端口释放
3. ✅ 启动后端服务

### 方法 2：PowerShell 一键启动

```powershell
cd C:\test\antinet

# 停止所有 Python
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 等待 3 秒
Start-Sleep -Seconds 3

# 启动后端
.\start_backend_simple.bat
```

### 方法 3：手动启动

```cmd
# 停止进程
taskkill /F /IM python.exe

# 等待 3 秒
timeout /t 3

# 启动
cd C:\test\antinet
start_backend_simple.bat
```

---

## 📋 预期输出

```
========================================
Service URL: http://localhost:8000
API Docs: http://localhost:8000/docs
========================================

[SETUP] QNN 日志级别设置为: DEBUG
[SETUP] NPU library paths configured
✓ 知识管理路由已注册
[SkillRegistry] 知识图谱可视化技能已注册
[SkillRegistry] 已注册 24 个内置技能

INFO: Uvicorn running on http://0.0.0.0:8000
```

---

## 🧪 启动后测试

**打开新的 PowerShell 窗口：**

```powershell
# 测试健康检查
curl http://localhost:8000/api/health

# 测试技能列表
curl http://localhost:8000/api/skill/list

# 测试知识图谱
curl http://localhost:8000/api/knowledge/graph
```

或运行完整测试：

```powershell
cd C:\test\antinet
.\test_all_functions.ps1
```

---

## 🎯 为什么会有多个进程？

可能原因：
1. NPU 测试脚本还在运行
2. 之前的启动脚本没有正确关闭
3. 多次启动导致进程堆积

**解决方案：**
- 使用 `clean_start_backend.bat`（自动清理）
- 或手动停止所有 Python 进程

---

## ✅ 立即执行

```cmd
cd C:\test\antinet
clean_start_backend.bat
```

---

**准备好了吗？现在就启动！** 🚀
