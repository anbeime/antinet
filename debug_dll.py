#!/usr/bin/env python
"""
Debug DLL loading and dependencies
"""
import os
import sys
import ctypes
import subprocess

def check_dll_loading():
    print("=" * 80)
    print("DLL Loading Debug")
    print("=" * 80)
    
    lib_dir = "C:/ai-engine-direct-helper/samples/qai_libs"
    dll_path = os.path.join(lib_dir, "QnnHtp.dll")
    
    # 1. Check if file exists
    print("1. File exists:", os.path.exists(dll_path))
    
    # 2. Check PATH
    path = os.environ.get('PATH', '')
    print("2. qai_libs in PATH:", lib_dir in path)
    
    # 3. Try loading with different methods
    print("3. Attempting to load QnnHtp.dll...")
    
    # Method A: ctypes.CDLL with explicit path
    try:
        lib = ctypes.CDLL(dll_path)
        print("   A) ctypes.CDLL: SUCCESS")
    except Exception as e:
        print(f"   A) ctypes.CDLL: FAILED - {e}")
    
    # Method B: ctypes.WinDLL
    try:
        lib = ctypes.WinDLL(dll_path)
        print("   B) ctypes.WinDLL: SUCCESS")
    except Exception as e:
        print(f"   B) ctypes.WinDLL: FAILED - {e}")
    
    # Method C: Add DLL directory
    try:
        os.add_dll_directory(lib_dir)
        lib = ctypes.CDLL(dll_path)
        print("   C) os.add_dll_directory + CDLL: SUCCESS")
    except Exception as e:
        print(f"   C) os.add_dll_directory + CDLL: FAILED - {e}")
    
    # 4. Check dependency walker (simplified)
    print("4. Checking for dependency issues...")
    try:
        # Try to load a known system DLL from same directory
        system_dll = os.path.join(lib_dir, "vcruntime140.dll")
        if os.path.exists(system_dll):
            ctypes.CDLL(system_dll)
            print("   System DLL (vcruntime140.dll) loads successfully")
    except Exception as e:
        print(f"   System DLL load failed: {e}")
    
    # 5. Try to import GenieContext
    print("5. Importing GenieContext...")
    try:
        sys.path.insert(0, "C:/ai-engine-direct-helper/samples/genie/python")
        from qai_appbuilder import GenieContext
        print("   GenieContext import: SUCCESS")
    except Exception as e:
        print(f"   GenieContext import: FAILED - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_dll_loading()