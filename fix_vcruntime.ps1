# 修复 vcruntime140_1.dll 架构不匹配问题
# 必须在 ARM64 Python 虚拟环境中运行（已激活 venv_arm64）
# 需要管理员权限

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "vcruntime140_1.dll 架构修复工具" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误: 需要管理员权限运行此脚本！" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell -> '以管理员身份运行'" -ForegroundColor Yellow
    Write-Host "然后进入项目目录: cd c:\test\antinet" -ForegroundColor Yellow
    Write-Host "激活虚拟环境: .\venv_arm64\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "最后运行: .\fix_vcruntime.ps1" -ForegroundColor Yellow
    exit 1
}

# 检查Python架构
Write-Host "`n[1] 检查Python架构..." -ForegroundColor Green
try {
    $pythonArch = python -c "import sys; print('ARM64' if sys.maxsize > 2**32 else 'x64')" 2>$null
    Write-Host "   Python 架构: $pythonArch" -ForegroundColor White
    if ($pythonArch -ne "ARM64") {
        Write-Host "   ⚠ 警告: Python 不是 ARM64 架构，请确保虚拟环境已激活" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   错误: 无法检测 Python 架构" -ForegroundColor Red
}

# 备份当前 DLL
Write-Host "`n[2] 备份当前的 vcruntime140_1.dll..." -ForegroundColor Green
$system32Dll = "C:\Windows\System32\vcruntime140_1.dll"
$backupDir = "$env:TEMP\vc_runtime_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path $system32Dll) {
    Copy-Item -Path $system32Dll -Destination "$backupDir\vcruntime140_1.dll.backup" -Force
    Write-Host "   已备份到: $backupDir\vcruntime140_1.dll.backup" -ForegroundColor White
} else {
    Write-Host "   ⚠ 当前 System32 中不存在该 DLL" -ForegroundColor Yellow
}

# 下载 ARM64 VC++ 运行时
Write-Host "`n[3] 下载 ARM64 VC++ 运行时..." -ForegroundColor Green
$vcRedistUrl = "https://aka.ms/vs/17/release/vc_redist.arm64.exe"
$vcRedistPath = "$env:TEMP\vc_redist_arm64.exe"

Write-Host "   下载地址: $vcRedistUrl" -ForegroundColor White
Write-Host "   保存到: $vcRedistPath" -ForegroundColor White

try {
    # 使用 Invoke-WebRequest 下载
    Invoke-WebRequest -Uri $vcRedistUrl -OutFile $vcRedistPath
    Write-Host "   ✓ 下载完成" -ForegroundColor Green
} catch {
    Write-Host "   ✗ 下载失败: $_" -ForegroundColor Red
    Write-Host "   请手动下载: https://aka.ms/vs/17/release/vc_redist.arm64.exe" -ForegroundColor Yellow
    Write-Host "   保存到: $vcRedistPath" -ForegroundColor Yellow
    Write-Host "   然后重新运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 安装 VC++ 运行时
Write-Host "`n[4] 安装 VC++ 运行时..." -ForegroundColor Green
Write-Host "   运行: $vcRedistPath /quiet /norestart" -ForegroundColor White

try {
    $installProcess = Start-Process -FilePath $vcRedistPath -ArgumentList "/quiet /norestart" -Wait -PassThru
    if ($installProcess.ExitCode -eq 0) {
        Write-Host "   ✓ 安装成功" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ 安装完成，但退出代码: $($installProcess.ExitCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ 安装失败: $_" -ForegroundColor Red
    Write-Host "   请手动运行安装程序: $vcRedistPath" -ForegroundColor Yellow
    Write-Host "   选择 '安装' 然后重启 AIPC" -ForegroundColor Yellow
    exit 1
}

# 验证新 DLL 架构
Write-Host "`n[5] 验证新 DLL 架构..." -ForegroundColor Green
$pythonCheckScript = @"
import struct
path = r'$system32Dll'
try:
    with open(path, 'rb') as f:
        f.seek(60)
        pe = struct.unpack('I', f.read(4))[0]
        f.seek(pe + 24)
        machine = struct.unpack('H', f.read(2))[0]
        arch_map = {0x014C: 'x86', 0x8664: 'x64', 0xAA64: 'ARM64'}
        arch = arch_map.get(machine, f'unknown (0x{machine:04X})')
        print(f'DLL架构: {arch}')
        if machine == 0xAA64:
            print('✓ ARM64 架构正确')
        else:
            print('✗ 架构不正确，可能是安装失败')
except Exception as e:
    print(f'检查失败: {e}')
"@

$tempScript = "$env:TEMP\check_dll_arch.py"
$pythonCheckScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    $result = python $tempScript 2>$null
    Write-Host "   $result" -ForegroundColor White
} catch {
    Write-Host "   验证失败" -ForegroundColor Red
}

Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue

# 清理临时文件
Write-Host "`n[6] 清理临时文件..." -ForegroundColor Green
Remove-Item -Path $vcRedistPath -Force -ErrorAction SilentlyContinue
Write-Host "   临时安装程序已删除" -ForegroundColor White

# 必须重启警告
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "⚠ 必须重启 AIPC 才能使修复生效！" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "`n📋 下一步操作:" -ForegroundColor White
Write-Host "1. 保存所有工作，推送代码到 Git:" -ForegroundColor White
Write-Host "   git add . && git commit -m 'fix: 修复 vcruntime140_1.dll 架构' && git push" -ForegroundColor Gray
Write-Host "2. 重启 AIPC (开始菜单 -> 电源 -> 重启)" -ForegroundColor White
Write-Host "3. 重新登录后，激活虚拟环境并测试:" -ForegroundColor White
Write-Host "   .\venv_arm64\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python check_dll_deps.py" -ForegroundColor Gray
Write-Host "   python diagnose_npu_device.py" -ForegroundColor Gray
Write-Host "4. 如果问题解决，继续 NPU 模型测试" -ForegroundColor White

Write-Host "`n📁 备份文件保存在: $backupDir" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan