"""
测试 GenieContext 创建
"""
import os
import sys
import time
from pathlib import Path

# 设置控制台编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

# 设置路径
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 添加到 PATH
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 添加DLL目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)
        print(f"[OK] Added DLL directory: {p}")

# 预加载DLL
print("\n[INFO] Preloading DLLs...")
import ctypes
dlls_to_load = ["QnnSystem.dll", "QnnModelDlc.dll", "QnnHtp.dll", "QnnHtpPrepare.dll"]
for dll in dlls_to_load:
    found = False
    for p in paths_to_add:
        dll_path = Path(p) / dll
        if dll_path.exists():
            try:
                ctypes.CDLL(str(dll_path))
                print(f"[OK] Preloaded: {dll}")
                found = True
                break
            except Exception as e:
                print(f"[WARN] Failed to preload {dll}: {e}")
    if not found:
        print(f"[WARN] Not found: {dll}")

# 添加 Genie 路径
genie_path = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if genie_path not in sys.path:
    sys.path.append(genie_path)
    print(f"\n[OK] Added Genie path")

# 设置 QNN 日志
os.environ['QNN_LOG_LEVEL'] = "DEBUG"
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"

# 导入 GenieContext
print("\n[INFO] Importing GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext imported successfully")
except Exception as e:
    print(f"[ERROR] Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 创建 GenieContext
print("\n[INFO] Creating GenieContext (30s timeout)...")
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"

try:
    start_time = time.time()
    genie = GenieContext(config_path, False)
    load_time = time.time() - start_time
    print(f"[OK] GenieContext created successfully, time: {load_time:.2f}s")
    print(f"[OK] NPU model loaded successfully!")
except Exception as e:
    print(f"[ERROR] Creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*60)
print("[SUCCESS] All tests passed!")
print("="*60)
