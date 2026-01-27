"""
简化版 NPU 推理测试
直接测试模型推理延迟
"""
import sys
import time
import os
import traceback

# 添加路径
sys.path.insert(0, 'c:/test/antinet/backend')
sys.path.insert(0, 'c:/test/antinet')
os.chdir('c:/test/antinet/backend')

# 设置环境变量
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc;' + os.environ.get('PATH', '')

# 导入 NPUModelLoader
from models.model_loader import NPUModelLoader

def test_npu_inference():
    print("=== NPU 推理性能测试 ===")
    
    # 使用 NPUModelLoader 加载模型
    print("1. 加载 NPU 模型...")
    start_time = time.time()
    loader = NPUModelLoader(model_key="Qwen2.0-7B-SSD")
    model = loader.load()
    load_time = time.time() - start_time
    print(f"   模型加载时间: {load_time:.2f}秒")
    
    # 测试短文本推理
    print("\n2. 测试短文本推理延迟...")
    short_input = "分析销售数据趋势"
    latencies = []
    
    for i in range(3):
        start = time.time()
        try:
            result = loader.infer(short_input, max_new_tokens=64, temperature=0.7)
            latency = (time.time() - start) * 1000
            latencies.append(latency)
            print(f"   测试 {i+1}: {latency:.2f}ms")
        except Exception as e:
            print(f"   测试 {i+1} 失败: {e}")
    
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        print(f"   平均延迟: {avg_latency:.2f}ms")
        
        if avg_latency < 500:
            print("   ✅ 性能达标 (< 500ms)")
        else:
            print("   ❌ 性能超标 (> 500ms)")
    
    # 测试长文本推理
    print("\n3. 测试长文本推理延迟...")
    long_input = "请详细分析这份包含多个季度销售数据的复杂报表，识别其中的趋势、异常点和关键业务洞察，并提供具体的行动建议。数据包括：Q1销售额100万，Q2销售额120万，Q3销售额95万，Q4销售额150万，同时需要考虑季节性因素、市场竞争情况和客户反馈等多个维度的信息。"
    latencies_long = []
    
    for i in range(2):
        start = time.time()
        try:
            result = loader.infer(long_input, max_new_tokens=128, temperature=0.7)
            latency = (time.time() - start) * 1000
            latencies_long.append(latency)
            print(f"   测试 {i+1}: {latency:.2f}ms")
        except Exception as e:
            print(f"   测试 {i+1} 失败: {e}")
    
    if latencies_long:
        avg_latency_long = sum(latencies_long) / len(latencies_long)
        print(f"   平均延迟: {avg_latency_long:.2f}ms")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    try:
        test_npu_inference()
    except Exception as e:
        print("❌ 测试执行出错:")
        traceback.print_exc()