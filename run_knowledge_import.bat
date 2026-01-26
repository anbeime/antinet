@echo off
REM 批量导入知识库到数据库
cd /d C:\test\antinet

echo ====================================
echo 开始导入知识库
echo ====================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在: venv_arm64\Scripts\activate.bat
    echo 请确保项目根目录下有 venv_arm64 虚拟环境
    pause
    exit /b 1
)

REM 激活虚拟环境
call venv_arm64\Scripts\activate.bat

echo [STEP 1] 解析 HTML 文件...
python backend\tools\html_parser.py
if errorlevel 1 (
    echo [ERROR] HTML 解析失败
    pause
    exit /b 1
)

echo.
echo [STEP 2] 导入到数据库...
python backend\tools\knowledge_importer.py
if errorlevel 1 (
    echo [ERROR] 数据库导入失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo 知识库导入完成!
echo ====================================
echo.
echo 现在可以通过以下API访问知识库:
echo   - GET  http://localhost:8000/api/knowledge/cards
echo   - POST http://localhost:8000/api/knowledge/cards
echo   - GET  http://localhost:8000/api/knowledge/stats
echo   - POST http://localhost:8000/api/knowledge/search
echo.
pause
