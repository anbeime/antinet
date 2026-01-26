"""
快速NPU诊断 - 简化版
"""
import sys
import os
from pathlib import Path

print("=" * 60)
print("NPU快速诊断")
print("=" * 60)

# 1. 检查环境
print("\n[1] 环境检查:")
print(f"  Python: {sys.executable}")
print(f"  架构: {sys.platform}")

# 2. 检查关键路径
print("\n[2] 路径检查:")
paths = [
    ("模型", r"C:\model\Qwen2.0-7B-SSD-8380-2.34"),
    ("QAI库", r"C:\ai-engine-direct-helper\samples\qai_libs"),
    ("QAIRT库", r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"),
]

for name, path in paths:
    p = Path(path)
    exists = "✓" if p.exists() else "✗"
    print(f"  {name} {exists} {path}")

# 3. 检查DLL
print("\n[3] DLL检查:")
dlls = ["Genie.dll", "QnnHtp.dll", "QnnSystem.dll", "QnnModelDlc.dll"]
dll_paths = [
    r"C:\ai-engine-direct-helper\samples\qai_libs",
    r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc",
]

for dll in dlls:
    found = False
    for lib_path in dll_paths:
        if Path(lib_path).joinpath(dll).exists():
            print(f"  ✓ {dll}")
            found = True
            break
    if not found:
        print(f"  ✗ {dll} 未找到")

# 4. 尝试导入
print("\n[4] 模块导入测试:")
try:
    genie_path = r"C:\ai-engine-direct-helper\samples\genie\python"
    if genie_path not in sys.path:
        sys.path.append(genie_path)
    
    from qai_appbuilder import GenieContext
    print("  ✓ qai_appbuilder 导入成功")
except Exception as e:
    print(f"  ✗ 导入失败: {e}")
    sys.exit(1)

# 5. 尝试创建设备
print("\n[5] 设备创建测试:")
try:
    import json
    config_path = Path(r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json")
    
    print(f"  配置文件: {config_path}")
    if not config_path.exists():
        print(f"  ✗ 配置文件不存在")
        sys.exit(1)
    
    # 设置环境变量
    qai_libs = r"C:\ai-engine-direct-helper\samples\qai_libs"
    qairt_libs = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    
    os.environ['PATH'] = f"{qai_libs};{qairt_libs};" + os.environ.get('PATH', '')
    os.environ['QAI_LIBS_PATH'] = qai_libs
    
    # 添加DLL目录
    os.add_dll_directory(qai_libs)
    os.add_dll_directory(qairt_libs)
    
    print("  环境变量已设置")
    print("  尝试创建 GenieContext...")
    
    genie = GenieContext(str(config_path))
    print("  ✓ GenieContext 创建成功")
    
    del genie
    print("  ✓ 设备释放成功")
    
except Exception as e:
    print(f"  ✗ 设备创建失败: {e}")
    print("\n  可能的解决方案:")
    print("  1. 重启AIPC")
    print("  2. 检查是否有其他程序占用NPU")
    print("  3. 查看Windows事件查看器")
    sys.exit(1)

print("\n" + "=" * 60)
print("诊断完成 - 所有测试通过")
print("=" * 60)
