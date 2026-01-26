@echo off
chcp 65001 >nul
echo ========================================
echo 清理 CodeBuddy SDK 依赖
echo ========================================
echo.

cd /d "%~dp0backend\routes"

echo [1/2] 备份 codebuddy_chat_routes.py...
if exist codebuddy_chat_routes.py (
    copy /Y codebuddy_chat_routes.py codebuddy_chat_routes.py.bak
    echo 已备份到 codebuddy_chat_routes.py.bak
)

echo [2/2] 禁用 codebuddy_chat_routes.py...
if exist codebuddy_chat_routes.py (
    ren codebuddy_chat_routes.py codebuddy_chat_routes.py.disabled
    echo 已禁用 codebuddy_chat_routes.py
)

echo.
echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 现在可以正常启动后端服务了
echo 运行: start_backend_fixed.bat
echo.
pause
