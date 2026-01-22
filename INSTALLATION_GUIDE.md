# Antinet 智能知识管家 - 安装指南

## 概述

本文档提供在 AIPC 上部署 Antinet 智能知识管家所需的依赖安装指南。针对无管理员权限用户，提供虚拟环境和用户级安装方案。

## 系统要求

- Windows 10/11 (arm64)
- Python 3.12
- 高通骁龙 X Elite/Plus 平台 NPU 驱动
- 至少 16GB RAM

## 必需依赖包

### 1. 基础 Web 框架
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
```

### 2. AI 推理相关
```
onnx==1.15.0
onnxruntime==1.17.0
```

### 3. 数据处理
```
numpy==1.26.3
pandas==2.2.0
duckdb==0.10.0
```

### 4. 工具库
```
python-multipart==0.0.6
aiofiles==23.2.1
python-dotenv>=1.0.0
```

### 5. 数据库
```
sqlalchemy==2.0.25
```

### 6. 日志
```
loguru==0.7.2
```

### 7. QAI AppBuilder (特殊依赖)
需要从本地 .whl 文件安装：
```
C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

## 安装方法

### 方案一：虚拟环境（推荐）
无需管理员权限，隔离环境。

```powershell
# 1. 创建虚拟环境
python -m venv venv

# 2. 激活虚拟环境
.\venv\Scripts\Activate

# 3. 升级 pip
python -m pip install --upgrade pip

# 4. 安装必需依赖
pip install -r backend/requirements.txt

# 5. 安装 QAI AppBuilder
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 方案二：用户级安装
使用 `--user` 标志安装到用户目录。

```powershell
# 安装必需依赖
python -m pip install --user -r backend/requirements.txt

# 安装 QAI AppBuilder
python -m pip install --user "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 方案三：直接安装（如有管理员权限）
```powershell
pip install -r backend/requirements.txt
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

## 模型转换（如需）

如果已有 ONNX 模型需要转换为 QNN 格式：

```powershell
cd backend/models
python convert_to_qnn_on_aipc.py
```

转换过程需要以下可选依赖：
```
transformers==4.36.0
torch==2.1.2
```

安装可选依赖：
```powershell
pip install transformers==4.36.0
pip install torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

## 验证安装

### 1. 检查 Python 包
```powershell
pip list | findstr "fastapi uvicorn onnxruntime qai_appbuilder"
```

应显示版本信息。

### 2. 测试导入
```python
import fastapi
import uvicorn
import onnxruntime
import qai_appbuilder
print("✓ 所有必需包导入成功")
```

### 3. 测试模型加载
```powershell
cd backend
python -c "from models.model_loader import NPUModelLoader; loader = NPUModelLoader(); model = loader.load(); print('模型加载成功:', loader.is_loaded)"
```

预期输出：`模型加载成功: True`

## 故障排除

### 问题：`model_loaded: False` 但模型实际已加载

**症状**：前端显示"模拟模式"，但后端日志显示模型加载成功。

**原因**：`_global_model_loader.is_loaded` 标志未正确设置。

**解决方案**：

1. 手动修复（临时）：
```python
# 在 Python 交互环境中执行
import sys
sys.path.append('backend')
from models.model_loader import _global_model_loader
if _global_model_loader and _global_model_loader.model is not None:
    _global_model_loader.is_loaded = True
    print("已手动设置 is_loaded=True")
```

2. 永久修复：
编辑 `backend/models/model_loader.py` 中的 `load` 方法，确保在成功加载后设置 `self.is_loaded = True`。

### 问题：无法导入 qai_appbuilder

**症状**：`ImportError: cannot import name 'GenieContext' from 'qai_appbuilder'`

**原因**：QAI AppBuilder 未正确安装。

**解决方案**：
1. 确认 .whl 文件路径正确
2. 使用完整路径安装：`pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"`
3. 检查 Python 版本匹配（3.12）

### 问题：DLL 加载失败

**症状**：`DspTransport.openSession qnn_open failed, 0x80000406`

**原因**：NPU 运行时库路径未正确设置。

**解决方案**：
1. 确认以下目录存在于 PATH 环境变量：
   - `C:\ai-engine-direct-helper\samples\qai_libs`
   - `C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc`
2. 重启终端或 IDE 使 PATH 生效

## 部署步骤总结

1. **安装依赖**：使用虚拟环境或用户级安装
2. **安装 QAI AppBuilder**：从本地 .whl 文件安装
3. **转换模型**（如需）：运行转换脚本
4. **启动后端**：`cd backend && python main.py`
5. **启动前端**：`npm run dev`
6. **验证**：访问 `http://localhost:3000`，检查 NPU 状态

## 支持

如遇问题，请检查：
- 后端日志 `backend.log`
- 系统 PATH 环境变量
- Python 版本和包版本兼容性
- NPU 驱动状态

---
*文档版本：1.0 | 更新日期：2026-01-21*