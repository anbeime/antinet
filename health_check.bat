@echo off
REM ========================================
REM   Antinet Health Check Script
REM   Check service status and system health
REM   Virtual Environment Support
REM ========================================

echo.
echo ========================================
echo   Antinet - Health Check
echo ========================================
echo.

set "PASS=0"
set "FAIL=0"
set "WARN=0"

REM ========================================
REM 1. Environment Check
REM ========================================
echo [1/8] Environment Check
echo ----------------------------------------

REM Check System Python
python --version >nul 2>&1
if errorlevel 1 (
    echo   [X] System Python not installed
    set /a FAIL+=1
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do (
        echo   [OK] System Python %%i
        set /a PASS+=1
    )
)

REM Check Virtual Environment
set "VENV_PYTHON="
if exist "venv_arm64\Scripts\python.exe" (
    set "VENV_PYTHON=venv_arm64\Scripts\python.exe"
    for /f "tokens=2" %%i in ('venv_arm64\Scripts\python.exe --version 2^>^&1') do (
        echo   [OK] Virtual Environment Python %%i (ARM64)
        set /a PASS+=1
    )
) else if exist "venv\Scripts\python.exe" (
    set "VENV_PYTHON=venv\Scripts\python.exe"
    for /f "tokens=2" %%i in ('venv\Scripts\python.exe --version 2^>^&1') do (
        echo   [OK] Virtual Environment Python %%i (x64)
        set /a PASS+=1
    )
) else (
    echo   [WARN] No virtual environment found
    set /a WARN+=1
    set "VENV_PYTHON=python"
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js not installed
    set /a FAIL+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do (
        echo   [OK] Node.js %%i
        set /a PASS+=1
    )
)

REM Check pnpm
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo   [WARN] pnpm not installed
    set /a WARN+=1
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do (
        echo   [OK] pnpm %%i
        set /a PASS+=1
    )
)

echo.

REM ========================================
REM 2. Virtual Environment Check
REM ========================================
echo [2/8] Virtual Environment Check
echo ----------------------------------------

if exist "venv_arm64" (
    echo   [OK] venv_arm64 directory exists
    set /a PASS+=1
    if exist "venv_arm64\Scripts\activate.bat" (
        echo   [OK] Activation script exists
        set /a PASS+=1
    ) else (
        echo   [WARN] Activation script missing
        set /a WARN+=1
    )
) else if exist "venv" (
    echo   [OK] venv directory exists
    set /a PASS+=1
) else (
    echo   [WARN] No virtual environment directory found
    set /a WARN+=1
)

echo.

REM ========================================
REM 3. Dependencies Check
REM ========================================
echo [3/8] Dependencies Check
echo ----------------------------------------

REM Check backend dependencies in virtual environment
%VENV_PYTHON% -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if errorlevel 1 (
    echo   [X] Backend dependencies missing in virtual environment
    set /a FAIL+=1
) else (
    echo   [OK] Backend dependencies installed in virtual environment
    set /a PASS+=1
)

REM Check QAI AppBuilder
%VENV_PYTHON% -c "import qai_appbuilder" >nul 2>&1
if errorlevel 1 (
    echo   [X] QAI AppBuilder not installed in virtual environment
    set /a FAIL+=1
) else (
    echo   [OK] QAI AppBuilder installed in virtual environment
    set /a PASS+=1
)

REM Check frontend dependencies
if not exist "node_modules" (
    echo   [X] Frontend dependencies not installed
    set /a FAIL+=1
) else (
    echo   [OK] Frontend dependencies installed
    set /a PASS+=1
)

echo.

REM ========================================
REM 4. Configuration Files Check
REM ========================================
echo [4/8] Configuration Files Check
echo ----------------------------------------

if exist "backend\config.py" (
    echo   [OK] Backend configuration exists
    set /a PASS+=1
) else (
    echo   [X] Backend configuration missing
    set /a FAIL+=1
)

if exist "vite.config.ts" (
    echo   [OK] Frontend configuration exists
    set /a PASS+=1
) else (
    echo   [X] Frontend configuration missing
    set /a FAIL+=1
)

if exist "backend\data" (
    echo   [OK] Data directory exists
    set /a PASS+=1
) else (
    echo   [WARN] Data directory not found
    set /a WARN+=1
)

echo.

REM ========================================
REM 5. NPU Environment Check
REM ========================================
echo [5/8] NPU Environment Check
echo ----------------------------------------

set "QAI_LIBS=C:\ai-engine-direct-helper\samples\qai_libs"
set "BRIDGE_LIBS=C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"

if exist "%QAI_LIBS%\QnnHtp.dll" (
    echo   [OK] QAI library files exist
    set /a PASS+=1
) else (
    echo   [WARN] QAI library files missing
    set /a WARN+=1
)

if exist "%BRIDGE_LIBS%\QnnHtp.dll" (
    echo   [OK] Bridge library files exist
    set /a PASS+=1
) else (
    echo   [WARN] Bridge library files missing
    set /a WARN+=1
)

echo.

REM ========================================
REM 6. Service Status Check
REM ========================================
echo [6/8] Service Status Check
echo ----------------------------------------

REM Check backend service (port 8000)
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Backend service not running (port 8000)
    set /a WARN+=1
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
        echo   [OK] Backend service running (PID: %%a)
        set /a PASS+=1
    )
)

REM Check frontend service (port 3000)
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Frontend service not running (port 3000)
    set /a WARN+=1
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        echo   [OK] Frontend service running (PID: %%a)
        set /a PASS+=1
    )
)

echo.

REM ========================================
REM 7. API Health Check
REM ========================================
echo [7/8] API Health Check
echo ----------------------------------------

REM Try to access backend health check endpoint
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Backend API not responding
    set /a WARN+=1
) else (
    echo   [OK] Backend API responding
    set /a PASS+=1
)

echo.

REM ========================================
REM 8. System Resources Check
REM ========================================
echo [8/8] System Resources Check
echo ----------------------------------------

REM Check disk space
for /f "tokens=3" %%a in ('dir C:\ ^| findstr "bytes free"') do (
    set "FREE_SPACE=%%a"
)
echo   [OK] Disk free space: %FREE_SPACE% bytes

REM Check memory
for /f "skip=1 tokens=4" %%a in ('wmic OS get FreePhysicalMemory') do (
    set /a FREE_MEM=%%a/1024
    echo   [OK] Free memory: !FREE_MEM! MB
)

set /a PASS+=1

echo.

REM ========================================
REM Summary Report
REM ========================================
echo ========================================
echo   Health Check Report
echo ========================================
echo.
echo   Passed: %PASS%
echo   Failed: %FAIL%
echo   Warnings: %WARN%
echo.

if defined VENV_PYTHON (
    echo Virtual Environment: %VENV_PYTHON%
    echo.
)

if %FAIL% GTR 0 (
    echo [Status] System has critical issues, needs fixing
    echo.
    echo Suggested actions:
    echo   1. Run deploy_antinet.bat to redeploy
    echo   2. Check backend log: backend\backend.log
    echo   3. See detailed docs: DEPLOYMENT_GUIDE.md
) else if %WARN% GTR 0 (
    echo [Status] System is basically OK, but has warnings
    echo.
    echo Suggested actions:
    echo   1. Check warning items and fix
    echo   2. If services not running, run start_all.bat
) else (
    echo [Status] System is running normally!
    echo.
    echo Access URLs:
    echo   - Frontend: http://localhost:3000
    echo   - Backend:  http://localhost:8000
)

echo.
pause