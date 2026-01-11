#!/usr/bin/env pwsh
# 推送本地提交到GitHub（网络恢复后执行）

Write-Host "=== Antinet - 推送本地提交到GitHub ===" -ForegroundColor Cyan
Write-Host ""

# 检查是否有未推送的提交
$unpushed = git log origin/main..HEAD --oneline
if ($unpushed) {
    Write-Host "发现未推送的提交:" -ForegroundColor Yellow
    git log origin/main..HEAD --oneline --decorate
    Write-Host ""

    # 推送到远程
    Write-Host "正在推送到GitHub..." -ForegroundColor Yellow
    git push origin main

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ 推送成功！" -ForegroundColor Green
        Write-Host "查看仓库: https://github.com/anbeime/antinet" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "✗ 推送失败，请检查网络连接" -ForegroundColor Red
        Write-Host "稍后可以重新运行此脚本" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ 所有提交已同步" -ForegroundColor Green
    Write-Host "查看仓库: https://github.com/anbeime/antinet" -ForegroundColor Cyan
}

Write-Host ""
