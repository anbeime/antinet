@echo off
echo ========================================
echo   NPU Device Reset Utility
echo ========================================
echo.

echo [INFO] Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
if errorlevel 1 (
    echo [INFO] No Python processes running
) else (
    echo [OK] Python processes stopped
)

echo.
echo [INFO] Waiting 5 seconds for NPU to release...
timeout /t 5 /nobreak >nul

echo.
echo [INFO] Checking NPU device status...
powershell -Command "Get-PnpDevice -FriendlyName '*NPU*' | Select-Object Status, FriendlyName"

echo.
echo [INFO] Attempting to restart NPU device...
echo [WARNING] This requires administrator privileges
powershell -Command "Start-Process powershell -ArgumentList '-Command', 'Get-PnpDevice -FriendlyName \"*NPU*\" | Disable-PnpDevice -Confirm:$false; Start-Sleep -Seconds 2; Get-PnpDevice -FriendlyName \"*NPU*\" | Enable-PnpDevice -Confirm:$false' -Verb RunAs"

echo.
echo [INFO] Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo [INFO] NPU device reset complete
echo [INFO] You can now restart the backend service
echo.
pause
