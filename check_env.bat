@echo off
chcp 65001 >nul
echo ========================================
echo   Python环境检查工具
echo ========================================
echo.

echo [1] 检查venv_arm64环境...
if exist "venv_arm64\Scripts\python.exe" (
    venv_arm64\Scripts\python.exe -c "
import sys
import platform
print('Python路径:', sys.executable)
print('Python版本:', sys.version)
print('平台:', platform.platform())
print('机器类型:', platform.machine())
print('架构:', platform.architecture())

packages = ['fastapi', 'uvicorn', 'pydantic', 'numpy', 'pandas', 'duckdb', 'sqlalchemy', 'loguru', 'onnx', 'onnxruntime', 'qai_appbuilder']
print('\n核心依赖检查:')
for pkg in packages:
    try:
        __import__(pkg)
        print(f'  ✓ {pkg}')
    except ImportError as e:
        print(f'  ✗ {pkg}: {e}')
    "
) else (
    echo   ✗ venv_arm64 不存在
)

echo.
echo [2] 检查系统ARM64 Python...
if exist "C:\Users\AI-PC-19\AppData\Local\Programs\Python\Python312-arm64\python.exe" (
    "C:\Users\AI-PC-19\AppData\Local\Programs\Python\Python312-arm64\python.exe" -c "
import sys
import platform
print('Python路径:', sys.executable)
print('Python版本:', sys.version)
print('平台:', platform.platform())
print('机器类型:', platform.machine())
print('架构:', platform.architecture())

packages = ['fastapi', 'uvicorn', 'pydantic', 'numpy', 'pandas', 'duckdb', 'sqlalchemy', 'loguru', 'onnx', 'onnxruntime', 'qai_appbuilder']
print('\n核心依赖检查:')
for pkg in packages:
    try:
        __import__(pkg)
        print(f'  ✓ {pkg}')
    except ImportError as e:
        print(f'  ✗ {pkg}: {e}')
    "
) else (
    echo   ✗ 系统ARM64 Python 不存在
)

echo.
echo ========================================
echo   使用说明:
echo   1. 使用venv_arm64: run_diagnose.bat
echo   2. 安装系统Python依赖: python setup_arm64_env.py
echo ========================================
pause