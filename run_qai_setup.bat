@echo off
echo ============================================================
echo    运行 QAI AppBuilder Setup
echo ============================================================
echo.
echo 这个脚本会：
echo 1. 下载 QAI AppBuilder wheel包
echo 2. 下载 QNN SDK 到 C:\Qualcomm\AIStack\QAIRT\
echo 3. 复制 DLL 文件到 qai_libs 目录
echo.
echo 注意：可能需要几分钟下载时间
echo ============================================================
echo.
cd "C:\ai-engine-direct-helper\samples"
python "python\setup.py"

echo.
echo ============================================================
echo    Setup 完成
echo ============================================================
echo.
echo 检查 DLL 文件：
dir "C:\ai-engine-direct-helper\samples\qai_libs"

echo.
pause
