@echo off
chcp 65001 >nul
echo Checking frontend status...
echo.

echo Testing frontend at http://localhost:3003...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3003' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host 'SUCCESS: Frontend is accessible' -ForegroundColor Green; Write-Host 'Content length:' $response.Content.Length 'bytes'; if ($response.Content -match 'root') { Write-Host 'React root element found' -ForegroundColor Green } else { Write-Host 'WARNING: React root element not found' -ForegroundColor Yellow } } else { Write-Host 'ERROR: Unexpected status code' $response.StatusCode -ForegroundColor Red } } catch { Write-Host 'ERROR: Cannot connect to frontend:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo Testing backend API at http://localhost:8000...
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:8000/api/chat/health' -TimeoutSec 5; Write-Host 'SUCCESS: Backend API is working' -ForegroundColor Green; Write-Host 'Response:' ($response | ConvertTo-Json -Compress) } catch { Write-Host 'ERROR: Backend API not responding:' $_.Exception.Message -ForegroundColor Red }"
echo.

echo ========================================
echo Next steps:
echo 1. Open browser and visit: http://localhost:3003
echo 2. Press F12 to open Developer Tools
echo 3. Check Console tab for any errors
echo 4. If you see a white screen, check the error messages
echo ========================================
pause
