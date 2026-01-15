@echo off
chcp 65001 >nul
echo GenieContext 绝对路径测试 - IBM-Granite 模型
echo.

cd /d c:\test\antinet
C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe test_genie_abspath.py

echo.
echo Press any key to continue...
pause >nul
