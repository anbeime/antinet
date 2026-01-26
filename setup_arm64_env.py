#!/usr/bin/env python3
"""
ARM64 Python环境安装脚本
使用系统ARM64 Python安装所有必要依赖
"""
import sys
import subprocess
import os
from pathlib import Path

def run_command(cmd, description):
    """运行命令并显示结果"""
    print(f"\n[{description}]")
    print(f"命令: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ 成功")
            if result.stdout.strip():
                print(f"输出: {result.stdout.strip()}")
        else:
            print(f"✗ 失败: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"✗ 异常: {e}")
        return False

def main():
    print("=" * 60)
    print("ARM64 Python环境安装工具（安全版）")
    print("=" * 60)
    print("  注意：此脚本不会升级Python或pip，仅安装缺失依赖")
    print("=" * 60)
    
    # 确定Python路径
    python_exe = r"C:\Users\AI-PC-19\AppData\Local\Programs\Python\Python312-arm64\python.exe"
    
    if not os.path.exists(python_exe):
        print(f"错误: Python不存在: {python_exe}")
        return 1
    
    print(f"使用Python: {python_exe}")
    
    # 检查当前pip版本和已安装包
    print("\n[1] 检查当前环境状态...")
    import subprocess
    result = subprocess.run(f'"{python_exe}" -m pip list', shell=True, capture_output=True, text=True)
    installed_packages = set()
    for line in result.stdout.split('\n'):
        if line and not line.startswith('Package') and not line.startswith('---'):
            parts = line.split()
            if len(parts) >= 1:
                installed_packages.add(parts[0].lower())
    
    print(f"已安装包数量: {len(installed_packages)}")
    if installed_packages:
        print("主要包:", [p for p in installed_packages if p not in ['pip', 'setuptools', 'wheel']])
    
    # 2. 安装QAI AppBuilder ARM64版本（首要）
    print("\n[2] 安装QAI AppBuilder ARM64版本...")
    arm64_wheel = r"C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    if os.path.exists(arm64_wheel):
        if 'qai_appbuilder' in installed_packages:
            print("  ✓ qai_appbuilder 已安装，跳过")
        else:
            run_command(f'"{python_exe}" -m pip install "{arm64_wheel}"', "安装QAI AppBuilder ARM64")
    else:
        print(f"  ✗ ARM64 wheel不存在: {arm64_wheel}")
        print("  请确认文件位置或使用现有venv_arm64环境")
        return 1
    
    # 3. 选择性安装基础依赖（仅必需的核心依赖）
    print("\n[3] 选择性安装核心依赖...")
    core_packages = [
        ('fastapi', 'fastapi'),
        ('uvicorn', 'uvicorn[standard]'),
        ('pydantic', 'pydantic'),
        ('numpy', 'numpy'),
        ('pandas', 'pandas'),
        ('duckdb', 'duckdb'),
        ('sqlalchemy', 'sqlalchemy'),
        ('loguru', 'loguru'),
        ('onnx', 'onnx'),
        ('onnxruntime', 'onnxruntime'),
    ]
    
    missing = []
    for pkg_name, pkg_install in core_packages:
        if pkg_name not in installed_packages:
            missing.append(pkg_install)
    
    if missing:
        print(f"  需要安装 {len(missing)} 个缺失依赖")
        # 分批安装避免问题
        install_cmd = f'"{python_exe}" -m pip install ' + ' '.join(missing)
        run_command(install_cmd, "安装缺失依赖")
    else:
        print("  ✓ 所有核心依赖已安装")
    
    # 4. 验证安装
    print("\n[4] 验证安装...")
    test_code = """
import sys
print(f"Python: {sys.version.split()[0]}")
print(f"执行路径: {sys.executable}")

essential = ['qai_appbuilder', 'onnxruntime']
optional = ['fastapi', 'uvicorn', 'pydantic', 'numpy', 'pandas', 'duckdb', 'sqlalchemy', 'loguru', 'onnx']

print("\\n必需依赖:")
for pkg in essential:
    try:
        __import__(pkg)
        ver = ''
        try:
            import pkg_resources
            ver = pkg_resources.get_distribution(pkg).version
        except:
            pass
        print(f"  ✓ {pkg}" + (f" ({ver})" if ver else ""))
    except ImportError as e:
        print(f"  ✗ {pkg}: {e}")

print("\\n可选依赖:")
for pkg in optional:
    try:
        __import__(pkg)
        print(f"  ✓ {pkg}")
    except ImportError:
        print(f"  - {pkg} (未安装)")
"""
    
    temp_file = "verify_install.py"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(test_code)
    
    run_command(f'"{python_exe}" {temp_file}', "验证安装")
    
    # 清理
    if os.path.exists(temp_file):
        os.remove(temp_file)
    
    print("\n" + "=" * 60)
    print("安装完成（安全模式）！")
    print("\n环境使用说明:")
    print(f"  1. 直接运行: \"{python_exe}\" your_script.py")
    print(f"  2. 交互模式: \"{python_exe}\" -i your_script.py")
    print("\n  注意：如需完整后端功能，建议使用现有venv_arm64环境")
    print("  venv_arm64已包含所有依赖，无需额外安装")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())