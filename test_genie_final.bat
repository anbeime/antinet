@echo off
chcp 65001 >nul
echo GenieContext 正确参数测试 (2 个参数）
echo.

cd /d c:\test\antinet
C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe test_genie_final.py

echo.
echo Press any key to continue...
pause >nul
