# Antinet 智能知识管家 - 安装指南

## 概述

本文档提供在 AIPC 上部署 Antinet 智能知识管家所需的依赖安装指南。针对无管理员权限用户，提供虚拟环境和用户级安装方案。

## 系统要求

- Windows 10/11 (arm64)
- Python 3.12
- 高通骁龙 X Elite/Plus 平台 NPU 驱动
- 至少 16GB RAM
- Node.js 18+ (用于前端)

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
python -m venv venv_arm64

# 2. 激活虚拟环境
.\venv_arm64\Scripts\Activate

# 3. 升级 pip
python -m pip install --upgrade pip

# 4. 安装后端依赖
cd data-analysis-iteration
pip install -r requirements.txt
cd ..

# 5. 安装前端依赖
npm install

# 6. 安装 QAI AppBuilder
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 方案二：用户级安装
使用 `--user` 标志安装到用户目录。

```powershell
# 安装后端依赖
python -m pip install --user -r data-analysis-iteration/requirements.txt

# 安装前端依赖
npm install

# 安装 QAI AppBuilder
python -m pip install --user "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 方案三：直接安装（如有管理员权限）
```powershell
cd data-analysis-iteration
pip install -r requirements.txt
cd ..
npm install
pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

## 前端依赖安装

```powershell
npm install
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
cd data-analysis-iteration
python -c "import qai_hub; print('NPU SDK OK')"
```

预期输出：`NPU SDK OK`

## 故障排除

### 问题：NPU SDK未找到

**症状**：启动时报错 `NPU SDK未安装或不可用！`

**解决方案**：
1. 确认已安装 qai_appbuilder：`pip show qai_appbuilder`
2. 如未安装，运行：`pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"`
3. 检查 NPU 驱动是否已安装
4. 重启终端或 IDE

### 问题：无法导入 qai_appbuilder

**症状**：`ImportError: cannot import name 'GenieContext' from 'qai_appbuilder'`

**原因**：QAI AppBuilder 未正确安装。

**解决方案**：
1. 确认 .whl 文件路径正确
2. 使用完整路径安装：`pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"`
3. 检查 Python 版本匹配（3.12）
4. 确保已激活正确的虚拟环境（`venv_arm64`）

### 问题：前端启动失败

**症状**：`npm run dev` 报错

**解决方案**：
1. 确认已安装 Node.js 18+：`node --version`
2. 删除 node_modules 重新安装：`rm -rf node_modules && npm install`
3. 检查端口 3000 是否被占用

### 问题：后端启动失败

**症状**：`python main.py` 报错

**解决方案**：
1. 确认已激活虚拟环境：`.\venv_arm64\Scripts\Activate`
2. 检查依赖是否完整：`pip list`
3. 查看错误日志：检查 `data-analysis-iteration/logs/` 目录

### 问题：DLL 加载失败

**症状**：`DspTransport.openSession qnn_open failed, 0x80000406`

**原因**：NPU 运行时库路径未正确设置。

**解决方案**：
1. 确认以下目录存在于 PATH 环境变量：
   - `C:\ai-engine-direct-helper\samples\qai_libs`
   - `C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc`
2. 重启终端或 IDE 使 PATH 生效

## 部署步骤总结

1. **安装依赖**：使用虚拟环境或用户级安装（backend + frontend）
2. **安装 QAI AppBuilder**：从本地 .whl 文件安装
3. **转换模型**（如需）：运行转换脚本
4. **一键启动**：双击 `start_simple.bat`
   - 或手动启动：
     - 后端：`cd data-analysis-iteration && python main.py`
     - 前端：`npm run dev`
5. **验证**：访问 `http://localhost:3000`，检查 NPU 状态

## 启动方式

### 方式一：一键启动（推荐）
双击项目根目录下的 `start_simple.bat`，自动启动前后端。

### 方式二：手动启动

**启动后端**：
```powershell
.\venv_arm64\Scripts\Activate
cd data-analysis-iteration
python main.py
```

**启动前端**（新开一个终端）：
```powershell
npm run dev
```

## 支持

如遇问题，请检查：
- 后端日志：`data-analysis-iteration/logs/`
- 前端控制台错误
- 系统 PATH 环境变量（NPU 库路径）
- Python 版本（3.12）和包版本兼容性
- NPU 驱动状态
- 端口占用情况（8000 后端，3000 前端）

## 快速启动命令参考

```powershell
# 安装所有依赖
.\venv_arm64\Scripts\Activate
cd data-analysis-iteration
pip install -r requirements.txt
cd ..
npm install

# 启动服务（一键）
start_simple.bat

# 或手动启动
cd data-analysis-iteration
python main.py  # 后端
npm run dev     # 前端（新终端）
```

---
*文档版本：2.0 | 更新日期：2026-01-22*