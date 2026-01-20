# AIPC NPU快速启动

## 环境
- **模型**: C:\model\Qwen2.0-7B-SSD-8380-2.34
- **GenieLLM**: C:\ai-engine-direct-helper\samples\genie\python\ChainUtils.py
- **后端**: c:\test\antinet\backend
- **前端**: c:\test\antinet

## 启动方式

### 1. 启动后端
```bash
cd c:\test\antinet\backend
set PYTHONPATH=C:\ai-engine-direct-helper\samples\genie\python;%PYTHONPATH%
python main.py
```

### 2. 启动前端（新终端）
```bash
cd c:\test\antinet
pnpm dev
```

### 3. 访问
- 前端: http://localhost:3000
- NPU分析: http://localhost:3000/npu-analysis

## 后端配置

backend/models/model_loader.py 应该使用:
```python
import sys
sys.path.append("C:\\ai-engine-direct-helper\\samples\\genie\\python")
from ChainUtils import GenieLLM
```

## 功能目标
1. 知识卡片管理 - 已实现，前端功能
2. NPU智能分析 - 使用GenieLLM进行真实推理
3. 四色卡片生成 - 基于NPU推理结果
4. 性能监控 - NPU使用率、推理时间

## 故障排查
如果GenieLLM导入失败，检查PYTHONPATH是否包含genie/python目录。
