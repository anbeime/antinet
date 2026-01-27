# NPU BURST Mode Test Script
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "NPU BURST Mode Performance Test" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1/2] Stopping backend service..." -ForegroundColor Yellow
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "[OK] Backend stopped" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 2/2] Starting backend with BURST mode..." -ForegroundColor Yellow
$backendPath = "C:\test\antinet"
Start-Process cmd -ArgumentList "/k", "cd /d $backendPath && venv_arm64\Scripts\activate && python backend\main.py" -WindowStyle Normal
Write-Host ""
Write-Host "Waiting 15 seconds for backend initialization..." -ForegroundColor Yellow
Write-Host "Watch the backend window for this message:" -ForegroundColor Cyan
Write-Host '  "[OK] 已通过环境变量启用 BURST 性能模式"' -ForegroundColor Green
Write-Host ""

for ($i = 15; $i -gt 0; $i--) {
    Write-Host "  $i seconds remaining..." -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r" -NoNewline
}

Write-Host ""
Write-Host "[OK] Backend should be ready" -ForegroundColor Green
Write-Host ""

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Running Performance Test" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\test\antinet"
& "venv_arm64\Scripts\python.exe" "test_burst_mode.py"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Expected improvement: 30-40% faster (from 1200ms to 700-900ms)" -ForegroundColor Yellow
Write-Host "Target: < 500ms" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
