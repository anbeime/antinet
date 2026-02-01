"""
使用官方示例方式测试 NPU
参考: C:\ai-engine-direct-helper\samples\genie\python\GenieSample.py
"""
import os
import sys
import time

# 添加 Genie 路径
genie_path = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
sys.path.insert(0, genie_path)

# 官方示例方式：使用相对路径添加 qai_libs 到 PATH
# 关键：相对路径，而且要添加到 PATH 前面
lib_path = "C:\\ai-engine-direct-helper\\samples\\qai_libs"
current_path = os.environ.get('PATH', '')

# 官方示例：将 qai_libs 添加到 PATH 前面
if lib_path not in current_path:
    current_path = lib_path + ";" + current_path
    os.environ['PATH'] = current_path

print(f"[INFO] PATH 已更新")
print(f"[INFO] lib_path: {lib_path}")
print(f"[INFO] qai_libs 在 PATH 中: {'qai_libs' in os.environ['PATH']}")

# 添加 DLL 目录
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"
try:
    os.add_dll_directory(lib_path)
    print(f"[OK] 已添加 DLL 目录: {lib_path}")
    os.add_dll_directory(bridge_lib_path)
    print(f"[OK] 已添加 DLL 目录: {bridge_lib_path}")
except Exception as e:
    print(f"[WARNING] 添加 DLL 目录失败: {e}")

# 导入 GenieContext（官方示例方式）
print("[INFO] 导入 GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
except Exception as e:
    print(f"[ERROR] GenieContext 导入失败: {e}")
    sys.exit(1)

# 使用 AIPC 预装模型
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"[INFO] 使用配置: {config_path}")

# 创建 GenieContext（官方示例方式：只传一个参数）
print("[INFO] 创建 GenieContext...")
try:
    dialog = GenieContext(config_path)
    print("[OK] GenieContext 创建成功")
except Exception as e:
    print(f"[ERROR] GenieContext 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 准备提示词（使用官方示例格式）
prompt = "你好"
print(f"\n[测试] 推理提示词: {prompt}")

# 执行推理
result_parts = []
def callback(text):
    result_parts.append(text)
    print(text, end='', flush=True)
    return True

print("\n推理结果: ", end='')
start_time = time.time()
dialog.Query(prompt, callback)
inference_time = (time.time() - start_time) * 1000

print(f"\n\n[结果] 推理延迟: {inference_time:.2f}ms")

# 判断是否使用 NPU
if inference_time < 500:
    print("[SUCCESS] ✓ 延迟 < 500ms，确认使用 NPU！")
elif inference_time < 1000:
    print("[WARNING] ⚠ 延迟 500-1000ms，可能使用 NPU 但性能一般")
elif inference_time < 3000:
    print("[ERROR] ✗ 延迟 1-3s，可能回退到 CPU")
else:
    print("[CRITICAL] ✗ 延迟 > 3s，确认未使用 NPU，使用 CPU")

print("\n" + "=" * 70)
