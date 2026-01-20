from models.model_loader import load_model_if_needed
import time

print("正在加载NPU模型...")
start = time.time()
model = load_model_if_needed()
load_time = time.time() - start

print(f"✅ 模型加载成功！")
print(f"模型类型: {type(model).__name__}")
print(f"加载时间: {load_time:.2f}秒")
print(f"是否是模拟: {'Mock' in type(model).__name__}")

# 测试推理
print("\n测试推理...")
start = time.time()
result = model.infer("分析端侧AI的优势", max_new_tokens=64)
inference_time = (time.time() - start) * 1000

print(f"推理延迟: {inference_time:.2f}ms")
print(f"结果: {result[:100]}...")
