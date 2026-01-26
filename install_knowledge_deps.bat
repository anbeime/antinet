@echo off
REM 安装知识库功能所需的依赖
REM  重要：使用项目现有的 venv_arm64 虚拟环境
REM 不要升级 Python，不要创建新虚拟环境

cd /d C:\test\antinet

echo ====================================
echo 安装知识库依赖
echo ====================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在: venv_arm64\Scripts\activate.bat
    echo 请确保项目根目录下有 venv_arm64 虚拟环境
    echo.
    echo 不要创建新虚拟环境，使用项目现有的环境！
    pause
    exit /b 1
)

REM 激活虚拟环境
call venv_arm64\Scripts\activate.bat
echo [OK] 虚拟环境已激活
echo.

REM 检查 Python 版本
python --version
echo.

REM 安装依赖
echo [STEP 1] 安装 beautifulsoup4...
pip install beautifulsoup4>=4.12.0
if errorlevel 1 (
    echo [ERROR] beautifulsoup4 安装失败
    pause
    exit /b 1
)

echo.
echo [STEP 2] 安装 lxml...
pip install lxml>=4.9.0
if errorlevel 1 (
    echo [ERROR] lxml 安装失败
    pause
    exit /b 1
)

echo.
echo [STEP 3] 安装 playwright...
pip install playwright>=1.40.0
if errorlevel 1 (
    echo [ERROR] playwright 安装失败
    pause
    exit /b 1
)

echo.
echo [STEP 4] 安装 playwright 浏览器...
playwright install chromium
if errorlevel 1 (
    echo [ERROR] playwright 浏览器安装失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo 依赖安装完成!
echo ====================================
echo.
echo 已安装的包：
pip list | findstr "beautifulsoup4 lxml playwright"
echo.
echo 现在可以运行知识导入了：
echo   run_knowledge_import.bat
echo.
pause
