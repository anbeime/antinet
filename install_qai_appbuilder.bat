@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
echo ========================================
echo 安装 qai_appbuilder 模块
echo ========================================
echo.

REM 检查虚拟环境
if not exist "venv_arm64\Scripts\python.exe" (
    echo 错误：未找到虚拟环境 venv_arm64
    pause
    exit /b 1
)

REM 安装whl包
REM 先尝试当前目录
SET "WHL_PATH=qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
if not exist "!WHL_PATH!" (
    REM 尝试上级目录
    SET "WHL_PATH=..\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
    if not exist "!WHL_PATH!" (
        REM 尝试绝对路径
        SET "WHL_PATH=C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"
        if not exist "!WHL_PATH!" (
            echo 错误：未找到 qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl
            echo 请将文件放在以下任一位置：
            echo   1. 当前目录
            echo   2. 上级目录 (C:\test\)
            pause
            exit /b 1
        )
    )
)

echo 正在安装 qai_appbuilder...
venv_arm64\Scripts\python.exe -m pip install "!WHL_PATH!"

if errorlevel 1 (
    echo.
    echo 安装失败！尝试使用--force-reinstall选项...
    venv_arm64\Scripts\python.exe -m pip install --force-reinstall --no-deps "!WHL_PATH!"
)

echo.
echo 验证安装...
venv_arm64\Scripts\python.exe -c "import qai_appbuilder; print('qai_appbuilder 安装成功'); print('版本:', getattr(qai_appbuilder, '__version__', 'unknown'))" 2>nul || echono 安装失败

echo.
echo 复制缺失的DLL文件...
set "SOURCE_DIR=C:\ai-engine-direct-helper\samples\qai_libs"
set "DEST_DIR=venv_arm64\Lib\site-packages\qai_appbuilder\libs"

if exist "!SOURCE_DIR!\QnnContextBinary.dll" (
    copy /Y "!SOURCE_DIR!\QnnContextBinary.dll" "!DEST_DIR!" >nul
    echo QnnContextBinary.dll 已复制
) else (
    echo   QnnContextBinary.dll 未找到
)

if exist "!SOURCE_DIR!\QnnModel.dll" (
    copy /Y "!SOURCE_DIR!\QnnModel.dll" "!DEST_DIR!" >nul
    echo QnnModel.dll 已复制
) else (
    echo   QnnModel.dll 未找到
)

if exist "!SOURCE_DIR!\QnnCpu.dll" (
    copy /Y "!SOURCE_DIR!\QnnCpu.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnCpu.dll 已复制
)

if exist "!SOURCE_DIR!\QnnGpu.dll" (
    copy /Y "!SOURCE_DIR!\QnnGpu.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnGpu.dll 已复制
)

if exist "!SOURCE_DIR!\QnnIr.dll" (
    copy /Y "!SOURCE_DIR!\QnnIr.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnIr.dll 已复制
)

if exist "!SOURCE_DIR!\QnnModelDlc.dll" (
    copy /Y "!SOURCE_DIR!\QnnModelDlc.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnModelDlc.dll 已复制
)

if exist "!SOURCE_DIR!\QnnGenAiTransformer.dll" (
    copy /Y "!SOURCE_DIR!\QnnGenAiTransformer.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnGenAiTransformer.dll 已复制
)

if exist "!SOURCE_DIR!\QnnGenAiTransformerCpuOpPkg.dll" (
    copy /Y "!SOURCE_DIR!\QnnGenAiTransformerCpuOpPkg.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnGenAiTransformerCpuOpPkg.dll 已复制
)

if exist "!SOURCE_DIR!\QnnGenAiTransformerModel.dll" (
    copy /Y "!SOURCE_DIR!\QnnGenAiTransformerModel.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnGenAiTransformerModel.dll 已复制
)

if exist "!SOURCE_DIR!\QnnGpuNetRunExtensions.dll" (
    copy /Y "!SOURCE_DIR!\QnnGpuNetRunExtensions.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnGpuNetRunExtensions.dll 已复制
)

if exist "!SOURCE_DIR!\QnnCpuNetRunExtensions.dll" (
    copy /Y "!SOURCE_DIR!\QnnCpuNetRunExtensions.dll" "!DEST_DIR!" >nul 2>nul
    echo QnnCpuNetRunExtensions.dll 已复制
)

echo.
echo DLL文件复制完成！

pause