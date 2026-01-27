# Quick Restart Backend
# 快速重启后端服务

Write-Host "Restarting backend service..." -ForegroundColor Cyan

# 停止旧服务
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 启动新服务
Set-Location $PSScriptRoot
Start-Process cmd -ArgumentList "/c", "start_backend_simple.bat"

Write-Host "Backend service restarting..." -ForegroundColor Green
Write-Host "Wait 5 seconds for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Testing API..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing
    Write-Host "OK - Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING - Backend may still be starting..." -ForegroundColor Yellow
}
