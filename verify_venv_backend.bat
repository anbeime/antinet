@echo off
echo ========================================
echo Antinet 虚拟环境后端验证
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在！
    exit /b 1
)

echo [1/4] Python 版本
venv_arm64\Scripts\python.exe --version
echo.

echo [2/4] 导入测试
venv_arm64\Scripts\python.exe -c "import fastapi, uvicorn, pandas, numpy, sqlalchemy, pydantic, loguru; print('所有模块导入成功')"
if %errorlevel% neq 0 (
    echo [错误] 模块导入失败
    exit /b 1
)
echo.

echo [3/4] QAI AppBuilder
venv_arm64\Scripts\python.exe -c "import qai_appbuilder; print('NPU 支持正常')"
if %errorlevel% neq 0 (
    echo [警告] QAI AppBuilder 导入失败（NPU 功能可能不可用）
)
echo.

echo [4/4] 数据库模块
venv_arm64\Scripts\python.exe backend\database.py >nul 2>&1
if %errorlevel% equ 0 (
    echo [成功] 数据库模块正常
) else (
    echo [警告] 数据库模块可能有问题
)
echo.

echo ========================================
echo 验证完成！
echo ========================================
echo.
echo 启动后端：
echo   start_backend_with_venv.bat
echo.
pause
