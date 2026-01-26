# 🔧 对话AI "后端服务未连接" 问题解决

## ❌ 当前问题

前端显示：
```
 后端服务未连接
当前使用模拟模式演示功能。
```

## 🔍 问题诊断

### 检查1: 后端服务是否运行？

```cmd
netstat -ano | findstr :8000
```

**结果**: 无输出 ❌  
**结论**: 后端服务未运行

### 检查2: 前端服务是否运行？

```cmd
netstat -ano | findstr :3000
```

**结果**: 有输出  
**结论**: 前端服务正在运行

### 检查3: 代码是否已修改？

**文件**: `src/components/ChatBotModal.tsx`  
**修改**: `useCodeBuddy` 改为 `false`  
**结论**: 代码已修改

## 🎯 问题根源

1. ❌ **后端服务未启动** - 主要问题
2.  **前端可能未重新编译** - 代码修改未生效

---

## 解决方案

### 方案1: 使用快速修复脚本（推荐）

```cmd
cd C:\test\antinet
quick_fix_chat.bat
```

这个脚本会：
1. 停止所有服务
2. 启动后端服务
3. 启动前端服务
4. 等待服务就绪

### 方案2: 手动修复

#### 步骤1: 停止所有服务

```cmd
cd C:\test\antinet
stop_all.bat
```

#### 步骤2: 启动后端服务

```cmd
cd C:\test\antinet
start_backend.bat
```

**等待后端启动**（约30-60秒），应该看到：
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### 步骤3: 验证后端

打开新的命令行窗口：
```cmd
curl http://localhost:8000/api/health
```

**预期输出**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "NPU"
}
```

#### 步骤4: 启动前端服务

```cmd
cd C:\test\antinet
pnpm run dev
```

**等待前端编译**（约10-20秒），应该看到：
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

#### 步骤5: 测试

1. 打开浏览器访问 http://localhost:3000
2. **硬刷新页面**: `Ctrl + Shift + R`
3. 点击右下角聊天图标
4. 输入测试问题: "Antinet是什么？"

---

##  验证修复

### 测试1: 后端健康检查

```cmd
curl http://localhost:8000/api/health
```

**成功**: 返回JSON  
**失败**: 连接错误

### 测试2: 知识库API

```cmd
curl -X POST "http://localhost:8000/api/chat/query" ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"Antinet是什么？\",\"conversation_history\":[]}"
```

**成功**: 返回回答和来源  
**失败**: 连接错误或500错误

### 测试3: 前端对话

1. 访问 http://localhost:3000
2. 点击聊天图标
3. 输入: "Antinet是什么？"

**成功的响应**:
```
Antinet智能知识管家是一款部署于骁龙AIPC的端侧智能数据工作站...

📚 参考来源：
1. [事实] Antinet系统概述 (相似度: 95%)
```

**失败的响应**:
```
 后端服务未连接
当前使用模拟模式演示功能。
```

---

## 🐛 常见问题

### 问题1: 后端启动失败

**症状**: 运行 `start_backend.bat` 后窗口立即关闭

**检查**:
```cmd
cd C:\test\antinet
venv_arm64\Scripts\python -m backend.main
```

**可能的错误**:

#### 错误A: ModuleNotFoundError
```
ModuleNotFoundError: No module named 'backend'
```

**解决**: 已修复，确保从项目根目录运行

#### 错误B: 端口被占用
```
OSError: [Errno 48] Address already in use
```

**解决**:
```cmd
# 查找占用进程
netstat -ano | findstr :8000

# 停止进程
taskkill /F /PID <PID>
```

#### 错误C: 依赖缺失
```
ModuleNotFoundError: No module named 'fastapi'
```

**解决**:
```cmd
cd C:\test\antinet
venv_arm64\Scripts\activate
pip install -r backend\requirements.txt
```

### 问题2: 前端仍显示"模拟模式"

**原因**: 浏览器缓存或前端未重新编译

**解决**:

1. **硬刷新浏览器**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **清除浏览器缓存**
   - Chrome: F12 → Network → Disable cache

3. **重启前端服务**
   ```cmd
   # 停止前端 (Ctrl+C)
   # 重新启动
   pnpm run dev
   ```

4. **强制重新编译**
   ```cmd
   # 删除缓存
   rmdir /s /q node_modules\.vite
   
   # 重新启动
   pnpm run dev
   ```

### 问题3: API调用失败

**症状**: 前端显示"后端服务未连接"，但后端正在运行

**检查CORS配置**:

打开 `backend/main.py`，确认CORS设置：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**检查API端点**:

打开浏览器控制台（F12），查看Network标签：
- 请求URL应该是: `http://localhost:8000/api/chat/query`
- 状态码应该是: 200
- 如果是404: API端点不存在
- 如果是500: 后端错误
- 如果是CORS错误: CORS配置问题

---

## 📊 完整检查清单

### 启动前检查

- [ ] 虚拟环境已激活 (`venv_arm64`)
- [ ] 后端依赖已安装
- [ ] 前端依赖已安装 (`node_modules` 存在)
- [ ] 端口8000和3000未被占用

### 启动后检查

- [ ] 后端服务正在运行 (端口8000)
- [ ] 前端服务正在运行 (端口3000)
- [ ] 后端健康检查通过
- [ ] 知识库API响应正常

### 前端检查

- [ ] 代码已修改 (`useCodeBuddy = false`)
- [ ] 浏览器已硬刷新
- [ ] 控制台无错误
- [ ] Network标签显示API调用成功

### 功能检查

- [ ] 对话窗口可以打开
- [ ] 输入问题后有回答
- [ ] 回答不是"模拟模式"
- [ ] 显示参考来源
- [ ] 显示卡片类型和相似度

---

## 🚀 快速命令参考

### 启动服务
```cmd
cd C:\test\antinet
start_all.bat
```

### 停止服务
```cmd
stop_all.bat
```

### 健康检查
```cmd
health_check.bat
```

### 后端测试
```cmd
curl http://localhost:8000/api/health
```

### 前端测试
```
浏览器访问: http://localhost:3000
硬刷新: Ctrl+Shift+R
```

### 查看日志
```cmd
# 后端日志
type backend\backend.log

# 前端日志
# 浏览器控制台 (F12)
```

---

##  故障排查流程图

```
问题: 显示"后端服务未连接"
    ↓
检查: 后端是否运行？
    ├─ 否 → 启动后端 → start_backend.bat
    └─ 是 → 检查: API是否响应？
              ├─ 否 → 检查后端日志
              └─ 是 → 检查: 前端是否最新？
                        ├─ 否 → 硬刷新浏览器
                        └─ 是 → 检查: 代码是否正确？
                                  ├─ 否 → 修改代码
                                  └─ 是 → 检查CORS/网络
```

---

## 🎯 预期结果

修复完成后，对话应该是这样的：

**用户**: "Antinet是什么？"

**助手**:
```
Antinet智能知识管家是一款部署于骁龙AIPC的端侧智能数据工作站，
通过集成NPU加速的轻量化大模型(Qwen2.0-7B-SSD),实现:

- 🗣️ 自然语言驱动的数据查询
- 📊 自动数据分析与可视化
- 🎴 四色卡片知识沉淀
- 🔒 数据不出域
- ⚡ NPU加速推理

📚 参考来源：
1. [事实] Antinet系统概述 (相似度: 95%)
2. [事实] 核心价值 (相似度: 87%)
```

**不应该看到**:
```
 后端服务未连接
当前使用模拟模式演示功能。
```

---

##  提示

1. **启动顺序**: 先启动后端，等待30秒，再启动前端
2. **硬刷新**: 修改代码后一定要硬刷新浏览器
3. **检查日志**: 遇到问题先查看后端日志和浏览器控制台
4. **使用脚本**: 推荐使用 `start_all.bat` 而不是手动启动

---

**现在运行 `quick_fix_chat.bat` 开始修复！** 🚀

---

*故障排查指南创建时间: 2026-01-26*  
*状态: 准备就绪*
