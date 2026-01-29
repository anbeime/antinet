@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 项目清理脚本
echo ========================================
echo.
echo 此脚本将清理不需要上传的文件
echo 包括：node_modules, venv, dist, __pycache__, *.log, *.db
echo.
echo 警告：此操作不可逆！
echo.
pause

cd /d "%~dp0"

echo.
echo [1/6] 清理 node_modules...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo ✓ 已删除 node_modules
) else (
    echo ⊘ node_modules 不存在
)

echo.
echo [2/6] 清理 dist...
if exist "dist" (
    rmdir /s /q "dist"
    echo ✓ 已删除 dist
) else (
    echo ⊘ dist 不存在
)

echo.
echo [3/6] 清理 Python 虚拟环境...
if exist "backend\venv" (
    rmdir /s /q "backend\venv"
    echo ✓ 已删除 backend\venv
) else (
    echo ⊘ backend\venv 不存在
)

if exist "backend\venv_arm64" (
    rmdir /s /q "backend\venv_arm64"
    echo ✓ 已删除 backend\venv_arm64
) else (
    echo ⊘ backend\venv_arm64 不存在
)

echo.
echo [4/6] 清理 Python 缓存...
for /d /r %%d in (__pycache__) do (
    if exist "%%d" (
        rmdir /s /q "%%d"
        echo ✓ 已删除 %%d
    )
)

echo.
echo [5/6] 清理日志文件...
del /s /q *.log 2>nul
echo ✓ 已删除所有 .log 文件

echo.
echo [6/6] 清理数据库文件...
del /s /q backend\data\*.db 2>nul
echo ✓ 已删除数据库文件（保留 demo 数据）

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 现在可以安全上传项目了
echo 建议使用 Git 或压缩为 ZIP
echo.
echo 预计文件大小：5-20 MB
echo.
pause
