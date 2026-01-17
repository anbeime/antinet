@echo off
echo 复制 VC++ 运行时 DLL 到 QAI 库目录

set QAI_LIBS=C:\ai-engine-direct-helper\samples\qai_libs
set SYS32=C:\Windows\System32

echo 目标目录: %QAI_LIBS%
if not exist "%QAI_LIBS%" mkdir "%QAI_LIBS%"

:: 复制 VC++ 运行时 DLL
copy /Y "%SYS32%\msvcp140.dll" "%QAI_LIBS%\"
copy /Y "%SYS32%\vcruntime140.dll" "%QAI_LIBS%\"
copy /Y "%SYS32%\vcruntime140_1.dll" "%QAI_LIBS%\"
copy /Y "%SYS32%\ucrtbase.dll" "%QAI_LIBS%\"
copy /Y "%SYS32%\concrt140.dll" "%QAI_LIBS%\"

:: 检查文件是否复制成功
echo.
echo 复制后的文件列表:
dir "%QAI_LIBS%\*.dll"

pause