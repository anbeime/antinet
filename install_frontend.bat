@echo off
echo ====================================
echo Installing Frontend Dependencies
echo ====================================
echo.

cd /d C:\test\antinet\data-analysis-iteration\frontend

echo Step 1: Installing dependencies...
echo This may take a few minutes...
npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installation failed!
    echo.
    echo Try:
    echo 1. Check internet connection
    echo 2. Run: npm install --registry=https://registry.npmmirror.com
    pause
    exit /b 1
)

echo.
echo ====================================
echo Installation Complete!
echo ====================================
echo.
echo Step 2: Starting frontend...
echo.
echo Access URL: http://localhost:3001
echo.
npm run dev
