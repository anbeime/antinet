# Antinet 系统完整测试脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet 完整系统测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 1. 检查后端
Write-Host "[1/5] 检查后端服务..." -ForegroundColor Yellow
$backend = netstat -ano | Select-String ":8000"
if ($backend) {
    Write-Host "  ✓ 后端服务运行中" -ForegroundColor Green
} else {
    Write-Host "  ✗ 后端服务未运行" -ForegroundColor Red
    Write-Host "  启动命令: venv_arm64\Scripts\python.exe backend\main.py"
    pause
    exit 1
}

# 2. 检查前端
Write-Host ""
Write-Host "[2/5] 检查前端服务..." -ForegroundColor Yellow
$frontend = netstat -ano | Select-String ":3001"
if ($frontend) {
    Write-Host "  ✓ 前端服务运行中 (端口 3001)" -ForegroundColor Green
} else {
    Write-Host "  ✗ 前端服务未运行" -ForegroundColor Red
    Write-Host "  启动命令: pnpm dev"
    pause
    exit 1
}

# 3. 测试 API
Write-Host ""
Write-Host "[3/5] 测试后端 API..." -ForegroundColor Yellow
$env:PYTHONIOENCODING="utf-8"
& "venv_arm64\Scripts\python.exe" "backend\test_all_apis.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ✗ 部分 API 测试失败" -ForegroundColor Red
    pause
    exit 1
}

# 4. 检查数据库
Write-Host ""
Write-Host "[4/5] 检查数据库..." -ForegroundColor Yellow
if (Test-Path "backend\data\antinet.db") {
    Write-Host "  ✓ 数据库文件存在" -ForegroundColor Green
} else {
    Write-Host "  ✗ 数据库文件不存在" -ForegroundColor Red
    pause
    exit 1
}

# 5. 打开浏览器
Write-Host ""
Write-Host "[5/5] 打开浏览器..." -ForegroundColor Yellow
Start-Process "http://localhost:3001"
Write-Host "  ✓ 已打开浏览器" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ 所有检查通过！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "系统已就绪，请在浏览器中测试以下功能：" -ForegroundColor White
Write-Host ""
Write-Host "1. 知识卡片管理 (✓ 已验证)" -ForegroundColor White
Write-Host "2. GTD 任务管理 (✓ 后端就绪)" -ForegroundColor White
Write-Host "3. PDF 智能分析 (✓ 完全可用)" -ForegroundColor White
Write-Host "4. 数据分析" -ForegroundColor White
Write-Host "5. Agent 系统" -ForegroundColor White
Write-Host "6. 技能中心" -ForegroundColor White
Write-Host ""
Write-Host "访问地址: http://localhost:3001" -ForegroundColor Cyan
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "查看完整报告: GOOD_NEWS.md" -ForegroundColor Yellow
Write-Host ""
pause
