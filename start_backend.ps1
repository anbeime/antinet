# 启动后端服务
Write-Host "启动后端服务..." -ForegroundColor Yellow

cd c:\test\antinet\backend

# 启动 FastAPI
python main.py

Write-Host "后端服务已启动: http://localhost:8000" -ForegroundColor Green
Write-Host "API 文档: http://localhost:8000/docs" -ForegroundColor Green
