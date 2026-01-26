@echo off
REM 运行NPU设备诊断

echo ========================================
echo 运行NPU设备诊断
echo ========================================
echo.

cd /d %~dp0
venv_arm64\Scripts\python.exe diagnose_npu_device.py

echo.
pause
