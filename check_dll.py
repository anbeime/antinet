#!/usr/bin/env python3
"""
简单检查 QNN DLL 依赖
"""
import os
import sys
import ctypes
from pathlib import Path

def check_dll(dll_name, search_paths):
    for path in search_paths:
        dll_path = Path(path) / dll_name
        if dll_path.exists():
            print(f"✅ {dll_name}: {dll_path}")
            try:
                ctypes.WinDLL(str(dll_path))
                print(f"   可以加载")
                return True
            except Exception as e:
                print(f"   加载失败: {e}")
                return False
    print(f"❌ {dll_name}: 未找到")
    return False

def main():
    print("检查 QNN DLL 依赖")
    print("=" * 60)
    
    qai_libs = "C:/ai-engine-direct-helper/samples/qai_libs"
    system32 = "C:/Windows/System32"
    
    search_paths = [qai_libs, system32]
    
    dlls = [
        "QnnHtp.dll",
        "QnnCpu.dll",
        "QnnGpu.dll",
        "QnnSystem.dll",
        "msvcp140.dll",
        "vcruntime140.dll",
        "vcruntime140_1.dll",
        "ucrtbase.dll",
    ]
    
    results = {}
    for dll in dlls:
        results[dll] = check_dll(dll, search_paths)
    
    print("\n" + "=" * 60)
    print("总结:")
    for dll, ok in results.items():
        print(f"{'✅' if ok else '❌'} {dll}")
    
    if all(results.values()):
        print("\n🎉 所有 DLL 检查通过")
    else:
        print("\n⚠️  发现缺失的 DLL")
        print("建议: 从 C:/Windows/System32/ 复制缺失的 DLL 到")
        print(f"      {qai_libs}")
        
        # 列出缺失的 DLL
        missing = [dll for dll, ok in results.items() if not ok]
        print(f"缺失: {', '.join(missing)}")

if __name__ == "__main__":
    main()