@echo off
REM 复制 whl 文件到当前目录并安装

echo 正在复制 whl 文件...
copy "C:\test\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" ".\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl"

if not exist ".\qai_appbuilder-2.38.0-cp312-cp312-win_arm64.whl" (
    echo 错误：复制失败
    pause
    exit /b 1
)

echo 复制成功！
echo.
echo 正在安装 qai_appbuilder...
call install_qai_appbuilder.bat
