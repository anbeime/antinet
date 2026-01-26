# GLM-4.7-Flash 集成方案

## 📊 模型概述

**GLM-4.7-Flash** 是智谱 AI 最新发布的高性能模型：
- **架构**: 30B-A3B MoE（总参数30B，激活参数3B）
- **性能**: 20-30B 参数范围内最强
- **速度**: API 调用约 27 tokens/s
- **价格**: **免费调用**（普通用户并发量为1）

---

## 🚀 方案1: API 调用（推荐）

### 优势
- **完全免费**
- **无需本地资源**
- **即开即用**
- **27 tokens/s 速度**
- **支持深度思考模式**

### 安装依赖

```bash
pip install zai-sdk
```

### 获取 API Key

1. 访问智谱官网: https://docs.bigmodel.cn
2. 注册并实名验证
3. 获取 API Key

### 集成到 Antinet

#### 1. 更新 requirements.txt

```bash
# 添加到 backend/requirements.txt
zai-sdk>=1.0.0
```

#### 2. 创建 GLM-4.7-Flash 适配器

```python
# backend/models/glm_flash_adapter.py
"""
GLM-4.7-Flash 模型适配器
支持智谱 API 调用
"""
from zai import ZhipuAiClient
from typing import Optional, Dict, Any, Iterator
import logging

logger = logging.getLogger(__name__)


class GLMFlashAdapter:
    """GLM-4.7-Flash 模型适配器"""
    
    def __init__(self, api_key: str):
        """
        初始化适配器
        
        Args:
            api_key: 智谱 API Key
        """
        self.client = ZhipuAiClient(api_key=api_key)
        self.model = "glm-4.7-flash"
        logger.info(f"✓ GLM-4.7-Flash 适配器初始化完成")
    
    def infer(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        thinking: bool = False,
        stream: bool = False
    ) -> str:
        """
        执行推理
        
        Args:
            prompt: 输入提示
            max_tokens: 最大输出 tokens
            temperature: 温度参数（0-1）
            thinking: 是否启用深度思考模式
            stream: 是否流式输出
            
        Returns:
            模型输出文本
        """
        messages = [{"role": "user", "content": prompt}]
        
        # 构建请求参数
        params = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        # 启用深度思考模式
        if thinking:
            params["thinking"] = {"type": "enabled"}
        
        # 流式输出
        if stream:
            params["stream"] = True
            return self._stream_infer(params)
        
        # 非流式输出
        try:
            response = self.client.chat.completions.create(**params)
            result = response.choices[0].message.content
            logger.info(f"✓ GLM-4.7-Flash 推理完成，输出长度: {len(result)}")
            return result
        except Exception as e:
            logger.error(f"✗ GLM-4.7-Flash 推理失败: {e}")
            raise
    
    def _stream_infer(self, params: Dict[str, Any]) -> Iterator[str]:
        """
        流式推理
        
        Args:
            params: 请求参数
            
        Yields:
            输出文本片段
        """
        try:
            response = self.client.chat.completions.create(**params)
            
            for chunk in response:
                # 思考内容
                if chunk.choices[0].delta.reasoning_content:
                    yield chunk.choices[0].delta.reasoning_content
                
                # 输出内容
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"✗ GLM-4.7-Flash 流式推理失败: {e}")
            raise
    
    def batch_infer(
        self,
        prompts: list[str],
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> list[str]:
        """
        批量推理
        
        Args:
            prompts: 输入提示列表
            max_tokens: 最大输出 tokens
            temperature: 温度参数
            
        Returns:
            输出文本列表
        """
        results = []
        for prompt in prompts:
            result = self.infer(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            results.append(result)
        
        return results
```

#### 3. 更新配置文件

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... 现有配置 ...
    
    # GLM-4.7-Flash 配置
    GLM_FLASH_API_KEY: str = ""  # 从环境变量读取
    GLM_FLASH_ENABLED: bool = False  # 是否启用 GLM-4.7-Flash
    
    # 模型选择
    USE_NPU: bool = True  # True: 使用 NPU, False: 使用 API
    
    class Config:
        env_file = ".env"
```

#### 4. 创建 .env 文件

```bash
# backend/.env
GLM_FLASH_API_KEY=your-api-key-here
GLM_FLASH_ENABLED=true
USE_NPU=false
```

#### 5. 更新模型加载器

```python
# backend/models/model_loader.py
from backend.models.glm_flash_adapter import GLMFlashAdapter
from backend.config import settings

def get_model_loader():
    """获取模型加载器（支持 NPU 和 API）"""
    
    # 如果启用 GLM-4.7-Flash API
    if settings.GLM_FLASH_ENABLED and not settings.USE_NPU:
        logger.info("使用 GLM-4.7-Flash API")
        return GLMFlashAdapter(api_key=settings.GLM_FLASH_API_KEY)
    
    # 否则使用 NPU
    logger.info("使用 NPU 模型")
    return NPUModelLoader()
```

#### 6. 更新 API 路由

```python
# backend/routes/npu_routes.py
@router.post("/api/npu/infer")
async def npu_infer(request: InferRequest):
    """
    NPU/API 推理接口
    自动选择 NPU 或 GLM-4.7-Flash API
    """
    try:
        loader = get_model_loader()
        
        # 执行推理
        result = loader.infer(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return {
            "success": True,
            "result": result,
            "model": "glm-4.7-flash" if settings.GLM_FLASH_ENABLED else "qwen2-7b-ssd"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🖥️ 方案2: 本地部署（Ollama）

### 系统要求
- **显存**: 24GB（4位量化）
- **内存**: 16GB+
- **Ollama**: v0.14.3+

### 安装步骤

#### 1. 安装 Ollama 预览版

```bash
# 下载 Ollama v0.14.3
# https://github.com/ollama/ollama/releases/tag/v0.14.3
```

#### 2. 下载模型

```bash
# 4位量化版本（推荐）
ollama pull glm-4.7-flash:latest

# 8位量化版本
ollama pull glm-4.7-flash:8b

# 原始16位版本
ollama pull glm-4.7-flash:16b
```

#### 3. 启动服务

```bash
ollama serve
```

#### 4. 测试推理

```bash
ollama run glm-4.7-flash "你好，请介绍一下自己"
```

### 集成到 Antinet

#### 创建 Ollama 适配器

```python
# backend/models/ollama_adapter.py
"""
Ollama 本地模型适配器
支持 GLM-4.7-Flash 本地部署
"""
import requests
import logging

logger = logging.getLogger(__name__)


class OllamaAdapter:
    """Ollama 本地模型适配器"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        """
        初始化适配器
        
        Args:
            base_url: Ollama 服务地址
        """
        self.base_url = base_url
        self.model = "glm-4.7-flash"
        logger.info(f"✓ Ollama 适配器初始化完成")
    
    def infer(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        stream: bool = False
    ) -> str:
        """
        执行推理
        
        Args:
            prompt: 输入提示
            max_tokens: 最大输出 tokens
            temperature: 温度参数
            stream: 是否流式输出
            
        Returns:
            模型输出文本
        """
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            if stream:
                return self._handle_stream(response)
            else:
                result = response.json()["response"]
                logger.info(f"✓ Ollama 推理完成，输出长度: {len(result)}")
                return result
                
        except Exception as e:
            logger.error(f"✗ Ollama 推理失败: {e}")
            raise
    
    def _handle_stream(self, response):
        """处理流式响应"""
        full_response = ""
        for line in response.iter_lines():
            if line:
                data = line.decode('utf-8')
                import json
                chunk = json.loads(data)
                if "response" in chunk:
                    full_response += chunk["response"]
        return full_response
```

---

## 📊 方案对比

| 特性 | API 调用 | NPU 部署 | Ollama 本地 |
|------|----------|----------|-------------|
| **成本** | 免费 | 一次性硬件 | 一次性硬件 |
| **速度** | 27 tokens/s | ~450ms | 取决于硬件 |
| **隐私** | 数据上传 | 完全本地 | 完全本地 |
| **显存要求** | 无 | 无 | 24GB |
| **部署难度** | 简单 | 中等 | 简单 |
| **稳定性** | 依赖网络 | 高 | 高 |
| **并发** | 1 | 无限制 | 无限制 |

---

## 🎯 推荐方案

### 开发阶段
**使用 GLM-4.7-Flash API**
- 免费
- 快速部署
- 无需硬件

### 生产阶段
**使用 NPU 部署**
- 数据不出域
- 低延迟
- 无并发限制
- 符合比赛要求

### 混合方案
**NPU + API 双模式**
- NPU 处理核心任务
- API 处理非敏感任务
- 灵活切换

---

## 🔧 实施步骤

### 第1步: 安装依赖
```bash
cd C:\test\antinet\backend
pip install zai-sdk
```

### 第2步: 获取 API Key
访问 https://docs.bigmodel.cn 注册并获取

### 第3步: 配置环境变量
创建 `backend/.env`:
```
GLM_FLASH_API_KEY=your-api-key-here
GLM_FLASH_ENABLED=true
USE_NPU=false
```

### 第4步: 创建适配器
复制上面的 `glm_flash_adapter.py` 代码

### 第5步: 更新配置
修改 `config.py` 和 `model_loader.py`

### 第6步: 测试
```bash
python -c "from models.glm_flash_adapter import GLMFlashAdapter; adapter = GLMFlashAdapter('your-api-key'); print(adapter.infer('你好'))"
```

---

## 📈 性能对比

### GLM-4.7-Flash API
- **延迟**: ~37ms (27 tokens/s)
- **吞吐**: 27 tokens/s
- **并发**: 1

### NPU (Qwen2-7B-SSD)
- **延迟**: ~450ms
- **吞吐**: 取决于 token 长度
- **并发**: 无限制

### 建议
- **实时对话**: 使用 API（更快）
- **批量分析**: 使用 NPU（更稳定）
- **敏感数据**: 必须使用 NPU

---

## 🎓 深度思考模式

GLM-4.7-Flash 支持**深度思考模式**，适合复杂推理任务：

```python
response = client.chat.completions.create(
    model="glm-4.7-flash",
    messages=[{"role": "user", "content": "分析这个数据趋势"}],
    thinking={"type": "enabled"},  # 启用深度思考
    max_tokens=65536,
    temperature=1.0
)
```

### 适用场景
- 🧠 复杂数据分析
- 🔍 风险识别
-  策略建议
- 📊 趋势预测

---

##  总结

### 立即可用
1. 安装 `zai-sdk`
2. 获取 API Key
3. 配置环境变量
4. 开始使用

### 优势
- **完全免费**
- **性能强大**（20-30B 最强）
- **速度快**（27 tokens/s）
- **支持深度思考**
- **易于集成**

### 下一步
1. 集成到 Antinet 8-Agent 系统
2. 对比 NPU 和 API 性能
3. 实现智能切换机制
4. 优化推理速度

---

**创建时间**: 2026-01-26  
**模型版本**: GLM-4.7-Flash  
**状态**: 可立即部署
