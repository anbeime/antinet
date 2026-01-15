@echo off
chcp 65001 >nul
echo GenieContext 测试 - Qwen2.0-7B-SSD 模型
echo.

cd /d c:\test\antinet
python test_genie_qwen.py

echo.
echo Press any key to continue...
pause >nul
