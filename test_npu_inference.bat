@echo off
chcp 65001 > nul
echo ========================================
echo NPU 推理测试 - 使用 qai_appbuilder
echo ========================================
echo.

venv_arm64\Scripts\python.exe test_npu_inference.py

if errorlevel 1 (
    echo.
    echono 测试失败
    pause
    exit /b 1
)

echo.
echo 测试完成
pause
