#!/usr/bin/env python3
import subprocess
import sys
import os

def run_command(cmd):
    print(f"执行: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"成功")
        if result.stdout.strip():
            print(f"输出: {result.stdout[:200]}")
    else:
        print(f"失败 (代码: {result.returncode})")
        if result.stderr.strip():
            print(f"错误: {result.stderr[:200]}")
    return result.returncode

def main():
    print("修复 venv_arm64 环境")
    print("=" * 60)
    
    # 检查Python
    python_exe = r"C:\test\antinet\venv_arm64\Scripts\python.exe"
    if not os.path.exists(python_exe):
        print(f"错误: Python不存在: {python_exe}")
        return 1
    
    # 测试基本导入
    print("\n[1] 测试基本导入...")
    test_code = "import sys; print('Python:', sys.version)"
    cmd = f'"{python_exe}" -c "{test_code}"'
    if run_command(cmd) != 0:
        print("基本导入失败，环境可能损坏")
        return 1
    
    # 重新安装核心依赖
    print("\n[2] 重新安装核心依赖...")
    core_packages = [
        "fastapi==0.128.0",
        "uvicorn[standard]==0.40.0",
        "pydantic==2.12.5",
        "numpy==2.4.1",
        "pandas==3.0.0",
        "duckdb==0.10.0",
        "sqlalchemy==2.0.25",
        "loguru==0.7.2",
        "onnx==1.15.0",
        "onnxruntime==1.17.0",
        "qai_appbuilder==2.38.0"
    ]
    
    for pkg in core_packages:
        cmd = f'"{python_exe}" -m pip install --force-reinstall "{pkg}"'
        run_command(cmd)
    
    # 验证安装
    print("\n[3] 验证安装...")
    test_imports = """
import sys
print("Python版本:", sys.version.split()[0])
packages = ['fastapi', 'uvicorn', 'pydantic', 'numpy', 'pandas', 'duckdb', 'sqlalchemy', 'loguru', 'onnx', 'onnxruntime', 'qai_appbuilder']
for pkg in packages:
    try:
        __import__(pkg)
        print(f"✓ {pkg}")
    except ImportError as e:
        print(f"✗ {pkg}: {e}")
"""
    
    temp_file = "test_imports_temp.py"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(test_imports)
    
    cmd = f'"{python_exe}" {temp_file}'
    result = run_command(cmd)
    
    # 清理
    if os.path.exists(temp_file):
        os.remove(temp_file)
    
    print("\n" + "=" * 60)
    if result == 0:
        print("修复完成！")
        print(f"使用以下命令运行程序:")
        print(f'  "{python_exe}" your_script.py')
    else:
        print("修复可能不完整，建议使用系统Python或重新创建虚拟环境")
    
    return result

if __name__ == "__main__":
    sys.exit(main())