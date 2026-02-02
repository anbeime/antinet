@echo off
REM 在虚拟环境中安装 PDF 处理相关的依赖包
echo ========================================
echo 在虚拟环境中安装 PDF 处理依赖...
echo ========================================

REM 检查虚拟环境是否存在
if not exist "venv_arm64\Scripts\activate.bat" (
    echo 错误: 虚拟环境不存在于 venv_arm64 目录
    echo 请先运行 setup_arm64_env.py 创建虚拟环境
    pause
    exit /b 1
)

REM 激活虚拟环境
echo 正在激活虚拟环境...
call venv_arm64\Scripts\activate.bat

echo.
echo 正在安装 PDF 处理包...
echo ----------------------------------------
echo 包列表:
echo   - pypdf
echo   - pdfplumber
echo   - reportlab
echo ----------------------------------------

REM 安装包
pip install pypdf pdfplumber reportlab

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo ✓ 安装成功！
    echo.
    echo 已安装的包:
    pip show pypdf
    pip show pdfplumber
    pip show reportlab
) else (
    echo ✗ 安装失败，请检查错误信息
)
echo ========================================

REM 等待用户确认
pause
