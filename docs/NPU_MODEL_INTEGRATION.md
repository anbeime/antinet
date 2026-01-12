# NPU 模型集成指南（远程 AI 必读）

## 📋 概述

本指南专门针对远程 AIPC 上的 AI 助手，提供 **step-by-step** 的详细操作步骤，确保正确集成和使用预装的 NPU 模型。

**重要提醒**：请**严格按照**以下步骤操作，**不要跳过任何步骤**，**不要自行修改**。

---

## 🎯 目标

将远程 AIPC 上 `C:\model\` 目录下的预装模型集成到 Antinet 项目中，实现：
1. ✅ NPU 推理延迟 < 500ms
2. ✅ CPU vs NPU 加速比 > 2x
3. ✅ 数据不出域（本地推理）
4. ✅ 四色卡片生成

---

## 📁 预装模型列表

远程 AIPC 上 `C:\model\` 目录包含以下模型：

| 模型名称 | 文件夹路径 | 参数量 | 推荐使用 |
|---------|-----------|--------|---------|
| **Qwen2.0-7B-SSD** | `C:\model\Qwen2.0-7B-SSD-8380-2.34` | 7B | ✅ **首选** |
| llama3.1-8b | `C:\model\llama3.1-8b-8380-qnn2.38` | 8B | 备选 |
| llama3.2-3b | `C:\model\llama3.2-3b-8380-qnn2.37` | 3B | 备选 |

**默认使用**: **Qwen2.0-7B-SSD**（中文支持好，速度快，推荐首选）

---

## 🚀 Step 1: 验证模型文件存在

**操作**: 检查模型文件是否已解压

```bash
# 打开命令提示符（Win+R -> cmd）

# 检查模型目录
dir C:\model

# 应该看到以下文件夹（已解压）：
# - Qwen2.0-7B-SSD-8380-2.34
# - llama3.1-8b-8380-qnn2.38
# - llama3.2-3b-8380-qnn2.37
```

**判断标准**：
- ✅ 如果看到**文件夹**（不是 .zip 文件） → 继续下一步
- ❌ 如果只看到 .zip 文件 → 需要先解压

**解压方法**（如果需要）：
```bash
# 进入 model 目录
cd C:\model

# 解压 Qwen2.0-7B-SSD
powershell Expand-Archive -Path "Qwen2.0-7B-SSD-8380-2.34.zip" -DestinationPath "C:\model\Qwen2.0-7B-SSD-8380-2.34"

# 验证解压成功
dir "Qwen2.0-7B-SSD-8380-2.34"
```

---

## 🚀 Step 2: 拉取最新代码

**操作**: 同步项目代码（包含模型集成代码）

```bash
# 进入项目目录
cd C:\Users\你的用户名\Desktop\antinet

# 拉取最新代码
git pull origin main

# 验证新文件存在
dir backend\models\model_loader.py
dir backend\test_model_loading.py
dir backend\routes\npu_routes.py
```

**判断标准**：
- ✅ 所有文件都存在 → 继续下一步
- ❌ 文件不存在 → 重新执行 `git pull`

---

## 🚀 Step 3: 验证环境

**操作**: 检查 Python 和 QAI AppBuilder

```bash
# 1. 检查 Python 版本（必须是 3.12）
python --version
# 应输出: Python 3.12.x

# 2. 检查 QAI AppBuilder
python -c "import qai_appbuilder; print('QAI AppBuilder 可用')"
# 应输出: QAI AppBuilder 可用
```

**判断标准**：
- ✅ Python 3.12 + QAI AppBuilder 可用 → 继续下一步
- ❌ 版本不对或模块不存在 → 参考 `.roomodes` 重新配置环境

---

## 🚀 Step 4: 运行模型加载测试

**操作**: 验证模型可以正确加载

```bash
# 进入后端目录
cd backend

# 运行测试脚本
python test_model_loading.py
```

**预期输出**：
```
╔====================================================================╗
║                    NPU 模型性能测试                                  ║
╚====================================================================╝

可用模型:
  [qwen2-7b-ssd] Qwen2.0-7B-SSD (7B)
      - 推荐首选，对话/分析，速度快，中文支持好
      - ⭐️ 推荐首选
  ...

正在加载推荐模型...
✓ 模型加载成功
  - 模型: Qwen2.0-7B-SSD
  - 参数量: 7B
  - 运行设备: NPU (Hexagon)

测试结果汇总
====================================================================
模型加载              ✓ 通过
推理性能              ✓ 通过
Token长度             ✓ 通过
...

✓ 所有测试通过！
```

**判断标准**：
- ✅ 所有测试通过 → 继续下一步
- ❌ 任何测试失败 → **停止**，查看错误信息

**常见错误处理**：

**错误 1**: `FileNotFoundError: 模型路径不存在`
```bash
# 原因：模型文件未解压
# 解决：回到 Step 1，解压模型文件
```

**错误 2**: `ModuleNotFoundError: No module named 'qai_appbuilder'`
```bash
# 原因：QAI AppBuilder 未安装
# 解决：
cd %USERPROFILE%\Desktop\ai-engine-direct-helper\samples
pip install qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

**错误 3**: `推理延迟超标: XXXms (目标 < 500ms)`
```bash
# 原因：性能模式未设置或模型量化有问题
# 解决：检查 ModelConfig.QNN_CONFIG["performance_mode"] 是否为 "BURST"
```

---

## 🚀 Step 5: 集成到 FastAPI

**操作**: 将 NPU 路由添加到主应用

### 5.1 检查 main.py 是否已集成

```bash
# 查看 main.py
cat backend/main.py | findstr "npu_routes"
```

**判断标准**：
- ✅ 看到 `from routes.npu_routes import router as npu_router` → 已集成，跳到 Step 6
- ❌ 没有看到 → 继续 5.2

### 5.2 添加 NPU 路由（如果未集成）

**编辑 `backend/main.py`**，添加以下代码：

```python
# 在文件开头添加导入
from routes.npu_routes import router as npu_router

# 在 app 创建后添加路由
app.include_router(npu_router)
```

**完整示例**：
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.npu_routes import router as npu_router  # ← 添加这行

app = FastAPI(title="Antinet API", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加 NPU 路由
app.include_router(npu_router)  # ← 添加这行

# 其他路由...
```

---

## 🚀 Step 6: 启动后端服务

**操作**: 启动 FastAPI 服务

```bash
# 在 backend 目录
cd backend

# 启动服务
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**预期输出**：
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**判断标准**：
- ✅ 服务启动成功，无错误 → 继续下一步
- ❌ 启动失败，有错误 → 查看错误信息，修复后重试

---

## 🚀 Step 7: 测试 API 接口

**操作**: 验证 NPU 推理接口工作正常

### 7.1 测试模型列表接口

```bash
# 新开一个命令提示符

# 获取可用模型列表
curl http://localhost:8000/api/npu/models
```

**预期输出**：
```json
[
  {
    "key": "qwen2-7b-ssd",
    "name": "Qwen2.0-7B-SSD",
    "params": "7B",
    "quantization": "QNN 2.34",
    "description": "推荐首选，对话/分析，速度快，中文支持好",
    "path": "C:/model/Qwen2.0-7B-SSD-8380-2.34",
    "recommended": true
  },
  ...
]
```

### 7.2 测试性能基准接口

```bash
# 运行性能测试
curl http://localhost:8000/api/npu/benchmark
```

**预期输出**：
```json
{
  "model_name": "Qwen2.0-7B-SSD",
  "avg_latency_ms": 420.5,
  "min_latency_ms": 380.2,
  "max_latency_ms": 485.7,
  "cpu_vs_npu_speedup": 4.5,
  "memory_usage_mb": 1800.0,
  "test_count": 5,
  "status": "✓ 通过"
}
```

**判断标准**：
- ✅ `avg_latency_ms < 500` 且 `status == "✓ 通过"` → 性能达标
- ⚠️ `avg_latency_ms >= 500` → 性能未达标，需优化

### 7.3 测试分析接口

```bash
# POST 请求（Windows PowerShell）
Invoke-WebRequest -Uri "http://localhost:8000/api/npu/analyze" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"query":"分析这段数据的趋势","max_tokens":128}'

# 或使用 curl（如果已安装）
curl -X POST "http://localhost:8000/api/npu/analyze" -H "Content-Type: application/json" -d "{\"query\":\"分析这段数据的趋势\",\"max_tokens\":128}"
```

**预期输出**：
```json
{
  "success": true,
  "query": "分析这段数据的趋势",
  "cards": [
    {
      "color": "blue",
      "category": "事实",
      "title": "数据事实",
      "content": "..."
    },
    ...
  ],
  "raw_output": "...",
  "performance": {
    "inference_time_ms": 425.3,
    "total_time_ms": 430.1,
    "model": "Qwen2.0-7B-SSD",
    "device": "NPU (Hexagon)",
    "meets_target": true
  }
}
```

**判断标准**：
- ✅ `success == true` 且 `performance.meets_target == true` → 完美
- ❌ `success == false` → 查看错误信息

---

## 🚀 Step 8: 前端集成（可选）

**操作**: 在前端调用 NPU 接口

### 8.1 创建 API 客户端（示例）

```typescript
// src/services/npuService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/npu';

export interface AnalyzeRequest {
  query: string;
  max_tokens?: number;
  temperature?: number;
}

export interface FourColorCard {
  color: 'blue' | 'green' | 'yellow' | 'red';
  category: '事实' | '解释' | '风险' | '行动';
  title: string;
  content: string;
}

export interface AnalyzeResponse {
  success: boolean;
  query: string;
  cards: FourColorCard[];
  raw_output: string;
  performance: {
    inference_time_ms: number;
    meets_target: boolean;
  };
}

export const npuService = {
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await axios.post(`${API_BASE}/analyze`, request);
    return response.data;
  },

  async benchmark() {
    const response = await axios.get(`${API_BASE}/benchmark`);
    return response.data;
  },

  async listModels() {
    const response = await axios.get(`${API_BASE}/models`);
    return response.data;
  }
};
```

### 8.2 使用示例

```typescript
import { npuService } from '@/services/npuService';

// 执行分析
const result = await npuService.analyze({
  query: "分析这段数据的趋势",
  max_tokens: 128
});

console.log('推理延迟:', result.performance.inference_time_ms, 'ms');
console.log('四色卡片:', result.cards);
```

---

## ✅ 验证清单

完成集成后，请逐一检查：

- [ ] 模型文件已解压到 `C:\model\`
- [ ] `backend/models/model_loader.py` 文件存在
- [ ] `backend/test_model_loading.py` 所有测试通过
- [ ] FastAPI 服务启动成功
- [ ] `/api/npu/models` 接口返回模型列表
- [ ] `/api/npu/benchmark` 性能测试通过（< 500ms）
- [ ] `/api/npu/analyze` 接口返回四色卡片
- [ ] `performance.meets_target == true`

---

## ⚠️ 常见错误排查

### 错误 1: 模型加载失败
```
FileNotFoundError: 模型路径不存在: C:/model/Qwen2.0-7B-SSD-8380-2.34
```
**解决**：
1. 检查模型文件是否已解压
2. 运行 `dir C:\model\Qwen2.0-7B-SSD-8380-2.34`
3. 如果不存在，解压 .zip 文件

### 错误 2: QAI AppBuilder 不可用
```
ModuleNotFoundError: No module named 'qai_appbuilder'
```
**解决**：
```bash
cd %USERPROFILE%\Desktop\ai-engine-direct-helper\samples
pip install qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

### 错误 3: 推理延迟超标
```
⚠️  推理延迟超标: 650ms (目标 < 500ms)
```
**解决**：
1. 检查性能模式：确保 `performance_mode == "BURST"`
2. 减少 `max_tokens`（从 512 减到 128）
3. 尝试使用更小的模型（llama3.2-3b）

### 错误 4: 内存不足
```
RuntimeError: Cannot allocate memory
```
**解决**：
1. 关闭其他应用释放内存
2. 使用更小的模型（llama3.2-3b）
3. 减小 batch size

---

## 📊 性能优化建议

如果推理延迟超过 500ms，尝试以下优化：

1. **使用 BURST 模式**
   ```python
   # backend/models/model_loader.py
   QNN_CONFIG = {
       "performance_mode": "BURST"  # 确保是 BURST
   }
   ```

2. **减小 max_tokens**
   ```python
   # 从 512 减到 128 或更少
   loader.infer(prompt, max_new_tokens=128)
   ```

3. **切换到更小模型**
   ```python
   loader = NPUModelLoader(model_key="llama3.2-3b")  # 3B 更快
   ```

---

## 🎓 总结

完成以上步骤后，你应该能够：
- ✅ 成功加载 NPU 模型
- ✅ 推理延迟 < 500ms
- ✅ 通过 API 接口调用 NPU
- ✅ 生成四色卡片
- ✅ 查看性能监控数据

**下一步**：集成到前端 UI，展示四色卡片和性能监控仪表板。

---

**重要提醒**：
- 📌 每次工作开始前：`git pull`
- 📌 每次工作结束前：`git add . && git commit && git push`
- 📌 每 2 小时推送一次代码
- 📌 遇到问题立即停止，查看错误信息，不要盲目继续

**技术民主化，从端侧开始。** 🚀
