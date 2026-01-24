@echo off
REM 启动Antinet后端服务
echo ========================================
echo   Antinet 后端服务启动脚本
echo ========================================
echo.

cd /d "%~dp0backend"

echo 检查Python环境...

REM 优先使用虚拟环境（ARM64版本）
set "PYTHON_EXE=python"
if exist "..\venv_arm64\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv_arm64\Scripts\python.exe"
    echo [信息] 使用 ARM64 虚拟环境
) else if exist "..\venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv\Scripts\python.exe"
    echo [信息] 使用 x64 虚拟环境
) else (
    echo [信息] 使用系统 Python 环境
)

%PYTHON_EXE% --version
if errorlevel 1 (
    echo [错误] Python未安装或未添加到PATH
    pause
    exit /b 1
)

echo.
echo 检查依赖...
%PYTHON_EXE% -c "import fastapi, qai_appbuilder, onnxruntime, numpy, pandas, duckdb, sqlalchemy, loguru; print('所有依赖检查通过')"
if errorlevel 1 (
    echo [警告] 部分依赖未安装，正在安装...
    %PYTHON_EXE% -m pip install -r requirements.txt
    REM 检查是否安装了 qai_appbuilder
    %PYTHON_EXE% -c "import qai_appbuilder" 2>nul
    if errorlevel 1 (
        echo [信息] 正在安装 QAI AppBuilder...
        %PYTHON_EXE% -m pip install "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
    )
    echo [信息] 依赖安装完成
)

echo.
echo 启动后端服务...
echo 服务地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo 按 Ctrl+C 停止服务
echo.

%PYTHON_EXE% main.py

pause
