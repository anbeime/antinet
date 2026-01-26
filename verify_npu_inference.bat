@echo off
REM NPU 真推理验证脚本

echo.
echo ========================================
echo   NPU 真推理验证 - 三步走验证
echo ========================================
echo.
echo 步骤说明：
echo   1. 检查配置文件（无模拟开关）
echo   2. 真推理测试（输入文本，检查 NPU）
echo   3. 熔断检查（超过 500ms 崩掉）
echo.
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在
    echo 请确保项目根目录下有 venv_arm64 虚拟环境
    pause
    exit /b 1
)

echo [运行] 开始验证...
echo.

venv_arm64\Scripts\python.exe verify_npu_inference.py

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   验证通过！
    echo ========================================
    echo.
    echo 系统正在使用真实的 NPU 推理。
    echo.
) else (
    echo.
    echo ========================================
    echo  no 验证失败！
    echo ========================================
    echo.
    echo NPU 推理配置存在问题，请根据提示修复。
    echo.
)

pause
