@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo   Antinet - Build Package Tool
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

:: Clean up dist_package
if exist "dist_package" rmdir /s /q "dist_package"
mkdir dist_package
mkdir dist_package\static
mkdir dist_package\services
mkdir dist_package\backend
mkdir dist_package\backend\data

:: ========================================
echo [1/6] Cleanup...
echo ========================================
echo   Done
echo.

:: ========================================
echo [2/6] Build frontend...
echo ========================================
if not exist "node_modules" (
    echo   Installing dependencies...
    call pnpm install
)

echo   Running pnpm build:client...
call pnpm build:client

if not exist "dist\static\index.html" (
    echo   [ERROR] Frontend build failed!
    pause
    exit /b 1
)
echo   Done
echo.

:: ========================================
echo [3/6] Copy frontend files...
echo ========================================
robocopy "dist\static" "dist_package\static" /E /NFL /NDL /NJH /NJS >nul
copy /y "package.json" "dist_package\" >nul
echo. > "dist_package\build.flag"
:: Copy development database to package
if exist "backend\data\antinet.db" (
    echo   Copying database...
    copy /y "backend\data\antinet.db" "dist_package\backend\data\antinet.db" >nul
)
echo   Done
echo.

:: ========================================
echo [4/6] Build backend with PyInstaller...
echo ========================================
cd backend
call ..\venv_arm64\Scripts\python.exe -m PyInstaller AntinetBackend.spec --noconfirm
if not exist "dist\AntinetBackend.exe" (
    echo   [ERROR] PyInstaller build failed!
    cd ..
    pause
    exit /b 1
)
echo   Copying AntinetBackend.exe...
robocopy "dist" "..\dist_package\backend" /E /NFL /NDL /NJH /NJS >nul 2>&1
copy /y "build\AntinetBackend\"* "..\dist_package\backend\" >nul 2>&1
cd ..

:: Copy public fonts to backend
robocopy "public" "dist_package\backend\fonts" /E /NFL /NDL /NJH /NJS >nul 2>&1

echo   Done
echo.

:: ========================================
echo [5/6] Copy AI services...
echo ========================================

:: Genie AI Engine
if exist "ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73\GenieAPIService.exe" (
    echo   Copying Genie AI Engine...
    robocopy "ai-engine-direct-helper-main\samples\GenieAPIService_v2.1.4_QAIRT_v2.42.0_v73" "dist_package\services\GenieAPIService" /E /NFL /NDL /NJH /NJS >nul
)

:: AI Models - put in services\models directory
if exist "models" (
    robocopy "models" "dist_package\services\models" /E /NFL /NDL /NJH /NJS >nul 2>&1
)
echo   Done
echo.

:: ========================================
echo [6/6] Create startup script...
echo ========================================

(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo.
echo echo ========================================
echo echo   Antinet - Starting
echo echo ========================================
echo.
echo :: Check Node.js
echo where node ^>nul 2^>^&1
echo if errorlevel 1 ^(
echo     echo [ERROR] Node.js not found! Please install Node.js first.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo [0/3] Stopping old processes...
echo taskkill /F /IM python.exe ^>nul 2^>^&1
echo taskkill /F /IM node.exe ^>nul 2^>^&1
echo taskkill /F /IM AntinetBackend.exe ^>nul 2^>^&1
echo taskkill /F /IM GenieAPIService.exe ^>nul 2^>^&1
echo timeout /t 1 /nobreak ^>nul
echo.
echo :: [1/3] Genie AI Engine
echo if exist "services\GenieAPIService\GenieAPIService.exe" ^(
echo     if exist "services\models\qwen2.5vl3b-8380-2.42\config.json" ^(
echo         echo [1/3] Starting Genie AI Engine...
echo         start "Genie AI" cmd /k "services\GenieAPIService\GenieAPIService.exe -c services\models\qwen2.5vl3b-8380-2.42\config.json -l -p 8910 -d 3"
echo     ^) else ^(
echo         echo [1/3] Genie config.json not found, starting without vision model...
echo         start "Genie AI" cmd /k "services\GenieAPIService\GenieAPIService.exe -l -p 8910 -d 0"
echo     ^)
echo     timeout /t 5 /nobreak ^>nul
echo ^) else ^(
echo     echo [1/3] Genie AI Engine not found - AI features disabled
echo ^)
echo.
echo :: [2/3] Backend
echo echo [2/3] Starting Backend...
echo start "Antinet Backend" cmd /k "backend\AntinetBackend.exe"
echo timeout /t 5 /nobreak ^>nul
echo.
echo :: [3/3] Frontend
echo echo [3/3] Starting Frontend...
echo if exist "static\index.html" ^(
echo     start "Antinet Frontend" cmd /k "npx -y serve static -p 3000 --single"
echo ^) else ^(
echo     start "Antinet Frontend" cmd /k "npx -y vite --host --port 3000"
echo ^)
echo timeout /t 5 /nobreak ^>nul
echo.
echo echo.
echo echo Opening browser...
echo start http://localhost:3000
echo.
echo echo ========================================
echo echo   Started!
echo echo   - Frontend: http://localhost:3000
echo echo   - Backend:  http://localhost:8000
echo echo   - Genie:    http://localhost:8910
echo echo ========================================
echo.
echo pause
) > "dist_package\start.bat"

echo   Done
echo.

:: ========================================
:: Create README
:: ========================================
(
echo Antinet - Installation Guide
echo ========================================
echo.
echo Quick Start:
echo   Double-click "start.bat"
echo.
echo Services:
echo   - Frontend:  http://localhost:3000
echo   - Backend:   http://localhost:8000
echo   - Genie:     http://localhost:8910  ^(AI Engine^)
echo.
echo Stop:
echo   Close all command windows
echo.
echo Directory:
echo   dist_package\
echo   - backend\         Backend exe ^(PyInstaller^)
echo   - static\          Frontend files
echo   - services\        AI models ^(if included^)
echo   - start.bat        Startup script
echo.
echo ========================================
echo   Antinet v1.0
) > "dist_package\README.txt"

echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Output: %SCRIPT_DIR%\dist_package\
echo.
echo Files:
echo   - backend\             ^(PyInstaller exe^)
echo   - static\              ^(Frontend^)
echo   - services\            ^(AI models^)
echo   - start.bat            ^(Startup script^)
echo   - README.txt           ^(Guide^)
echo.
echo ========================================
set /p choice=Press Y to compress to ZIP, or any key to exit: 
if /i "!choice!"=="Y" (
    echo.
    echo Compressing...
    powershell -Command "Compress-Archive -Path 'dist_package\*' -DestinationPath 'Antinet_v1.0.zip' -Force"
    echo Done: Antinet_v1.0.zip
)

echo.
pause
explorer "%SCRIPT_DIR%\dist_package"
