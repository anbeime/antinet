@echo off
REM ========================================
REM   Install PPT Skills Dependencies
REM   Install all required Python packages
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   Install PPT Skills Dependencies
echo ========================================
echo.

cd /d C:\test\antinet

REM Activate virtual environment
echo [Step 1/5] Activating virtual environment...
call venv_arm64\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    echo Please run from project root: C:\test\antinet
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

REM Install pptx-generator dependencies
echo [Step 2/5] Installing pptx-generator dependencies...
pip install python-pptx>=1.0.2 pillow>=9.0.0 openpyxl>=3.1.0 --quiet
if errorlevel 1 (
    echo [WARN] Some dependencies may have failed
) else (
    echo [OK] pptx-generator dependencies installed
)
echo.

REM Install ppt-generator dependencies
echo [Step 3/5] Installing ppt-generator dependencies...
pip install python-pptx>=0.6.21 --quiet
if errorlevel 1 (
    echo [WARN] Some dependencies may have failed
) else (
    echo [OK] ppt-generator dependencies installed
)
echo.

REM Install ppt-roadshow-generator dependencies
echo [Step 4/5] Installing ppt-roadshow-generator dependencies...
pip install moviepy>=1.0.3 pydub>=0.25.1 requests>=2.28.0 --quiet
if errorlevel 1 (
    echo [WARN] Some dependencies may have failed
) else (
    echo [OK] ppt-roadshow-generator dependencies installed
)
echo.

REM Install nanobanana-ppt-visualizer dependencies
echo [Step 5/5] Installing nanobanana-ppt-visualizer dependencies...
pip install python-dotenv>=0.19.0 --quiet
if errorlevel 1 (
    echo [WARN] Some dependencies may have failed
) else (
    echo [OK] nanobanana-ppt-visualizer dependencies installed
)
echo.

REM Verify installations
echo ========================================
echo   Verifying Installations
echo ========================================
echo.

python -c "import pptx; print('[OK] python-pptx:', pptx.__version__)"
python -c "import PIL; print('[OK] pillow:', PIL.__version__)"
python -c "import openpyxl; print('[OK] openpyxl:', openpyxl.__version__)"
python -c "import moviepy; print('[OK] moviepy: installed')" 2>nul || echo [WARN] moviepy not available
python -c "import pydub; print('[OK] pydub: installed')" 2>nul || echo [WARN] pydub not available
python -c "import dotenv; print('[OK] python-dotenv: installed')"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Installed dependencies for:
echo   pptx-generator
echo   ppt-generator
echo   ppt-roadshow-generator
echo   nanobanana-ppt-visualizer
echo.
echo   Note: FFmpeg is required for video features
echo    Install FFmpeg separately if needed
echo.
echo Next steps:
echo   1. Review: NEW_PPT_SKILLS_ANALYSIS.md
echo   2. Implement: advanced_ppt_service.py
echo   3. Test: Create a sample PPT
echo.
pause
