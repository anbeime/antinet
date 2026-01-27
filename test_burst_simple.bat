@echo off
echo ======================================================================
echo NPU BURST Mode Test
echo ======================================================================
echo.

echo [Step 1/2] Stopping backend...
taskkill /F /IM python.exe 2>nul
timeout /t 3 /nobreak >nul
echo [OK] Backend stopped
echo.

echo [Step 2/2] Starting backend with BURST mode...
start "AntiNet Backend" cmd /k "cd /d %~dp0 && venv_arm64\Scripts\activate && python backend\main.py"
echo.
echo Waiting 15 seconds for initialization...
timeout /t 15 /nobreak >nul
echo.

echo Running performance test...
echo.
venv_arm64\Scripts\python.exe test_burst_mode.py
echo.

echo ======================================================================
echo Test Complete
echo ======================================================================
pause
