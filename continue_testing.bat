@echo off
chcp 65001 >nul
echo ========================================
echo Antinet - Continue Testing
echo ========================================
echo.

cd /d "%~dp0"

echo [Step 1/3] Starting backend service...
echo.
start cmd /k "start_backend_simple.bat"
echo Backend starting in new window...
echo.

echo Waiting 10 seconds for backend to start...
timeout /t 10 /nobreak >nul
echo.

echo [Step 2/3] Testing APIs...
echo.

echo Testing health check...
curl http://localhost:8000/api/health
echo.
echo.

echo Testing skill list...
curl http://localhost:8000/api/skill/list
echo.
echo.

echo Testing knowledge graph...
curl http://localhost:8000/api/knowledge/graph
echo.
echo.

echo [Step 3/3] All tests complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Check test results above
echo 2. Run: test_all_functions.ps1 (for detailed tests)
echo 3. Start frontend: cd frontend ^&^& npm run dev
echo ========================================
echo.
pause
