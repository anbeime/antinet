@echo off
REM 修复 vcruntime140_1.dll 架构不匹配问题
REM 必须以管理员身份运行

echo ========================================================
echo vcruntime140_1.dll 架构修复工具
echo ========================================================

REM 检查是否以管理员身份运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误: 需要管理员权限运行此脚本！
    echo 请右键点击命令提示符 -> "以管理员身份运行"
    echo 然后进入项目目录: cd c:\test\antinet
    echo 激活虚拟环境: venv_arm64\Scripts\activate.bat
    echo 最后运行: fix_vcruntime.bat
    pause
    exit /b 1
)

echo.
echo [1] 检查Python架构...
python -c "import sys; print('ARM64' if sys.maxsize > 2**32 else 'x64')"
if errorlevel 1 (
    echo   警告: Python 检查失败，请确保虚拟环境已激活
)

echo.
echo [2] 备份当前的 vcruntime140_1.dll...
set backup_dir=%TEMP%\vc_runtime_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%
mkdir "%backup_dir%" 2>nul

if exist "C:\Windows\System32\vcruntime140_1.dll" (
    copy "C:\Windows\System32\vcruntime140_1.dll" "%backup_dir%\vcruntime140_1.dll.backup" >nul
    echo   已备份到: %backup_dir%\vcruntime140_1.dll.backup
) else (
    echo   ⚠ 当前 System32 中不存在该 DLL
)

echo.
echo [3] 下载 ARM64 VC++ 运行时...
set vc_redist_url=https://aka.ms/vs/17/release/vc_redist.arm64.exe
set vc_redist_path=%TEMP%\vc_redist_arm64.exe

echo   下载地址: %vc_redist_url%
echo   保存到: %vc_redist_path%

REM 使用 PowerShell 下载
powershell -Command "Invoke-WebRequest -Uri '%vc_redist_url%' -OutFile '%vc_redist_path%'"
if errorlevel 1 (
    echo   ✗ 下载失败
    echo   请手动下载: %vc_redist_url%
    echo   保存到: %vc_redist_path%
    echo   然后重新运行此脚本
    pause
    exit /b 1
)
echo   ✓ 下载完成

echo.
echo [4] 安装 VC++ 运行时...
echo   运行: %vc_redist_path% /quiet /norestart
start /wait %vc_redist_path% /quiet /norestart
if errorlevel 1 (
    echo   ⚠ 安装完成，但退出代码: %errorlevel%
) else (
    echo   ✓ 安装成功
)

echo.
echo [5] 验证新 DLL 架构...
python -c "
import struct
path = r'C:\Windows\System32\vcruntime140_1.dll'
try:
    with open(path, 'rb') as f:
        f.seek(60)
        pe = struct.unpack('I', f.read(4))[0]
        f.seek(pe + 24)
        machine = struct.unpack('H', f.read(2))[0]
        arch_map = {0x014C: 'x86', 0x8664: 'x64', 0xAA64: 'ARM64'}
        arch = arch_map.get(machine, 'unknown (0x{:04X})'.format(machine))
        print('DLL架构:', arch)
        if machine == 0xAA64:
            print('✓ ARM64 架构正确')
        else:
            print('✗ 架构不正确，可能是安装失败')
except Exception as e:
    print('检查失败:', e)
"

echo.
echo [6] 清理临时文件...
del "%vc_redist_path%" 2>nul
echo   临时安装程序已删除

echo.
echo ========================================================
echo ⚠ 必须重启 AIPC 才能使修复生效！
echo ========================================================
echo.
echo 📋 下一步操作:
echo 1. 保存所有工作，推送代码到 Git:
echo    git add . && git commit -m "fix: 修复 vcruntime140_1.dll 架构" && git push
echo 2. 重启 AIPC (开始菜单 -> 电源 -> 重启)
echo 3. 重新登录后，激活虚拟环境并测试:
echo    venv_arm64\Scripts\activate.bat
echo    python check_dll_deps.py
echo    python diagnose_npu_device.py
echo 4. 如果问题解决，继续 NPU 模型测试
echo.
echo 📁 备份文件保存在: %backup_dir%
echo ========================================================

pause