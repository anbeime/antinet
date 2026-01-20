# Antinet智能知识管家 - 部署指南

## 📦 项目概述

**Antinet智能知识管家**是一款部署于骁龙AIPC的端侧智能数据工作站,集成NPU加速的轻量化大模型,实现自然语言驱动的数据查询、自动分析与可视化,并通过"四色卡片"方法论进行结构化知识沉淀。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────┐
│         前端 (React + Vite)                  │
│  http://localhost:3000                      │
└──────────────┬──────────────────────────────┘
               │ HTTP API
┌──────────────┴──────────────────────────────┐
│         后端API (FastAPI)                    │
│  http://localhost:8000                      │
│  - 数据分析接口                              │
│  - 四色卡片生成                              │
│  - 性能监控                                  │
└──────────────┬──────────────────────────────┘
               │ QNN推理
┌──────────────┴──────────────────────────────┐
│    骁龙NPU (Hexagon NPU + QNN SDK)          │
│  - Qwen2-1.5B (INT8量化)                    │
│  - 目标延迟 < 500ms                          │
└─────────────────────────────────────────────┘
```

## 🚀 在远程AIPC上部署

### 前置条件

1. ✅ 已通过远程桌面连接到AIPC
2. ✅ 已配置磁盘重定向(可访问本地C盘)
3. ✅ AIPC已安装Python 3.10+和Node.js 18+

### 步骤1: 复制项目到AIPC

**在远程AIPC的PowerShell中执行:**

```powershell
# 方式A: 通过磁盘重定向复制 (推荐)
xcopy "\\tsclient\C\D\compet\xiaolong" "C:\workspace\antinet" /E /I /Y

# 方式B: 如果项目在其他盘符
xcopy "\\tsclient\D\compet\xiaolong" "C:\workspace\antinet" /E /I /Y

cd C:\workspace\antinet
```

### 步骤2: 安装前端依赖

```powershell
cd C:\workspace\antinet

# 确保已安装pnpm
npm install -g pnpm

# 安装依赖
pnpm install

# 启动前端开发服务器
pnpm run dev
```

访问: http://localhost:3000

### 步骤3: 安装后端依赖

**打开新的PowerShell窗口:**

```powershell
cd C:\workspace\antinet\backend

# 创建虚拟环境 (可选但推荐)
python -m venv venv
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 重要: 安装QAI AppBuilder (骁龙专用)
# 文件路径: C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

### 步骤4: 模型转换与部署 (核心步骤)

#### 4.1 本地转换模型 (可选,在本地PC上执行)

```powershell
cd C:\workspace\antinet\backend

# 下载并转换为ONNX格式
python model_converter.py --model qwen2-1.5b --output ./models

# 这会生成:
# - models/pytorch/qwen2-1.5b/          (PyTorch模型)
# - models/onnx/qwen2-1.5b.onnx         (ONNX模型)
# - models/onnx/qwen2-1.5b_quantized.onnx  (量化模型)
```

#### 4.2 在AIPC上转换为QNN格式 (**必须在AIPC上执行**)

```powershell
cd C:\workspace\antinet\backend\models

# 运行QNN转换脚本
python convert_to_qnn_on_aipc.py

# 输出:
# - models/qnn/qwen2-1.5b.bin  (QNN模型,可在NPU上运行)
```

**如果自动转换脚本失败,手动执行:**

```powershell
python -c "
import qai_appbuilder as qai

print('开始转换ONNX模型到QNN格式...')
model = qai.convert_onnx_to_qnn(
    'models/onnx/qwen2-1.5b_quantized.onnx',
    backend='QNN',
    device='NPU',
    precision='INT8'
)
model.save('models/qnn/qwen2-1.5b.bin')
print('✓ QNN模型已保存')
"
```

### 步骤5: 启动后端服务

```powershell
cd C:\workspace\antinet\backend

# 确保模型文件存在
dir models\qnn\qwen2-1.5b.bin

# 启动后端API服务
python main.py

# 输出:
# ====================================================
# Antinet智能知识管家 v1.0.0
# 端侧智能数据中枢与协同分析平台
# ====================================================
# 运行环境: NPU
# 数据不出域: True
#
# 正在加载QNN模型...
# ✓ 模型加载成功 (设备: NPU)
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### 步骤6: 验证部署

**在AIPC的浏览器中:**

1. 前端: http://localhost:3000
2. 后端健康检查: http://localhost:8000/api/health

**测试数据分析功能:**

1. 点击"数据分析"标签页
2. 点击"检测服务"按钮,确认后端连接正常
3. 输入查询: "分析上个月的销售数据趋势"
4. 点击"开始分析",查看四色卡片结果

## 📊 性能验证

### 测试NPU加速效果

**访问性能测试接口:**

```powershell
# 在PowerShell中
curl http://localhost:8000/api/performance/benchmark
```

**预期结果:**

```json
{
  "device": "NPU",
  "model": "qwen2-1.5b",
  "tests": [
    {
      "sequence_length": 32,
      "avg_latency_ms": 120.5,
      "throughput_qps": 8.3
    },
    {
      "sequence_length": 128,
      "avg_latency_ms": 450.2,
      "throughput_qps": 2.2
    }
  ]
}
```

**关键指标:**
- ✅ NPU推理延迟 < 500ms
- ✅ 相比CPU加速 3-5倍
- ✅ 内存占用 < 2GB

## 🐛 常见问题

### Q1: 模型加载失败

**错误**: `模型文件不存在: ./models/qwen2-1.5b-npu.bin`

**解决**:
```powershell
# 检查模型文件是否存在
dir backend\models\qnn\qwen2-1.5b.bin

# 如果不存在,重新运行模型转换
cd backend\models
python convert_to_qnn_on_aipc.py
```

### Q2: QAI AppBuilder导入失败

**错误**: `ModuleNotFoundError: No module named 'qai_appbuilder'`

**解决**:
```powershell
# 确认whl文件路径
dir C:\ai-engine-direct-helper\samples\*.whl

# 安装
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

### Q3: 前后端无法通信

**错误**: 前端显示"后端服务连接失败"

**解决**:
```powershell
# 检查后端是否运行
curl http://localhost:8000/api/health

# 检查防火墙
# Windows防火墙 → 允许应用 → Python

# 检查CORS配置 (backend/main.py)
# allow_origins=["http://localhost:3000"]
```



## 📝 开发模式 vs 生产模式

### 开发模式 (当前)

```powershell
# 前端
pnpm run dev  # 热重载,调试工具

# 后端
python main.py  # 自动重载,详细日志
```

### 生产模式 (复赛提交)

```powershell
# 前端 - 构建生产版本
pnpm run build

# 后端 - 使用生产服务器
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

## 🎬 录制演示视频建议

### 场景1: 启动演示 (30秒)

1. 展示远程桌面连接到AIPC
2. 打开前端 http://localhost:3000
3. 显示后端健康状态 (NPU, 模型已加载)

### 场景2: 数据分析 (60秒)

1. 切换到"数据分析"标签
2. 输入查询: "分析上个月的销售数据趋势"
3. 显示NPU推理过程和延迟
4. 展示四色卡片自动生成:
   - 蓝色(事实): 数据统计结果
   - 绿色(解释): 原因分析
   - 黄色(风险): 潜在问题
   - 红色(行动): 具体建议

### 场景3: 性能展示 (30秒)

1. 访问性能测试接口
2. 显示NPU推理延迟 < 500ms
3. 对比CPU推理(如果可能)
4. 强调"数据不出域"安全机制

### 场景4: 知识沉淀 (30秒)

1. 展示分析结果自动保存为卡片
2. 在知识卡片库中查看
3. 展示团队协作功能
4. 强调可追溯、可协作

## 📦 提交材料清单

### 必交材料

- [x] **演示视频** (≤3分钟)
  - 文件名: `AIPC-通用赛-TOPGO创客-演示视频.mp4`
  - 内容: 真实运行效果,核心功能展示

- [x] **PPT** (基于模板)
  - 文件名: `AIPC-通用赛-TOPGO创客-作品说明.pptx`
  - 重点说明:
    - ✅ 模型运行算力单元: NPU
    - ✅ 算力选择理由: 低延迟、低功耗、数据不出域
    - ✅ 端侧运行效果: < 500ms推理延迟
    - ✅ 异构计算: NPU(推理) + CPU(数据处理)

### 选交材料

- [ ] 完整代码包
  - 文件名: `antinet-源代码.zip`
  - 包含: 前端、后端、模型转换脚本

- [ ] 技术文档
  - 架构设计
  - API文档
  - 部署指南(本文件)

## 🎯 核心价值总结

1. **效率提升**: 数据分析从数小时缩短到分钟级 (70%+)
2. **安全保障**: 端侧处理,数据不出域
3. **知识沉淀**: 四色卡片方法论,可追溯可协作
4. **NPU加速**: 骁龙Hexagon NPU,推理延迟 < 500ms

---

**祝您参赛顺利!如有问题,请参考高通开发文档或联系技术支持。**
