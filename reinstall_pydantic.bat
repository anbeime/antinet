@echo off
echo 修复 pydantic-core 问题...

echo 1. 删除损坏的包目录...
rmdir /s /q "%USERPROFILE%\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\pydantic_core" 2>nul
rmdir /s /q "%USERPROFILE%\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\~ydantic-core" 2>nul

echo 2. 安装 pydantic...
pip install pydantic==2.5.3 pydantic-core==2.14.6 -i https://mirrors.aliyun.com/pypi/simple/

echo 3. 验证安装...
python -c "from fastapi import FastAPI; from pydantic import BaseModel; print('✅ 安装成功')"

echo.
echo 完成！
