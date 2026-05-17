@echo off
chcp 65001 >nul
cd /d C:\D\zhiyi\backend
title zhiyi 后端服务
echo ================================================
echo   zhiyi 后端服务启动器
echo ================================================
echo.
echo [信息] 工作目录: %cd%
echo [信息] Python: C:\D\zhiyi\venv_arm64\Scripts\python.exe
echo [信息] 端口: 8000
echo.
echo [启动] 正在启动 uvicorn...
echo.
C:\D\zhiyi\venv_arm64\Scripts\python.exe -X utf8 -m uvicorn main:app --host 0.0.0.0 --port 8000
pause