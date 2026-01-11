#!/usr/bin/env pwsh
# 自动同步和推送脚本 - 在远程AIPC测试完成后执行

$ErrorActionPreference = "Stop"

Write-Host "=== Antinet AIPC 测试完成自动同步 ===" -ForegroundColor Cyan

# 1. 检查Git状态
Write-Host "`n[1/4] 检查修改..." -ForegroundColor Yellow
git status --short

# 2. 添加所有修改
Write-Host "`n[2/4] 添加修改到暂存区..." -ForegroundColor Yellow
git add .

# 3. 提交修改
Write-Host "`n[3/4] 提交修改..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "AIPC测试完成 - $timestamp

- NPU模型部署测试
- 数据分析功能验证
- 性能基准测试结果

测试环境: 骁龙X Elite AIPC (AI-PC-19)
"

# 4. 推送到远程仓库
Write-Host "`n[4/4] 推送到远程仓库..." -ForegroundColor Yellow
git push origin main

Write-Host "`n✓ 同步完成！" -ForegroundColor Green
Write-Host "代码已安全保存到Git仓库" -ForegroundColor Green
