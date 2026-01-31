@echo off
echo ========================================
echo Antinet Frontend Fix and Start
echo ========================================
echo.

echo [1/4] Checking backend service...
powershell -Command "$result = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue; if ($result) { Write-Host 'Backend service is running on port 8000' -ForegroundColor Green } else { Write-Host 'Backend service is not running, please start it first' -ForegroundColor Red; exit 1 }"
echo.

echo [2/4] Cleaning old build files...
if exist dist (
    rmdir /s /q dist
    echo Cleaned dist directory
)
echo.

echo [3/4] Building frontend...
call pnpm build:client
if errorlevel 1 (
    echo Frontend build failed
    pause
    exit /b 1
)
echo Frontend build successful
echo.

echo [4/4] Starting frontend dev server...
echo.
echo ========================================
echo Frontend will start at http://localhost:3000
echo Press Ctrl+C to stop
echo ========================================
echo.
call pnpm dev:client
