@echo off
chcp 65001 >nul
echo Testing GenieContext with absolute paths and detailed debugging...
echo.

cd /d C:\test\antinet

python test_genie_fixed.py

echo.
echo Press any key to continue...
pause >nul