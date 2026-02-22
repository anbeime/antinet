@echo off
chcp 65001 >nul
echo ==========================================
echo 安装 PPT 功能依赖
echo ==========================================
echo.

echo [1/2] 安装 python-pptx...
pip install python-pptx>=0.6.21

echo [2/2] 验证安装...
python -c "from pptx import Presentation; print('✓ python-pptx 安装成功')"

echo.
echo ==========================================
echo 安装完成！
echo ==========================================
echo.
echo 请重启后端服务以应用更改。
echo.
pause
