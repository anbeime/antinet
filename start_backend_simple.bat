@echo off
echo Starting Backend Service...
echo.

cd /d C:\test\antinet
call venv_arm64\Scripts\activate.bat
cd backend

echo Starting FastAPI Backend on port 8000...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
