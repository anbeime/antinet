#!/usr/bin/env python3
"""
检查QNN库依赖关系
"""
import os
import sys
import ctypes
from pathlib import Path

def check_dll(dll_name):
    """检查DLL是否可加载"""
    try:
        # 尝试加载DLL
        dll = ctypes.WinDLL(dll_name)
        print(f"{dll_name}: 可加载")
        return True
    except Exception as e:
        print(f" {dll_name}: 加载失败 - {e}")
        return False

def check_system_dlls():
    """检查系统DLL"""
    dlls = [
        "vcruntime140.dll",
        "vcruntime140_1.dll",
        "msvcp140.dll",
        "ucrtbase.dll",
        "kernel32.dll",
        "user32.dll",
    ]
    
    print("=" * 60)
    print("检查系统DLL依赖")
    print("=" * 60)
    
    results = []
    for dll in dlls:
        results.append(check_dll(dll))
    
    return all(results)

def check_qnn_dlls():
    """检查QNN库DLL"""
    qnn_paths = [
        r"C:\ai-engine-direct-helper\samples\qai_libs",
        r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc",
    ]
    
    print("\n" + "=" * 60)
    print("检查QNN库DLL")
    print("=" * 60)
    
    all_ok = True
    for qnn_path in qnn_paths:
        if not os.path.exists(qnn_path):
            print(f" 路径不存在: {qnn_path}")
            all_ok = False
            continue
            
        print(f"\n检查目录: {qnn_path}")
        try:
            dll_files = list(Path(qnn_path).glob("*.dll"))
            print(f"  找到 {len(dll_files)} 个DLL文件")
            
            # 检查几个关键的DLL
            critical_dlls = ["QnnHtp.dll", "QnnSystem.dll", "QnnGpu.dll", "QnnCpu.dll"]
            for dll in critical_dlls:
                dll_path = os.path.join(qnn_path, dll)
                if os.path.exists(dll_path):
                    print(f"  {dll}: 存在")
                else:
                    print(f"    {dll}: 不存在")
                    
        except Exception as e:
            print(f"  错误: {e}")
            all_ok = False
    
    return all_ok

def test_genie_import():
    """测试GenieContext导入"""
    print("\n" + "=" * 60)
    print("测试GenieContext导入")
    print("=" * 60)
    
    # 添加DLL目录
    lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
    bridge_lib_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    
    paths_to_add = [lib_path, bridge_lib_path]
    current_path = os.environ.get('PATH', '')
    for p in paths_to_add:
        if p not in current_path:
            current_path = p + ';' + current_path
    os.environ['PATH'] = current_path
    
    # 添加DLL目录（Python 3.8+）
    for p in paths_to_add:
        if os.path.exists(p):
            os.add_dll_directory(p)
    
    try:
        from qai_appbuilder import GenieContext
        print("GenieContext 导入成功")
        return True
    except ImportError as e:
        print(f" GenieContext 导入失败: {e}")
        return False
    except Exception as e:
        print(f" 其他错误: {e}")
        return False

def main():
    print("QNN 依赖关系诊断工具")
    print("=" * 60)
    
    # 1. 检查系统DLL
    sys_ok = check_system_dlls()
    
    # 2. 检查QNN DLL
    qnn_ok = check_qnn_dlls()
    
    # 3. 测试导入
    import_ok = test_genie_import()
    
    print("\n" + "=" * 60)
    print("诊断结果")
    print("=" * 60)
    print(f"系统DLL: {'通过' if sys_ok else ' 失败'}")
    print(f"QNN DLL: {'通过' if qnn_ok else ' 失败'}")
    print(f"导入测试: {'通过' if import_ok else ' 失败'}")
    
    if not import_ok:
        print("\n 建议：")
        print("1. 确保已安装 Visual C++ Redistributable 2015-2022 (ARM64)")
        print("2. 检查 QNN 库版本与模型版本匹配")
        print("3. 尝试重新安装 qai_appbuilder 库")
        print("4. 检查模型文件完整性")
    
    return import_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)