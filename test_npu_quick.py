"""
NPU Quick Performance Test
NPU 快速性能测试 - 测试不同 max_new_tokens 的影响
"""
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

from models.model_loader import get_model_loader

loader = get_model_loader()

print("=" * 60)
print("NPU 快速性能测试")
print("=" * 60)
print()

# 测试不同的 max_new_tokens
test_configs = [
    {"max_new_tokens": 8, "name": "极短 (8 tokens)"},
    {"max_new_tokens": 16, "name": "短 (16 tokens)"},
    {"max_new_tokens": 32, "name": "中 (32 tokens)"},
    {"max_new_tokens": 64, "name": "长 (64 tokens)"},
    {"max_new_tokens": 128, "name": "很长 (128 tokens)"}
]

results = []

for config in test_configs:
    print(f"测试 {config['name']}:")
    print("-" * 60)
    
    # 第一次推理
    start = time.time()
    response = loader.infer(
        prompt="你好",
        max_new_tokens=config['max_new_tokens'],
        temperature=0.7
    )
    latency1 = (time.time() - start) * 1000
    
    print(f"  第一次延迟: {latency1:.2f}ms")
    
    # 第二次推理（测试缓存效果）
    start = time.time()
    response = loader.infer(
        prompt="你好",
        max_new_tokens=config['max_new_tokens'],
        temperature=0.7
    )
    latency2 = (time.time() - start) * 1000
    
    print(f"  第二次延迟: {latency2:.2f}ms")
    print(f"  响应长度: {len(response)} 字符")
    print(f"  响应预览: {response[:50]}...")
    
    # 判断是否达标
    avg_latency = (latency1 + latency2) / 2
    if avg_latency < 500:
        print(f"  ✅ 达标! (平均 {avg_latency:.2f}ms)")
        status = "✅ 达标"
    elif avg_latency < 1000:
        print(f"  ⚠️ 接近达标 (平均 {avg_latency:.2f}ms)")
        status = "⚠️ 接近"
    else:
        print(f"  ❌ 超标 {avg_latency/500:.1f}x (平均 {avg_latency:.2f}ms)")
        status = "❌ 超标"
    
    results.append({
        "config": config['name'],
        "tokens": config['max_new_tokens'],
        "latency1": latency1,
        "latency2": latency2,
        "avg": avg_latency,
        "status": status
    })
    
    print()

# 总结
print("=" * 60)
print("测试总结")
print("=" * 60)
print()

print(f"{'配置':<20} {'第一次':<12} {'第二次':<12} {'平均':<12} {'状态'}")
print("-" * 60)

for r in results:
    print(f"{r['config']:<20} {r['latency1']:>8.0f}ms  {r['latency2']:>8.0f}ms  {r['avg']:>8.0f}ms  {r['status']}")

print()
print("=" * 60)
print("建议:")
print("=" * 60)

# 找出最佳配置
best = min(results, key=lambda x: x['avg'])
if best['avg'] < 500:
    print(f"✅ 推荐使用: {best['config']}")
    print(f"   平均延迟: {best['avg']:.2f}ms")
    print(f"   max_new_tokens = {best['tokens']}")
else:
    print("❌ 所有配置都未达标，需要进一步优化:")
    print("   1. 启用 BURST 性能模式")
    print("   2. 检查 NPU backend 配置")
    print("   3. 考虑切换到更轻量的模型")

print()
print("=" * 60)
