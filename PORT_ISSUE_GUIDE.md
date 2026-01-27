# 🚀 快速启动指南 - 端口占用解决方案

## ❌ 问题：端口 8000 被占用

**错误信息：**
```
ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000): 
[winerror 10048] 通常每个套接字地址(协议/网络地址/端口)只允许使用一次。
```

**原因：** 之前的后端服务还在运行，占用了 8000 端口。

---

## ✅ 解决方案（3 种方法）

### 方法 1：使用智能启动脚本（推荐）⭐

```powershell
cd C:\test\antinet
.\start_backend_smart.ps1
```

**功能：**
- ✅ 自动检测端口占用
- ✅ 自动停止旧服务
- ✅ 自动启动新服务
- ✅ 无需手动操作

---

### 方法 2：手动停止旧服务

**步骤 1：停止旧服务**
```powershell
cd C:\test\antinet
.\stop_backend.ps1
```

**步骤 2：启动新服务**
```powershell
.\quick_start.ps1
```

---

### 方法 3：使用命令行（最快）

```powershell
# 一行命令停止并启动
cd C:\test\antinet; .\stop_backend.ps1; .\start_backend_smart.ps1
```

---

## 🔍 手动排查步骤

如果脚本不工作，可以手动排查：

### 1. 查找占用端口的进程

```powershell
netstat -ano | findstr :8000
```

**输出示例：**
```
TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       7968
```

**PID 是 7968**

### 2. 查看进程详情

```powershell
tasklist /FI "PID eq 7968"
```

**输出示例：**
```
Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ =========== ============
python.exe                    7968 RDP-Tcp#0                  2     38,044 K
```

### 3. 停止进程

```powershell
taskkill /F /PID 7968
```

**输出：**
```
SUCCESS: The process with PID 7968 has been terminated.
```

### 4. 验证端口已释放

```powershell
netstat -ano | findstr :8000
```

**应该没有 LISTENING 状态的连接**

### 5. 启动新服务

```powershell
cd C:\test\antinet
.\quick_start.ps1
```

---

## 📋 新增的脚本

### 1. `stop_backend.ps1` - 停止后端服务

**功能：**
- 查找占用 8000 端口的进程
- 停止所有相关进程
- 验证端口已释放

**使用：**
```powershell
.\stop_backend.ps1
```

### 2. `start_backend_smart.ps1` - 智能启动

**功能：**
- 自动检测并停止旧服务
- 检查虚拟环境
- 禁用 CodeBuddy
- 启动新服务

**使用：**
```powershell
.\start_backend_smart.ps1
```

---

## 🎯 推荐工作流程

### 日常使用（推荐）

```powershell
cd C:\test\antinet
.\start_backend_smart.ps1
```

**优势：**
- ✅ 一键启动
- ✅ 自动处理端口占用
- ✅ 无需担心旧服务

### 开发调试

```powershell
# 停止服务
.\stop_backend.ps1

# 修改代码...

# 重新启动
.\start_backend_smart.ps1
```

### 完全重启

```powershell
# 停止所有服务
.\stop_backend.ps1

# 等待 2 秒
Start-Sleep -Seconds 2

# 启动新服务
.\start_backend_smart.ps1
```

---

## ⚠️ 常见问题

### Q1: 端口还是被占用怎么办？

**A:** 可能有多个 Python 进程，全部停止：

```powershell
# 停止所有 Python 进程（谨慎使用）
Get-Process python | Stop-Process -Force

# 等待 2 秒
Start-Sleep -Seconds 2

# 重新启动
.\start_backend_smart.ps1
```

### Q2: 脚本执行策略错误？

**A:** 允许脚本执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q3: 如何查看服务是否正常运行？

**A:** 测试 API：

```powershell
# 测试主页
curl http://localhost:8000/

# 测试健康检查
curl http://localhost:8000/api/health

# 测试技能列表
curl http://localhost:8000/api/skill/list

# 测试知识图谱
curl http://localhost:8000/api/knowledge/graph
```

### Q4: 如何同时启动前后端？

**A:** 使用两个 PowerShell 窗口：

**窗口 1（后端）：**
```powershell
cd C:\test\antinet
.\start_backend_smart.ps1
```

**窗口 2（前端）：**
```powershell
cd C:\test\antinet\<前端目录>
npm run dev
```

---

## 🎉 现在可以启动了！

```powershell
cd C:\test\antinet
.\start_backend_smart.ps1
```

**预期输出：**
```
========================================
Antinet Backend - Smart Start
========================================

[1/4] Checking port 8000...
  OK - Port 8000 is free

[2/4] Checking virtual environment...
  OK - Virtual environment exists

[3/4] Checking CodeBuddy...
  OK - CodeBuddy already disabled

[4/4] Starting backend service...

========================================
Antinet Backend Service
========================================

Service URL: http://localhost:8000
API Docs: http://localhost:8000/docs
Knowledge Graph: http://localhost:8000/api/knowledge/graph

Press Ctrl+C to stop the service
========================================

[SETUP] QNN 日志级别设置为: DEBUG
[SETUP] NPU library paths configured
...
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

**创建时间：** 2026-01-27  
**问题：** 端口 8000 被占用  
**解决方案：** 使用 `start_backend_smart.ps1` 智能启动  
**状态：** ✅ 已解决
