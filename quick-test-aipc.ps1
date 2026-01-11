#!/usr/bin/env pwsh
# AIPC快速测试脚本 - 在远程AIPC执行

Write-Host "=== Antinet AIPC 快速测试 ===" -ForegroundColor Cyan

# 复制项目到本地
Write-Host "`n[1] 复制项目..." -ForegroundColor Yellow
xcopy "\\tsclient\D\compet\xiaolong" "C:\workspace\antinet" /E /I /Y /Q
cd C:\workspace\antinet

# 启动前端
Write-Host "`n[2] 安装前端依赖并启动..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\workspace\antinet; pnpm install; pnpm run dev"

# 等待前端启动
Start-Sleep -Seconds 5

# 启动后端
Write-Host "`n[3] 安装后端依赖并启动..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd C:\workspace\antinet\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder*.whl -q
python main.py
"@

Write-Host "`n✓ 服务启动中..." -ForegroundColor Green
Write-Host "前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host "后端: http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "`n打开浏览器测试数据分析功能" -ForegroundColor Yellow
