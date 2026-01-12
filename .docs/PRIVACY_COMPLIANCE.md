# 端侧隐私合规

## 概述

Antinet 智能知识管理系统严格遵守数据不出域原则,所有数据处理在本地 AIPC 完成,确保用户隐私和商业数据安全。

## 隐私合规声明

### 核心承诺

1. **数据不出域**: 所有数据处理在本地完成,不传输到云端
2. **本地存储**: 数据文件保存到本地目录
3. **无云端调用**: 不使用任何云端 AI 服务或数据分析服务
4. **模型本地部署**: AI 模型 (Qwen2-1.5B) 本地部署到 NPU
5. **隐私保护**: 不记录用户查询历史,不上传分析结果

## 技术实现

### 1. 配置验证

```python
# backend/config.py
class Settings(BaseSettings):
    # 安全配置
    DATA_STAYS_LOCAL: bool = True  # 数据不出域 (强制要求)

    # 数据配置
    DATA_DIR: Path = Path("./data")
    DB_PATH: Path = Path("./data/antinet.db")
```

**验证**:

```python
from backend.config import settings

assert settings.DATA_STAYS_LOCAL is True
print("✓ 数据不出域配置正确")
```

### 2. 数据上传接口

#### 本地存储

```python
@app.post("/api/data/upload")
async def upload_data(file: UploadFile = File(...)):
    """数据上传接口 - 本地化处理"""

    # 读取文件
    contents = await file.read()

    # 保存到本地
    upload_path = settings.DATA_DIR / "uploads" / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, 'wb') as f:
        f.write(contents)

    logger.info(f"✓ 文件已保存到本地: {upload_path}")

    return {
        "filename": file.filename,
        "saved_path": str(upload_path),
        "data_stays_local": True  # 强调数据不出域
    }
```

### 3. 无云端 API 调用

#### 代码审查

**禁止模式**:

```python
# ❌ 禁止: 云端 API 调用
import openai
response = openai.ChatCompletion.create(...)

# ❌ 禁止: 第三方数据分析
import requests
requests.post("https://api.anthropic.com/v1/messages", ...)
```

**允许模式**:

```python
# ✅ 允许: 本地 NPU 推理
import qai_appbuilder as qai
model = qai.load_model("models/qnn/qwen2-1.5b.bin", device="NPU")
output = model.infer(input_ids=input_ids)

# ✅ 允许: 本地数据处理
import pandas as pd
df = pd.read_csv("data/uploads/sales_data.csv")
```

### 4. 模型本地部署

#### 模型位置

```
backend/models/
├── pytorch/qwen2-1.5b/        # PyTorch 模型 (本地)
├── onnx/qwen2-1.5b.onnx       # ONNX 模型 (本地)
├── onnx/qwen2-1.5b_quantized.onnx  # 量化模型 (本地)
└── qnn/qwen2-1.5b.bin         # QNN 模型 (本地, NPU 使用)
```

#### 模型加载

```python
def load_model_if_needed():
    """按需加载本地模型"""

    # 加载本地模型
    import qai_appbuilder as qai

    model = qai.load_model(
        str(settings.MODEL_PATH),
        device=settings.QNN_DEVICE  # "NPU"
    )

    logger.info(f"✓ 模型加载成功 (设备: {settings.QNN_DEVICE})")
    return model
```

## 安全措施

### 1. 文件系统安全

#### 数据目录权限

```python
# 确保目录权限正确
DATA_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
```

#### 文件上传限制

```python
# 限制文件大小
MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

# 限制文件类型
ALLOWED_EXTENSIONS = [".csv", ".json", ".xlsx", ".txt"]
```

### 2. 网络安全

#### CORS 配置

```python
# 仅允许本地访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 防火墙配置

```powershell
# 仅允许本地访问
New-NetFirewallRule -DisplayName "Antinet Backend" `
  -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow `
  -LocalAddress "127.0.0.1,::1"
```

### 3. 敏感信息保护

#### 环境变量

```python
# .env 文件 (不提交到 Git)
DATA_STAYS_LOCAL=True
API_KEY=your-api-key
ENCRYPTION_KEY=your-encryption-key
```

#### .gitignore

```
# 敏感信息
.env
*.key
*.pem

# 模型文件 (大文件)
backend/models/pytorch/
backend/models/onnx/
backend/models/qnn/*.bin
```

## 合规验证

### 自动化验证

```bash
# 运行合规性验证脚本
python backend/verify_compliance.py
```

**验证项**:

- ✅ DATA_STAYS_LOCAL = True
- ✅ 数据目录存在
- ✅ 无云端 API 调用
- ✅ 模型本地部署

### 手动验证

#### API 响应检查

```bash
# 健康检查
curl http://localhost:8000/api/health

# 预期响应
{
  "status": "healthy",
  "model": "qwen2-1.5b",
  "model_loaded": true,
  "device": "NPU",
  "data_stays_local": true  # ← 必须为 true
}
```

#### 网络监控

```bash
# 监控网络连接
netstat -ano | findstr LISTENING

# 应该只看到本地端口
# - 3000 (前端)
# - 8000 (后端)
```

## 隐私保护最佳实践

### 1. 数据最小化

- ✅ 只上传必要的数据
- ✅ 及时清理临时文件
- ✅ 不记录敏感信息到日志

### 2. 数据加密

- ✅ 本地数据库加密
- ✅ 敏感字段加密存储
- ✅ 传输加密 (HTTPS/TLS)

### 3. 访问控制

- ✅ 本地访问限制
- ✅ 用户认证 (如需要)
- ✅ 权限管理

### 4. 审计日志

- ✅ 记录数据访问
- ✅ 记录文件上传/下载
- ✅ 定期审计日志

## 合规标准

### GDPR 合规

- ✅ 数据处理透明化
- ✅ 用户数据控制权
- ✅ 数据最小化原则
- ✅ 端侧数据处理

### 《个人信息保护法》合规

- ✅ 明确告知数据处理目的
- ✅ 获得用户同意
- ✅ 采取安全措施
- ✅ 端侧存储和处理

### 高通 AIPC 赛道要求

- ✅ 数据不出域
- ✅ 端侧执行
- ✅ 无云端调用
- ✅ 模型本地部署

## 常见问题

### Q1: 数据是否上传到云端？

**答**: 否。所有数据处理在本地 AIPC 完成,数据文件保存在 `backend/data/uploads/` 目录。

### Q2: AI 模型是否使用云端服务？

**答**: 否。AI 模型 (Qwen2-1.5B) 本地部署到骁龙 NPU,推理在本地完成。

### Q3: 是否记录用户查询历史？

**答**: 否。系统不记录用户查询历史,不上传分析结果。

### Q4: 如何验证数据不出域？

**答**:
1. 运行 `python backend/verify_compliance.py`
2. 检查 `/api/health` 返回 `data_stays_local: true`
3. 监控网络连接 (应无外部连接)
4. 检查日志 (无云端 API 调用)

## 总结

端侧隐私合规:

1. **核心承诺**: 数据不出域,本地处理,隐私保护
2. **技术实现**: 配置验证、本地存储、无云端调用、模型本地部署
3. **安全措施**: 文件系统安全、网络安全、敏感信息保护
4. **合规验证**: 自动化验证 + 手动验证
5. **最佳实践**: 数据最小化、数据加密、访问控制、审计日志
6. **合规标准**: GDPR、《个人信息保护法》、高通 AIPC 赛道要求

**核心原则**: 所有数据处理在本地完成,数据不出域,确保用户隐私和商业数据安全。
