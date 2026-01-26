"""
快速测试 NPU 推理（单参数创建 GenieContext）
"""
import os
import sys
import time

# 添加 Genie 路径
genie_path = 'C:\\ai-engine-direct-helper\\samples\\genie\\python'
if genie_path not in sys.path:
    sys.path.append(genie_path)

# 设置路径
lib_path = 'C:/ai-engine-direct-helper/samples/qai_libs'
bridge_lib_path = 'C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc'

paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 添加 DLL 目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

# 设置 QNN 日志
os.environ['QNN_LOG_LEVEL'] = 'ERROR'  # 减少日志输出

from qai_appbuilder import GenieContext

print('='*60)
print('Quick NPU Test (Single Parameter)')
print('='*60)

config_path = 'C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json'

print(f'\n[1/3] Creating GenieContext...')
try:
    start = time.time()
    genie = GenieContext(config_path)  # 单参数
    load_time = time.time() - start
    print(f'    ✓ SUCCESS! ({load_time:.2f}s)')
except Exception as e:
    print(f'    ✗ FAILED: {e}')
    sys.exit(1)

print(f'\n[2/3] Running inference...')
try:
    start = time.time()
    result = genie.Query("Hello")
    infer_time = time.time() - start
    print(f'    ✓ SUCCESS! ({infer_time*1000:.2f}ms)')
    print(f'    Result: {result[:100]}...' if len(result) > 100 else f'    Result: {result}')
except Exception as e:
    print(f'    ✗ FAILED: {e}')
    sys.exit(1)

print(f'\n[3/3] Done!')
print('='*60)
