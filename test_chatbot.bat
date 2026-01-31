@echo off
chcp 65001 >nul
echo ========================================
echo 测试聊天机器人修复
echo ========================================
echo.

echo [测试1] 测试API健康检查...
curl -s http://localhost:8000/api/chat/health
echo.
echo.

echo [测试2] 搜索"Antinet"相关卡片...
curl -s -X POST http://localhost:8000/api/chat/query -H "Content-Type: application/json" -d "{\"query\":\"Antinet\"}"
echo.
echo.

echo [测试3] 搜索"系统功能"...
curl -s -X POST http://localhost:8000/api/chat/query -H "Content-Type: application/json" -d "{\"query\":\"系统功能\"}"
echo.
echo.

echo ========================================
echo 测试完成
echo 如果看到卡片数据，说明修复成功
echo ========================================
pause
