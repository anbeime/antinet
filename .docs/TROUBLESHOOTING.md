# 故障排查指南

## 概述

本文档提供 Antinet 智能知识管理系统的常见问题排查方法和解决方案。

## 目录

1. [安装问题](#安装问题)
2. [后端问题](#后端问题)
3. [前端问题](#前端问题)
4. [NPU 模型问题](#npu-模型问题)
5. [性能问题](#性能问题)
6. [数据问题](#数据问题)

---

## 安装问题

### Q1: Python 版本不兼容

**错误**: `Python 3.8 is not supported`

**原因**: QAI AppBuilder 需要 Python 3.12

**解决**:
```bash
# 安装 Python 3.12
# 下载: https://www.python.org/downloads/release/python-3120/

# 验证版本
python --version
# 应该显示: Python 3.12.x
```

### Q2: pnpm 安装失败

**错误**: `pnpm: command not found`

**原因**: pnpm 未安装

**解决**:
```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### Q3: QAI AppBuilder 安装失败

**错误**: `ModuleNotFoundError: No module named 'qai_appbuilder'`

**原因**: QAI AppBuilder 未正确安装

**解决**:
```bash
# 确认 Python 版本 (必须是 3.12)
python --version

# 安装 QAI AppBuilder
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 验证安装
python -c "import qai_appbuilder; print(qai_appbuilder.__version__)"
# 应该显示: 2.31.0
```

---

## 后端问题

### Q1: 后端服务启动失败

**错误**: `Address already in use`

**原因**: 端口 8000 已被占用

**解决**:
```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :8000

# 终止进程
taskkill /PID <PID> /F

# 或使用其他端口
# 修改 backend/config.py
PORT: int = 8001
```

### Q2: 后端服务无法访问

**错误**: `Connection refused`

**原因**: 后端服务未启动或防火墙阻止

**解决**:
```bash
# 检查后端是否运行
curl http://localhost:8000/api/health

# 检查防火墙
# Windows 防火墙 → 允许应用 → Python

# 重启后端服务
cd backend
python main.py
```

### Q3: CORS 错误

**错误**: `Access-Control-Allow-Origin`

**原因**: 前后端跨域问题

**解决**:
```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # 确保包含前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 前端问题

### Q1: 前端启动失败

**错误**: `Module not found: Can't resolve 'react'`

**原因**: 依赖未安装

**解决**:
```bash
# 清理缓存
rm -rf node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install

# 启动
pnpm run dev
```

### Q2: 前端无法连接后端

**错误**: `Failed to fetch`

**原因**: 后端服务未启动或地址错误

**解决**:
```bash
# 1. 检查后端是否运行
curl http://localhost:8000/api/health

# 2. 检查前端 API 地址
# src/components/DataAnalysisPanel.tsx
const API_BASE_URL = 'http://localhost:8000';  // 确保正确

# 3. 重启后端服务
cd backend
python main.py
```

### Q3: Tailwind CSS 样式未生效

**错误**: 样式未应用

**原因**: Tailwind CSS 配置问题

**解决**:
```bash
# 1. 检查 Tailwind 配置
# tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
}

# 2. 重新构建
pnpm run dev
```

---

## NPU 模型问题

### Q1: 模型文件不存在

**错误**: `模型文件不存在: ./models/qwen2-1.5b-npu.bin`

**原因**: QNN 模型未转换或路径错误

**解决**:
```bash
# 1. 检查模型文件
dir backend\models\qnn\qwen2-1.5b.bin

# 2. 如果不存在,重新转换
cd backend\models
python convert_to_qnn_on_aipc.py

# 3. 验证模型
python -c "import qai_appbuilder; model = qai_appbuilder.load_model('models/qnn/qwen2-1.5b.bin', device='NPU'); print('✓ 模型加载成功')"
```

### Q2: 模型加载失败

**错误**: `RuntimeError: 模型加载失败`

**原因**: 模型文件损坏或格式不正确

**解决**:
```bash
# 1. 重新转换模型
cd backend\models
python convert_to_qnn_on_aipc.py

# 2. 如果转换失败,重新下载 Hugging Face 模型
cd backend
python model_converter.py --model qwen2-1.5b --output ./models
```

### Q3: NPU 推理延迟过高

**错误**: 推理延迟 > 500ms

**原因**: 模型未量化或输入过长

**解决**:
```bash
# 1. 检查模型是否量化
# 确保使用 INT8 量化模型
# models/onnx/qwen2-1.5b_quantized.onnx

# 2. 减小输入长度
# 默认 128 tokens,可减小到 64

# 3. 运行基准测试
curl http://localhost:8000/api/performance/benchmark
```

---

## 性能问题

### Q1: 页面加载缓慢

**原因**: 构建文件过大或网络问题

**解决**:
```bash
# 1. 清理构建缓存
rm -rf dist

# 2. 使用生产构建
pnpm run build

# 3. 检查网络
# 使用本地网络,避免 VPN
```

### Q2: 推理响应慢

**原因**: 模型未预热或系统负载高

**解决**:
```bash
# 1. 增加预热次数
# backend/main.py
for _ in range(5):  # 3 → 5 次
    current_model.infer(input_ids=input_ids)

# 2. 检查系统负载
# 关闭不必要的应用程序

# 3. 使用 Burst 模式
# backend/config.py
QNN_BACKEND = "QNN"
```

### Q3: 内存占用过高

**错误**: `RuntimeError: 内存不足`

**原因**: 模型太大或批处理过大

**解决**:
```bash
# 1. 减小批处理
batch_size = 1  # 端侧推荐

# 2. 释放内存
import torch
torch.cuda.empty_cache()

# 3. 使用更小的模型
# Qwen2-0.5B (如 Qwen2-1.5B 内存不足)
```

---

## 数据问题

### Q1: 文件上传失败

**错误**: `413 Payload Too Large`

**原因**: 文件过大 (超过 10MB)

**解决**:
```bash
# 1. 减小文件大小
# 压缩或分割文件

# 2. 增加上传限制
# backend/config.py
MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024  # 20MB

# 3. 重启后端
python main.py
```

### Q2: 数据文件无法读取

**错误**: `FileNotFoundError`

**原因**: 文件路径错误或文件不存在

**解决**:
```bash
# 1. 检查文件路径
dir backend\data\uploads\

# 2. 重新上传文件

# 3. 检查文件权限
# 确保有读取权限
```

### Q3: 数据分析无结果

**错误**: 分析返回空结果

**原因**: 模型未加载或数据格式错误

**解决**:
```bash
# 1. 检查模型是否加载
curl http://localhost:8000/api/health

# 2. 检查数据格式
# 确保是 CSV/JSON 格式

# 3. 查看后端日志
# backend/logs/app.log
```

---

## 调试技巧

### 1. 查看日志

```bash
# 后端日志
cd backend
tail -f logs/app.log

# 前端控制台
# 浏览器开发者工具 → Console
```

### 2. 检查网络

```bash
# 检查端口占用
netstat -ano | findstr LISTENING

# 检查连接
netstat -ano | findstr ESTABLISHED
```

### 3. 测试 API

```bash
# 健康检查
curl http://localhost:8000/api/health

# 性能测试
curl http://localhost:8000/api/performance/benchmark

# 数据分析
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "测试", "data_source": "local"}'
```

### 4. 验证配置

```bash
# 运行合规性验证
python backend/verify_compliance.py

# 检查配置
python -c "from backend.config import settings; print(settings)"
```

---

## 获取帮助

### 日志位置

- **后端日志**: `backend/logs/app.log`
- **前端日志**: 浏览器开发者工具 → Console
- **基准测试**: `.benchmarks/` 目录

### 相关文档

- [NPU 集成方案](../.specs/npu-integration.md)
- [模型部署规范](../.specs/model-deployment.md)
- [端侧隐私合规](../.specs/privacy-compliance.md)
- [API 接口规范](../.specs/api-spec.md)

### 技术支持

- 高通开发者论坛: https://bbs.csdn.net/forums/qualcomm
- QAI AppBuilder 文档: 资料/ai-engine-direct-helper/
- 项目 GitHub: https://github.com/anbeime/antinet

---

## 总结

故障排查指南:

1. **安装问题**: Python 版本、pnpm、QAI AppBuilder
2. **后端问题**: 端口占用、连接失败、CORS
3. **前端问题**: 依赖未安装、后端连接、Tailwind
4. **NPU 模型问题**: 模型文件、加载失败、延迟过高
5. **性能问题**: 页面加载、推理响应、内存占用
6. **数据问题**: 文件上传、文件读取、分析结果

**调试技巧**:

- ✅ 查看日志
- ✅ 检查网络
- ✅ 测试 API
- ✅ 验证配置
