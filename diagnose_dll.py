#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DLL Diagnosis Script
"""

import os
import sys
import ctypes

print("=" * 80)
print("DLL Diagnosis")
print("=" * 80)
print()

# Check qai_libs directory
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
print(f"1. Checking qai_libs directory: {lib_path}")
print()

if os.path.exists(lib_path):
    print("   Directory exists ✓")
    files = os.listdir(lib_path)
    print(f"   Found {len(files)} files")
    print()

    # List DLL files
    dll_files = [f for f in files if f.endswith('.dll') or f.endswith('.so') or f.endswith('.cat')]
    print("   DLL/SO/CAT files:")
    for f in sorted(dll_files):
        file_path = os.path.join(lib_path, f)
        size = os.path.getsize(file_path)
        print(f"     - {f} ({size:,} bytes)")
    print()

    # Try to load QnnHtp.dll
    print("2. Testing DLL loading...")
    print()

    qnn_dll = os.path.join(lib_path, "QnnHtp.dll")
    if os.path.exists(qnn_dll):
        print(f"   Loading: {qnn_dll}")
        try:
            lib = ctypes.CDLL(qnn_dll)
            print("   SUCCESS: QnnHtp.dll loaded!")
            print()
        except Exception as e:
            print(f"   ERROR: {e}")
            print()
    else:
        print(f"   ERROR: {qnn_dll} not found!")
        print()

    # Check PATH
    print("3. Checking PATH environment variable...")
    print()
    path_dirs = os.environ['PATH'].split(';')
    lib_in_path = any(lib_path in p for p in path_dirs)
    print(f"   qai_libs in PATH: {'YES' if lib_in_path else 'NO'}")
    print()

    # Try to import GenieContext
    print("4. Importing GenieContext...")
    print()
    GENIE_PATH = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
    if GENIE_PATH not in sys.path:
        sys.path.append(GENIE_PATH)

    try:
        from qai_appbuilder import GenieContext
        print("   SUCCESS: GenieContext imported")
        print()
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
        print()

else:
    print("   ERROR: Directory does not exist!")

print("=" * 80)
