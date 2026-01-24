@echo off
REM 安装 Antinet 后端依赖
echo ========================================
echo   Antinet 依赖安装脚本
echo ========================================
echo.

REM 检查是否在项目根目录
if not exist "backend\requirements.txt" (
    echo [错误] 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo 可用虚拟环境:
echo   1. venv_arm64 (ARM64 NPU 推荐)
echo   2. venv (x64)
echo   3. 系统 Python
echo.

set /p choice="请选择环境 (1/2/3 默认 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    set "VENV_PATH=venv_arm64"
    set "VENV_DESC=ARM64 虚拟环境"
) else if "%choice%"=="2" (
    set "VENV_PATH=venv"
    set "VENV_DESC=x64 虚拟环境"
) else if "%choice%"=="3" (
    set "VENV_PATH="
    set "VENV_DESC=系统 Python"
) else (
    echo [错误] 无效选择
    pause
    exit /b 1
)

if not "%VENV_PATH%"=="" (
    if not exist "%VENV_PATH%\Scripts\python.exe" (
        echo [信息] 创建虚拟环境 %VENV_PATH%...
        python -m venv %VENV_PATH%
        if errorlevel 1 (
            echo [错误] 虚拟环境创建失败
            pause
            exit /b 1
        )
    )
    set "PYTHON_EXE=%VENV_PATH%\Scripts\python.exe"
    echo [信息] 使用 %VENV_DESC%
) else (
    set "PYTHON_EXE=python"
    echo [信息] 使用系统 Python
)

echo.
echo 检查 Python 版本...
%PYTHON_EXE% --version
if errorlevel 1 (
    echo [错误] Python 不可用
    pause
    exit /b 1
)

echo.
echo 安装基础依赖...
%PYTHON_EXE% -m pip install --upgrade pip
%PYTHON_EXE% -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [警告] 部分依赖安装失败
)

echo.
echo 安装 QAI AppBuilder...
%PYTHON_EXE% -m pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
if errorlevel 1 (
    echo [警告] QAI AppBuilder 安装失败，请手动安装
)

echo.
echo 验证安装...
%PYTHON_EXE% -c "
import fastapi, qai_appbuilder, onnxruntime, numpy, pandas, duckdb, sqlalchemy, loguru
print('✓ FastAPI:', fastapi.__version__)
print('✓ NumPy:', numpy.__version__)
print('✓ Pandas:', pandas.__version__)
print('✓ ONNX Runtime:', onnxruntime.__version__)
print('✓ 所有核心依赖安装成功！')
"
if errorlevel 1 (
    echo [警告] 部分依赖验证失败
) else (
    echo [成功] %VENV_DESC% 依赖安装完成
)

echo.
echo 使用说明:
echo   启动后端: start_backend.bat
echo   手动激活虚拟环境: %VENV_PATH%\Scripts\activate.bat
echo.

pause