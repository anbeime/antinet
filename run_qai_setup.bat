@echo off
echo ============================================================
echo    QAI AppBuilder Setup
echo ============================================================
echo.
echo This script will:
echo 1. Download QAI AppBuilder wheel
echo 2. Download QNN SDK to C:\Qualcomm\AIStack\QAIRT\
echo 3. Copy DLL files to qai_libs directory
echo.
echo Note: Download may take several minutes
echo ============================================================
echo.
cd "C:\ai-engine-direct-helper\samples"
python "python\setup.py"

echo.
echo ============================================================
echo    Setup Completed
echo ============================================================
echo.
echo Check DLL files:
dir "C:\ai-engine-direct-helper\samples\qai_libs"

echo.
pause
