# Quick Start Script for AIPC Testing
# 一键启动后端和前端服务

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Antinet AIPC Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python environment
Write-Host "[1/5] Checking Python environment..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Python not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python OK" -ForegroundColor Green
Write-Host ""

# Check Node.js environment
Write-Host "[2/5] Checking Node.js environment..." -ForegroundColor Yellow
node --version
pnpm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Node.js/pnpm not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js/pnpm OK" -ForegroundColor Green
Write-Host ""

# Check model files
Write-Host "[3/5] Checking model files..." -ForegroundColor Yellow
$modelPath = "C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
if (Test-Path $modelPath) {
    Write-Host "✓ Model files found" -ForegroundColor Green
} else {
    Write-Host "✗ Model files not found at $modelPath" -ForegroundColor Red
    Write-Host "  Please extract model to C:/model/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Start backend
Write-Host "[4/5] Starting backend service..." -ForegroundColor Yellow
Write-Host "  Backend URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\test\antinet\backend; python main.py"
Write-Host "✓ Backend started (see new terminal)" -ForegroundColor Green
Write-Host ""

# Wait for backend to start
Write-Host "Waiting for backend to start (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend
Write-Host "[5/5] Starting frontend service..." -ForegroundColor Yellow
Write-Host "  Frontend URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  NPU Analysis: http://localhost:3000/npu-analysis" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\test\antinet; pnpm dev"
Write-Host "✓ Frontend started (see new terminal)" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "  • Frontend:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • NPU Analysis: http://localhost:3000/npu-analysis" -ForegroundColor Cyan
Write-Host "  • Backend API:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • API Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in terminals to stop services" -ForegroundColor Yellow
Write-Host ""
