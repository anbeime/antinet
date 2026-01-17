#!/usr/bin/env pwsh
# deploy-to-aipc.ps1 - 一键部署到远程AIPC脚本

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Antinet智能知识管家 - 远程AIPC部署脚本" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$LocalProjectPath = "C:\D\compet\xiaolong"
$RemoteProjectPath = "C:\workspace\antinet"
$FrontendPort = 3000
$BackendPort = 8000

Write-Host "[步骤 1/6] 检查项目路径..." -ForegroundColor Yellow
if (!(Test-Path $LocalProjectPath)) {
    Write-Host "✗ 错误: 本地项目路径不存在: $LocalProjectPath" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 本地项目路径确认" -ForegroundColor Green

Write-Host ""
Write-Host "[步骤 2/6] 复制项目到AIPC..." -ForegroundColor Yellow
Write-Host "  源: $LocalProjectPath" -ForegroundColor Gray
Write-Host "  目标: $RemoteProjectPath" -ForegroundColor Gray

# 检查是否在远程桌面中
if (Test-Path "\\tsclient\C\D\compet\xiaolong") {
    Write-Host "  检测到磁盘重定向,开始复制..." -ForegroundColor Gray
    xcopy "\\tsclient\C\D\compet\xiaolong" $RemoteProjectPath /E /I /Y /Q
    Write-Host "✓ 项目复制完成" -ForegroundColor Green
} else {
    Write-Host "⚠ 警告: 未检测到磁盘重定向" -ForegroundColor Yellow
    Write-Host "  请确保:" -ForegroundColor Gray
    Write-Host "  1. 您在远程桌面会话中运行此脚本" -ForegroundColor Gray
    Write-Host "  2. 已配置本地磁盘重定向" -ForegroundColor Gray

    $continue = Read-Host "是否继续? (假设项目已存在) [y/N]"
    if ($continue -ne 'y') {
        exit 0
    }
}

Set-Location $RemoteProjectPath

Write-Host ""
Write-Host "[步骤 3/6] 检查开发环境..." -ForegroundColor Yellow

# 检查Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js 未安装" -ForegroundColor Red
    Write-Host "  请访问: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}

# 检查Python
try {
    $pythonVersion = python --version
    Write-Host "  ✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python 未安装" -ForegroundColor Red
    exit 1
}

# 检查pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "  ✓ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ pnpm 未安装,正在安装..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "  ✓ pnpm 安装完成" -ForegroundColor Green
}

Write-Host ""
Write-Host "[步骤 4/6] 安装前端依赖..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    pnpm install
    Write-Host "✓ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 前端依赖已存在" -ForegroundColor Green
}

Write-Host ""
Write-Host "[步骤 5/6] 安装后端依赖..." -ForegroundColor Yellow
Set-Location backend

if (!(Test-Path "venv")) {
    Write-Host "  创建虚拟环境..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "  激活虚拟环境..." -ForegroundColor Gray
.\venv\Scripts\Activate.ps1

Write-Host "  安装Python包..." -ForegroundColor Gray
pip install -r requirements.txt -q

# 检查QAI AppBuilder
Write-Host "  检查QAI AppBuilder..." -ForegroundColor Gray
$qaiWhl = "C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
if (Test-Path $qaiWhl) {
    pip install $qaiWhl
    Write-Host "  ✓ QAI AppBuilder 已安装" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 警告: QAI AppBuilder whl文件未找到" -ForegroundColor Yellow
    Write-Host "  路径: $qaiWhl" -ForegroundColor Gray
    Write-Host "  将使用模拟模式运行" -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "[步骤 6/6] 检查模型文件..." -ForegroundColor Yellow
$modelPath = "backend\models\qnn\qwen2-1.5b.bin"
if (Test-Path $modelPath) {
    Write-Host "✓ QNN模型文件已存在" -ForegroundColor Green
} else {
    Write-Host "⚠ QNN模型文件不存在,需要运行模型转换" -ForegroundColor Yellow
    Write-Host "  运行: cd backend\models && python convert_to_qnn_on_aipc.py" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[步骤 7/7] 验证 NPU 环境..." -ForegroundColor Yellow
if (Test-Path "test_genie_context.py") {
    Write-Host "  正在运行 NPU 测试..." -ForegroundColor Gray
    try {
        python test_genie_context.py
    } catch {
        Write-Host "  ⚠ NPU 测试失败，请检查模型文件和环境" -ForegroundColor Red
    }
} else {
     Write-Host "⚠ test_genie_context.py 未找到，跳过验证" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 启动前端服务:" -ForegroundColor White
Write-Host "   pnpm run dev" -ForegroundColor Gray
Write-Host "   访问: http://localhost:$FrontendPort" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 启动后端服务 (新窗口):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host "   访问: http://localhost:$BackendPort/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 如需转换模型 (如未完成):" -ForegroundColor White
Write-Host "   cd backend\models" -ForegroundColor Gray
Write-Host "   python convert_to_qnn_on_aipc.py" -ForegroundColor Gray
Write-Host ""
Write-Host "提示: 建议使用Windows Terminal打开多个标签页分别运行前后端" -ForegroundColor Yellow
Write-Host ""
