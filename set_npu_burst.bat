@echo off
chcp 65001 >nul
echo ==========================================
echo Setting NPU BURST Performance Mode
echo ==========================================

:: 设置关键环境变量
set "QNN_PERFORMANCE_MODE=BURST"
set "QNN_HTP_PERFORMANCE_MODE=burst"
set "QNN_LOG_LEVEL=INFO"

:: 验证设置
echo.
echo Environment variables set:
echo   QNN_PERFORMANCE_MODE=%QNN_PERFORMANCE_MODE%
echo   QNN_HTP_PERFORMANCE_MODE=%QNN_HTP_PERFORMANCE_MODE%
echo.
echo ==========================================
echo You can now run: python backend/main.py
echo ==========================================
