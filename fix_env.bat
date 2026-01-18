# 手动修复 pydantic-core 问题

echo "步骤 1: 修复 pydantic-core..."
pip install --force-reinstall --no-deps pydantic-core==2.14.6 pydantic==2.5.3

echo.
echo "步骤 2: 验证 FastAPI 导入..."
python -c "from fastapi import FastAPI; print('FastAPI 导入成功')"

echo.
echo "步骤 3: 检查后端服务..."
curl http://localhost:8000/api/health

echo.
echo "✅ 后端环境检查完成"
echo.
echo "📋 注意事项:"
echo "- Node.js 未安装，前端无法启动"
echo "- 请从 https://nodejs.org 下载安装 LTS 版本"
echo "- 现在可以使用 test.html 测试后端功能"
