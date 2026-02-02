@echo off
REM ====================================
REM Antinet - 虚拟环境测试脚本
REM ====================================
echo.
echo ========================================
echo Antinet 虚拟环境测试
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在！
    pause
    exit /b 1
)

echo [测试 1/5] Python 版本
venv_arm64\Scripts\python.exe --version
echo.

echo [测试 2/5] 关键依赖
venv_arm64\Scripts\pip.exe show fastapi | findstr "Version"
venv_arm64\Scripts\pip.exe show uvicorn | findstr "Version"
venv_arm64\Scripts\pip.exe show pandas | findstr "Version"
venv_arm64\Scripts\pip.exe show pydantic | findstr "Version"
echo.

echo [测试 3/5] QAI AppBuilder（NPU 支持）
venv_arm64\Scripts\pip.exe show qai_appbuilder >nul 2>&1
if %errorlevel% equ 0 (
    echo [成功] QAI AppBuilder 已安装
    venv_arm64\Scripts\pip.exe show qai_appbuilder | findstr "Version"
) else (
    echo [警告] QAI AppBuilder 未安装（NPU 功能不可用）
)
echo.

echo [测试 4/5] 导入测试
venv_arm64\Scripts\python.exe -c "import fastapi; import uvicorn; import pandas; import numpy; print('所有核心模块导入成功')"
if %errorlevel% equ 0 (
    echo [成功] 核心模块导入正常
) else (
    echo [错误] 模块导入失败
)
echo.

echo [测试 5/5] 数据库初始化
if exist "backend\database.py" (
    venv_arm64\Scripts\python.exe -c "from backend.database import engine; print('数据库连接测试通过')" 2>nul
    if %errorlevel% equ 0 (
        echo [成功] 数据库模块正常
    ) else (
        echo [警告] 数据库模块可能有问题
    )
) else (
    echo [跳过] database.py 不存在
)

echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 使用虚拟环境启动后端：
echo   start_backend_with_venv.bat
echo.
pause
