@echo off
REM 测试知识库集成
cd /d C:\test\antinet

echo ====================================
echo 知识库集成测试
echo ====================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\activate.bat" (
    echo [ERROR] 虚拟环境不存在: venv_arm64\Scripts\activate.bat
    echo.
    echo  重要: 不要创建新虚拟环境！
    echo 项目应该已有 venv_arm64 虚拟环境。
    echo 如果不存在，请检查项目设置或从备份恢复。
    pause
    exit /b 1
)

REM 激活虚拟环境
call venv_arm64\Scripts\activate.bat

echo [虚拟环境] 已激活: %VIRTUAL_ENV%
echo.

echo [测试 1] 文件结构检查...
python test_knowledge_integration.py
if errorlevel 1 (
    echo [ERROR] 文件结构测试失败
    pause
    exit /b 1
)

echo.
echo [测试 2] 检查依赖包...
python -c "import sqlite3, json, sys; print('标准库检查通过')"
if errorlevel 1 (
    echo [ERROR] 标准库检查失败
    pause
    exit /b 1
)

echo.
echo [测试 3] 检查虚拟环境中的包...
python -m pip list | findstr beautifulsoup4
if errorlevel 1 (
    echo [WARNING] beautifulsoup4 未安装
    echo 正在安装 beautifulsoup4...
    python -m pip install beautifulsoup4 lxml
)

echo.
echo ====================================
echo 测试完成!
echo ====================================
echo.
echo 下一步:
echo   1. 运行知识导入: run_knowledge_import.bat
echo   2. 启动后端服务: start_backend.bat
echo   3. 访问 API 文档: http://localhost:8000/docs
echo.
pause
