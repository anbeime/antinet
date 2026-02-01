"""
使用更小的模型测试 NPU（llama3.2-3b）
"""
import os
import sys
import time

# 添加 Genie 路径
genie_path = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
sys.path.insert(0, genie_path)

# 添加 qai_libs 到 PATH
lib_path = "C:\\ai-engine-direct-helper\\samples\\qai_libs"
current_path = os.environ.get('PATH', '')
if lib_path not in current_path:
    current_path = lib_path + ";" + current_path
    os.environ['PATH'] = current_path

# 添加 DLL 目录
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"
try:
    os.add_dll_directory(lib_path)
    os.add_dll_directory(bridge_lib_path)
except Exception as e:
    print(f"Warning: {e}")

# 导入 GenieContext
from qai_appbuilder import GenieContext

# 使用 llama3.2-3b 模型（更小，可能更快）
config_path = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"
print(f"使用模型: {config_path}")

# 创建 GenieContext
print("创建 GenieContext...")
dialog = GenieContext(config_path)
print("GenieContext 创建成功")

# 测试简单推理
prompt = "Hello"
print(f"\n测试提示词: {prompt}")

result_parts = []
def callback(text):
    result_parts.append(text)
    print(text, end='', flush=True)
    return True

print("\n推理结果: ", end='')
start_time = time.time()
dialog.Query(prompt, callback)
inference_time = (time.time() - start_time) * 1000

print(f"\n\n推理延迟: {inference_time:.2f}ms")

if inference_time < 300:
    print("[SUCCESS] 使用 NPU！延迟 < 300ms")
elif inference_time < 500:
    print("[OK] 可能使用 NPU，延迟 < 500ms")
elif inference_time < 1000:
    print("[WARNING] 延迟 500-1000ms，可能未使用 NPU")
else:
    print(f"[ERROR] 延迟 {inference_time:.0f}ms，确认未使用 NPU，使用 CPU")
