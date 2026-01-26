#!/usr/bin/env python3
"""
验证 vcruntime140_1.dll 修复结果
运行此脚本检查 DLL 加载是否正常
"""

import ctypes
import os
import sys
import struct

def check_dll_architecture(dll_path):
    """检查 DLL 文件的架构"""
    try:
        with open(dll_path, 'rb') as f:
            f.seek(60)
            pe_offset = struct.unpack('I', f.read(4))[0]
            f.seek(pe_offset + 24)
            machine = struct.unpack('H', f.read(2))[0]
            
            arch_map = {
                0x014C: 'x86',
                0x0200: 'IA64',
                0x8664: 'x64',
                0xAA64: 'ARM64',
                0x01C4: 'ARM',
            }
            
            arch_name = arch_map.get(machine, f'未知 (0x{machine:04X})')
            return machine, arch_name
    except Exception as e:
        return None, f'检查失败: {e}'

def test_dll_load(dll_path):
    """测试加载 DLL"""
    try:
        dll = ctypes.WinDLL(dll_path)
        return True, "加载成功"
    except Exception as e:
        return False, f"加载失败: {e}"

def main():
    print("=" * 80)
    print("vcruntime140_1.dll 修复验证工具")
    print("=" * 80)
    
    print("\n[1] 检查 Python 架构...")
    is_arm64 = sys.maxsize > 2**32
    print(f"   Python 版本: {sys.version}")
    print(f"   架构: {'ARM64' if is_arm64 else 'x64'}")
    
    print("\n[2] 检查系统 DLL...")
    system32_dll = os.path.join(os.environ.get('SystemRoot', 'C:\\Windows'), 'System32', 'vcruntime140_1.dll')
    
    if not os.path.exists(system32_dll):
        print("   ✗ 文件不存在:", system32_dll)
        return
    
    print(f"   文件路径: {system32_dll}")
    
    # 检查架构
    machine, arch = check_dll_architecture(system32_dll)
    if machine is not None:
        print(f"   架构: {arch}")
    else:
        print(f"   错误: {arch}")
    
    # 测试加载
    print("\n[3] 测试 DLL 加载...")
    success, message = test_dll_load(system32_dll)
    if success:
        print(f"   ✓ {message}")
    else:
        print(f"   ✗ {message}")
    
    print("\n[4] 检查其他相关 DLL...")
    related_dlls = [
        'vcruntime140.dll',
        'msvcp140.dll',
        'ucrtbase.dll',
    ]
    
    for dll_name in related_dlls:
        dll_path = os.path.join(os.environ.get('SystemRoot', 'C:\\Windows'), 'System32', dll_name)
        if os.path.exists(dll_path):
            machine, arch = check_dll_architecture(dll_path)
            if machine is not None:
                print(f"   {dll_name}: {arch}")
            else:
                print(f"   {dll_name}: 检查失败")
        else:
            print(f"   {dll_name}: 文件不存在")
    
    print("\n" + "=" * 80)
    print("验证结果总结")
    print("=" * 80)
    
    if success and machine == 0xAA64:
        print("\n修复成功！")
        print("   - vcruntime140_1.dll 架构正确 (ARM64)")
        print("   - DLL 加载正常")
        print("\n   可以继续 NPU 模型测试:")
        print("   python backend/test_model_loading.py")
    elif not success:
        print("\n❌ 修复失败！")
        print("   - DLL 加载失败:", message)
        print("\n   建议:")
        print("   1. 重新运行修复脚本")
        print("   2. 重启 AIPC")
        print("   3. 检查系统日志")
    elif machine != 0xAA64:
        print("\n⚠ 架构不正确！")
        print(f"   - 当前架构: {arch}")
        print("\n   建议:")
        print("   1. 确保下载的 VC++ 运行时是 ARM64 版本")
        print("   2. 重新安装 VC++ 运行时")
        print("   3. 检查是否有其他软件覆盖了 DLL")
    
    print("\n📋 后续步骤:")
    print("1. 如果修复成功，运行 NPU 性能测试:")
    print("   python backend/verify_npu_performance.py")
    print("2. 测试数据分析功能:")
    print("   python backend/test_api.py")
    print("3. 验证四色卡片系统:")
    print("   启动前端: pnpm dev")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()