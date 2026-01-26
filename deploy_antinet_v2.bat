@echo off
REM ========================================
REM   Antinet Deploy Script v2
REM   Improved version with better error handling
REM ========================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Antinet Smart Knowledge Manager
echo   One-Click Deployment Script v2
echo ========================================
echo.

REM ========================================
REM Step 1: Environment Check
REM ========================================
echo [Step 1/6] Environment Check
echo ----------------------------------------

REM Check Python
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not installed
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% installed

REM Check Python architecture
for /f "tokens=*" %%i in ('python -c "import platform; print(platform.machine())"') do set PYTHON_ARCH=%%i
echo [OK] Python architecture: %PYTHON_ARCH%

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed
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
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] pnpm installation failed
        pause
        exit /b 1
    )
    echo [OK] pnpm installed
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo [OK] pnpm !PNPM_VERSION! installed
)

echo.
echo [Step 1/6] Complete - Environment check passed
echo.
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 2: NPU Environment Setup
REM ========================================
echo [Step 2/6] NPU Environment Setup
echo ----------------------------------------

if exist "set_env.bat" (
    echo Configuring NPU environment...
    call set_env.bat >nul 2>&1
    echo [OK] NPU environment configured
) else (
    echo [WARN] set_env.bat not found, skipping NPU setup
)

echo.
echo [Step 2/6] Complete
echo.
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 3: Backend Dependencies
REM ========================================
echo [Step 3/6] Backend Dependencies Installation
echo ----------------------------------------

cd /d "%~dp0backend"

REM Determine Python executable
set "PYTHON_EXE=python"
if exist "..\venv_arm64\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv_arm64\Scripts\python.exe"
    echo Using ARM64 virtual environment
) else if exist "..\venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv\Scripts\python.exe"
    echo Using x64 virtual environment
) else (
    echo Using system Python
)

echo.
echo Checking backend dependencies...
%PYTHON_EXE% -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Backend dependencies not installed, installing now...
    echo This may take 5-10 minutes...
    echo.
    %PYTHON_EXE% -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Backend dependencies installation failed
        cd ..
        pause
        exit /b 1
    )
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

echo.
echo Checking QAI AppBuilder...
%PYTHON_EXE% -c "import qai_appbuilder" >nul 2>&1
if errorlevel 1 (
    echo QAI AppBuilder not installed, searching for package...
    
    set "QAI_WHL="
    if exist "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl" (
        set "QAI_WHL=C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
    ) else if exist "C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" (
        set "QAI_WHL=C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    )
    
    if defined QAI_WHL (
        echo Installing QAI AppBuilder from: !QAI_WHL!
        %PYTHON_EXE% -m pip install "!QAI_WHL!"
        if errorlevel 1 (
            echo [WARN] QAI AppBuilder installation failed
            echo [INFO] You may need to install it manually later
        ) else (
            echo [OK] QAI AppBuilder installed
        )
    ) else (
        echo [WARN] QAI AppBuilder package not found
        echo [INFO] You may need to install it manually later
    )
) else (
    echo [OK] QAI AppBuilder already installed
)

cd ..
echo.
echo [Step 3/6] Complete
echo.
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 4: Frontend Dependencies
REM ========================================
echo [Step 4/6] Frontend Dependencies Installation
echo ----------------------------------------

if not exist "node_modules" (
    echo Frontend dependencies not installed, installing now...
    echo This may take 3-5 minutes...
    echo.
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
echo [Step 4/6] Complete
echo.
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 5: Configuration Verification
REM ========================================
echo [Step 5/6] Configuration Verification
echo ----------------------------------------

if exist "backend\config.py" (
    echo [OK] Backend configuration exists
) else (
    echo [WARN] Backend configuration not found
)

if exist "vite.config.ts" (
    echo [OK] Frontend configuration exists
) else (
    echo [WARN] Frontend configuration not found
)

if not exist "backend\data" (
    mkdir "backend\data"
    echo [OK] Database directory created
) else (
    echo [OK] Database directory exists
)

echo.
echo [Step 5/6] Complete
echo.
timeout /t 2 /nobreak >nul

REM ========================================
REM Step 6: Deployment Complete
REM ========================================
echo [Step 6/6] Deployment Summary
echo ----------------------------------------
echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo [OK] Environment verified
echo [OK] NPU environment configured
echo [OK] Backend dependencies installed
echo [OK] Frontend dependencies installed
echo [OK] Configuration verified
echo.
echo ----------------------------------------
echo Service Access URLs:
echo ----------------------------------------
echo   Frontend:     http://localhost:3000
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ----------------------------------------
echo.

echo Do you want to start services now?
echo.
echo   [1] Start backend only
echo   [2] Start frontend only
echo   [3] Start both (Recommended)
echo   [4] Exit (start manually later)
echo.
choice /C 1234 /N /M "Choose option (1-4): "
set CHOICE_NUM=%ERRORLEVEL%

if "%CHOICE_NUM%"=="1" (
    echo.
    echo Starting backend service...
    start "Antinet Backend" cmd /k "cd /d %~dp0 && start_backend.bat"
    echo [OK] Backend started in new window
    pause
) else if "%CHOICE_NUM%"=="2" (
    echo.
    echo Starting frontend service...
    start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
    echo [OK] Frontend started in new window
    pause
) else if "%CHOICE_NUM%"=="3" (
    echo.
    echo Starting backend service...
    start "Antinet Backend" cmd /k "cd /d %~dp0 && start_backend.bat"
    timeout /t 3 /nobreak >nul
    echo Starting frontend service...
    start "Antinet Frontend" cmd /k "cd /d %~dp0 && pnpm run dev"
    echo.
    echo [OK] Both services started
    echo.
    echo Wait 10-15 seconds then visit: http://localhost:3000
    pause
) else (
    echo.
    echo You can start services later with:
    echo   start_all.bat
    echo.
    pause
)

endlocal