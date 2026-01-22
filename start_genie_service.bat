@echo off
REM 启动官方 GenieAPIService (OpenAI兼容API)

echo 启动 GenieAPIService...
echo 模型: Qwen2.0-7B-SSD
echo 端口: 8910
echo.

cd "C:\ai-engine-direct-helper\samples\genie\python"

python GenieAPIService.py --loadmodel --modelname Qwen2.0-7B-SSD

echo.
echo 服务已启动！
pause