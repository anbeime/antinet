@echo off
chcp 65001 >nul
echo ============================================================
echo GenieContext 初始化测试脚本
echo ============================================================
echo.

cd c:\test\antinet

REM 激活虚拟环境
call venv_arm64\Scripts\activate.bat

REM 运行测试
echo [INFO] 正在测试 GenieContext 初始化...
echo.

python test_genie_init.py

echo.
echo ============================================================
echo 测试完成
echo ============================================================
echo.
echo 请查看上面的测试结果，并将完整输出发送给高通技术支持
echo.
pause
