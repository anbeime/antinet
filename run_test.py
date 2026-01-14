@echo off
cd /d C:\test\antinet
echo Running Genie load test...
py -3.12 test_genie_load.py
pause
