# 启动前端服务
Write-Host "启动前端服务..." -ForegroundColor Yellow

cd c:\test\antinet

# 启动 Vite 开发服务器
npm run dev

Write-Host "前端服务已启动: http://localhost:3000" -ForegroundColor Green
