@echo off
REM 设置NPU相关环境变量
set QAIRT_ROOT=C:\Qualcomm\AIStack\QAIRT\2.38.0.250901
set QNN_SDK_ROOT=C:\Qualcomm\AIStack\QNN-SDK\2.38
set PATH=%QAIRT_ROOT%\lib\arm64x-windows-msvc;%PATH%

echo 环境变量已设置：
echo QAIRT_ROOT=%QAIRT_ROOT%
echo QNN_SDK_ROOT=%QNN_SDK_ROOT%
echo PATH已更新，包含QAIRT库路径
