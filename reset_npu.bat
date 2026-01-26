@echo off
REM NPU资源重置脚本

echo ========================================
echo NPU资源重置工具
echo ========================================
echo.
echo 此脚本将尝试释放和重新初始化NPU资源
echo 不需要重启AIPC
echo.
pause

cd /d c:\test\antinet
venv_arm64\Scripts\python.exe reset_npu_resources.py

echo.
pause
