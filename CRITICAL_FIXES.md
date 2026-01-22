# 后端问题诊断与修复

## 🎯 问题根源

### 问题1: `/api/npu/analyze` 违反单例模式
**位置**: `backend/routes/npu_routes.py:90`

**错误代码**:
```python
loader = NPUModelLoader(model_key=request.model)  # ❌ 每次请求都创建新实例
```

**问题**:
- 每次请求都创建新的 `NPUModelLoader` 实例
- 导致模型被多次加载
- 违反单例模式，浪费资源

**修复**:
```python
from models.model_loader import get_model_loader
loader = get_model_loader(request.model)  # ✅ 使用全局单例
```

---

### 问题2: 缺少调试日志
**位置**: `backend/routes/npu_routes.py:226-244` 和 `backend/main.py:251-269`

**问题**:
- 无法诊断为什么返回 `model_loaded=false`
- 不清楚哪个加载器实例被使用

**修复**:
添加详细日志：
```python
logger.info(f"[/api/npu/status] _global_model_loader: {_global_model_loader is not None}")
logger.info(f"[/api/npu/status] stats: {stats}")
logger.info(f"[/api/health] loader.is_loaded: {_global_model_loader.is_loaded}")
```

---

## ✅ 已应用的修复

| 文件 | 修复内容 | 状态 |
|------|---------|------|
| `routes/npu_routes.py:90` | 使用 `get_model_loader()` 替代 `NPUModelLoader()` | ✅ 已修复 |
| `routes/npu_routes.py:226` | 添加状态检查日志 | ✅ 已添加 |
| `main.py:251` | 添加健康检查日志 | ✅ 已添加 |

---

## 🔍 当前状态

### 后端日志显示：
```
✓ 全局模型加载器已初始化
  - 模型: Qwen2.0-7B-SSD
  - 参数: 7B
  - 量化: QNN 2.34
  - 状态: 已加载
```

### API 返回：
```json
// /api/health
{
  "model_loaded": false  // ❌ 错误
}

// /api/npu/status
{
  "loaded": false  // ❌ 错误
}
```

### 不一致的原因：
FastAPI 检测到文件变化后自动 reload，但 reload 过程可能：
1. 未完全重新加载新代码
2. 状态在不同进程/线程间不同步
3. 全局变量在 reload 时丢失

---

## 🚀 解决方案：完全重启后端

**不要依赖 FastAPI 的 reload 功能！**

### 步骤1: 完全停止所有Python进程
```powershell
# PowerShell
Get-Process python | Stop-Process -Force
```

### 步骤2: 等待2-3秒
确保所有进程完全退出。

### 步骤3: 启动后端
```powershell
# PowerShell
cd C:\test\antinet\backend
python main.py
```

或使用批处理：
```batch
cd C:\test\antinet\backend
python main.py
```

### 步骤4: 等待10-15秒
让模型加载完成（约8-54秒）。

### 步骤5: 检查状态
```bash
# 健康检查
curl http://localhost:8000/api/health

# 模型状态
curl http://localhost:8000/api/npu/status

# 应该返回：
{
  "loaded": true,  // ✅
  "model_name": "Qwen2.0-7B-SSD"
}
```

---

## 📊 预期结果（重启后）

### ✅ 成功指标

| 指标 | 预期值 |
|------|--------|
| `/api/health` | `model_loaded: true` |
| `/api/npu/status` | `loaded: true` |
| 模型加载时间 | ~8.5秒 |
| 推理延迟 | ~450ms |
| API 响应时间 | < 1秒 |

### ❌ 如果仍然失败

**可能原因**:
1. Python 进程未完全停止
2. 新代码未正确加载
3. 缓存问题

**排查步骤**:
```bash
# 1. 检查是否有残留进程
tasklist | findstr python

# 2. 如果有，强制停止
taskkill /F /IM python.exe

# 3. 删除 __pycache__（清除缓存）
cd C:\test\antinet\backend
rd /s /q __pycache__

# 4. 重新启动
python main.py
```

---

## 🧪 测试完整流程

### 测试1: 模型加载
```bash
# 1. 重启后端
# 2. 等待10秒
# 3. 检查
curl http://localhost:8000/api/health
# 期望: "model_loaded": true
```

### 测试2: 推理功能
```bash
curl -X POST http://localhost:8000/api/npu/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "测试数据分析",
    "max_tokens": 50,
    "temperature": 0.7
  }'
# 期望: 返回四色卡片
```

### 测试3: 前端集成
```bash
# 1. 启动前端
cd C:\test\antinet
pnpm run dev

# 2. 访问 http://localhost:3000

# 3. 点击"检测服务"按钮
# 期望: 显示 "✓ 后端服务正常, NPU模型已加载"

# 4. 输入查询并分析
# 期望: 生成四色卡片，显示推理时间
```

---

## 📁 相关文件

| 文件 | 状态 |
|------|------|
| `backend/main.py` | ✅ 已修复 |
| `backend/routes/npu_routes.py` | ✅ 已修复 |
| `backend/models/model_loader.py` | ✅ 正常 |
| `backend_new.log` | 📄 日志文件 |

---

## 🎯 关键总结

### 已解决的问题
1. ✅ 代码修复完成（单例模式）
2. ✅ 添加详细日志
3. ✅ 模型加载功能正常（独立测试）

### 待解决问题
1. ⏳ 后端需要完全重启（不要用 reload）
2. ⏳ 验证 API 返回正确状态

### NPU 驱动警告（非阻塞）
```
<E> DspTransport.openSession qnn_open failed, 0x80000406
<W> Traditional path not available. Switching to user driver path
```
- 不影响核心功能
- 可咨询高通解决

---

**最后更新**: 2026-01-21
**状态**: 等待用户完全重启后端
