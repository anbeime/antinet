import ctypes
import os
import sys

print("测试 vcruntime140_1.dll 加载")
print("Python 架构:", "ARM64" if sys.maxsize > 2**32 else "x64")

# 尝试从System32加载
system32 = os.path.join(os.environ.get('SystemRoot', 'C:\\Windows'), 'System32')
dll_path = os.path.join(system32, 'vcruntime140_1.dll')
print(f"尝试加载: {dll_path}")
print(f"文件存在: {os.path.exists(dll_path)}")

if os.path.exists(dll_path):
    try:
        dll = ctypes.WinDLL(dll_path)
        print("✓ 加载成功")
    except Exception as e:
        print(f"✗ 加载失败: {e}")
        import traceback
        traceback.print_exc()
else:
    print("✗ 文件不存在")

# 检查当前进程的DLL加载情况
print("\n当前加载的DLL中包含vcruntime140_1.dll吗?")
try:
    import ctypes.wintypes
    EnumProcessModules = ctypes.windll.psapi.EnumProcessModules
    GetModuleFileName = ctypes.windll.psapi.GetModuleFileNameW
    
    hProcess = ctypes.windll.kernel32.GetCurrentProcess()
    hModules = (ctypes.c_void_p * 1024)()
    cbNeeded = ctypes.c_ulong()
    
    if EnumProcessModules(hProcess, hModules, ctypes.sizeof(hModules), ctypes.byref(cbNeeded)):
        for i in range(cbNeeded.value // ctypes.sizeof(ctypes.c_void_p)):
            hModule = hModules[i]
            filename = ctypes.create_unicode_buffer(260)
            GetModuleFileName(hModule, filename, 260)
            if 'vcruntime140_1.dll' in filename.value.lower():
                print(f"  已加载: {filename.value}")
                break
        else:
            print("  未加载 vcruntime140_1.dll")
except Exception as e:
    print(f"  检查失败: {e}")