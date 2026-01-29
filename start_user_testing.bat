@echo off
chcp 65001 >nul
echo ========================================
echo Antinet 前端用户测试 - 快速启动
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 检查服务状态...
echo.

REM 检查前端
netstat -ano | findstr ":3000" >nul
if %errorlevel% == 0 (
    echo ✓ 前端服务运行中 (端口 3000)
) else (
    echo ✗ 前端服务未运行
    echo   启动命令: pnpm dev
)

REM 检查后端
netstat -ano | findstr ":8000" >nul
if %errorlevel% == 0 (
    echo ✓ 后端服务运行中 (端口 8000)
) else (
    echo ✗ 后端服务未运行
    echo   启动命令: python backend\main.py
)

echo.
echo [2/4] 检查测试文件...
echo.

if exist "backend\test_document.pdf" (
    echo ✓ 测试 PDF 文件存在
) else (
    echo ⚠ 测试 PDF 文件不存在
    echo   创建命令: python backend\create_test_pdf.py
)

if exist "backend\data\demo\sales_data.csv" (
    echo ✓ 测试 CSV 文件存在
) else (
    echo ⚠ 测试 CSV 文件不存在
)

echo.
echo [3/4] 打开测试文档...
echo.

if exist "USER_TESTING_GUIDE.md" (
    echo ✓ 打开用户测试指南...
    start "" "USER_TESTING_GUIDE.md"
) else (
    echo ⚠ 测试指南不存在
)

echo.
echo [4/4] 打开浏览器...
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
echo ✓ 已打开浏览器: http://localhost:3000

echo.
echo ========================================
echo 测试准备完成！
echo ========================================
echo.
echo 下一步：
echo 1. 在浏览器中测试各个功能
echo 2. 参考 USER_TESTING_GUIDE.md 进行测试
echo 3. 记录测试结果到 FRONTEND_USER_TESTING_CHECKLIST.md
echo.
echo 重点测试：
echo - PDF 上传和分析
echo - 知识卡片生成
echo - PDF 导出功能
echo.
pause
