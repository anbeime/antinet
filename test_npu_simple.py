import os
import sys
import time

print("=" * 70)
print("简单 NPU 推理测试")
print("=" * 70)

# 设置 PATH
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;' + os.getenv('PATH', '')

# 导入 QAI AppBuilder
print("\n[1] 导入 QAI AppBuilder...")
try:
    from qai_appbuilder import GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
    print("    [OK] 导入成功")
except ImportError as e:
    print(f"    [ERROR] {e}")
    sys.exit(1)

# 检查模型文件
print("\n[2] 检查模型文件...")
config_path = 'C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json'
if os.path.exists(config_path):
    print(f"    [OK] 配置文件存在: {config_path}")
else:
    print(f"    [ERROR] 配置文件不存在: {config_path}")
    sys.exit(1)

# 创建 GenieContext
print("\n[3] 创建 GenieContext...")
try:
    dialog = GenieContext(config_path)
    print("    [OK] GenieContext 创建成功")
except Exception as e:
    print(f"    [ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 等待模型初始化
print("\n[4] 等待模型初始化...")
time.sleep(2)
print("    [OK] 初始化完成")

# 执行推理
print("\n[5] 执行推理...")
test_prompt = "端侧AI的优势是什么？"
print(f"    输入: {test_prompt}")

result_text = []

def callback(text):
    result_text.append(text)
    print(text, end='', flush=True)
    return True

try:
    start_time = time.time()
    dialog.Query(test_prompt, callback)
    inference_time = (time.time() - start_time) * 1000
    
    print(f"\n\n[性能]")
    print(f"    推理延迟: {inference_time:.2f}ms")
    
    if inference_time < 500:
        print(f"    [OK] 性能达标 (< 500ms)")
    else:
        print(f"    [WARNING] 性能超标 (>= 500ms)")
    
    print("\n" + "=" * 70)
    print("✅ NPU 推理测试完成")
    print("=" * 70)
    
except Exception as e:
    print(f"\n    [ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
