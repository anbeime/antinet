@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo Antinet 后端服务启动 (虚拟环境)
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查虚拟环境...
if not exist "venv_arm64\Scripts\python.exe" (
    echo [错误] 虚拟环境不存在: venv_arm64
    echo 请先运行 deploy_antinet.bat 创建虚拟环境
    pause
    exit /b 1
)
echo √ 虚拟环境存在
echo.

echo [2/5] 清理 CodeBuddy 依赖...
if exist "backend\routes\codebuddy_chat_routes.py" (
    if not exist "backend\routes\codebuddy_chat_routes.py.disabled" (
        echo 禁用 codebuddy_chat_routes.py...
        ren "backend\routes\codebuddy_chat_routes.py" "codebuddy_chat_routes.py.disabled"
        echo √ 已禁用
    ) else (
        echo √ 已经禁用
    )
) else (
    echo √ 文件不存在或已禁用
)
echo.

echo [3/5] 检查虚拟环境 Python...
venv_arm64\Scripts\python.exe --version
echo.

echo [4/5] 检查 qai_appbuilder...
venv_arm64\Scripts\python.exe -c "import qai_appbuilder; print('√ qai_appbuilder 已安装')" 2>nul
if errorlevel 1 (
    echo ⚠ qai_appbuilder 未安装，尝试安装...
    
    REM 查找 whl 文件
    set "whl_file="
    if exist "C:\ai-engine-direct-helper\samples\qai_appbuilder*.whl" (
        for %%f in ("C:\ai-engine-direct-helper\samples\qai_appbuilder*.whl") do set "whl_file=%%f"
    )
    if "!whl_file!"=="" (
        if exist "C:\test\qai_appbuilder*.whl" (
            for %%f in ("C:\test\qai_appbuilder*.whl") do set "whl_file=%%f"
        )
    )
    
    if not "!whl_file!"=="" (
        echo 找到: !whl_file!
        venv_arm64\Scripts\python.exe -m pip install "!whl_file!"
        if not errorlevel 1 (
            echo √ qai_appbuilder 安装成功
        )
    ) else (
        echo ⚠ 未找到 qai_appbuilder whl 文件
    )
)
echo.

echo [5/5] 启动后端服务...
echo.
echo ========================================
echo 正在启动 Antinet 后端服务...
echo ========================================
echo.
echo 服务地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

cd backend
..\venv_arm64\Scripts\python.exe main.py

if errorlevel 1 (
    echo.
    echo ========================================
    echo [错误] 后端服务启动失败
    echo ========================================
    echo.
    echo 请检查上面的错误信息
    echo.
    pause
)
