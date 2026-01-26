@echo off
REM Antinet 部署脚本 (Windows)
REM 用于在Windows ARM64环境下部署Antinet智能知识管家

echo ===================================
echo Antinet 智能知识管家部署脚本
echo ===================================

REM 检查Python环境
echo [1/6] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.10+
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set python_version=%%i
echo Python版本: %python_version%

REM 创建虚拟环境
echo [2/6] 创建Python虚拟环境...
if not exist venv (
    python -m venv venv
    echo 虚拟环境创建成功
) else (
    echo 虚拟环境已存在
)

REM 激活虚拟环境
echo [3/6] 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo [4/6] 安装Python依赖...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM 创建必要目录
echo [5/6] 创建必要目录...
if not exist data mkdir data
if not exist logs mkdir logs
if not exist temp mkdir temp

REM 配置环境变量
echo [6/6] 配置环境变量...
if not exist .env (
    copy .env.example .env
    echo 已创建.env配置文件，请根据实际情况修改配置
) else (
    echo .env配置文件已存在
)

REM 检查GenieAPIService配置
echo.
echo ===================================
echo 部署完成！
echo ===================================
echo.
echo 请确保：
echo 1. GenieAPIService已安装并运行
echo 2. QNN SDK已正确配置
echo 3. 模型路径正确: C:/model/Qwen2.0-7B-SSD-8380-2.34/
echo 4. .env配置文件已正确设置
echo.
echo 启动后端服务：
echo   venv\Scripts\activate.bat
echo   python main.py
echo.
echo 启动前端服务：
echo   cd frontend
echo   npm install
echo   npm run dev
echo.
pause
