@echo off
chcp 65001 >nul
echo Testing GenieContext with llama3.2-3b (smaller model)...
echo.

cd /d c:\test\antinet
C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe test_genie_simple.py

echo.
echo Press any key to continue...
pause >nul
