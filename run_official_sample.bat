@echo off
chcp 65001 >nul
echo Running official GenieSample.py...
echo.

REM 切换到官方示例目录
cd /d C:/ai-engine-direct-helper/samples/genie/python

echo Current directory: %CD%
echo Running: python GenieSample.py
echo.

C:\Users\AI-PC-19\AppData\Local\Microsoft\WindowsApps\python.exe GenieSample.py

echo.
echo Press any key to continue...
pause >nul
