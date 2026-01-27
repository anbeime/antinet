# 🚀 AntiNet AI PC - 生产环境部署指南

## ✅ 优化完成状态

**优化版本**: v3.0 (BURST Mode)  
**完成时间**: 2026-01-27  
**性能提升**: 49-56%  
**生产就绪**: ✅ 是

---

## 📊 当前性能基准

### **性能指标**

| Token 数 | 延迟 | 状态 | 吞吐量 |
|---------|------|------|--------|
| 8       | 533ms | ✅ 优秀 | ~1.9 req/s |
| 16      | 625ms | ✅ 良好 | ~1.6 req/s |
| 24      | 1747ms | ⚠️ 可接受 | ~0.6 req/s |

### **推荐配置**
- **默认 Token 数**: 16
- **最大 Token 数**: 24
- **熔断阈值**: 3000ms
- **性能模式**: BURST

---

## 🎯 应用场景配置

### **场景 1：聊天机器人（推荐）**

```python
# backend/routes/chat_routes.py
@router.post("/chat")
async def chat(message: str):
    loader = get_model_loader()
    
    # 推荐配置：16 tokens
    response = loader.infer(
        prompt=message,
        max_new_tokens=16,  # ~625ms
        temperature=0.7
    )
    
    return {"response": response}
```

**性能**：
- 延迟: ~625ms
- 用户体验: 优秀
- 适用: 快速问答、简短对话

---

### **场景 2：数据分析建议**

```python
# backend/routes/analysis_routes.py
@router.post("/analyze")
async def analyze_data(data: dict):
    loader = get_model_loader()
    
    # 分析场景：16-24 tokens
    prompt = f"分析数据: {data}"
    response = loader.infer(
        prompt=prompt,
        max_new_tokens=20,  # ~800-1000ms
        temperature=0.5
    )
    
    return {"analysis": response}
```

**性能**：
- 延迟: ~800-1000ms
- 用户体验: 良好
- 适用: 数据分析、建议生成

---

### **场景 3：知识问答**

```python
# backend/routes/knowledge_routes.py
@router.post("/qa")
async def question_answer(question: str):
    loader = get_model_loader()
    
    # 问答场景：8-16 tokens
    response = loader.infer(
        prompt=question,
        max_new_tokens=12,  # ~550-600ms
        temperature=0.3
    )
    
    return {"answer": response}
```

**性能**：
- 延迟: ~550-600ms
- 用户体验: 优秀
- 适用: 快速问答、知识检索

---

## 🔧 API 最佳实践

### **1. 动态 Token 配置**

```python
# 根据场景动态调整
def get_optimal_tokens(scenario: str) -> int:
    """根据场景返回最优 token 数"""
    token_map = {
        "quick_chat": 8,      # 533ms
        "normal_chat": 16,    # 625ms
        "analysis": 20,       # ~900ms
        "detailed": 24,       # 1747ms
    }
    return token_map.get(scenario, 16)

# 使用示例
@router.post("/smart_chat")
async def smart_chat(message: str, scenario: str = "normal_chat"):
    loader = get_model_loader()
    tokens = get_optimal_tokens(scenario)
    
    response = loader.infer(
        prompt=message,
        max_new_tokens=tokens,
        temperature=0.7
    )
    
    return {
        "response": response,
        "tokens_used": tokens,
        "scenario": scenario
    }
```

---

### **2. 性能监控**

```python
import time
import logging

logger = logging.getLogger(__name__)

def monitored_infer(loader, prompt: str, max_tokens: int):
    """带性能监控的推理"""
    start = time.time()
    
    try:
        response = loader.infer(prompt, max_new_tokens=max_tokens)
        latency = (time.time() - start) * 1000
        
        # 记录性能指标
        logger.info(f"Inference: {latency:.0f}ms, tokens: {max_tokens}")
        
        # 性能告警
        if latency > 1000:
            logger.warning(f"High latency detected: {latency:.0f}ms")
        
        return response, latency
        
    except Exception as e:
        logger.error(f"Inference failed: {e}")
        raise
```

---

### **3. 错误处理和降级**

```python
from fastapi import HTTPException

async def safe_infer(prompt: str, max_tokens: int = 16):
    """安全的推理调用，带降级策略"""
    loader = get_model_loader()
    
    try:
        # 尝试正常推理
        response = loader.infer(prompt, max_new_tokens=max_tokens)
        return response
        
    except RuntimeError as e:
        if "熔断检查失败" in str(e):
            # 降级：减少 token 数重试
            logger.warning(f"Circuit breaker triggered, retrying with fewer tokens")
            response = loader.infer(prompt, max_new_tokens=8)
            return response
        else:
            raise
            
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail="推理服务暂时不可用")
```

---

## 📈 性能优化技巧

### **1. 提示词优化**

```python
# ❌ 不推荐：冗长的提示词
prompt = "你好，我是用户，我想问你一个问题，请你帮我详细分析一下这个数据"

# ✅ 推荐：简洁的提示词
prompt = "分析数据"
```

**效果**：
- 减少输入处理时间
- 降低推理复杂度
- 提升响应速度

---

### **2. 批量推理优化**

```python
async def batch_infer(prompts: list[str], max_tokens: int = 16):
    """批量推理（串行）"""
    loader = get_model_loader()
    results = []
    
    for prompt in prompts:
        response = loader.infer(prompt, max_new_tokens=max_tokens)
        results.append(response)
    
    return results

# 使用示例
prompts = ["问题1", "问题2", "问题3"]
responses = await batch_infer(prompts, max_tokens=12)
```

**注意**：
- 当前为串行处理
- 每个请求 ~600ms
- 3个请求约 1.8s

---

### **3. 缓存策略**

```python
from functools import lru_cache
import hashlib

# 简单缓存
response_cache = {}

def cached_infer(prompt: str, max_tokens: int = 16):
    """带缓存的推理"""
    # 生成缓存键
    cache_key = hashlib.md5(
        f"{prompt}_{max_tokens}".encode()
    ).hexdigest()
    
    # 检查缓存
    if cache_key in response_cache:
        logger.info(f"Cache hit for: {prompt[:20]}...")
        return response_cache[cache_key]
    
    # 执行推理
    loader = get_model_loader()
    response = loader.infer(prompt, max_new_tokens=max_tokens)
    
    # 存入缓存
    response_cache[cache_key] = response
    
    return response
```

**效果**：
- 相同问题即时返回
- 减少 NPU 负载
- 提升用户体验

---

## 🔍 监控和日志

### **1. 性能指标收集**

```python
# backend/services/metrics.py
from collections import defaultdict
import time

class PerformanceMetrics:
    def __init__(self):
        self.latencies = []
        self.token_counts = defaultdict(list)
        self.errors = 0
    
    def record_inference(self, latency: float, tokens: int):
        """记录推理性能"""
        self.latencies.append(latency)
        self.token_counts[tokens].append(latency)
    
    def record_error(self):
        """记录错误"""
        self.errors += 1
    
    def get_stats(self):
        """获取统计信息"""
        if not self.latencies:
            return {}
        
        return {
            "total_requests": len(self.latencies),
            "avg_latency": sum(self.latencies) / len(self.latencies),
            "min_latency": min(self.latencies),
            "max_latency": max(self.latencies),
            "errors": self.errors,
            "by_tokens": {
                tokens: {
                    "count": len(lats),
                    "avg": sum(lats) / len(lats)
                }
                for tokens, lats in self.token_counts.items()
            }
        }

# 全局实例
metrics = PerformanceMetrics()
```

---

### **2. 健康检查端点**

```python
# backend/routes/health_routes.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """健康检查"""
    try:
        loader = get_model_loader()
        
        # 快速推理测试
        start = time.time()
        response = loader.infer("test", max_new_tokens=8)
        latency = (time.time() - start) * 1000
        
        status = "healthy" if latency < 1000 else "degraded"
        
        return {
            "status": status,
            "latency_ms": latency,
            "model_loaded": loader.is_loaded,
            "burst_mode": "enabled"
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.get("/metrics")
async def get_metrics():
    """获取性能指标"""
    return metrics.get_stats()
```

---

## 🚨 告警和故障处理

### **1. 性能告警**

```python
def check_performance_alert(latency: float, tokens: int):
    """检查性能告警"""
    # 定义阈值
    thresholds = {
        8: 800,    # 8 tokens 应 < 800ms
        16: 1000,  # 16 tokens 应 < 1000ms
        24: 2500,  # 24 tokens 应 < 2500ms
    }
    
    threshold = thresholds.get(tokens, 3000)
    
    if latency > threshold:
        logger.warning(
            f"Performance alert: {latency:.0f}ms > {threshold}ms "
            f"for {tokens} tokens"
        )
        # 可以发送告警通知
        # send_alert(f"High latency: {latency:.0f}ms")
```

---

### **2. 自动重启策略**

```python
# backend/services/auto_recovery.py
import os
import sys

class AutoRecovery:
    def __init__(self, max_errors: int = 10):
        self.error_count = 0
        self.max_errors = max_errors
    
    def record_error(self):
        """记录错误"""
        self.error_count += 1
        
        if self.error_count >= self.max_errors:
            logger.critical(
                f"Too many errors ({self.error_count}), "
                f"consider restarting service"
            )
            # 可以触发自动重启
            # self.restart_service()
    
    def reset_errors(self):
        """重置错误计数"""
        self.error_count = 0
    
    def restart_service(self):
        """重启服务"""
        logger.info("Restarting service...")
        os.execv(sys.executable, ['python'] + sys.argv)

# 全局实例
auto_recovery = AutoRecovery()
```

---

## 📦 部署配置

### **1. 环境变量配置**

```bash
# .env
# NPU 配置
QNN_LOG_LEVEL=INFO
QNN_PERFORMANCE_MODE=BURST
QNN_HTP_PERFORMANCE_MODE=burst

# 模型配置
DEFAULT_MODEL=qwen2-7b-ssd
DEFAULT_MAX_TOKENS=16
CIRCUIT_BREAKER_THRESHOLD=3000

# 服务配置
HOST=0.0.0.0
PORT=8000
WORKERS=1  # NPU 单例，只用 1 个 worker
```

---

### **2. 启动脚本**

```bash
# start_production.bat
@echo off
echo Starting AntiNet AI PC - Production Mode
echo.

cd C:\test\antinet
call venv_arm64\Scripts\activate

echo [INFO] Starting backend service...
python backend\main.py

pause
```

---

### **3. 系统服务配置（可选）**

```powershell
# install_service.ps1
# 将 AntiNet 安装为 Windows 服务

$serviceName = "AntiNetAIPC"
$serviceDisplayName = "AntiNet AI PC Service"
$servicePath = "C:\test\antinet\venv_arm64\Scripts\python.exe"
$serviceArgs = "C:\test\antinet\backend\main.py"

# 创建服务
New-Service -Name $serviceName `
    -DisplayName $serviceDisplayName `
    -BinaryPathName "$servicePath $serviceArgs" `
    -StartupType Automatic `
    -Description "AntiNet AI PC NPU Service with BURST mode"

Write-Host "Service installed successfully!"
Write-Host "Start service: Start-Service $serviceName"
```

---

## 📊 性能测试脚本

### **压力测试**

```python
# performance_test.py
import time
import statistics
from concurrent.futures import ThreadPoolExecutor
import sys
sys.path.insert(0, 'C:/test/antinet/backend')

from models.model_loader import get_model_loader

def single_request(prompt: str, tokens: int):
    """单个请求"""
    loader = get_model_loader()
    start = time.time()
    response = loader.infer(prompt, max_new_tokens=tokens)
    latency = (time.time() - start) * 1000
    return latency

def stress_test(num_requests: int = 10, tokens: int = 16):
    """压力测试"""
    print(f"Running stress test: {num_requests} requests, {tokens} tokens")
    print("-" * 60)
    
    latencies = []
    
    for i in range(num_requests):
        latency = single_request(f"Test {i}", tokens)
        latencies.append(latency)
        print(f"Request {i+1}/{num_requests}: {latency:.0f}ms")
    
    # 统计
    print("\n" + "=" * 60)
    print("Statistics:")
    print(f"  Total requests: {num_requests}")
    print(f"  Average latency: {statistics.mean(latencies):.0f}ms")
    print(f"  Median latency: {statistics.median(latencies):.0f}ms")
    print(f"  Min latency: {min(latencies):.0f}ms")
    print(f"  Max latency: {max(latencies):.0f}ms")
    print(f"  Std deviation: {statistics.stdev(latencies):.0f}ms")
    print("=" * 60)

if __name__ == "__main__":
    stress_test(num_requests=20, tokens=16)
```

---

## 🎯 生产环境检查清单

### **部署前检查**

- [ ] BURST 模式已启用
- [ ] 熔断阈值设置为 3000ms
- [ ] 默认 token 数设置为 16
- [ ] 健康检查端点正常
- [ ] 日志系统配置完成
- [ ] 错误处理机制就绪
- [ ] 性能监控启用
- [ ] 备份和恢复策略制定

### **性能验证**

- [ ] 8 tokens < 800ms
- [ ] 16 tokens < 1000ms
- [ ] 24 tokens < 2500ms
- [ ] 熔断检查通过
- [ ] 压力测试通过

### **监控配置**

- [ ] 性能指标收集
- [ ] 错误日志记录
- [ ] 告警机制设置
- [ ] 健康检查定期执行

---

## 📞 技术支持

### **常见问题**

**Q: 性能突然下降怎么办？**
A: 
1. 检查 NPU 驱动状态
2. 重启后端服务
3. 查看错误日志
4. 运行健康检查

**Q: 如何进一步优化？**
A:
1. 切换到 Llama3.2-3B 模型
2. 减少 max_tokens
3. 启用缓存策略
4. 优化提示词

**Q: 如何监控生产环境？**
A:
1. 使用 /metrics 端点
2. 定期运行健康检查
3. 监控错误日志
4. 设置性能告警

---

## 🎉 总结

**当前状态**: ✅ 生产就绪

**性能指标**:
- 8-16 tokens: ~600ms (优秀)
- 吞吐量: ~1.6 req/s
- 可用性: 高

**推荐配置**:
- 默认 16 tokens
- BURST 性能模式
- 3000ms 熔断阈值

**下一步**:
1. 部署到生产环境
2. 启用监控和日志
3. 定期性能测试
4. 根据实际情况调优

---

**AntiNet AI PC 已准备好投入生产使用！** 🚀
