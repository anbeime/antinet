# 杀掉占用 8000 端口的进程
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "杀掉进程: $($_.OwningProcess)"
    Stop-Process -Id $_.OwningProcess -Force
}

Write-Host "✅ 后端进程已停止"
