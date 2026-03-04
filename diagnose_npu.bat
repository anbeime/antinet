@echo off
echo ========================================
echo NPU配置诊断工具
echo ========================================
echo.

echo [1] 检查系统环境变量...
echo QNN_LOG_LEVEL: %QNN_LOG_LEVEL%
echo QNN_DEBUG: %QNN_DEBUG%
echo QNN_PERFORMANCE_MODE: %QNN_PERFORMANCE_MODE%
echo QNN_HTP_PERFORMANCE_MODE: %QNN_HTP_PERFORMANCE_MODE%
echo QAI_LIBS_PATH: %QAI_LIBS_PATH%
echo.

echo [2] 检查QNN SDK路径...
if exist "C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc" (
    echo [OK] QNN SDK 2.38 路径存在
) else (
    echo [ERROR] QNN SDK 2.38 路径不存在
)

if exist "C:\Qualcomm\AIStack\QAIRT\2.34.0.250626\lib\arm64x-windows-msvc" (
    echo [OK] QNN SDK 2.34 路径存在
) else (
    echo [ERROR] QNN SDK 2.34 路径不存在
)
echo.

echo [3] 检查模型配置...
if exist "C:\model\models_2.34\Qwen2.0-7B-SSD-8380-2.34\config.json" (
    echo [OK] 模型配置文件存在
    echo Backend类型: QnnHtp
) else (
    echo [ERROR] 模型配置文件不存在
)
echo.

echo [4] 检查htp_backend_ext_config.json配置...
if exist "C:\model\models_2.34\Qwen2.0-7B-SSD-8380-2.34\htp_backend_ext_config.json" (
    type "C:\model\models_2.34\Qwen2.0-7B-SSD-8380-2.34\htp_backend_ext_config.json"
) else (
    echo [ERROR] htp_backend_ext_config.json不存在
)
echo.

echo [5] 检查Python和pip版本...
python --version
pip --version
echo.

echo [6] 检查已安装的NPU相关包...
pip list | findstr -i "qai"
pip list | findstr -i "genie"
pip list | findstr -i "npu"
echo.

echo [7] 检查正在运行的进程...
tasklist | findstr -i "python"
tasklist | findstr -i "uvicorn"
tasklist | findstr -i "genie"
tasklist | findstr -i "qnn"
echo.

echo ========================================
echo 诊断完成
echo ========================================
echo.

echo 问题分析和建议:
echo.
echo 1. 性能差的原因:
echo    - 每Token延迟210ms远超200ms目标
echo    - 可能是NPU资源泄漏导致性能持续下降
echo    - 可能是BURST模式配置没有生效
echo.
echo 2. 解决方案:
echo    A. 运行资源清理: cleanup_npu_resources.bat
echo    B. 重启所有Python进程: fix_npu_device.bat
echo    C. 检查系统环境变量是否正确设置
echo    D. 验证QNN驱动是否正确安装
echo    E. 检查是否有其他进程占用NPU资源
echo.
echo 3. 性能优化:
echo    - 使用更轻量的模型 (llama3.2-3b)
echo    - 减少max_tokens参数
echo    - 调整temperature参数
echo.

pause