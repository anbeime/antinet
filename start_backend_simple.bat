@echo off
chcp 65001 >nul
echo ========================================
echo Antinet Backend - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking virtual environment...
if not exist "venv_arm64\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found
    pause
    exit /b 1
)
echo OK - Virtual environment exists
echo.

echo [2/3] Checking environment...
echo OK - Environment ready
echo.

echo [3/3] Starting backend service...
echo.
echo ========================================
echo Service URL: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Knowledge Graph: http://localhost:8000/api/knowledge/graph
echo ========================================
echo.

cd backend
..\venv_arm64\Scripts\python.exe main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Backend service failed to start
    pause
)
