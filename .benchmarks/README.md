# .benchmarks - 性能基准测试结果

此目录用于保存 NPU 性能基准测试结果。

## 文件命名规范

格式: `npu_benchmark_YYYYMMDD_HHMMSS.json`

示例: `npu_benchmark_20260112_153045.json`

## 数据结构

```json
{
  "timestamp": "2026-01-12T15:30:45",
  "device": "NPU",
  "model": "qwen2-1.5b",
  "results": [
    {
      "sequence_length": 32,
      "avg_latency_ms": 120.5,
      "min_latency_ms": 115.2,
      "max_latency_ms": 128.7
    },
    {
      "sequence_length": 64,
      "avg_latency_ms": 230.8,
      "min_latency_ms": 225.1,
      "max_latency_ms": 238.9
    },
    {
      "sequence_length": 128,
      "avg_latency_ms": 450.2,
      "min_latency_ms": 442.5,
      "max_latency_ms": 461.8
    },
    {
      "sequence_length": 256,
      "avg_latency_ms": 850.5,
      "min_latency_ms": 838.2,
      "max_latency_ms": 865.1
    }
  ]
}
```

## 性能指标

- **目标延迟**: < 500ms (128 tokens)
- **加速比**: 3.5x - 5.3x (相比 CPU)
- **吞吐量**: 2.2 - 8.3 QPS

## 使用方法

运行合规性验证脚本自动生成测试结果：

```bash
python backend/verify_compliance.py
```

或直接测试 API：

```bash
curl http://localhost:8000/api/performance/benchmark
```

## 性能趋势分析

使用此目录中的历史数据可以：

1. 追踪 NPU 性能变化
2. 对比不同模型配置
3. 分析性能优化效果
4. 生成性能报告图表
