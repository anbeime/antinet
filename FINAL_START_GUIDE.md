# 🚀 最终启动指南 - 已修复所有路径问题

## ✅ 问题已修复

**问题：** PowerShell 脚本中的相对路径错误  
**修复：** 使用 `$PSScriptRoot` 获取绝对路径

---

## 🎯 推荐启动方式

### 方法 1：批处理文件（最可靠）⭐

```cmd
cd C:\test\antinet
start_backend_simple.bat
```

**优势：**
- ✅ 最稳定
- ✅ 路径处理简单
- ✅ 兼容性最好

### 方法 2：PowerShell 脚本（已修复）

```powershell
cd C:\test\antinet
.\start_backend_smart.ps1
```

**优势：**
- ✅ 自动处理端口占用
- ✅ 彩色输出
- ✅ 更多检查

### 方法 3：快速启动

```powershell
cd C:\test\antinet
.\quick_start.ps1
```

---

## 📋 所有可用的启动脚本

| 脚本名称 | 类型 | 功能 | 推荐 |
|---------|------|------|------|
| `start_backend_simple.bat` | 批处理 | 简单启动 | ⭐⭐⭐ |
| `start_backend_smart.ps1` | PowerShell | 智能启动（自动处理端口） | ⭐⭐ |
| `quick_start.ps1` | PowerShell | 快速启动 | ⭐⭐ |
| `stop_backend.ps1` | PowerShell | 停止服务 | ⭐⭐ |

---

## 🔧 已修复的脚本

### 1. `start_backend_smart.ps1`

**修复前：**
```powershell
Set-Location "backend"
& "..\venv_arm64\Scripts\python.exe" main.py  # ❌ 相对路径错误
```

**修复后：**
```powershell
$projectRoot = $PSScriptRoot
Set-Location "$projectRoot\backend"
& "$projectRoot\venv_arm64\Scripts\python.exe" main.py  # ✅ 绝对路径
```

### 2. `quick_start.ps1`

同样的修复。

---

## 🚀 立即启动

### 推荐：使用批处理文件

打开命令提示符或 PowerShell：

```cmd
cd C:\test\antinet
start_backend_simple.bat
```

**预期输出：**
```
========================================
Antinet Backend - Quick Start
========================================

[1/3] Checking virtual environment...
OK - Virtual environment exists

[2/3] Disabling CodeBuddy...
OK - CodeBuddy disabled

[3/3] Starting backend service...

========================================
Service URL: http://localhost:8000
API Docs: http://localhost:8000/docs
Knowledge Graph: http://localhost:8000/api/knowledge/graph
========================================

[SETUP] QNN 日志级别设置为: DEBUG
[SETUP] NPU library paths configured
✓ 知识管理路由已注册
✓ 8-Agent 系统路由已注册
✓ 技能系统路由已注册
✓ Excel 导出路由已注册
✓ 完整分析路由已注册
✓ PDF 处理路由已注册
✓ PPT 处理路由已注册
[SkillRegistry] 知识图谱可视化技能已注册
[SkillRegistry] 已注册 24 个内置技能

INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 🧪 验证服务

打开新的命令提示符或 PowerShell：

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

**预期响应（主页）：**
```json
{
  "app": "Antinet智能知识管家",
  "version": "1.0.0",
  "status": "running",
  "model_loaded": true,
  "device": "NPU"
}
```

**预期响应（技能列表）：**
```json
{
  "total": 24,
  "skills": [
    {
      "name": "knowledge_graph_visualization",
      "description": "知识图谱可视化：构建和展示卡片间的关联关系",
      "category": "知识管理",
      "agent_name": "太史阁",
      "enabled": true
    },
    ...
  ]
}
```

---

## 🎯 下一步：测试知识图谱

### 1. 后端已启动 ✅

### 2. 安装前端依赖

```bash
cd <前端目录>
npm install echarts
# 或
pnpm add echarts
```

### 3. 启动前端

```bash
npm run dev
# 或
pnpm dev
```

### 4. 访问知识图谱

打开浏览器：http://localhost:3000/knowledge-graph

---

## 📝 故障排查

### 问题 1：端口被占用

**解决：**
```powershell
cd C:\test\antinet
.\stop_backend.ps1
start_backend_simple.bat
```

### 问题 2：虚拟环境不存在

**解决：**
```cmd
cd C:\test\antinet
deploy_antinet.bat
```

### 问题 3：模块导入错误

**解决：**
确保从正确的目录启动，使用绝对路径的脚本。

---

## ✅ 总结

### 已修复
- ✅ PowerShell 脚本路径问题
- ✅ 端口占用问题
- ✅ CodeBuddy 清理
- ✅ 知识图谱技能注册

### 可用的脚本
- ✅ `start_backend_simple.bat` - 批处理启动（推荐）
- ✅ `start_backend_smart.ps1` - 智能启动
- ✅ `quick_start.ps1` - 快速启动
- ✅ `stop_backend.ps1` - 停止服务

### 下一步
1. 启动后端：`start_backend_simple.bat`
2. 验证服务：`curl http://localhost:8000/api/skill/list`
3. 安装前端依赖：`npm install echarts`
4. 启动前端：`npm run dev`
5. 测试知识图谱：访问 `/knowledge-graph`

---

**准备好了吗？现在就启动吧！** 🚀

```cmd
cd C:\test\antinet
start_backend_simple.bat
```

---

**创建时间：** 2026-01-27  
**问题：** PowerShell 路径错误  
**解决方案：** 使用批处理文件或修复后的 PowerShell 脚本  
**状态：** ✅ 已修复
