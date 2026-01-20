@echo off
echo Running Official GenieSample.py...
echo.
cd "C:\ai-engine-direct-helper\samples\genie\python"
python GenieSample.py
echo.
if errorlevel 1 (
    echo [ERROR] GenieSample.py failed!
) else (
    echo [SUCCESS] GenieSample.py completed!
)
echo.
pause
