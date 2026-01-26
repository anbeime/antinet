@echo off
REM 快速 NPU 推理测试脚本

echo.
echo ========================================
echo   NPU 推理快速测试
echo ========================================
echo.
echo 测试内容：
echo   1. 检查配置文件（无模拟开关）
echo   2. 加载 NPU 模型
echo   3. 执行推理测试
echo   4. 熔断检查（^< 500ms）
echo.
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在
    pause
    exit /b 1
)

echo [运行] 执行 NPU 推理测试...
echo.
venv_arm64\Scripts\python.exe quick_npu_test.py

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   测试通过！
    echo ========================================
    echo.
    echo NPU 推理正常，系统正在使用真实的 NPU 推理。
    echo 推理时间在 500ms 以内，熔断检查通过。
    echo.
) else (
    echo.
    echo ========================================
    echo  no 测试失败！
    echo ========================================
    echo.
    echo NPU 推理存在问题，推理时间超过 500ms。
    echo 可能未走 NPU，请使用 QNN Profile 检查。
    echo.
)

pause
