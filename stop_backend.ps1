# Stop Backend Service
# 停止占用 8000 端口的后端服务

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stop Antinet Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 查找占用 8000 端口的进程
Write-Host "[1/2] Finding processes on port 8000..." -ForegroundColor Yellow
$netstatOutput = netstat -ano | Select-String ":8000"

if ($netstatOutput) {
    Write-Host "Found processes:" -ForegroundColor Gray
    $netstatOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    
    # 提取 PID
    $pids = @()
    $netstatOutput | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $pid = $matches[1]
            if ($pid -ne "0" -and $pid -notin $pids) {
                $pids += $pid
            }
        }
    }
    
    if ($pids.Count -gt 0) {
        Write-Host "[2/2] Stopping processes..." -ForegroundColor Yellow
        
        foreach ($pid in $pids) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "  Stopping PID $pid ($($process.ProcessName))..." -ForegroundColor Gray
                    Stop-Process -Id $pid -Force
                    Write-Host "  OK - Process $pid stopped" -ForegroundColor Green
                }
            } catch {
                Write-Host "  SKIP - Process $pid already stopped" -ForegroundColor Yellow
            }
        }
        
        # 等待端口释放
        Start-Sleep -Seconds 2
        
        # 验证端口已释放
        $checkOutput = netstat -ano | Select-String ":8000.*LISTENING"
        if ($checkOutput) {
            Write-Host ""
            Write-Host "WARNING - Port 8000 still in use!" -ForegroundColor Yellow
            $checkOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        } else {
            Write-Host ""
            Write-Host "OK - Port 8000 is now free" -ForegroundColor Green
        }
    } else {
        Write-Host "No active processes found (only TIME_WAIT connections)" -ForegroundColor Yellow
        Write-Host "Port 8000 should be available in a few seconds" -ForegroundColor Yellow
    }
} else {
    Write-Host "No processes found on port 8000" -ForegroundColor Green
    Write-Host "Port is already free" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the backend service:" -ForegroundColor White
Write-Host "  .\quick_start.ps1" -ForegroundColor Cyan
Write-Host ""
