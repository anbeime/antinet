@echo off
chcp 65001 >nul
echo Testing GenieContext model loading...
echo.

cd /d c:\test\antinet
C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe test_genie_context.py

echo.
echo Press any key to continue...
pause >nul
