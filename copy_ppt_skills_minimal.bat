@echo off
REM ========================================
REM   PPT Skills - Minimal Packaging
REM   Copy only runtime-required files
REM   Total size: ~42 KB
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   PPT Skills - Minimal Packaging
echo ========================================
echo.

cd /d C:\test\antinet\backend

REM Step 1: Create directory structure
echo [Step 1/2] Creating directories...
if not exist "skills" mkdir skills
if not exist "skills\pptx" mkdir skills\pptx
if not exist "skills\pptx\scripts" mkdir skills\pptx\scripts
echo [OK] Directories created
echo.

REM Step 2: Copy only essential files
echo [Step 2/2] Copying essential files...
copy "C:\test\StepFun\resources\skill\pptx\scripts\html2pptx.js" "skills\pptx\scripts\" >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy html2pptx.js
    pause
    exit /b 1
)
echo [OK] html2pptx.js copied

copy "C:\test\StepFun\resources\skill\pptx\scripts\thumbnail.py" "skills\pptx\scripts\" >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy thumbnail.py
    pause
    exit /b 1
)
echo [OK] thumbnail.py copied

copy "C:\test\StepFun\resources\skill\pptx\LICENSE.txt" "skills\pptx\" >nul
echo [OK] LICENSE.txt copied
echo.

REM Calculate total size
echo ========================================
echo   Minimal Packaging Complete!
echo ========================================
echo.
echo Files copied:
echo   Core scripts:    2 files (~40 KB)
echo   License:         1 file  (~2 KB)
echo   Total:           3 files (~42 KB)
echo.
echo Location: C:\test\antinet\backend\skills\pptx
echo.
echo Included files:
echo   html2pptx.js      - HTML to PPT conversion
echo   thumbnail.py      - Thumbnail generation
echo   LICENSE.txt       - License file
echo.
echo   WARNING: No documentation included!
echo    Documentation must be accessed externally.
echo.
echo This packaging is suitable for:
echo   - Production deployments
echo   - Minimal size requirements
echo   - When documentation is hosted separately
echo.
pause
