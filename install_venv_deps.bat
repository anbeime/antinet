@echo off
REM ====================================
REM Antinet - 虚拟环境依赖安装脚本
REM ====================================
echo.
echo ========================================
echo Antinet 智能知识管家 - 虚拟环境安装
echo ========================================
echo.

REM 检查虚拟环境是否存在
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在！
    echo 请先创建虚拟环境：python -m venv venv_arm64
    pause
    exit /b 1
)

echo [信息] 检测到虚拟环境：venv_arm64
echo [信息] Python 版本：
venv_arm64\Scripts\python.exe --version
echo.

REM 安装后端依赖
echo [步骤 1/3] 安装后端依赖...
venv_arm64\Scripts\pip.exe install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败！
    pause
    exit /b 1
)
echo [成功] 后端依赖安装完成
echo.

REM 检查 QAI AppBuilder
echo [步骤 2/3] 检查 QAI AppBuilder...
venv_arm64\Scripts\pip.exe show qai_appbuilder >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] QAI AppBuilder 未安装
    echo.
    echo 如果在 AIPC 上运行，请安装：
    echo venv_arm64\Scripts\pip.exe install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl
    echo.
) else (
    venv_arm64\Scripts\pip.exe show qai_appbuilder | findstr "Version"
    echo [成功] QAI AppBuilder 已安装
)
echo.

REM 验证关键依赖
echo [步骤 3/3] 验证关键依赖...
venv_arm64\Scripts\pip.exe show fastapi >nul 2>&1
venv_arm64\Scripts\pip.exe show uvicorn >nul 2>&1
venv_arm64\Scripts\pip.exe show pandas >nul 2>&1
venv_arm64\Scripts\pip.exe show pydantic >nul 2>&1

if %errorlevel% equ 0 (
    echo [成功] 所有关键依赖已正确安装
) else (
    echo [警告] 部分依赖可能缺失
)

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 使用虚拟环境启动后端：
echo   start_backend_with_venv.bat
echo.
echo 或手动激活虚拟环境：
echo   venv_arm64\Scripts\activate
echo   cd backend
echo   python main.py
echo.
pause
