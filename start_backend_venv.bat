@echo off
echo Starting Antinet Backend with Virtual Environment...
cd /d "%~dp0backend"
..\venv_arm64\Scripts\python.exe main.py
pause
