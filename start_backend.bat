@echo off
REM ========================================
REM   Antinet Backend Service Starter
REM   Using Virtual Environment
REM ========================================
echo ========================================
echo   Antinet Backend Service
echo ========================================
echo.

cd /d "%~dp0"

REM Configure NPU environment
call set_env.bat
echo.
echo Checking Python environment...

REM Priority: Use virtual environment (ARM64 version)
set "PYTHON_EXE=python"
if exist "venv_arm64\Scripts\python.exe" (
    set "PYTHON_EXE=venv_arm64\Scripts\python.exe"
    echo [INFO] Using ARM64 virtual environment
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    echo [INFO] Using x64 virtual environment
) else (
    echo [INFO] Using system Python environment
)

%PYTHON_EXE% --version
if errorlevel 1 (
    echo [ERROR] Python not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Checking dependencies...
%PYTHON_EXE% -c "import fastapi, qai_appbuilder, onnxruntime, numpy, pandas, duckdb, sqlalchemy, loguru; print('All dependencies OK')"
if errorlevel 1 (
    echo [WARNING] Some dependencies missing, installing...
    %PYTHON_EXE% -m pip install -r backend\requirements.txt
    REM Check if QAI AppBuilder is installed
    %PYTHON_EXE% -c "import qai_appbuilder" 2>nul
    if errorlevel 1 (
        echo [INFO] Installing QAI AppBuilder ARM64 version...
        %PYTHON_EXE% -m pip install "C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    )
    echo [INFO] Dependencies installation complete
)

echo.
echo Starting backend service...
echo Service URL: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Press Ctrl+C to stop service
echo.

REM Run from project root using module syntax
%PYTHON_EXE% -m backend.main

pause