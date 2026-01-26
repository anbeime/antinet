@echo off
echo ========================================
echo   修复 Python 环境配置
echo ========================================
echo.

cd /d C:\test\antinet

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo [ERROR] 虚拟环境不存在，正在创建...
    python -m venv venv_arm64
    if errorlevel 1 (
        echo [ERROR] 创建虚拟环境失败
        pause
        exit /b 1
    )
)

echo [INFO] 激活虚拟环境...
call venv_arm64\Scripts\activate.bat

echo.
echo [INFO] Python 版本:
python --version

echo.
echo [INFO] 升级 pip...
python -m pip install --upgrade pip

echo.
echo ========================================
echo   安装核心依赖
echo ========================================
echo.

echo [1/3] 安装 qai_appbuilder (NPU核心库)...
python -m pip install "C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" --force-reinstall
if errorlevel 1 (
    echo [ERROR] qai_appbuilder 安装失败
    pause
    exit /b 1
)
echo [OK] qai_appbuilder 安装成功

echo.
echo [2/3] 安装 FastAPI 和 Web 框架...
python -m pip install fastapi>=0.109.0 uvicorn[standard]>=0.27.0 pydantic>=2.5.0 pydantic-settings>=2.1.0
if errorlevel 1 (
    echo [WARNING] Web 框架安装失败，继续...
)

echo.
echo [3/3] 安装其他依赖...
python -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [WARNING] 部分依赖安装失败，继续...
)

echo.
echo ========================================
echo   验证安装
echo ========================================
echo.

echo [验证] qai_appbuilder...
python -c "import qai_appbuilder; print('[OK] qai_appbuilder 版本:', qai_appbuilder.__version__ if hasattr(qai_appbuilder, '__version__') else 'installed')"
if errorlevel 1 (
    echo [ERROR] qai_appbuilder 验证失败
    pause
    exit /b 1
)

echo [验证] fastapi...
python -c "import fastapi; print('[OK] fastapi 版本:', fastapi.__version__)"
if errorlevel 1 (
    echo [ERROR] fastapi 验证失败
    pause
    exit /b 1
)

echo [验证] GenieContext...
python -c "from qai_appbuilder import GenieContext; print('[OK] GenieContext 可用')"
if errorlevel 1 (
    echo [ERROR] GenieContext 验证失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   环境修复完成！
echo ========================================
echo.
echo 下一步：
echo   1. 运行 start_npu_backend.bat 启动后端服务
echo   2. 访问 http://localhost:8000/docs 查看 API 文档
echo.

pause
