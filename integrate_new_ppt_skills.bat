@echo off
REM ========================================
REM   Integrate New PPT Skills
REM   Copy 4 downloaded PPT skills to project
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   Integrate New PPT Skills
echo ========================================
echo.

cd /d C:\test\antinet\backend

REM Step 1: Create skills directory
echo [Step 1/5] Creating skills directory...
if not exist "skills" mkdir skills
cd skills
echo [OK] Directory created
echo.

REM Step 2: Copy pptx-generator
echo [Step 2/5] Copying pptx-generator...
xcopy "C:\test\pptx-generator\pptx-generator" "pptx-generator\" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Failed to copy pptx-generator
    pause
    exit /b 1
)
echo [OK] pptx-generator copied
echo.

REM Step 3: Copy ppt-generator
echo [Step 3/5] Copying ppt-generator...
xcopy "C:\test\ppt-generator\ppt-generator" "ppt-generator\" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Failed to copy ppt-generator
    pause
    exit /b 1
)
echo [OK] ppt-generator copied
echo.

REM Step 4: Copy ppt-roadshow-generator
echo [Step 4/5] Copying ppt-roadshow-generator...
xcopy "C:\test\ppt-roadshow-generator\ppt-roadshow-generator" "ppt-roadshow-generator\" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Failed to copy ppt-roadshow-generator
    pause
    exit /b 1
)
echo [OK] ppt-roadshow-generator copied
echo.

REM Step 5: Copy nanobanana-ppt-visualizer
echo [Step 5/5] Copying nanobanana-ppt-visualizer...
xcopy "C:\test\nanobanana-ppt-visualizer\nanobanana-ppt-visualizer" "nanobanana-ppt-visualizer\" /E /I /Y /Q
if errorlevel 1 (
    echo [ERROR] Failed to copy nanobanana-ppt-visualizer
    pause
    exit /b 1
)
echo [OK] nanobanana-ppt-visualizer copied
echo.

REM Calculate total size
echo ========================================
echo   Integration Complete!
echo ========================================
echo.
echo Skills copied:
echo   1. pptx-generator           - JSON to PPTX converter
echo   2. ppt-generator            - 7-role collaboration
echo   3. ppt-roadshow-generator   - Roadshow video generator
echo   4. nanobanana-ppt-visualizer - Visual enhancer
echo.
echo Total size: ~112 KB
echo Location: C:\test\antinet\backend\skills
echo.
echo Next steps:
echo   1. Install dependencies: install_ppt_dependencies.bat
echo   2. Review: NEW_PPT_SKILLS_ANALYSIS.md
echo   3. Implement: advanced_ppt_service.py
echo   4. Update: ppt_routes.py
echo.
pause
