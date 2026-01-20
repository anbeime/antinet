#!/usr/bin/env python
"""
Copy bridge DLLs from SDK to qai_libs directory
"""
import os
import shutil
import sys

def copy_bridge_dlls():
    # Source: bridge DLLs
    src_dir = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    # Destination: qai_libs
    dst_dir = r"C:\ai-engine-direct-helper\samples\qai_libs"
    
    if not os.path.exists(src_dir):
        print(f"ERROR: Source directory not found: {src_dir}")
        return False
    
    os.makedirs(dst_dir, exist_ok=True)
    
    # List all DLL files in source
    dll_files = [f for f in os.listdir(src_dir) if f.lower().endswith('.dll')]
    
    print(f"Found {len(dll_files)} DLL files in {src_dir}")
    print("Copying...")
    
    copied = []
    for dll in dll_files:
        src_path = os.path.join(src_dir, dll)
        dst_path = os.path.join(dst_dir, dll)
        
        # Check if destination already exists and size differs
        if os.path.exists(dst_path):
            src_size = os.path.getsize(src_path)
            dst_size = os.path.getsize(dst_path)
            if src_size == dst_size:
                print(f"  {dll} already exists with same size, skipping")
                continue
            else:
                print(f"  {dll} exists but size differs ({dst_size} -> {src_size} bytes), overwriting")
        
        try:
            shutil.copy2(src_path, dst_path)
            copied.append(dll)
            print(f"  {dll} copied")
        except Exception as e:
            print(f"  ERROR copying {dll}: {e}")
    
    print(f"\nCopied {len(copied)} DLL files to {dst_dir}")
    
    # Also copy from bin directory if needed
    bin_src_dir = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\bin\arm64x-windows-msvc"
    if os.path.exists(bin_src_dir):
        bin_dlls = [f for f in os.listdir(bin_src_dir) if f.lower().endswith('.dll')]
        for dll in bin_dlls:
            src_path = os.path.join(bin_src_dir, dll)
            dst_path = os.path.join(dst_dir, dll)
            try:
                shutil.copy2(src_path, dst_path)
                print(f"  {dll} (from bin) copied")
                copied.append(dll)
            except Exception as e:
                print(f"  ERROR copying {dll} from bin: {e}")
    
    return True

if __name__ == "__main__":
    copy_bridge_dlls()