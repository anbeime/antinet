# Antinet 项目部署指南

## 📋 项目概述

**Antinet智能知识管家** 是一款部署于骁龙AIPC的端侧智能数据工作站，包含：
- **前端**: React + TypeScript + Vite
- **后端**: FastAPI + Python + QNN NPU推理
- **AI模型**: Qwen2.0-7B-SSD (INT8量化)

---

## 🚀 快速部署（一键启动）

### 方式1: 使用一键部署脚本

```powershell
# 在项目根目录执行
.\deploy_antinet.bat
```

该脚本会自动完成：
1. 环境检查（Python、Node.js）
2. 依赖安装（前端 + 后端）
3. NPU环境配置
4. 启动前后端服务

### 方式2: 手动分步部署

---

## 📦 环境要求

### 硬件要求
- **处理器**: 骁龙 X Elite (支持NPU)
- **内存**: 至少 8GB RAM
- **存储**: 至少 10GB 可用空间

### 软件要求
- **操作系统**: Windows 11 ARM64
- **Python**: 3.12.x (ARM64版本)
- **Node.js**: 18.x 或更高版本
- **pnpm**: 最新版本

---

## 🔧 详细部署步骤

### 步骤1: 环境准备

#### 1.1 检查Python环境

```powershell
# 检查Python版本（必须是3.12.x）
python --version

# 检查架构（必须是ARM64）
python -c "import platform; print(platform.machine())"
```

#### 1.2 检查Node.js环境

```powershell
# 检查Node.js版本
node --version

# 检查pnpm
pnpm --version

# 如果未安装pnpm
npm install -g pnpm
```

#### 1.3 配置NPU环境

```powershell
# 设置NPU库路径
.\set_env.bat

# 验证NPU可用性
python backend\tools\simple_npu_test.py
```

---

### 步骤2: 安装依赖

#### 2.1 安装后端依赖

```powershell
# 方式1: 使用安装脚本（推荐）
.\install_deps.bat

# 方式2: 手动安装
cd backend
pip install -r requirements.txt

# 安装 QAI AppBuilder（必需）
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

#### 2.2 安装前端依赖

```powershell
# 在项目根目录
pnpm install
```

---

### 步骤3: 配置检查

#### 3.1 检查后端配置

```powershell
# 查看配置文件
type backend\config.py

# 关键配置项：
# - MODEL_PATH: 模型文件路径
# - QNN_DEVICE: NPU设备
# - HOST/PORT: 服务地址
```

#### 3.2 检查前端配置

```powershell
# 查看Vite配置
type vite.config.ts

# 确认API代理配置指向后端地址
```

---

### 步骤4: 启动服务

#### 4.1 启动后端服务

```powershell
# 方式1: 使用启动脚本（推荐）
.\start_backend.bat

# 方式2: 手动启动
cd backend
python main.py

# 后端服务地址:
# - API: http://localhost:8000
# - 文档: http://localhost:8000/docs
```

#### 4.2 启动前端服务

```powershell
# 新开一个终端窗口
pnpm run dev

# 前端访问地址:
# - 首页: http://localhost:3000
# - NPU分析: http://localhost:3000/npu-analysis
```

---

### 步骤5: 验证部署

#### 5.1 健康检查

```powershell
# 检查后端健康状态
curl http://localhost:8000/api/health

# 预期输出:
# {
#   "status": "healthy",
#   "model_loaded": true,
#   "device": "NPU"
# }
```

#### 5.2 测试NPU推理

```powershell
# 运行NPU推理测试
.\test_npu_inference.bat

# 预期延迟: < 500ms
```

#### 5.3 测试前端访问

1. 打开浏览器访问 http://localhost:3000
2. 检查页面是否正常加载
3. 测试NPU分析功能

---

## 🐛 常见问题排查

### 问题1: 模型加载失败

**症状**: 后端启动时报错 "模型加载失败"

**解决方案**:
```powershell
# 1. 检查模型文件是否存在
dir "C:\ai-engine-direct-helper\samples\qwen2-7b-ssd"

# 2. 检查DLL依赖
.\check_dlls.py

# 3. 重新配置NPU环境
.\set_env.bat
```

### 问题2: NPU设备创建失败（错误14001）

**症状**: 后端日志显示 "Failed to create device (14001)"

**解决方案**:
```powershell
# 1. 运行修复脚本
.\fix_npu_device.bat

# 2. 如果仍然失败，重启AIPC
shutdown /r /t 0

# 3. 检查NPU驱动状态
# 打开设备管理器 -> 查看 Hexagon NPU
```

### 问题3: 前端无法连接后端

**症状**: 前端页面显示 "无法连接到服务器"

**解决方案**:
```powershell
# 1. 确认后端服务正在运行
curl http://localhost:8000

# 2. 检查防火墙设置
# Windows安全中心 -> 防火墙 -> 允许应用通过防火墙

# 3. 检查端口占用
netstat -ano | findstr :8000
```

### 问题4: 依赖安装失败

**症状**: pip install 报错

**解决方案**:
```powershell
# 1. 升级pip
python -m pip install --upgrade pip

# 2. 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 3. 检查Python架构
python -c "import platform; print(platform.machine())"
# 必须输出: ARM64
```

---

## 🔒 安全注意事项

1. **数据不出域**: 所有数据处理在本地完成，不会上传到云端
2. **端口访问**: 默认仅监听 localhost，不对外暴露
3. **文件上传**: 限制最大文件大小（默认100MB）
4. **API认证**: 生产环境建议启用API密钥认证

---

## 📊 性能优化建议

### 1. NPU性能优化

```python
# 在 backend/config.py 中启用BURST模式
PERFORMANCE_MODE = "BURST"  # 高性能模式
```

### 2. 模型量化

- 当前使用: INT8量化
- 可选: INT4量化（更快，精度略降）
- 推荐: 保持INT8以平衡性能和精度

### 3. 并发优化

```powershell
# 修改 backend/main.py 中的workers数量
# 注意: 多进程会增加内存占用
uvicorn.run(app, workers=1)  # 单进程推荐
```

---

## 📚 相关文档

- [README.md](./README.md) - 项目概述
- [NPU_TROUBLESHOOTING.md](./NPU_TROUBLESHOOTING.md) - NPU故障排查
- [API文档](http://localhost:8000/docs) - 后端API接口文档

---

## 🆘 获取帮助

如遇到问题：
1. 查看后端日志: `backend/backend.log`
2. 查看前端控制台: 浏览器开发者工具
3. 运行诊断脚本: `.\run_diagnose.bat`
4. 查看详细错误堆栈

---

##  更新日志

### v1.0.0 (2026-01-26)
- 完成项目部署文档
- 添加一键部署脚本
- 优化NPU环境配置流程
- 完善故障排查指南

---

**部署完成后，您可以开始使用Antinet智能知识管家！** 🎉
