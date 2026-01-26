#!/usr/bin/env python3
"""快速诊断 vcruntime140_1.dll 架构问题"""
import struct
import os

print("=" * 60)
print("Diagnostic: vcruntime140_1.dll architecture")
print("=" * 60)

# 检查System32中的DLL
dll_path = r"C:\Windows\System32\vcruntime140_1.dll"
if os.path.exists(dll_path):
    print(f"\nDLL found: {dll_path}")

    # 读取PE头获取机器码
    with open(dll_path, 'rb') as f:
        f.seek(60)  # PE偏移量
        pe_offset = struct.unpack('I', f.read(4))[0]

        f.seek(pe_offset + 24)
        machine = struct.unpack('H', f.read(2))[0]

        # 解码机器码
        machine_names = {
            0x014c: "x86 (0x014c)",
            0x8664: "x64 (0x8664)",
            0xaa64: "ARM64 (0xaa64)",
            0x01c4: "ARM (0x01c4)",
            0xaa20: "ARM64EC (0xaa20)"
        }

        print(f"Machine code: 0x{machine:04X}")

        if machine in machine_names:
            print(f"Architecture: {machine_names[machine]}")
        else:
            print("Unknown architecture - need further analysis")

        # 检查是否是ARM64
        if machine == 0xaa64:
            print("[PASS] Architecture correct: ARM64")
            exit(0)
        elif machine == 0x8664:
            print("[FAIL] Architecture wrong: x64 (should be ARM64)")
            print("Solution: Reinstall ARM64 VC++ Redistributable")
            exit(1)
        elif machine == 0x01c4:
            print("[FAIL] Architecture wrong: ARM (should be ARM64)")
            print("Solution: Reinstall ARM64 VC++ Redistributable")
            exit(1)
        elif machine == 0xaa20:
            print("[WARN] Architecture: ARM64EC (not compatible)")
            print("Solution: Use standard ARM64 VC++ Redistributable")
            exit(2)
        else:
            print("[WARN] Unknown architecture - need manual check")
            exit(3)

else:
    print(f"\n[DLL NOT FOUND] {dll_path}")
    print("  Checking other location...")

    # 检查SysWOW64
    dll_path_wow64 = r"C:\Windows\SysWOW64\vcruntime140_1.dll"
    if os.path.exists(dll_path_wow64):
        print(f"\nDLL found: {dll_path_wow64}")
        print("[WARNING] DLL found in SysWOW64 (32-bit location)")
        print("  ARM64 programs should load from System32")
        print("Solution: Reinstall ARM64 VC++ Redistributable")

print("\n" + "=" * 60)
print("Diagnosis completed")
print("=" * 60)
