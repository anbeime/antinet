@echo off
REM ========================================
REM   PPT Skills - Standard Packaging
REM   Copy core scripts + documentation
REM   Total size: ~96 KB
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   PPT Skills - Standard Packaging
echo ========================================
echo.

cd /d C:\test\antinet\backend

REM Step 1: Create directory structure
echo [Step 1/3] Creating directories...
if not exist "skills" mkdir skills
if not exist "skills\pptx" mkdir skills\pptx
if not exist "skills\pptx\scripts" mkdir skills\pptx\scripts
echo [OK] Directories created
echo.

REM Step 2: Copy core scripts
echo [Step 2/3] Copying core scripts...
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
echo.

REM Step 3: Copy documentation
echo [Step 3/3] Copying documentation...
copy "C:\test\StepFun\resources\skill\pptx\SKILL.md" "skills\pptx\" >nul
echo [OK] SKILL.md copied

copy "C:\test\StepFun\resources\skill\pptx\html2pptx.md" "skills\pptx\" >nul
echo [OK] html2pptx.md copied

copy "C:\test\StepFun\resources\skill\pptx\ooxml.md" "skills\pptx\" >nul
echo [OK] ooxml.md copied

copy "C:\test\StepFun\resources\skill\pptx\LICENSE.txt" "skills\pptx\" >nul
echo [OK] LICENSE.txt copied
echo.

REM Calculate total size
echo ========================================
echo   Packaging Complete!
echo ========================================
echo.
echo Files copied:
echo   Core scripts:    2 files (~40 KB)
echo   Documentation:   4 files (~56 KB)
echo   Total:           6 files (~96 KB)
echo.
echo Location: C:\test\antinet\backend\skills\pptx
echo.
echo Included files:
echo   html2pptx.js      - HTML to PPT conversion
echo   thumbnail.py      - Thumbnail generation
echo   SKILL.md          - Main documentation
echo   html2pptx.md      - HTML conversion guide
echo   ooxml.md          - OOXML editing guide
echo   LICENSE.txt       - License file
echo.
echo This is the RECOMMENDED packaging for most use cases.
echo.
pause
