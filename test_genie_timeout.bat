@echo off
chcp 65001 >nul
echo GenieContext 超时检测测试（最多等待 5 分钟）
echo.

cd /d c:\test\antinet
C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe test_genie_timeout.py

echo.
echo Press any key to continue...
pause >nul
