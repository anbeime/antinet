# Start Backend Service in Background
Write-Host "Starting Backend Service in Background..." -ForegroundColor Green

$env:VIRTUAL_ENV = "C:\test\antinet\venv_arm64"
$env:PATH = "$env:VIRTUAL_ENV\Scripts;" + $env:PATH

cd C:\test\antinet\backend

Start-Process -FilePath "$env:VIRTUAL_ENV\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" -NoNewWindow -RedirectStandardOutput "..\backend_startup.log" -RedirectStandardError "..\backend_error.log"

Write-Host "Backend Service starting..." -ForegroundColor Yellow
Write-Host "Log file: C:\test\antinet\backend_startup.log" -ForegroundColor Cyan
Write-Host "Waiting for service to start..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

# Check if service is running
$portCheck = netstat -ano | findstr :8000 | findstr LISTENING
if ($portCheck) {
    Write-Host "[SUCCESS] Backend Service is running on port 8000!" -ForegroundColor Green
    Write-Host "API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
    Write-Host "Health Check: http://127.0.0.1:8000/api/health" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Failed to start Backend Service" -ForegroundColor Red
    Write-Host "Check backend_startup.log for details" -ForegroundColor Red
}
