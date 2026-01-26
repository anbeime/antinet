"""
NPU设备创建诊断测试
在不重启后端的情况下测试NPU设备创建
"""
import sys
import os
import time
from pathlib import Path

print("=" * 60)
print("NPU设备创建诊断测试")
print("=" * 60)

# 1. 添加路径
genie_path = r"C:\ai-engine-direct-helper\samples\genie\python"
qai_libs = r"C:\ai-engine-direct-helper\samples\qai_libs"
qairt_libs = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"

print("\n[1] 配置环境...")
sys.path.append(genie_path)
print(f"  ✓ Genie路径已添加")

# 更新PATH
paths = [qairt_libs, qai_libs]
current_path = os.environ.get('PATH', '')
for p in paths:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = qai_libs
print(f"  ✓ PATH已更新")

# 添加DLL目录
for p in paths:
    if os.path.exists(p):
        os.add_dll_directory(p)
        print(f"  ✓ DLL目录已添加: {p}")

# 2. 预加载DLL
print("\n[2] 预加载关键DLL...")
import ctypes
dlls = ["Genie.dll", "QnnSystem.dll", "QnnModelDlc.dll", "QnnHtp.dll"]
for dll in dlls:
    found = False
    for p in paths:
        dll_path = Path(p) / dll
        if dll_path.exists():
            try:
                ctypes.WinDLL(str(dll_path))
                print(f"  ✓ {dll}")
                found = True
                break
            except Exception as e:
                print(f"  ✗ {dll}: {e}")
    if not found:
        print(f"  ✗ {dll} 未找到")

# 3. 尝试导入
print("\n[3] 导入GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("  ✓ 导入成功")
except Exception as e:
    print(f"  ✗ 导入失败: {e}")
    sys.exit(1)

# 4. 尝试创建设备
print("\n[4] 尝试创建NPU设备...")
config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"

if not Path(config_path).exists():
    print(f"  ✗ 配置文件不存在: {config_path}")
    sys.exit(1)

print(f"  配置文件: {config_path}")

try:
    print("  正在创建GenieContext...")
    genie = GenieContext(config_path)
    print("  ✓ GenieContext创建成功")

    # 释放设备
    del genie
    print("  ✓ 设备已释放")

    print("\n" + "=" * 60)
    print("✓ NPU设备创建测试通过")
    print("=" * 60)

except Exception as e:
    print(f"\n  ✗ 设备创建失败: {e}")
    print("\n错误分析:")
    error_msg = str(e)

    if "14001" in error_msg:
        print("  错误类型: 设备创建失败（错误代码14001）")
        print("  可能原因:")
        print("    1. NPU被其他进程占用")
        print("    2. NPU驱动需要重新初始化")
        print("    3. DLL版本不匹配")
        print("  建议解决方案:")
        print("    - 检查是否有其他Python进程在使用NPU")
        print("    - 等待其他团队释放NPU资源")
        print("    - 检查Windows事件查看器中的NPU错误")
    elif "DLL" in error_msg or "dll" in error_msg:
        print("  错误类型: DLL加载失败")
        print("  可能原因:")
        print("    1. DLL路径不正确")
        print("    2. DLL版本不兼容")
        print("    3. 缺少依赖库")
    else:
        print(f"  未知错误类型: {type(e).__name__}")

    print("\n" + "=" * 60)
    print("✗ NPU设备创建测试失败")
    print("=" * 60)

    sys.exit(1)
