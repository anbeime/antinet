#!/usr/bin/env python3
"""
诊断 QAI AppBuilder DLL 依赖问题
检查 QnnHtp.dll 及其依赖链，VC++ 运行时环境
"""
import os
import sys
import subprocess
import platform
import ctypes
import json
from pathlib import Path

print("=" * 80)
print("QAI AppBuilder DLL 依赖诊断工具")
print("=" * 80)

# 关键路径
PATHS = {
    "qai_libs": "C:/ai-engine-direct-helper/samples/qai_libs",
    "model_dir": "C:/model",
    "system32": "C:/Windows/System32",
    "syswow64": "C:/Windows/SysWOW64",
}

# 检查的 DLL 列表
QNN_DLLS = [
    "QnnHtp.dll",        # NPU 后端
    "QnnCpu.dll",        # CPU 后端
    "QnnGpu.dll",        # GPU 后端
    "QnnSystem.dll",     # 系统库
    "QnnInterface.dll",  # 接口
]

VC_RUNTIME_DLLS = [
    "msvcp140.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "ucrtbase.dll",
    "concrt140.dll",
]

def check_file_exists(path, desc):
    """检查文件是否存在"""
    p = Path(path)
    exists = p.exists()
    size = p.stat().st_size if exists else 0
    status = "✅ 存在" if exists else "❌ 缺失"
    print(f"{status} {desc}: {path} ({size:,} bytes)")
    return exists, size

def check_dll_loadable(dll_path):
    """测试 DLL 是否可以加载"""
    try:
        ctypes.WinDLL(str(dll_path))
        return True, None
    except Exception as e:
        return False, str(e)

def run_command(cmd, desc):
    """运行命令并捕获输出"""
    print(f"\n🔧 {desc}: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        print(f"   退出码: {result.returncode}")
        if result.stdout.strip():
            print(f"   输出: {result.stdout[:500]}")
        if result.stderr.strip():
            print(f"   错误: {result.stderr[:500]}")
        return result.returncode == 0, result
    except subprocess.TimeoutExpired:
        print("   ⚠️ 超时")
        return False, None
    except Exception as e:
        print(f"   ❌ 异常: {e}")
        return False, None

def check_vc_redist():
    """检查 VC++ 运行时安装"""
    print("\n" + "=" * 60)
    print("VC++ 运行时环境检查")
    print("=" * 60)
    
    # 检查注册表键值
    import winreg
    vc_versions = []
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64")
        version = winreg.QueryValueEx(key, "Version")[0]
        vc_versions.append(("VC++ 2015-2022 x64", version))
        winreg.CloseKey(key)
    except:
        pass
    
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x86")
        version = winreg.QueryValueEx(key, "Version")[0]
        vc_versions.append(("VC++ 2015-2022 x86", version))
        winreg.CloseKey(key)
    except:
        pass
    
    if vc_versions:
        for name, ver in vc_versions:
            print(f"✅ {name}: {ver}")
    else:
        print("❌ 未检测到 VC++ 2015-2022 运行时")
    
    # 检查系统目录中的 DLL
    print(f"\n系统目录 DLL 检查 ({PATHS['system32']}):")
    for dll in VC_RUNTIME_DLLS:
        check_file_exists(f"{PATHS['system32']}/{dll}", dll)
    
    # 检查 qai_libs 中的 DLL
    print(f"\nQAI库目录 DLL 检查 ({PATHS['qai_libs']}):")
    for dll in VC_RUNTIME_DLLS:
        check_file_exists(f"{PATHS['qai_libs']}/{dll}", dll)

def check_qnn_dlls():
    """检查 QNN DLL 文件"""
    print("\n" + "=" * 60)
    print("QNN DLL 文件检查")
    print("=" * 60)
    
    qai_libs = PATHS['qai_libs']
    print(f"检查目录: {qai_libs}")
    
    for dll in QNN_DLLS:
        dll_path = f"{qai_libs}/{dll}"
        exists, size = check_file_exists(dll_path, dll)
        if exists:
            loadable, error = check_dll_loadable(dll_path)
            if loadable:
                print(f"   ✅ 可加载")
            else:
                print(f"   ❌ 加载失败: {error}")

def check_path_env():
    """检查 PATH 环境变量"""
    print("\n" + "=" * 60)
    print("PATH 环境变量检查")
    print("=" * 60)
    
    path_env = os.environ.get('PATH', '')
    paths = path_env.split(';')
    
    qai_libs = PATHS['qai_libs']
    in_path = qai_libs in path_env
    
    print(f"QAI库路径: {qai_libs}")
    print(f"是否在 PATH 中: {'✅ 是' if in_path else '❌ 否'}")
    
    if not in_path:
        print(f"\n建议添加:")
        print(f'set PATH={qai_libs};%PATH%')

def check_python_env():
    """检查 Python 环境"""
    print("\n" + "=" * 60)
    print("Python 环境检查")
    print("=" * 60)
    
    print(f"Python 版本: {platform.python_version()}")
    print(f"Python 路径: {sys.executable}")
    print(f"系统架构: {platform.architecture()[0]}")
    
    # 检查 qai_appbuilder 模块
    try:
        import qai_appbuilder
        print(f"✅ qai_appbuilder 模块: {qai_appbuilder.__file__}")
        
        # 检查版本
        if hasattr(qai_appbuilder, '__version__'):
            print(f"   版本: {qai_appbuilder.__version__}")
        else:
            print(f"   版本: 未知")
    except ImportError as e:
        print(f"❌ qai_appbuilder 模块导入失败: {e}")

def check_genie_context():
    """测试 GenieContext 加载"""
    print("\n" + "=" * 60)
    print("GenieContext 加载测试")
    print("=" * 60)
    
    config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
    exists, size = check_file_exists(config_path, "配置文件")
    
    if not exists:
        print("❌ 配置文件不存在，跳过 GenieContext 测试")
        return False
    
    # 尝试导入和创建 GenieContext
    try:
        from qai_appbuilder import GenieContext
        
        print("尝试创建 GenieContext 实例...")
        start = time.time()
        genie = GenieContext(config_path)
        load_time = time.time() - start
        
        print(f"✅ GenieContext 创建成功")
        print(f"   加载时间: {load_time:.2f}s")
        print(f"   对象类型: {type(genie).__name__}")
        
        # 尝试设置参数
        genie.SetParams(128, 0.8, 40, 0.95)
        print(f"✅ 参数设置成功")
        
        return True
    except Exception as e:
        print(f"❌ GenieContext 创建失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    import time
    
    # 执行检查
    check_python_env()
    check_path_env()
    check_vc_redist()
    check_qnn_dlls()
    
    # 最后测试 GenieContext
    print("\n" + "=" * 80)
    print("最终诊断结果")
    print("=" * 80)
    
    success = check_genie_context()
    
    if success:
        print("\n🎉 诊断完成: 所有检查通过")
        print("建议下一步: 运行 test_genie_context.py 进行完整测试")
    else:
        print("\n⚠️  诊断完成: 发现潜在问题")
        print("建议下一步:")
        print("1. 安装 VC++ 2015-2022 运行时 (x86 和 x64)")
        print("2. 复制系统 DLL 到 qai_libs 目录")
        print("3. 使用 Dependencies 工具分析缺失依赖")
        print("4. 重新运行此诊断脚本")
    
    return success

if __name__ == "__main__":
    main()