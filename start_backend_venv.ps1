# Antinet 后端服务启动脚本 (使用虚拟环境)
# PowerShell 版本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Antinet 后端服务启动 (虚拟环境)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到项目目录
Set-Location $PSScriptRoot

# 检查虚拟环境
Write-Host "[1/5] 检查虚拟环境..." -ForegroundColor Yellow
if (-not (Test-Path "venv_arm64\Scripts\python.exe")) {
    Write-Host "[错误] 虚拟环境不存在: venv_arm64" -ForegroundColor Red
    Write-Host "请先运行 deploy_antinet.bat 创建虚拟环境" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✓ 虚拟环境存在" -ForegroundColor Green
Write-Host ""

# 禁用 CodeBuddy 路由（如果存在）
Write-Host "[2/5] 清理 CodeBuddy 依赖..." -ForegroundColor Yellow
if (Test-Path "backend\routes\codebuddy_chat_routes.py") {
    if (-not (Test-Path "backend\routes\codebuddy_chat_routes.py.disabled")) {
        Write-Host "禁用 codebuddy_chat_routes.py..." -ForegroundColor Gray
        Rename-Item "backend\routes\codebuddy_chat_routes.py" "codebuddy_chat_routes.py.disabled"
        Write-Host "✓ 已禁用" -ForegroundColor Green
    } else {
        Write-Host "✓ 已经禁用" -ForegroundColor Green
    }
} else {
    Write-Host "✓ 文件不存在或已禁用" -ForegroundColor Green
}
Write-Host ""

# 显示虚拟环境 Python 版本
Write-Host "[3/5] 检查虚拟环境 Python..." -ForegroundColor Yellow
$venvPython = "venv_arm64\Scripts\python.exe"
& $venvPython --version
Write-Host ""

# 检查 qai_appbuilder
Write-Host "[4/5] 检查 qai_appbuilder..." -ForegroundColor Yellow
$checkResult = & $venvPython -c "import qai_appbuilder; print('已安装')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ qai_appbuilder 已安装" -ForegroundColor Green
} else {
    Write-Host "⚠ qai_appbuilder 未安装" -ForegroundColor Yellow
    Write-Host "尝试安装..." -ForegroundColor Gray
    
    # 查找 whl 文件
    $whlFile = Get-ChildItem -Path "C:\ai-engine-direct-helper\samples\" -Filter "qai_appbuilder*.whl" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $whlFile) {
        $whlFile = Get-ChildItem -Path "C:\test\" -Filter "qai_appbuilder*.whl" -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    
    if ($whlFile) {
        Write-Host "找到: $($whlFile.FullName)" -ForegroundColor Gray
        & $venvPython -m pip install $whlFile.FullName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ qai_appbuilder 安装成功" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ 未找到 qai_appbuilder whl 文件" -ForegroundColor Yellow
    }
}
Write-Host ""

# 启动后端服务
Write-Host "[5/5] 启动后端服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在启动 Antinet 后端服务..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务地址: http://localhost:8000" -ForegroundColor Green
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到 backend 目录并使用虚拟环境的 Python 启动
Set-Location "backend"
& "..\venv_arm64\Scripts\python.exe" main.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "[错误] 后端服务启动失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查上面的错误信息" -ForegroundColor Yellow
    Write-Host ""
    pause
}
