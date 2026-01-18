@echo off
echo Fixing pydantic-core issue...

echo 1. Removing corrupted package directories...
rmdir /s /q "%USERPROFILE%\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\pydantic_core" 2>nul
rmdir /s /q "%USERPROFILE%\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\LocalCache\local-packages\Python312\site-packages\~ydantic-core" 2>nul

echo 2. Installing pydantic...
pip install pydantic==2.5.3 pydantic-core==2.14.6 -i https://mirrors.aliyun.com/pypi/simple/

echo 3. Verifying installation...
python -c "from fastapi import FastAPI; from pydantic import BaseModel; print('SUCCESS: FastAPI and pydantic imported successfully')"

echo.
echo Fix completed!