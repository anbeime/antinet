"""
测试 GenieContext 单参数创建（参考官方示例）
"""
import os
import sys
import time
from pathlib import Path

# 设置路径
lib_path = 'C:/ai-engine-direct-helper/samples/qai_libs'
bridge_lib_path = 'C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc'

# 添加到 PATH
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
        print(f'[OK] Added DLL directory: {p}')

# 添加 Genie 路径
genie_path = 'C:\\ai-engine-direct-helper\\samples\\genie\\python'
if genie_path not in sys.path:
    sys.path.append(genie_path)
    print(f'[OK] Added Genie path')

# 设置 QNN 日志
os.environ['QNN_LOG_LEVEL'] = 'DEBUG'
os.environ['QNN_DEBUG'] = '1'
os.environ['QNN_VERBOSE'] = '1'

print('\n' + '='*60)
print('Testing GenieContext creation (single parameter)')
print('='*60)

# 测试单参数创建
from qai_appbuilder import GenieContext

config_path = 'C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json'

print(f'\n[INFO] Config path: {config_path}')
print(f'[INFO] Config exists: {Path(config_path).exists()}')
print(f'\n[INFO] Creating GenieContext with single parameter (config)...')

try:
    start = time.time()
    genie = GenieContext(config_path)  # 单参数，参考官方示例
    load_time = time.time() - start
    print(f'\n[OK] SUCCESS! GenieContext created in {load_time:.2f}s')
    print(f'[OK] NPU model loaded successfully!')
except Exception as e:
    print(f'\n[ERROR] Failed: {e}')
    import traceback
    traceback.print_exc()
