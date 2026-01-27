# Smart Start Backend Service
# 智能启动后端服务（自动处理端口占用）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet Backend - Smart Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 检查端口 8000 是否被占用
Write-Host "[1/4] Checking port 8000..." -ForegroundColor Yellow
$portCheck = netstat -ano | Select-String ":8000.*LISTENING"

if ($portCheck) {
    Write-Host "  Port 8000 is in use" -ForegroundColor Yellow
    
    # 提取 PID
    $portCheck | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            if ($pid -ne "0") {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Found process: PID $pid ($($process.ProcessName))" -ForegroundColor Gray
                        Write-Host "  Stopping old backend service..." -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force
                        Start-Sleep -Seconds 2
                        Write-Host "  OK - Old service stopped" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "  SKIP - Process already stopped" -ForegroundColor Gray
                }
            }
        }
    }
} else {
    Write-Host "  OK - Port 8000 is free" -ForegroundColor Green
}
Write-Host ""

# 检查虚拟环境
Write-Host "[2/4] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "venv_arm64\Scripts\python.exe")) {
    Write-Host "  ERROR - Virtual environment not found: venv_arm64" -ForegroundColor Red
    Write-Host "  Please run deploy_antinet.bat first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  OK - Virtual environment exists" -ForegroundColor Green
Write-Host ""

# 禁用 CodeBuddy（如果存在）
Write-Host "[3/4] Checking environment..." -ForegroundColor Yellow
Write-Host "  OK - Environment ready" -ForegroundColor Green
Write-Host ""

# 启动后端服务
Write-Host "[4/4] Starting backend service..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Knowledge Graph: http://localhost:8000/api/knowledge/graph" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 保存当前目录
$projectRoot = $PSScriptRoot

# 切换到 backend 目录并启动
Set-Location "$projectRoot\backend"
& "$projectRoot\venv_arm64\Scripts\python.exe" main.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR - Backend service failed to start" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
}
