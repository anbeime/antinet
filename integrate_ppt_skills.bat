@echo off
REM ========================================
REM   PPT Skill Integration Script
REM   Copy PPT skills to Antinet project
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   PPT Skill Integration
echo ========================================
echo.

REM Step 1: Create skills directory
echo [Step 1/4] Creating skills directory...
cd /d C:\test\antinet\backend
if not exist "skills" mkdir skills
if not exist "skills\pptx" mkdir skills\pptx
echo [OK] Directory created
echo.

REM Step 2: Copy PPT skill files
echo [Step 2/4] Copying PPT skill files...
xcopy "C:\test\StepFun\resources\skill\pptx" "skills\pptx" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Failed to copy files
    pause
    exit /b 1
)
echo [OK] Files copied
echo.

REM Step 3: Install Python dependencies
echo [Step 3/4] Installing Python dependencies...
cd /d C:\test\antinet
call venv_arm64\Scripts\activate.bat
pip install markitdown lxml pillow --quiet
if errorlevel 1 (
    echo [WARN] Some dependencies may have failed to install
) else (
    echo [OK] Dependencies installed
)
echo.

REM Step 4: Test basic functionality
echo [Step 4/4] Testing basic functionality...
cd backend\skills\pptx

REM Test if markitdown is available
python -c "import markitdown; print('[OK] markitdown available')"
if errorlevel 1 (
    echo [WARN] markitdown not available
) 

REM Test if scripts exist
if exist "scripts\thumbnail.py" (
    echo [OK] thumbnail.py found
) else (
    echo [WARN] thumbnail.py not found
)

if exist "scripts\html2pptx.js" (
    echo [OK] html2pptx.js found
) else (
    echo [WARN] html2pptx.js not found
)

echo.
echo ========================================
echo   Integration Complete!
echo ========================================
echo.
echo Skills copied to: C:\test\antinet\backend\skills\pptx
echo.
echo Next steps:
echo   1. Review: PPT_SKILL_INTEGRATION.md
echo   2. Implement: enhanced_ppt_service.py
echo   3. Update: ppt_routes.py
echo   4. Test: Create advanced PPT
echo.
echo Available features:
echo   - HTML to PPT conversion
echo   - Text extraction (markitdown)
echo   - Thumbnail generation
echo   - OOXML editing
echo   - 18 design palettes
echo.
pause
