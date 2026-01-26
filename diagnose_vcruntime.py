#!/usr/bin/env python3
"""
诊断 vcruntime140_1.dll 架构不匹配问题
检查系统路径中的DLL文件，验证是否为ARM64架构
"""
import os
import sys
import struct
from pathlib import Path

def get_dll_architecture(dll_path):
    """检查DLL文件的架构"""
    try:
        with open(dll_path, 'rb') as f:
            # 读取DOS头部
            f.seek(60)
            pe_offset = struct.unpack('I', f.read(4))[0]
            f.seek(pe_offset + 24)
            machine = struct.unpack('H', f.read(2))[0]
            
            # 架构代码映射
            arch_map = {
                0x014C: 'x86',
                0x0200: 'IA64',
                0x8664: 'x64',
                0xAA64: 'ARM64',
                0x01C4: 'ARM',
            }
            
            arch_name = arch_map.get(machine, f'Unknown (0x{machine:04X})')
            return machine, arch_name
    except Exception as e:
        return None, f'检查失败: {e}'

def find_dll_in_path(dll_name):
    """在系统PATH中查找DLL文件"""
    paths = os.environ.get('PATH', '').split(';')
    found = []
    
    for path in paths:
        if not path.strip():
            continue
        dll_path = Path(path) / dll_name
        if dll_path.exists():
            found.append(str(dll_path))
    
    # 检查Windows系统目录
    system32 = Path(os.environ.get('SystemRoot', 'C:\\Windows')) / 'System32'
    dll_path = system32 / dll_name
    if dll_path.exists():
        found.append(str(dll_path))
    
    # 检查当前目录
    current = Path.cwd() / dll_name
    if current.exists():
        found.append(str(current))
    
    return found

def check_vc_redist_registry():
    """检查VC++运行时安装情况"""
    import winreg
    
    redist_keys = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    ]
    
    arm64_versions = []
    
    for key_path in redist_keys:
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
            
            i = 0
            while True:
                try:
                    subkey_name = winreg.EnumKey(key, i)
                    subkey = winreg.OpenKey(key, subkey_name)
                    
                    try:
                        display_name = winreg.QueryValueEx(subkey, 'DisplayName')[0]
                        display_version = winreg.QueryValueEx(subkey, 'DisplayVersion')[0]
                        
                        if 'C++' in display_name and 'Redist' in display_name:
                            if 'ARM64' in display_name or 'arm64' in display_name.lower():
                                arm64_versions.append({
                                    'name': display_name,
                                    'version': display_version,
                                    'key': subkey_name
                                })
                    except:
                        pass
                    
                    winreg.CloseKey(subkey)
                    i += 1
                except OSError:
                    break
                    
            winreg.CloseKey(key)
        except:
            pass
    
    return arm64_versions

def main():
    print("=" * 80)
    print("vcruntime140_1.dll 架构诊断工具")
    print("=" * 80)
    
    print("\n[1] 检查Python架构...")
    print(f"    Python版本: {sys.version}")
    is_arm64 = sys.maxsize > 2**32
    print(f"    架构: {'ARM64' if is_arm64 else 'x64'}")
    
    print("\n[2] 查找 vcruntime140_1.dll 文件...")
    dll_name = "vcruntime140_1.dll"
    found_paths = find_dll_in_path(dll_name)
    
    if not found_paths:
        print("    ✗ 未找到 vcruntime140_1.dll 文件")
    else:
        print(f"    找到 {len(found_paths)} 个文件:")
        for i, path in enumerate(found_paths, 1):
            machine, arch = get_dll_architecture(path)
            if machine is not None:
                print(f"    {i}. {path}")
                print(f"       架构: {arch}")
            else:
                print(f"    {i}. {path}")
                print(f"       错误: {arch}")
    
    print("\n[3] 检查VC++运行时注册表...")
    arm64_versions = check_vc_redist_registry()
    
    if arm64_versions:
        print(f"    找到 {len(arm64_versions)} 个ARM64 VC++运行时:")
        for version in arm64_versions:
            print(f"    • {version['name']} - 版本 {version['version']}")
    else:
        print("    ✗ 未找到ARM64 VC++运行时注册表项")
    
    print("\n[4] 检查系统环境变量...")
    python_path = sys.executable
    print(f"    Python执行文件: {python_path}")
    
    path_env = os.environ.get('PATH', '')
    print(f"    PATH长度: {len(path_env)} 字符")
    
    # 检查PATH中是否有明显的x64路径
    x64_paths = [p for p in path_env.split(';') if 'x64' in p.lower() and 'system32' not in p.lower()]
    if x64_paths:
        print(f"    ⚠ 发现可能的x64路径:")
        for p in x64_paths[:5]:  # 只显示前5个
            print(f"      {p}")
    
    print("\n[5] 尝试加载DLL...")
    try:
        import ctypes
        # 尝试从System32加载
        system32_dll = Path(os.environ.get('SystemRoot', 'C:\\Windows')) / 'System32' / dll_name
        if system32_dll.exists():
            try:
                dll = ctypes.WinDLL(str(system32_dll))
                print(f"    ✓ 成功加载系统DLL: {system32_dll}")
            except Exception as e:
                print(f"    ✗ 加载失败: {e}")
        else:
            print(f"    ✗ 系统DLL不存在: {system32_dll}")
    except Exception as e:
        print(f"    ✗ 测试加载失败: {e}")
    
    print("\n" + "=" * 80)
    print("诊断结果总结")
    print("=" * 80)
    
    # 给出建议
    if not arm64_versions:
        print("\n⚠ 严重问题: 未检测到ARM64 VC++运行时")
        print("建议: 重新安装 Visual C++ Redistributable 2015-2022 (ARM64)")
        print("下载链接: https://aka.ms/vs/17/release/vc_redist.arm64.exe")
        print("安装后必须重启AIPC")
    else:
        print(f"\n✓ 检测到ARM64 VC++运行时 (版本: {arm64_versions[0]['version']})")
        
        if found_paths:
            # 检查是否有ARM64架构的DLL
            arm64_dlls = []
            for path in found_paths:
                machine, arch = get_dll_architecture(path)
                if machine == 0xAA64:  # ARM64
                    arm64_dlls.append(path)
            
            if arm64_dlls:
                print(f"✓ 找到ARM64架构的DLL文件: {arm64_dlls[0]}")
                print("  如果仍然加载失败，可能是路径顺序问题")
                print("  建议: 确保ARM64 DLL路径在PATH中靠前")
            else:
                print("✗ 未找到ARM64架构的DLL文件")
                print("  可能加载了错误架构的DLL")
                print("  建议: 检查PATH中是否有x64路径在ARM64路径之前")
    
    print("\n📋 修复步骤:")
    print("1. 重新安装ARM64 VC++运行时:")
    print("   运行: .\\tools\\vc_redist.arm64.exe /quiet /norestart")
    print("2. 重启AIPC (必须)")
    print("3. 运行修复脚本: .\\fix_npu_device.bat")
    print("4. 重新测试: python check_dll_deps.py")
    
    print("\n📁 如果问题依旧，尝试:")
    print("  1. 手动复制ARM64 DLL到System32 (不推荐)")
    print("  2. 检查Windows事件查看器")
    print("  3. 联系高通技术支持")

if __name__ == "__main__":
    main()