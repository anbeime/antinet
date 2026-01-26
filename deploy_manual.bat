@echo off
REM Manual deployment steps for Antinet

echo ========================================
echo   Antinet Manual Deployment
echo ========================================
echo.

echo Step 1: Installing backend dependencies...
cd /d "%~dp0backend"
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.

echo Step 2: Checking QAI AppBuilder...
python -c "import qai_appbuilder" >nul 2>&1
if errorlevel 1 (
    echo QAI AppBuilder not installed
    echo Please install manually if needed
) else (
    echo [OK] QAI AppBuilder already installed
)
echo.

echo Step 3: Verifying frontend dependencies...
cd ..
if not exist "node_modules" (
    echo Frontend dependencies not found, installing...
    pnpm install
) else (
    echo [OK] Frontend dependencies already installed
)
echo.

echo Step 4: Creating data directory...
if not exist "backend\data" mkdir "backend\data"
echo [OK] Data directory ready
echo.

echo ========================================
echo   Manual Deployment Complete!
echo ========================================
echo.
echo To start services:
echo   Backend: start_backend.bat
echo   Frontend: pnpm run dev
echo.
pause
