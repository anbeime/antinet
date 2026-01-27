@echo off
chcp 65001 >nul
echo ========================================
echo Quick API Test
echo ========================================
echo.

echo Waiting for backend to be ready...
timeout /t 5 /nobreak >nul
echo.

echo [Test 1] Health Check
echo ----------------------------------------
curl http://localhost:8000/api/health
echo.
echo.

echo [Test 2] Skill List
echo ----------------------------------------
curl http://localhost:8000/api/skill/list
echo.
echo.

echo [Test 3] Knowledge Graph
echo ----------------------------------------
curl http://localhost:8000/api/knowledge/graph
echo.
echo.

echo ========================================
echo Tests Complete!
echo ========================================
echo.
echo If all tests passed, you can:
echo 1. Start frontend: cd frontend ^&^& npm run dev
echo 2. Run full tests: test_all_functions.ps1
echo 3. Commit code: git add . ^&^& git commit
echo.
pause
