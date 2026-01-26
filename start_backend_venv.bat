@echo off
chcp 65001 >nul
cd /d C:\test\antinet

echo ========================================
echo   Starting Antinet Backend (NPU Mode)
echo ========================================
echo.

REM Activate virtual environment
if exist "venv_arm64\Scripts\activate.bat" (
    echo [INFO] Activating ARM64 virtual environment...
    call venv_arm64\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment venv_arm64 not found
    pause
    exit /b 1
)

echo.
echo [INFO] Python version:
python --version

echo.
echo [INFO] Python path:
python -c "import sys; print(sys.executable)"

echo.
echo [INFO] Checking qai_appbuilder...
python -c "import qai_appbuilder; print('[OK] qai_appbuilder installed')"
if errorlevel 1 (
    echo [ERROR] qai_appbuilder not installed
    pause
    exit /b 1
)

echo.
echo [INFO] Starting backend service...
echo [INFO] Service URL: http://localhost:8000
echo [INFO] API Docs: http://localhost:8000/docs
echo [INFO] Press Ctrl+C to stop
echo.

python backend\main.py

pause
