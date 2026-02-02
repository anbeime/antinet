@echo off
echo ============================================================
echo Antinet 向量搜索部署脚本
echo ============================================================
echo.

set VENV_PYTHON=C:\test\antinet\venv_arm64\Scripts\python.exe
set VENV_PIP=C:\test\antinet\venv_arm64\Scripts\pip.exe

cd C:\test\antinet

echo [Step 1/5] 检查虚拟环境...
if not exist "%VENV_PYTHON%" (
    echo ERROR: 虚拟环境不存在！
    echo 请先创建虚拟环境
    pause
    exit /b 1
)
echo OK 虚拟环境已找到
echo.

echo [Step 2/5] 安装依赖...
echo 正在安装 sentence-transformers...
%VENV_PIP% install sentence-transformers
if errorlevel 1 (
    echo ERROR: 安装失败！
    pause
    exit /b 1
)
echo OK 依赖安装完成
echo.

echo [Step 3/5] 验证安装...
%VENV_PYTHON% -c "from sentence_transformers import SentenceTransformer; print('OK')"
if errorlevel 1 (
    echo ERROR: 导入失败！
    pause
    exit /b 1
)
echo OK 导入测试通过
echo.

echo [Step 4/5] 创建向量表...
%VENV_PYTHON% backend\database_vector.py
if errorlevel 1 (
    echo ERROR: 向量表创建失败！
    pause
    exit /b 1
)
echo OK 向量表创建成功
echo.

echo [Step 5/5] 生成向量嵌入...
%VENV_PYTHON% backend\scripts\generate_embeddings.py
if errorlevel 1 (
    echo ERROR: 向量生成失败！
    pause
    exit /b 1
)
echo.

echo ============================================================
echo 部署完成！
echo ============================================================
echo.
echo 下一步：
echo 1. 修改 backend\main.py 启用向量搜索
echo 2. 修改 backend\routes\chat_routes.py 使用混合搜索
echo 3. 重启后端服务
echo.
echo 详细说明请查看: VECTOR_SEARCH_GUIDE.md
echo.
pause
