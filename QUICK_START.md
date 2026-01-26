# Antinet 快速部署指南

## 问题已修复 ✅

之前的批处理文件编码问题已修复。所有脚本现在使用正确的 GBK 编码，可以正常运行。

---

## 🚀 快速开始（3步完成）

### 步骤1: 打开命令提示符

```cmd
# 按 Win+R，输入 cmd，回车
# 或者在开始菜单搜索"命令提示符"
```

### 步骤2: 进入项目目录

```cmd
cd C:\test\antinet
```

### 步骤3: 运行部署脚本

```cmd
deploy_antinet.bat
```

就这么简单！脚本会自动完成所有部署工作。

---

## 📦 部署脚本说明

### deploy_antinet.bat - 一键部署

**功能：**
- 检查 Python、Node.js、pnpm 环境
- 配置 NPU 环境变量
- 安装后端依赖（FastAPI、QAI AppBuilder等）
- 安装前端依赖（React、Vite等）
- 验证配置文件
- 可选立即启动服务

**使用场景：** 首次部署或重新部署

**预计耗时：** 5-10分钟

---

### start_all.bat - 快速启动

**功能：**
- 验证环境
- 启动后端服务（新窗口）
- 启动前端服务（新窗口）
- 自动打开浏览器

**使用场景：** 依赖已安装，快速启动服务

**预计耗时：** 10-15秒

**使用方法：**
```cmd
cd C:\test\antinet
start_all.bat
```

---

### stop_all.bat - 停止服务

**功能：**
- 停止后端服务（端口8000）
- 停止前端服务（端口3000）
- 清理相关进程
- 验证端口释放

**使用方法：**
```cmd
cd C:\test\antinet
stop_all.bat
```

---

### health_check.bat - 健康检查

**功能：**
- 检查环境（Python、Node.js、pnpm）
- 检查依赖（后端、前端、QAI AppBuilder）
- 检查配置文件
- 检查 NPU 环境
- 检查服务状态
- 检查 API 健康度
- 检查系统资源

**使用方法：**
```cmd
cd C:\test\antinet
health_check.bat
```

---

## 🎯 典型使用流程

### 场景1: 首次部署

```cmd
# 1. 打开命令提示符
# 2. 进入项目目录
cd C:\test\antinet

# 3. 运行部署脚本
deploy_antinet.bat

# 4. 按提示选择启动选项（推荐选择3：同时启动前后端）
```

### 场景2: 日常使用

```cmd
# 启动服务
cd C:\test\antinet
start_all.bat

# 使用完毕后停止服务
stop_all.bat
```

### 场景3: 遇到问题

```cmd
# 1. 运行健康检查
cd C:\test\antinet
health_check.bat

# 2. 根据报告修复问题
# 3. 如果问题严重，重新部署
deploy_antinet.bat
```

---

## 🌐 访问地址

部署完成后，通过以下地址访问：

| 服务 | 地址 | 说明 |
|-----|------|------|
| **前端首页** | http://localhost:3000 | 主界面 |
| **NPU分析** | http://localhost:3000/npu-analysis | NPU智能分析 |
| **后端API** | http://localhost:8000 | API服务 |
| **API文档** | http://localhost:8000/docs | Swagger文档 |

---

##  常见问题

### Q1: 脚本运行时出现乱码

**A:** 已修复！新版本脚本使用正确的编码，不会再出现乱码。

### Q2: Python版本不匹配

**A:** 
- 当前系统: Python 3.11.9
- 推荐版本: Python 3.12.x
- 3.11.9 可以使用，但建议升级到 3.12.x

### Q3: 端口被占用

**A:**
```cmd
# 停止所有服务
stop_all.bat

# 或手动查找并停止进程
netstat -ano | findstr :8000
taskkill /F /PID <进程ID>
```

### Q4: QAI AppBuilder 安装失败

**A:** 确保以下路径之一存在：
- `C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl`
- `C:\test\qai_appbuilder-*.whl`

如果都不存在，请联系管理员获取安装包。

---

##  注意事项

1. **首次部署** 必须使用 `deploy_antinet.bat`
2. **日常使用** 使用 `start_all.bat` 更快
3. **停止服务** 使用 `stop_all.bat` 而不是直接关闭窗口
4. **遇到问题** 先运行 `health_check.bat` 诊断

---

## 🔧 手动部署（备选方案）

如果自动脚本失败，可以手动执行：

```cmd
# 1. 安装后端依赖
cd C:\test\antinet\backend
pip install -r requirements.txt
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl"

# 2. 安装前端依赖
cd C:\test\antinet
pnpm install

# 3. 配置NPU环境
set_env.bat

# 4. 启动后端（新窗口）
cd backend
python main.py

# 5. 启动前端（新窗口）
cd C:\test\antinet
pnpm run dev
```

---

## 📚 更多文档

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 详细部署指南
- [DEPLOYMENT_REPORT.md](./DEPLOYMENT_REPORT.md) - 部署完成报告
- [README.md](./README.md) - 项目概述

---

##  提示

- 首次启动可能需要较长时间加载模型（30-60秒）
- 建议在 AIPC 上运行以获得最佳 NPU 性能
- 所有数据处理在本地完成，数据不出域

---

**准备好了吗？现在就开始部署吧！** 🚀

```cmd
cd C:\test\antinet
deploy_antinet.bat
```
