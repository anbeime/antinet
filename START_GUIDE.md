# 骁龙 AIPC 预览启动指南

## ✅ 环境修复（执行一次）

### 在本地电脑（你现在在的位置）
```powershell
# 1. 修复 pydantic 依赖
.\fix_env.ps1
```

**如果提示权限问题，以管理员身份运行 PowerShell**：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\fix_env.ps1
```

---

## 🚀 启动预览

### 方式 1：启动完整预览（推荐）

**窗口 1 - 后端**：
```powershell
.\start_backend.ps1
```
访问：http://localhost:8000/docs

**窗口 2 - 前端**：
```powershell
.\start_frontend.ps1
```
访问：http://localhost:3000

### 方式 2：手动启动

**后端**：
```powershell
cd c:\test\antinet\backend
python main.py
```

**前端**：
```powershell
cd c:\test\antinet
npm run dev
```

---

## 📱 骁龙 AIPC 上的操作是否一样？

### ✅ 完全一样！

**骁龙 AIPC 预览步骤**（与本地电脑完全相同）：

1. **拉取最新代码**：
   ```bash
   git clone https://github.com/anbeime/antinet.git
   cd antinet
   ```

2. **修复环境**：
   ```powershell
   .\fix_env.ps1
   ```

3. **启动后端**：
   ```powershell
   .\start_backend.ps1
   # 或手动
   cd backend
   python main.py
   ```

4. **启动前端**：
   ```powershell
   .\start_frontend.ps1
   # 或手动
   npm run dev
   ```

5. **访问预览**：
   - 前端：http://localhost:3000
   - 后端：http://localhost:8000
   - API 文档：http://localhost:8000/docs

---

## 🔧 骁龙 AIPC 特殊说明

### 已预装的环境（不需要安装）
- ✅ Python 3.12.10
- ✅ QAI AppBuilder 2.31.0
- ✅ 模型文件：C:\model\Qwen2.0-7B-SSD-8380-2.34
- ✅ QNN 库：C:\ai-engine-direct-helper\samples\qai_libs

### 需要手动安装
- ⚠️ Node.js（如果未预装，从 https://nodejs.org 下载）
- ⚠️ 前端依赖（npm install）

### 关键差异
| 项目 | 本地电脑 | 骁龙 AIPC |
|------|---------|----------|
| Python | 需要自己安装 | ✅ 已预装 3.12.10 |
| QAI AppBuilder | 需要自己安装 | ✅ 已预装 2.31.0 |
| 模型文件 | 需要下载 | ✅ 已预装 C:\model\ |
| Node.js | 需要自己安装 | ⚠️ 可能未安装 |
| 前端依赖 | npm install | npm install（相同） |
| 启动命令 | 完全相同 | 完全相同 ✅ |

---

## 🧪 快速测试

### 测试后端 API
```bash
# 健康检查
curl http://localhost:8000/api/health

# NPU 推理测试
curl -X POST "http://localhost:8000/api/npu/analyze" `
  -H "Content-Type: application/json" `
  -d '{"query":"分析一下端侧AI的优势","max_tokens":64}'
```

### 测试 NPU 模型
```bash
python test_npu_simple.py
```

---

## ⚡ 快速启动流程（骁龙 AIPC）

```powershell
# 1. 拉取代码
git clone https://github.com/anbeime/antinet.git
cd antinet

# 2. 安装前端依赖（首次）
npm install

# 3. 启动后端
.\start_backend.ps1

# 4. 新窗口启动前端
.\start_frontend.ps1

# 5. 访问
# http://localhost:3000 (前端)
# http://localhost:8000/docs (API 文档)
```

---

## 📝 常见问题

### Q1: 执行策略限制
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q2: pydantic-core 损坏
```powershell
.\fix_env.ps1
```

### Q3: Node.js 未安装
从 https://nodejs.org 下载安装 LTS 版本

### Q4: NPU 推理卡住
- 首次加载模型需要 5-10 秒
- 请耐心等待

---

## 📊 性能预期

| 指标 | 目标 | 骁龙 AIPC |
|------|------|----------|
| NPU 推理延迟 | < 500ms | ~450ms |
| 模型加载时间 | < 10s | ~5-8s |
| 前端启动时间 | < 5s | ~3-5s |
| 后端启动时间 | < 3s | ~2-3s |

---

**总结**：骁龙 AIPC 上的操作与本地电脑**完全一样**，只是 Python 和 QAI AppBuilder 已经预装，可以直接使用！
