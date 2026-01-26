@echo off
REM ========================================
REM   Antinet 完整功能安装
REM   安装语音功能 + PPT技能
REM ========================================
chcp 65001 >nul

echo.
echo ========================================
echo   Antinet 完整功能安装
echo   Faster-Whisper + Coqui TTS + PPT Skills
echo ========================================
echo.

cd /d C:\test\antinet

REM 激活虚拟环境
echo [Step 1/5] 激活虚拟环境...
call venv_arm64\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] 虚拟环境激活失败
    pause
    exit /b 1
)
echo [OK] 虚拟环境已激活
echo.

REM 安装语音功能依赖
echo [Step 2/5] 安装语音功能依赖...
echo   - faster-whisper (语音识别)
echo   - TTS (语音合成)
pip install faster-whisper TTS --quiet
if errorlevel 1 (
    echo [WARN] 部分依赖安装失败
) else (
    echo [OK] 语音功能依赖安装完成
)
echo.

REM 安装PPT功能依赖
echo [Step 3/5] 安装PPT功能依赖...
echo   - python-pptx (PPT生成)
echo   - pillow (图像处理)
echo   - openpyxl (Excel支持)
echo   - python-dotenv (环境配置)
pip install python-pptx pillow openpyxl python-dotenv --quiet
if errorlevel 1 (
    echo [WARN] 部分依赖安装失败
) else (
    echo [OK] PPT功能依赖安装完成
)
echo.

REM 复制PPT技能
echo [Step 4/5] 复制PPT技能...
if exist "backend\skills\pptx-generator" (
    echo [INFO] PPT技能已存在，跳过复制
) else (
    call integrate_new_ppt_skills.bat
)
echo.

REM 测试安装
echo [Step 5/5] 测试安装...
python -c "import faster_whisper; print('[OK] faster-whisper')"
python -c "import TTS; print('[OK] TTS')"
python -c "import pptx; print('[OK] python-pptx')"
python -c "import PIL; print('[OK] pillow')"
python -c "import openpyxl; print('[OK] openpyxl')"
echo.

echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 已安装功能:
echo   语音识别 (Faster-Whisper)
echo   语音合成 (Coqui TTS)
echo   PPT生成 (pptx-generator)
echo   PPT规划 (ppt-generator)
echo   PPT视觉 (nanobanana-ppt-visualizer)
echo.
echo 下一步:
echo   1. 查看集成方案: COMPLETE_INTEGRATION_PLAN.md
echo   2. 实现语音服务: backend\services\voice_service.py
echo   3. 实现PPT服务: backend\services\advanced_ppt_service.py
echo   4. 更新路由: backend\routes\voice_routes.py
echo   5. 测试功能: python test_all_features.py
echo.
pause
