# Antinet 项目部署 - 快速指南

## 🎯 部署脚本说明

项目提供了完整的自动化部署脚本，支持一键部署和管理。

### 📁 部署脚本列表

| 脚本文件 | 功能说明 | 使用场景 |
|---------|---------|---------|
| `deploy_antinet.bat` | **一键完整部署** | 首次部署或重新部署 |
| `start_all.bat` | **快速启动服务** | 依赖已安装，快速启动 |
| `stop_all.bat` | **停止所有服务** | 停止前后端服务 |
| `health_check.bat` | **健康检查** | 诊断系统状态 |
| `start_backend.bat` | 仅启动后端 | 单独启动后端服务 |

---

## 🚀 快速开始

### 场景1: 首次部署（推荐）

```powershell
# 在项目根目录执行
.\deploy_antinet.bat
```

**该脚本会自动完成：**
1. 检查 Python、Node.js 环境
2. 配置 NPU 环境变量
3. 安装后端依赖（包括 QAI AppBuilder）
4. 安装前端依赖
5. 验证配置文件
6. 可选：立即启动服务

**预计耗时：** 5-10分钟（取决于网络速度）

---

### 场景2: 快速启动（依赖已安装）

```powershell
# 在项目根目录执行
.\start_all.bat
```

**该脚本会：**
1. 验证环境
2. 配置 NPU 环境
3. 启动后端服务（新窗口）
4. 启动前端服务（新窗口）
5. 自动打开浏览器

**预计耗时：** 10-15秒

---

### 场景3: 停止服务

```powershell
# 在项目根目录执行
.\stop_all.bat
```

**该脚本会：**
1. 查找并停止后端服务（端口8000）
2. 查找并停止前端服务（端口3000）
3. 清理相关进程
4. 验证端口释放

---

### 场景4: 健康检查

```powershell
# 在项目根目录执行
.\health_check.bat
```

**该脚本会检查：**
1. 环境（Python、Node.js、pnpm）
2. 依赖（后端、前端、QAI AppBuilder）
3. 配置文件
4. NPU 环境
5. 服务状态
6. API 健康度
7. 系统资源

**输出示例：**
```
╔════════════════════════════════════════════════════════════╗
║                    健康检查报告                            ║
╚════════════════════════════════════════════════════════════╝

  通过项: 15
  失败项: 0
  警告项: 2

[状态] 系统运行正常！
```

---

## 📊 部署流程图

```
┌─────────────────────────────────────────────────────────┐
│                  首次部署流程                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  运行 deploy_antinet  │
              └───────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌────────┐       ┌────────┐       ┌────────┐
   │环境检查│       │依赖安装│       │配置验证│
   └────────┘       └────────┘       └────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
              ┌───────────────────────┐
              │    启动服务（可选）    │
              └───────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌────────┐       ┌────────┐       ┌────────┐
   │后端服务│       │前端服务│       │打开浏览器│
   │ :8000  │       │ :3000  │       │         │
   └────────┘       └────────┘       └────────┘
```

---

## 🔧 手动部署（高级）

如果自动部署脚本遇到问题，可以手动执行以下步骤：

### 步骤1: 安装后端依赖

```powershell
cd backend
pip install -r requirements.txt

# 安装 QAI AppBuilder
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 步骤2: 安装前端依赖

```powershell
cd ..
pnpm install
```

### 步骤3: 配置NPU环境

```powershell
.\set_env.bat
```

### 步骤4: 启动后端

```powershell
cd backend
python main.py
```

### 步骤5: 启动前端（新终端）

```powershell
pnpm run dev
```

---

## 🌐 访问地址

部署完成后，可以通过以下地址访问：

| 服务 | 地址 | 说明 |
|-----|------|------|
| **前端首页** | http://localhost:3000 | 主界面 |
| **NPU分析** | http://localhost:3000/npu-analysis | NPU智能分析 |
| **后端API** | http://localhost:8000 | API服务 |
| **API文档** | http://localhost:8000/docs | Swagger文档 |
| **健康检查** | http://localhost:8000/api/health | 服务状态 |

---

## 🐛 常见问题

### 问题1: Python版本不匹配

**错误信息：** "Python版本必须是3.12.x"

**解决方案：**
```powershell
# 卸载旧版本Python
# 下载并安装 Python 3.12.x ARM64 版本
# 下载地址: https://www.python.org/downloads/
```

### 问题2: QAI AppBuilder安装失败

**错误信息：** "未找到 QAI AppBuilder 安装包"

**解决方案：**
```powershell
# 确保以下路径之一存在:
# - C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl
# - C:\test\qai_appbuilder-*.whl

# 手动安装
pip install "路径\qai_appbuilder-*.whl"
```

### 问题3: 端口被占用

**错误信息：** "端口8000或3000已被占用"

**解决方案：**
```powershell
# 查找占用进程
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# 停止进程（替换PID）
taskkill /F /PID <PID>

# 或使用停止脚本
.\stop_all.bat
```

### 问题4: NPU模型加载失败

**错误信息：** "模型加载失败"

**解决方案：**
```powershell
# 1. 运行NPU修复脚本
.\fix_npu_device.bat

# 2. 检查模型文件
dir "C:\ai-engine-direct-helper\samples\qwen2-7b-ssd"

# 3. 重启AIPC
shutdown /r /t 0
```

---

##  日志文件位置

如遇到问题，可查看以下日志：

| 日志文件 | 位置 | 说明 |
|---------|------|------|
| 后端日志 | `backend\backend.log` | 后端运行日志 |
| NPU日志 | 控制台输出 | NPU推理日志 |
| 前端日志 | 浏览器控制台 | 前端错误日志 |

---

## 🔄 更新部署

如果项目代码更新，重新部署：

```powershell
# 停止服务
.\stop_all.bat

# 拉取最新代码
git pull

# 重新部署
.\deploy_antinet.bat
```

---

## 📚 相关文档

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 详细部署指南
- [README.md](./README.md) - 项目概述
- [NPU_TROUBLESHOOTING.md](./NPU_TROUBLESHOOTING.md) - NPU故障排查

---

##  提示

1. **首次部署** 建议使用 `deploy_antinet.bat`
2. **日常使用** 建议使用 `start_all.bat`
3. **遇到问题** 先运行 `health_check.bat` 诊断
4. **停止服务** 使用 `stop_all.bat` 而不是直接关闭窗口

---

## 📞 获取帮助

如果遇到无法解决的问题：

1. 运行健康检查：`.\health_check.bat`
2. 查看后端日志：`type backend\backend.log`
3. 查看部署指南：`DEPLOYMENT_GUIDE.md`
4. 运行诊断脚本：`.\run_diagnose.bat`

---

**祝您部署顺利！** 🎉
