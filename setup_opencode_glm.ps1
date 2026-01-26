# OpenCode GLM-4.7-Flash 配置脚本
# 使用 OpenCode 内置的 auth 命令配置

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenCode + GLM-4.7-Flash 配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置环境变量（永久）
$apiKey = "d68afc047d2b47179fccca96e52ca57c.XDODZVHpC70KMfos"

Write-Host "[1/2] 设置环境变量..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("ZHIPU_API_KEY", $apiKey, "User")
Write-Host "  ✓ ZHIPU_API_KEY 已设置" -ForegroundColor Green

Write-Host ""
Write-Host "[2/2] 配置完成！" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  配置信息" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Key: $apiKey" -ForegroundColor White
Write-Host "模型: GLM-4.7-Flash" -ForegroundColor White
Write-Host "提供商: 智谱 AI" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  使用方法" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "方法1: 使用预配置启动脚本（推荐）" -ForegroundColor Yellow
Write-Host "  双击: opencode_glm.bat" -ForegroundColor White
Write-Host ""
Write-Host "方法2: 手动配置" -ForegroundColor Yellow
Write-Host "  1. 启动 OpenCode" -ForegroundColor White
Write-Host "  2. 输入: /connect" -ForegroundColor White
Write-Host "  3. 选择: Zhipu" -ForegroundColor White
Write-Host "  4. 粘贴 API Key" -ForegroundColor White
Write-Host ""
Write-Host "方法3: 使用环境变量（已设置）" -ForegroundColor Yellow
Write-Host "  重启终端后，OpenCode 会自动读取 ZHIPU_API_KEY" -ForegroundColor White
Write-Host ""

pause
