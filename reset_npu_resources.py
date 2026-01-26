"""
NPU资源释放和重新初始化脚本
尝试在不重启系统的情况下重置NPU资源
"""
import os
import sys
import time
import ctypes
from pathlib import Path

print("=" * 60)
print("NPU资源释放和重新初始化")
print("=" * 60)

# 1. 检查是否有NPU相关的DLL加载
print("\n[1] 检查NPU相关的DLL...")
qai_libs = r"C:\ai-engine-direct-helper\samples\qai_libs"
qairt_libs = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"

npu_dlls = [
    "Genie.dll",
    "QnnSystem.dll",
    "QnnModelDlc.dll",
    "QnnHtp.dll",
    "QnnHtpPrepare.dll",
    "NPUDetect.dll"
]

loaded_dlls = []
for dll in npu_dlls:
    for lib_path in [qai_libs, qairt_libs]:
        dll_path = Path(lib_path) / dll
        if dll_path.exists():
            try:
                # 尝试加载DLL以检查是否可用
                ctypes.WinDLL(str(dll_path))
                loaded_dlls.append(dll)
                print(f"  ✓ {dll} 可用")
                break
            except Exception as e:
                print(f"  ✗ {dll} 加载失败: {e}")
                break

if len(loaded_dlls) < 6:
    print(f"\n[警告] 部分DLL加载失败 ({len(loaded_dlls)}/6)")

# 2. 尝试重新加载GenieContext
print("\n[2] 重新初始化GenieContext...")
genie_path = r"C:\ai-engine-direct-helper\samples\genie\python"
if genie_path not in sys.path:
    sys.path.append(genie_path)

try:
    # 清除之前可能的导入
    if 'qai_appbuilder' in sys.modules:
        del sys.modules['qai_appbuilder']
    if 'qai_appbuilder.qai_appbuilder' in sys.modules:
        del sys.modules['qai_appbuilder.qai_appbuilder']

    print("  清除旧模块...")

    # 重新导入
    from qai_appbuilder import GenieContext
    print("  ✓ GenieContext导入成功")

except Exception as e:
    print(f"  ✗ 导入失败: {e}")
    sys.exit(1)

# 3. 尝试创建设备（带延迟）
print("\n[3] 尝试创建NPU设备...")
config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"

# 设置重试参数
max_retries = 3
retry_delay = 5  # 秒

for attempt in range(max_retries):
    print(f"\n  尝试 {attempt + 1}/{max_retries}...")
    
    if attempt > 0:
        print(f"  等待 {retry_delay} 秒...")
        time.sleep(retry_delay)
    
    try:
        genie = GenieContext(config_path)
        print("  ✓ GenieContext创建成功！")
        
        # 立即释放以避免占用
        del genie
        print("  ✓ 设备已释放")
        
        print("\n" + "=" * 60)
        print("✓ NPU资源重新初始化成功")
        print("=" * 60)
        print("\n建议:")
        print("  - 立即重启后端服务")
        print("  - 使用: start_backend_direct.bat")
        sys.exit(0)
        
    except Exception as e:
        error_msg = str(e)
        print(f"  ✗ 失败: {e}")
        
        if attempt < max_retries - 1:
            if "14001" in error_msg:
                print("  提示: NPU设备可能被占用，等待重试...")
            else:
                print("  提示: 将继续重试...")
        else:
            print(f"\n  重试 {max_retries} 次后仍失败")
            
            print("\n可能的解决方案:")
            print("  1. 检查是否有其他团队的程序在使用NPU")
            print("  2. 等待一段时间后重试")
            print("  3. 联系其他团队，确认NPU使用情况")
            print("  4. 查看Windows事件查看器中的NPU错误")
            
            print("\n" + "=" * 60)
            print("✗ NPU资源重新初始化失败")
            print("=" * 60)
            sys.exit(1)

print("不应到达此处")
sys.exit(1)
