@echo off
REM ========================================
REM   Antinet Deploy Script
REM   Auto install and start services
REM   Virtual Environment Support
REM ========================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Antinet Smart Knowledge Manager
echo   One-Click Deployment Script
echo ========================================
echo.

REM Record start time
set START_TIME=%TIME%

REM ========================================
REM Step 1: Environment Check
REM ========================================
echo [Step 1/6] Environment Check
echo ----------------------------------------

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not installed or not in PATH
    echo.
    echo Please install Python 3.12.x ARM64 version
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] System Python %PYTHON_VERSION% installed

REM Check for virtual environment
set "VENV_PYTHON="
set "VENV_NAME="
if exist "venv_arm64\Scripts\python.exe" (
    set "VENV_PYTHON=venv_arm64\Scripts\python.exe"
    set "VENV_NAME=venv_arm64"
    echo [OK] Found ARM64 virtual environment
    for /f "tokens=2" %%i in ('venv_arm64\Scripts\python.exe --version 2^>^&1') do (
        echo [OK] Virtual environment Python %%i
    )
) else if exist "venv\Scripts\python.exe" (
    set "VENV_PYTHON=venv\Scripts\python.exe"
    set "VENV_NAME=venv"
    echo [OK] Found x64 virtual environment
    for /f "tokens=2" %%i in ('venv\Scripts\python.exe --version 2^>^&1') do (
        echo [OK] Virtual environment Python %%i
    )
) else (
    echo [INFO] No virtual environment found
    echo [INFO] Will use system Python
    set "VENV_PYTHON=python"
)

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed
    echo.
    echo Please install Node.js 18.x or higher
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% installed

REM Check pnpm
echo Checking pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo [WARN] pnpm not installed, installing...
    npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] pnpm installation failed
        pause
        exit /b 1
    )
    echo [OK] pnpm installed successfully
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo [OK] pnpm !PNPM_VERSION! installed
)

echo.

REM ========================================
REM Step 2: NPU Environment Setup
REM ========================================
echo [Step 2/6] NPU Environment Setup
echo ----------------------------------------

echo Configuring NPU library paths...
call set_env.bat
if errorlevel 1 (
    echo [WARN] NPU environment setup had warnings (continuing)
)
echo [OK] NPU environment configured
echo.

REM ========================================
REM Step 3: Backend Dependencies
REM ========================================
echo [Step 3/6] Backend Dependencies Installation
echo ----------------------------------------

cd /d "%~dp0backend"

echo Using Python: %VENV_PYTHON%
echo.

echo Checking backend dependencies...
%VENV_PYTHON% -c "import fastapi, uvicorn, pydantic" >nul 2>&1
if errorlevel 1 (
    echo Installing backend dependencies...
    %VENV_PYTHON% -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Backend dependencies installation failed
        pause
        exit /b 1
    )
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

REM Check QAI AppBuilder
echo Checking QAI AppBuilder...
%VENV_PYTHON% -c "import qai_appbuilder" >nul 2>&1
if errorlevel 1 (
    echo Installing QAI AppBuilder...
    
    REM Try multiple possible paths
    set "QAI_WHL="
    if exist "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl" (
        set "QAI_WHL=C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
    ) else if exist "C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" (
        set "QAI_WHL=C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    ) else if exist "..\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" (
        set "QAI_WHL=..\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    )
    
    if defined QAI_WHL (
        %VENV_PYTHON% -m pip install "!QAI_WHL!"
        if errorlevel 1 (
            echo [ERROR] QAI AppBuilder installation failed
            pause
            exit /b 1
        )
        echo [OK] QAI AppBuilder installed
    ) else (
        echo [WARN] QAI AppBuilder package not found
        echo Searched paths:
        echo   - C:\ai-engine-direct-helper\samples\qai_appbuilder-*.whl
        echo   - C:\test\qai_appbuilder-*.whl
        echo   - .\qai_appbuilder-*.whl
        echo [INFO] Continuing without QAI AppBuilder (NPU features may not work)
    )
) else (
    echo [OK] QAI AppBuilder already installed
)

cd ..
echo.

REM ========================================
REM Step 4: Frontend Dependencies
REM ========================================
echo [Step 4/6] Frontend Dependencies Installation
echo ----------------------------------------

echo Checking frontend dependencies...
if not exist "node_modules" (
    echo Installing frontend dependencies...
    pnpm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependencies installation failed
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)
echo.

REM ========================================
REM Step 5: Configuration Verification
REM ========================================
echo [Step 5/6] Configuration Verification
echo ----------------------------------------

echo Verifying backend configuration...
if not exist "backend\config.py" (
    echo [ERROR] Backend configuration file not found
    pause
    exit /b 1
)
echo [OK] Backend configuration file exists

echo Verifying frontend configuration...
if not exist "vite.config.ts" (
    echo [ERROR] Frontend configuration file not found
    pause
    exit /b 1
)
echo [OK] Frontend configuration file exists

echo Verifying database directory...
if not exist "backend\data" mkdir "backend\data"
echo [OK] Database directory created

echo.

REM ========================================
REM Step 6: Service Startup
REM ========================================
echo [Step 6/6] Service Startup
echo ----------------------------------------

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo [OK] Environment check passed
echo [OK] NPU environment configured
echo [OK] Backend dependencies installed
echo [OK] Frontend dependencies installed
echo [OK] Configuration verified
echo.
if defined VENV_NAME (
    echo Virtual Environment: %VENV_NAME%
    echo Python Version: %VENV_PYTHON%
    echo.
)
echo ----------------------------------------
echo Service Access URLs:
echo ----------------------------------------
echo   Frontend:     http://localhost:3000
echo   NPU Analysis: http://localhost:3000/npu-analysis
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ----------------------------------------
echo.

REM Calculate deployment time
set END_TIME=%TIME%
echo Deployment time: %START_TIME% - %END_TIME%
echo.

echo Do you want to start services now?
echo   [1] Start backend service
echo   [2] Start frontend service
echo   [3] Start both services (Recommended)
echo   [4] Start manually later
echo.
set /p CHOICE="Please choose (1-4): "

if "%CHOICE%"=="1" (
    echo.
    echo Starting backend service...
    if defined VENV_PYTHON (
        start "Antinet Backend" cmd /k "cd /d %~dp0backend && ..\\%VENV_PYTHON% main.py"
    ) else (
        start "Antinet Backend" cmd /k "cd /d %~dp0backend && python main.py"
    )
    echo [OK] Backend service started in new window
    echo.
    echo Access URL: http://localhost:8000
    pause
) else if "%CHOICE%"=="2" (
    echo.
    echo Starting frontend service...
    start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
    echo [OK] Frontend service started in new window
    echo.
    echo Access URL: http://localhost:3000
    pause
) else if "%CHOICE%"=="3" (
    echo.
    echo Starting backend service...
    if defined VENV_PYTHON (
        start "Antinet Backend" cmd /k "cd /d %~dp0backend && ..\\%VENV_PYTHON% main.py"
    ) else (
        start "Antinet Backend" cmd /k "cd /d %~dp0backend && python main.py"
    )
    timeout /t 3 /nobreak >nul
    echo Starting frontend service...
    start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
    echo.
    echo [OK] Both services started in new windows
    echo.
    echo ----------------------------------------
    echo Access URLs:
    echo   Frontend: http://localhost:3000
    echo   Backend:  http://localhost:8000
    echo ----------------------------------------
    echo.
    echo TIP: Wait 5-10 seconds before accessing frontend
    pause
) else (
    echo.
    echo You can start services later with:
    echo.
    echo   Start all: start_all.bat
    echo   Or manually: 
    if defined VENV_PYTHON (
        echo     Backend: %VENV_PYTHON% backend\main.py
    ) else (
        echo     Backend: python backend\main.py
    )
    echo     Frontend: pnpm run dev
    echo.
    pause
)

endlocal