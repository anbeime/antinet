# 永久设置 OpenCode 环境变量
# 运行此脚本后，需要重新打开 PowerShell 窗口

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenCode 环境变量配置工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$nodePath = "C:\Users\AI-PC-19\.stepfun\runtimes\node\install_1769405385879_ym8edrbn6xn\node-v22.18.0-win-x64"

Write-Host "[1/3] 检查 Node.js 路径..." -ForegroundColor Yellow
if (Test-Path $nodePath) {
    Write-Host "  ✓ Node.js 路径存在: $nodePath" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js 路径不存在: $nodePath" -ForegroundColor Red
    Write-Host "  请检查安装路径是否正确" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "[2/3] 检查当前用户 PATH..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($userPath -like "*$nodePath*") {
    Write-Host "  ✓ OpenCode 路径已在用户 PATH 中" -ForegroundColor Green
} else {
    Write-Host "  ! OpenCode 路径不在用户 PATH 中，正在添加..." -ForegroundColor Yellow
    
    # 添加到用户 PATH
    $newPath = $userPath + ";" + $nodePath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    Write-Host "  ✓ 已添加到用户 PATH" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] 验证安装..." -ForegroundColor Yellow

# 刷新当前会话的环境变量
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

# 测试 OpenCode 命令
try {
    $version = & "$nodePath\opencode.cmd" --version 2>&1 | Select-Object -Last 1
    Write-Host "  ✓ OpenCode 版本: $version" -ForegroundColor Green
} catch {
    Write-Host "  ✗ OpenCode 命令测试失败" -ForegroundColor Red
}

# 测试 oh-my-opencode 命令
try {
    & "$nodePath\oh-my-opencode.cmd" --version 2>&1 | Out-Null
    Write-Host "  ✓ Oh-My-OpenCode 已安装" -ForegroundColor Green
} catch {
    Write-Host "  ! Oh-My-OpenCode 可能未正确安装" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  配置完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "重要提示:" -ForegroundColor Yellow
Write-Host "  1. 请关闭当前所有 PowerShell/CMD 窗口" -ForegroundColor White
Write-Host "  2. 重新打开新的终端窗口" -ForegroundColor White
Write-Host "  3. 运行 'opencode --version' 验证" -ForegroundColor White
Write-Host ""
Write-Host "或者使用快捷启动脚本:" -ForegroundColor Yellow
Write-Host "  - start_opencode.bat (启动 OpenCode TUI)" -ForegroundColor White
Write-Host "  - start_opencode_web.bat (启动 Web 界面)" -ForegroundColor White
Write-Host ""

pause
