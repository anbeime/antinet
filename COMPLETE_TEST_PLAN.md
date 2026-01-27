# 🎯 Antinet 完整测试和开发计划

## ⚠️ 发现的问题

**NPU 模型加载时间：82.68秒** - 异常缓慢！

**正常加载时间应该是：**
- 预期：10-15 秒
- 实际：82.68 秒
- **慢了 5-8 倍！**

**可能原因：**
1. 模型文件路径问题
2. NPU 驱动问题
3. 内存不足
4. 首次加载（需要编译）
5. 磁盘 I/O 慢

---

## 📋 完整测试计划

### 阶段 1：清理环境并重启 ⭐⭐⭐

#### 步骤 1.1：停止所有服务

```powershell
# 停止后端
cd C:\test\antinet
.\stop_backend.ps1

# 停止所有 Python 进程
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 等待进程完全停止
Start-Sleep -Seconds 3
```

#### 步骤 1.2：清理临时文件

```powershell
# 清理 Python 缓存
Get-ChildItem -Path "C:\test\antinet" -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force

# 清理 .pyc 文件
Get-ChildItem -Path "C:\test\antinet" -Recurse -Filter "*.pyc" | Remove-Item -Force
```

#### 步骤 1.3：验证虚拟环境

```powershell
cd C:\test\antinet

# 检查虚拟环境
Test-Path "venv_arm64\Scripts\python.exe"

# 检查 qai_appbuilder
& "venv_arm64\Scripts\python.exe" -c "import qai_appbuilder; print('OK')"
```

---

### 阶段 2：NPU 性能测试 ⭐⭐⭐

#### 步骤 2.1：创建 NPU 性能测试脚本

**文件：** `test_npu_performance.py`

```python
"""
NPU 性能基准测试
测试模型加载时间和推理延迟
"""
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

print("=" * 60)
print("NPU Performance Benchmark Test")
print("=" * 60)
print()

# 测试 1：模型加载时间
print("[Test 1] Model Loading Time")
print("-" * 60)

start_time = time.time()
from models.model_loader import get_model_loader

loader = get_model_loader()
print(f"Loader created: {time.time() - start_time:.2f}s")

if not loader.is_loaded:
    print("Loading model...")
    load_start = time.time()
    loader.load()
    load_time = time.time() - load_start
    print(f"Model loaded: {load_time:.2f}s")
    
    # 判断是否正常
    if load_time > 20:
        print(f"WARNING: Load time is too slow! ({load_time:.2f}s > 20s)")
    else:
        print(f"OK: Load time is acceptable ({load_time:.2f}s)")
else:
    print("Model already loaded")

print()

# 测试 2：推理延迟（短文本）
print("[Test 2] Inference Latency - Short Text")
print("-" * 60)

test_prompts = [
    "你好",
    "今天天气怎么样",
    "请介绍一下 Antinet 系统"
]

latencies = []
for i, prompt in enumerate(test_prompts, 1):
    print(f"\nTest {i}: '{prompt}'")
    
    start_time = time.time()
    response = loader.infer(
        prompt=prompt,
        max_new_tokens=32,
        temperature=0.7
    )
    latency = (time.time() - start_time) * 1000
    latencies.append(latency)
    
    print(f"  Response: {response[:50]}...")
    print(f"  Latency: {latency:.2f}ms")
    
    if latency > 500:
        print(f"  WARNING: Latency too high! ({latency:.2f}ms > 500ms)")
    else:
        print(f"  OK: Latency acceptable")

print()
print("-" * 60)
print(f"Average Latency: {sum(latencies) / len(latencies):.2f}ms")
print(f"Min Latency: {min(latencies):.2f}ms")
print(f"Max Latency: {max(latencies):.2f}ms")

# 测试 3：推理延迟（长文本）
print()
print("[Test 3] Inference Latency - Long Text")
print("-" * 60)

long_prompt = "请详细介绍 Antinet 智能知识管家系统的核心功能和技术架构"

start_time = time.time()
response = loader.infer(
    prompt=long_prompt,
    max_new_tokens=128,
    temperature=0.7
)
latency = (time.time() - start_time) * 1000

print(f"Prompt: {long_prompt}")
print(f"Response length: {len(response)} chars")
print(f"Latency: {latency:.2f}ms")

if latency > 2000:
    print(f"WARNING: Latency too high! ({latency:.2f}ms > 2000ms)")
else:
    print(f"OK: Latency acceptable")

print()
print("=" * 60)
print("Test Complete!")
print("=" * 60)
```

#### 步骤 2.2：运行性能测试

```powershell
cd C:\test\antinet
& "venv_arm64\Scripts\python.exe" test_npu_performance.py
```

---

### 阶段 3：同步 data-analysis/agents ⭐⭐

#### 步骤 3.1：检查需要同步的文件

```powershell
cd C:\test\antinet

# 检查 backend/agents
Get-ChildItem "backend\agents\*.py" | Select-Object Name

# 检查 data-analysis/agents
Get-ChildItem "data-analysis\agents\*.py" | Select-Object Name
```

#### 步骤 3.2：复制 memory.py 和 messenger.py

```powershell
# 复制 memory.py
Copy-Item "backend\agents\memory.py" "data-analysis\agents\memory.py" -Force

# 复制 messenger.py
Copy-Item "backend\agents\messenger.py" "data-analysis\agents\messenger.py" -Force

Write-Host "Files synchronized!" -ForegroundColor Green
```

#### 步骤 3.3：验证同步

```powershell
# 比较文件
$backend_memory = Get-FileHash "backend\agents\memory.py"
$dataanalysis_memory = Get-FileHash "data-analysis\agents\memory.py"

if ($backend_memory.Hash -eq $dataanalysis_memory.Hash) {
    Write-Host "memory.py synchronized OK" -ForegroundColor Green
} else {
    Write-Host "memory.py NOT synchronized" -ForegroundColor Red
}
```

---

### 阶段 4：测试数据分析和四色卡片生成 ⭐⭐

#### 步骤 4.1：创建数据分析测试脚本

**文件：** `test_data_analysis.py`

```python
"""
数据分析和四色卡片生成测试
"""
import sys
import asyncio
sys.path.insert(0, 'C:/test/antinet/backend')

print("=" * 60)
print("Data Analysis and Four-Color Cards Test")
print("=" * 60)
print()

# 测试数据
test_data = [
    {"month": "1月", "sales": 120000, "growth": -15},
    {"month": "2月", "sales": 135000, "growth": 12.5},
    {"month": "3月", "sales": 150000, "growth": 11.1}
]

async def test_analysis():
    from agents.orchestrator import OrchestratorAgent
    
    # 创建协调器
    orchestrator = OrchestratorAgent(
        genie_api_base_url="http://localhost:8000",
        model_path="C:/model/Qwen2.0-7B-SSD-8380-2.34"
    )
    
    print("[Test] Analyzing sales data...")
    print(f"Data: {test_data}")
    print()
    
    # 执行分析
    result = await orchestrator.coordinate_analysis(
        query="分析销售数据趋势",
        data=test_data
    )
    
    print()
    print("[Result] Four-Color Cards Generated:")
    print("-" * 60)
    
    # 显示结果
    if "cards" in result:
        for card_type, cards in result["cards"].items():
            print(f"\n{card_type.upper()} Cards ({len(cards)}):")
            for i, card in enumerate(cards, 1):
                print(f"  {i}. {card.get('title', card.get('content', ''))[:50]}...")
    
    print()
    print("=" * 60)
    print("Test Complete!")
    print("=" * 60)

# 运行测试
asyncio.run(test_analysis())
```

#### 步骤 4.2：运行数据分析测试

```powershell
cd C:\test\antinet
& "venv_arm64\Scripts\python.exe" test_data_analysis.py
```

---

### 阶段 5：提交进度到仓库 ⭐

#### 步骤 5.1：检查 Git 状态

```powershell
cd C:\test\antinet
git status
```

#### 步骤 5.2：添加所有更改

```powershell
# 添加新文件
git add backend/skills/knowledge_graph_skill.py
git add src/components/KnowledgeGraph.tsx
git add *.ps1
git add *.bat
git add *.md

# 查看将要提交的文件
git status
```

#### 步骤 5.3：提交更改

```powershell
git commit -m "feat: 添加知识图谱可视化技能和前端组件

- 创建知识图谱可视化技能 (KnowledgeGraphVisualizationSkill)
- 实现节点提取和边构建算法
- 添加前端 Echarts 图谱组件
- 修复 CodeBuddy SDK 清理
- 优化启动脚本（处理端口占用）
- 添加 NPU 性能测试脚本
- 更新文档和指南"
```

#### 步骤 5.4：推送到远程仓库（可选）

```powershell
git push origin main
```

---

### 阶段 6：前端集成测试 ⭐

#### 步骤 6.1：查找前端目录

```powershell
cd C:\test\antinet
Get-ChildItem -Directory -Recurse -Filter "frontend" -Depth 2
Get-ChildItem -Directory -Recurse -Filter "src" -Depth 2
```

#### 步骤 6.2：安装前端依赖

```bash
cd <前端目录>

# 安装 echarts
npm install echarts
# 或
pnpm add echarts

# 安装其他依赖（如果需要）
npm install
```

#### 步骤 6.3：启动前端开发服务器

```bash
npm run dev
# 或
pnpm dev
```

#### 步骤 6.4：测试前后端集成

**打开浏览器测试：**

1. **主页：** http://localhost:3000
2. **API 测试：**
   - http://localhost:8000/api/health
   - http://localhost:8000/api/skill/list
   - http://localhost:8000/api/knowledge/graph
3. **知识图谱：** http://localhost:3000/knowledge-graph

---

## 🚀 立即执行的完整流程

### 第 1 步：清理环境

```powershell
# 打开 PowerShell
cd C:\test\antinet

# 停止所有服务
.\stop_backend.ps1

# 停止所有 Python 进程
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 等待
Start-Sleep -Seconds 3

Write-Host "Environment cleaned!" -ForegroundColor Green
```

### 第 2 步：NPU 性能测试

```powershell
# 创建测试脚本（已在上面）
# 运行测试
& "venv_arm64\Scripts\python.exe" test_npu_performance.py > npu_test_result.txt

# 查看结果
Get-Content npu_test_result.txt
```

### 第 3 步：同步 agents

```powershell
# 复制文件
Copy-Item "backend\agents\memory.py" "data-analysis\agents\memory.py" -Force
Copy-Item "backend\agents\messenger.py" "data-analysis\agents\messenger.py" -Force

Write-Host "Agents synchronized!" -ForegroundColor Green
```

### 第 4 步：启动后端

```cmd
cd C:\test\antinet
start_backend_simple.bat
```

### 第 5 步：测试 API

**新窗口：**
```powershell
curl http://localhost:8000/api/health
curl http://localhost:8000/api/skill/list
curl http://localhost:8000/api/knowledge/graph
```

### 第 6 步：提交代码

```powershell
cd C:\test\antinet
git add .
git commit -m "feat: 知识图谱可视化和性能优化"
```

### 第 7 步：启动前端

```bash
cd <前端目录>
npm install echarts
npm run dev
```

---

## 📊 预期结果

### NPU 性能测试

**正常结果：**
```
Model loaded: 10-15s
Average Latency: 300-450ms
Max Latency: < 500ms
```

**如果异常：**
```
Model loaded: > 20s  ⚠️ 需要优化
Average Latency: > 500ms  ⚠️ 需要优化
```

### API 测试

**健康检查：**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "NPU"
}
```

**技能列表：**
```json
{
  "total": 24,
  "skills": [...]
}
```

---

## 🎯 优先级

1. ⭐⭐⭐ **清理环境并重测 NPU** - 立即执行
2. ⭐⭐⭐ **NPU 性能测试** - 诊断加载慢的问题
3. ⭐⭐ **同步 agents** - 保持代码一致
4. ⭐⭐ **测试数据分析** - 验证功能
5. ⭐ **提交代码** - 保存进度
6. ⭐ **前端集成** - 完整测试

---

**准备好了吗？让我们开始吧！** 🚀

**第一步：清理环境**
```powershell
cd C:\test\antinet
.\stop_backend.ps1
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

**创建时间：** 2026-01-27  
**问题：** NPU 加载时间 82秒（异常）  
**目标：** 完整重测并优化  
**状态：** 等待执行
