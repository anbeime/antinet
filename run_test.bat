@echo off
chcp 65001 >nul
cd /d C:\test\antinet
venv_arm64\Scripts\python.exe test_npu_english.py
pause
