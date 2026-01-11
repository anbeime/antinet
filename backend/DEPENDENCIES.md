# 远程AIPC依赖库安装指南

## 📦 依赖库分类

### 1️⃣ 必需依赖（运行后端API必须安装）

这些库在 `requirements.txt` 中，**必须在AIPC上安装**：

```bash
# 在AIPC上运行
cd C:\D\compet\xiaolong\backend
pip install -r requirements.txt
```

包含：
- `fastapi==0.109.0` - Web框架
- `uvicorn[standard]==0.27.0` - ASGI服务器
- `pydantic==2.5.3` - 数据验证
- `numpy==1.26.3` - 数组计算
- `pandas==2.2.0` - 数据处理
- `onnx==1.15.0` - ONNX模型支持
- `onnxruntime==1.17.0` - ONNX推理
- 其他工具库（详见requirements.txt）

### 2️⃣ QAI AppBuilder（NPU推理核心库）

**必须手动安装whl文件**：

```bash
# 在AIPC上运行
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
```

或者使用项目下载的版本：
```bash
pip install "C:\D\compet\xiaolong\资料参考\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

**验证安装**：
```bash
python -c "import qai_appbuilder as qai; print('QAI AppBuilder已安装')"
```

### 3️⃣ 可选依赖（仅在AIPC上做模型转换时需要）

如果你要在AIPC上运行完整的模型转换流程（从Hugging Face下载 → 转ONNX → 转QNN），需要额外安装：

```bash
# 可选：模型转换依赖
pip install transformers==4.36.0
pip install torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

**注意**：
- 这些库文件很大（torch约200MB，transformers约10MB）
- 如果你已经在本地转换好了ONNX模型，**不需要在AIPC上安装这些**
- 只需把转换好的 `.onnx` 文件复制到AIPC，然后用QAI AppBuilder转QNN即可

---

## 🚀 推荐安装流程

### 方案A：在AIPC上完整转换（适合首次部署）

```bash
# 步骤1: 克隆代码
cd C:\
git clone https://github.com/anbeime/antinet.git
cd antinet\backend

# 步骤2: 安装基础依赖
pip install -r requirements.txt

# 步骤3: 安装QAI AppBuilder
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 步骤4: 安装模型转换依赖（可选）
pip install transformers torch --index-url https://download.pytorch.org/whl/cpu

# 步骤5: 运行模型转换
python model_converter.py --model qwen2-1.5b

# 步骤6: 在AIPC上完成QNN转换
cd models
python convert_to_qnn_on_aipc.py

# 步骤7: 启动后端服务
cd ..
python main.py
```

### 方案B：只在AIPC上做QNN转换（推荐，节省时间）

如果你在本地已经有了ONNX模型：

```bash
# 步骤1: 克隆代码
cd C:\
git clone https://github.com/anbeime/antinet.git
cd antinet\backend

# 步骤2: 安装必需依赖
pip install -r requirements.txt

# 步骤3: 安装QAI AppBuilder
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 步骤4: 复制ONNX模型到AIPC（通过磁盘重定向）
# 将本地的 models/onnx/qwen2-1.5b_quantized.onnx 复制到 C:\antinet\backend\models\onnx\

# 步骤5: 转换为QNN格式
cd models
python convert_to_qnn_on_aipc.py

# 步骤6: 启动后端服务
cd ..
python main.py
```

---

## ✅ 依赖检查清单

在启动后端服务前，运行此检查脚本：

```bash
python -c "
import sys
print('Python版本:', sys.version)

# 检查必需库
required = ['fastapi', 'uvicorn', 'numpy', 'pandas', 'onnx', 'onnxruntime']
for lib in required:
    try:
        __import__(lib)
        print(f'✓ {lib}')
    except ImportError:
        print(f'✗ {lib} 未安装')

# 检查QAI AppBuilder
try:
    import qai_appbuilder as qai
    print('✓ qai_appbuilder (NPU核心库)')
except ImportError:
    print('✗ qai_appbuilder 未安装 - 请安装whl文件')

# 检查可选库
optional = ['transformers', 'torch']
print('\\n可选库（仅模型转换需要）:')
for lib in optional:
    try:
        __import__(lib)
        print(f'✓ {lib}')
    except ImportError:
        print(f'- {lib} 未安装（不影响运行）')
"
```

---

## 🔍 常见问题

### Q1: 安装requirements.txt时出现网络错误？
```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q2: QAI AppBuilder安装失败？
```bash
# 检查Python版本（必须是3.12）
python --version

# 检查whl文件是否存在
dir C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl
```

### Q3: torch安装太慢？
```bash
# 使用CPU版本（更小更快）
pip install torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu

# 或者跳过torch，在本地转换ONNX后再上传
```

### Q4: 如何验证NPU是否正常工作？
```bash
cd backend/models
python deploy.py
# 应该显示 "✓ 模型加载成功" 和推理延迟
```

---

## 📊 磁盘空间需求

- 基础依赖（requirements.txt）：约150MB
- QAI AppBuilder（whl）：约4MB
- 模型文件（ONNX）：约3GB
- 模型文件（QNN）：约800MB
- 可选依赖（torch + transformers）：约250MB

**总计**：约4-5GB（不包含可选依赖）

---

## 🎯 最小化安装（仅运行后端）

如果你只想运行后端服务，不做模型转换：

```bash
# 1. 安装核心依赖
pip install fastapi uvicorn numpy pandas onnx onnxruntime python-multipart aiofiles python-dotenv

# 2. 安装QAI AppBuilder
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 3. 把已转换好的QNN模型（.bin文件）复制到 backend/models/qnn/
# 4. 启动服务
python main.py
```

**总大小**：约160MB（不包含模型文件）
