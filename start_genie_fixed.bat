@echo off
echo 启动 GenieAPIService (Python版本)...
echo.

cd "C:\ai-engine-direct-helper\samples\genie\python"

venv\Scripts\python.exe GenieAPIService.py --loadmodel --modelname Qwen2.0-7B-SSD

echo.
echo 服务已停止。
pause