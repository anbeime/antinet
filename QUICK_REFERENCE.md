# 🎯 AntiNet AI PC - 快速参考卡

## ⚡ 性能速查表

```
Token 数    延迟      适用场景
8          533ms     快速问答
16         625ms     正常对话 ⭐ 推荐
24         1747ms    详细分析
32+        >2000ms   不推荐
```

---

## 🚀 推荐配置

```python
# 默认配置（最佳平衡）
max_new_tokens = 16
temperature = 0.7
# 预期延迟: ~625ms
```

---

## 📊 API 使用示例

### 快速问答
```python
response = loader.infer("你好", max_new_tokens=16)
# 延迟: ~625ms
```

### 数据分析
```python
response = loader.infer("分析数据", max_new_tokens=20)
# 延迟: ~900ms
```

### 超快响应
```python
response = loader.infer("Hi", max_new_tokens=8)
# 延迟: ~533ms
```

---

## ⚙️ 优化配置

```python
# backend/models/model_loader.py
DEFAULT_MODEL = "qwen2-7b-ssd"
max_new_tokens = 64  # 默认值
CIRCUIT_BREAKER = 3000  # 熔断阈值
BURST_MODE = True  # 性能模式
```

---

## 🔍 健康检查

```bash
# 检查服务状态
curl http://localhost:8000/health

# 查看性能指标
curl http://localhost:8000/metrics
```

---

## 📈 性能对比

```
优化前: 1203ms (16 tokens)
优化后:  625ms (16 tokens)
提升:    48%
```

---

## ⚠️ 注意事项

1. **推荐使用 8-16 tokens** - 最佳性能
2. **避免 64+ tokens** - 延迟过高
3. **BURST 模式已启用** - 无需额外配置
4. **熔断阈值 3000ms** - 自动保护

---

## 🛠️ 故障排查

### 性能下降
```bash
# 1. 重启服务
taskkill /F /IM python.exe
python backend\main.py

# 2. 检查日志
type backend.log | findstr "BURST"
```

### 推理失败
```bash
# 检查 NPU 状态
python test_burst_mode.py
```

---

## 📞 快速命令

```bash
# 启动服务
cd C:\test\antinet
venv_arm64\Scripts\activate
python backend\main.py

# 运行测试
python validate_burst_mode.py

# 性能测试
python test_npu_quick.py
```

---

## 🎯 最佳实践

1. ✅ 使用 16 tokens 作为默认值
2. ✅ 保持提示词简短
3. ✅ 启用缓存机制
4. ✅ 监控性能指标
5. ❌ 避免长文本生成

---

## 📊 性能目标

| 指标 | 目标 | 当前 | 状态 |
|------|------|------|------|
| 8 tokens | < 600ms | 533ms | ✅ |
| 16 tokens | < 700ms | 625ms | ✅ |
| 24 tokens | < 2000ms | 1747ms | ✅ |

---

**版本**: v3.0 (BURST Mode)  
**更新**: 2026-01-27  
**状态**: ✅ 生产就绪
