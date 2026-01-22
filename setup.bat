@echo off
cd /d C:\test\antinet\data-analysis-iteration\frontend
call npm install
if %errorlevel% equ 0 (
    echo Success! Now run: npm run dev
) else (
    echo Failed! Check network connection.
)
pause
