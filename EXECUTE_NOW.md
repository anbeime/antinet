# 🚀 立即执行 - 完整重测指南

## 📋 执行清单

### ✅ 已准备的脚本

1. `cleanup_and_restart.ps1` - 完整环境清理
2. `test_npu_performance.py` - NPU 性能测试
3. `start_backend_simple.bat` - 启动后端
4. `COMPLETE_TEST_PLAN.md` - 完整测试计划

---

## 🎯 立即执行（5 步完成）

### 第 1 步：清理环境 ⭐⭐⭐

```powershell
cd C:\test\antinet
.\cleanup_and_restart.ps1
```

**这个脚本会：**
- ✅ 停止所有 Python 进程
- ✅ 清理 Python 缓存
- ✅ 验证虚拟环境
- ✅ 同步 agents 文件
- ✅ 询问是否运行 NPU 测试

**预期输出：**
```
========================================
Complete Environment Cleanup
========================================

[1/5] Stopping all services...
  OK - All services stopped

[2/5] Cleaning Python cache...
  OK - Cleaned X cache directories

[3/5] Verifying virtual environment...
  OK - Virtual environment exists
  OK - qai_appbuilder installed

[4/5] Synchronizing agents...
  OK - memory.py synchronized
  OK - messenger.py synchronized

[5/5] Ready to start!
  Environment cleaned
  Cache cleared
  Agents synchronized

========================================
Cleanup Complete!
========================================

Do you want to run NPU performance test now? (Y/N)
```

**选择 Y 继续 NPU 测试**

---

### 第 2 步：NPU 性能测试 ⭐⭐⭐

如果在第 1 步选择了 N，手动运行：

```powershell
cd C:\test\antinet
& "venv_arm64\Scripts\python.exe" test_npu_performance.py
```

**预期输出（正常情况）：**
```
========================================
NPU Performance Benchmark Test
========================================

[Test 1] Model Loading Time
------------------------------------------------------------
Loader created: 0.05s
Loading model...
Model loaded: 10-15s
OK: Load time is acceptable (12.5s)

[Test 2] Inference Latency - Short Text
------------------------------------------------------------

Test 1: '你好'
  Response: 你好！有什么我可以帮助你的吗？...
  Latency: 350.25ms
  OK: Latency acceptable

Test 2: '今天天气怎么样'
  Response: 我是 AI 助手，无法获取实时天气信息...
  Latency: 420.15ms
  OK: Latency acceptable

Test 3: '请介绍一下 Antinet 系统'
  Response: Antinet 是一款智能知识管家系统...
  Latency: 480.50ms
  OK: Latency acceptable

------------------------------------------------------------
Average Latency: 416.97ms
Min Latency: 350.25ms
Max Latency: 480.50ms
OK: Average latency acceptable (416.97ms)

[Test 3] Inference Latency - Long Text
------------------------------------------------------------
Prompt: 请详细介绍 Antinet 智能知识管家系统的核心功能和技术架构
Response length: 256 chars
Latency: 1850.30ms
OK: Latency acceptable

========================================
Test Complete!
========================================

Summary:
  Model Load Time: 12.5s
  Avg Inference Latency (short): 416.97ms
  Inference Latency (long): 1850.30ms

RESULT: Performance is acceptable!
```

**如果加载时间仍然 > 20秒：**
```
WARNING: Load time is too slow! (82.68s > 20s)
Possible reasons:
  1. First-time loading (model compilation)
  2. Disk I/O slow
  3. NPU driver issue

RECOMMENDATION: Performance optimization needed
  - Consider switching to lighter model (Qwen2-1.5B)
  - Enable BURST performance mode
  - Check NPU driver and model cache
```

---

### 第 3 步：启动后端服务 ⭐⭐

```cmd
cd C:\test\antinet
start_backend_simple.bat
```

**预期输出：**
```
========================================
Service URL: http://localhost:8000
API Docs: http://localhost:8000/docs
Knowledge Graph: http://localhost:8000/api/knowledge/graph
========================================

[SETUP] QNN 日志级别设置为: DEBUG
[SETUP] NPU library paths configured
✓ 知识管理路由已注册
[SkillRegistry] 知识图谱可视化技能已注册
[SkillRegistry] 已注册 24 个内置技能

INFO: Uvicorn running on http://0.0.0.0:8000
```

---

### 第 4 步：测试 API ⭐⭐

**打开新的 PowerShell 窗口：**

```powershell
# 测试健康检查
curl http://localhost:8000/api/health

# 测试技能列表
curl http://localhost:8000/api/skill/list

# 测试知识图谱
curl http://localhost:8000/api/knowledge/graph
```

**预期响应（健康检查）：**
```json
{
  "status": "healthy",
  "model": "Qwen2.0-7B-SSD",
  "model_loaded": true,
  "device": "NPU",
  "data_stays_local": true
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

### 第 5 步：提交代码 ⭐

```powershell
cd C:\test\antinet

# 查看状态
git status

# 添加所有更改
git add .

# 提交
git commit -m "feat: 知识图谱可视化和性能测试

- 添加知识图谱可视化技能 (KnowledgeGraphVisualizationSkill)
- 创建前端 Echarts 图谱组件 (KnowledgeGraph.tsx)
- 实现 NPU 性能基准测试脚本
- 优化启动脚本（自动处理端口占用）
- 清理 CodeBuddy SDK 残留
- 同步 data-analysis/agents 文件
- 添加完整测试计划和文档

测试结果:
- 技能系统: 24 个技能已注册
- NPU 加载时间: [待测试]
- 推理延迟: [待测试]
- API 集成: 正常"

# 推送（可选）
git push origin main
```

---

## 📊 性能基准

### 正常性能指标

| 指标 | 目标值 | 可接受范围 |
|------|--------|-----------|
| 模型加载时间 | 10-15秒 | < 20秒 |
| 短文本推理延迟 | 300-450ms | < 500ms |
| 长文本推理延迟 | 1500-2000ms | < 3000ms |

### 如果性能不达标

**加载时间 > 20秒：**
1. 首次加载需要编译（正常）
2. 检查磁盘 I/O
3. 检查 NPU 驱动
4. 考虑切换到 Qwen2-1.5B

**推理延迟 > 500ms：**
1. 启用 BURST 性能模式
2. 减少 `max_new_tokens`
3. 优化 prompt
4. 切换到轻量模型

---

## 🎯 下一步（可选）

### 选项 A：前端集成测试

```bash
# 查找前端目录
cd C:\test\antinet
Get-ChildItem -Directory -Recurse -Filter "frontend" -Depth 2

# 进入前端目录
cd <前端目录>

# 安装依赖
npm install echarts

# 启动前端
npm run dev
```

### 选项 B：数据分析测试

```powershell
cd C:\test\antinet
& "venv_arm64\Scripts\python.exe" test_data_analysis.py
```

### 选项 C：继续开发

参考 `COMPLETE_TEST_PLAN.md` 中的其他测试项目。

---

## ⚠️ 故障排查

### 问题 1：NPU 加载时间仍然很慢（82秒）

**可能原因：**
1. **首次加载** - NPU 需要编译模型，第二次会快很多
2. **磁盘慢** - 模型文件在机械硬盘上
3. **内存不足** - 系统内存不够

**解决方案：**
```powershell
# 重启后再次测试
Restart-Computer

# 重启后运行
cd C:\test\antinet
.\cleanup_and_restart.ps1
# 选择 Y 运行 NPU 测试
```

### 问题 2：虚拟环境问题

**解决方案：**
```cmd
cd C:\test\antinet
deploy_antinet.bat
```

### 问题 3：端口被占用

**解决方案：**
```powershell
cd C:\test\antinet
.\stop_backend.ps1
```

---

## ✅ 执行检查清单

- [ ] 第 1 步：运行 `cleanup_and_restart.ps1`
- [ ] 第 2 步：NPU 性能测试完成
- [ ] 第 3 步：后端服务启动成功
- [ ] 第 4 步：API 测试通过
- [ ] 第 5 步：代码已提交

---

**准备好了吗？现在就开始吧！** 🚀

```powershell
cd C:\test\antinet
.\cleanup_and_restart.ps1
```

---

**创建时间：** 2026-01-27  
**目标：** 完整重测 NPU 性能  
**预期：** 加载时间 < 20秒，推理延迟 < 500ms  
**状态：** 等待执行
