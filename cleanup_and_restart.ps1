# Complete Environment Cleanup and Restart
# 完整环境清理和重启

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Environment Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 步骤 1：停止所有服务
Write-Host "[1/5] Stopping all services..." -ForegroundColor Yellow

# 停止占用 8000 端口的进程
$portCheck = netstat -ano | Select-String ":8000.*LISTENING"
if ($portCheck) {
    $portCheck | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            if ($pid -ne "0") {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "  Stopped process PID $pid" -ForegroundColor Gray
                } catch {}
            }
        }
    }
}

# 停止所有 Python 进程
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Stopping Python process PID $($_.Id)..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "  OK - All services stopped" -ForegroundColor Green
Start-Sleep -Seconds 3
Write-Host ""

# 步骤 2：清理 Python 缓存
Write-Host "[2/5] Cleaning Python cache..." -ForegroundColor Yellow

$cacheCount = 0
Get-ChildItem -Path "backend" -Recurse -Filter "__pycache__" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $cacheCount++
}

Get-ChildItem -Path "backend" -Recurse -Filter "*.pyc" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
}

Write-Host "  OK - Cleaned $cacheCount cache directories" -ForegroundColor Green
Write-Host ""

# 步骤 3：验证虚拟环境
Write-Host "[3/5] Verifying virtual environment..." -ForegroundColor Yellow

if (-not (Test-Path "venv_arm64\Scripts\python.exe")) {
    Write-Host "  ERROR - Virtual environment not found!" -ForegroundColor Red
    Write-Host "  Please run deploy_antinet.bat first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  OK - Virtual environment exists" -ForegroundColor Green

# 检查 qai_appbuilder
$checkResult = & "venv_arm64\Scripts\python.exe" -c "import qai_appbuilder; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - qai_appbuilder installed" -ForegroundColor Green
} else {
    Write-Host "  WARNING - qai_appbuilder not found" -ForegroundColor Yellow
}
Write-Host ""

# 步骤 4：同步 agents
Write-Host "[4/5] Synchronizing agents..." -ForegroundColor Yellow

if (Test-Path "backend\agents\memory.py") {
    Copy-Item "backend\agents\memory.py" "data-analysis\agents\memory.py" -Force -ErrorAction SilentlyContinue
    Write-Host "  OK - memory.py synchronized" -ForegroundColor Green
}

if (Test-Path "backend\agents\messenger.py") {
    Copy-Item "backend\agents\messenger.py" "data-analysis\agents\messenger.py" -Force -ErrorAction SilentlyContinue
    Write-Host "  OK - messenger.py synchronized" -ForegroundColor Green
}
Write-Host ""

# 步骤 5：准备启动
Write-Host "[5/5] Ready to start!" -ForegroundColor Yellow
Write-Host "  Environment cleaned" -ForegroundColor Green
Write-Host "  Cache cleared" -ForegroundColor Green
Write-Host "  Agents synchronized" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run NPU performance test:" -ForegroundColor White
Write-Host "     venv_arm64\Scripts\python.exe test_npu_performance.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start backend service:" -ForegroundColor White
Write-Host "     start_backend_simple.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Test APIs:" -ForegroundColor White
Write-Host "     curl http://localhost:8000/api/health" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Do you want to run NPU performance test now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Running NPU performance test..." -ForegroundColor Cyan
    Write-Host ""
    & "venv_arm64\Scripts\python.exe" test_npu_performance.py
}
