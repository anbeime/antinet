# 修复环境脚本

# 1. 修复 pydantic
Write-Host "步骤 1: 修复 pydantic-core..." -ForegroundColor Yellow
pip install --force-reinstall --no-deps pydantic-core==2.14.6 pydantic==2.5.3

# 2. 测试 FastAPI
Write-Host "`n步骤 2: 测试 FastAPI 导入..." -ForegroundColor Yellow
python -c "from fastapi import FastAPI; print('FastAPI 导入成功')"

# 3. 检查 Node.js
Write-Host "`n步骤 3: 检查 Node.js..." -ForegroundColor Yellow
try {
    node --version
    npm --version
    Write-Host "Node.js 已安装" -ForegroundColor Green
} catch {
    Write-Host "Node.js 未安装" -ForegroundColor Red
    Write-Host "请从 https://nodejs.org 下载安装 LTS 版本" -ForegroundColor Yellow
}

# 4. 安装前端依赖
Write-Host "`n步骤 4: 安装前端依赖..." -ForegroundColor Yellow
cd c:\test\antinet
npm install

Write-Host "`n✅ 环境修复完成" -ForegroundColor Green
