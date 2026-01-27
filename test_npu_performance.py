"""
NPU Performance Benchmark Test
NPU 性能基准测试 - 测试模型加载时间和推理延迟
"""
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

print("=" * 60)
print("NPU Performance Benchmark Test")
print("=" * 60)
print()

# 测试 1：模型加载时间
print("[Test 1] Model Loading Time")
print("-" * 60)

start_time = time.time()
from models.model_loader import get_model_loader

loader = get_model_loader()
print(f"Loader created: {time.time() - start_time:.2f}s")

if not loader.is_loaded:
    print("Loading model...")
    load_start = time.time()
    loader.load()
    load_time = time.time() - load_start
    print(f"Model loaded: {load_time:.2f}s")
    
    # 判断是否正常
    if load_time > 20:
        print(f"WARNING: Load time is too slow! ({load_time:.2f}s > 20s)")
        print("Possible reasons:")
        print("  1. First-time loading (model compilation)")
        print("  2. Disk I/O slow")
        print("  3. NPU driver issue")
    else:
        print(f"OK: Load time is acceptable ({load_time:.2f}s)")
else:
    print("Model already loaded")

print()

# 测试 2：推理延迟（短文本）
print("[Test 2] Inference Latency - Short Text")
print("-" * 60)

test_prompts = [
    "你好",
    "今天天气怎么样",
    "请介绍一下 Antinet 系统"
]

latencies = []
for i, prompt in enumerate(test_prompts, 1):
    print(f"\nTest {i}: '{prompt}'")
    
    start_time = time.time()
    response = loader.infer(
        prompt=prompt,
        max_new_tokens=32,
        temperature=0.7
    )
    latency = (time.time() - start_time) * 1000
    latencies.append(latency)
    
    print(f"  Response: {response[:50]}...")
    print(f"  Latency: {latency:.2f}ms")
    
    if latency > 500:
        print(f"  WARNING: Latency too high! ({latency:.2f}ms > 500ms)")
    else:
        print(f"  OK: Latency acceptable")

print()
print("-" * 60)
print(f"Average Latency: {sum(latencies) / len(latencies):.2f}ms")
print(f"Min Latency: {min(latencies):.2f}ms")
print(f"Max Latency: {max(latencies):.2f}ms")

# 判断平均延迟
avg_latency = sum(latencies) / len(latencies)
if avg_latency > 500:
    print(f"WARNING: Average latency too high! ({avg_latency:.2f}ms > 500ms)")
else:
    print(f"OK: Average latency acceptable ({avg_latency:.2f}ms)")

# 测试 3：推理延迟（长文本）
print()
print("[Test 3] Inference Latency - Long Text")
print("-" * 60)

long_prompt = "请详细介绍 Antinet 智能知识管家系统的核心功能和技术架构"

start_time = time.time()
response = loader.infer(
    prompt=long_prompt,
    max_new_tokens=128,
    temperature=0.7
)
latency = (time.time() - start_time) * 1000

print(f"Prompt: {long_prompt}")
print(f"Response length: {len(response)} chars")
print(f"Latency: {latency:.2f}ms")

if latency > 2000:
    print(f"WARNING: Latency too high! ({latency:.2f}ms > 2000ms)")
else:
    print(f"OK: Latency acceptable")

print()
print("=" * 60)
print("Test Complete!")
print("=" * 60)
print()

# 总结
print("Summary:")
print(f"  Model Load Time: {load_time if not loader.is_loaded else 'Already loaded'}")
print(f"  Avg Inference Latency (short): {avg_latency:.2f}ms")
print(f"  Inference Latency (long): {latency:.2f}ms")
print()

if load_time > 20 or avg_latency > 500:
    print("RECOMMENDATION: Performance optimization needed")
    print("  - Consider switching to lighter model (Qwen2-1.5B)")
    print("  - Enable BURST performance mode")
    print("  - Check NPU driver and model cache")
else:
    print("RESULT: Performance is acceptable!")
