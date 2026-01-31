@echo off
echo 测试前端显示状态...
echo.

echo 1. 检查前端服务是否运行...
curl -s -o nul -w "%%{http_code}" http://localhost:3000
echo.

echo 2. 获取页面内容...
powershell -Command "Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing | Select-Object -ExpandProperty Content" > frontend_page.html
echo 页面已保存到 frontend_page.html

echo.
echo 3. 检查 main.tsx 编译...
curl -s -o nul -w "%%{http_code}" http://localhost:3000/src/main.tsx
echo.

echo 4. 检查 App.tsx 编译...
curl -s -o nul -w "%%{http_code}" http://localhost:3000/src/App.tsx
echo.

echo 5. 检查 Home.tsx 编译...
curl -s -o nul -w "%%{http_code}" http://localhost:3000/src/pages/Home.tsx
echo.

echo.
echo 测试完成！请打开浏览器访问 http://localhost:3000 查看显示效果
echo 如果看到白屏，请按 F12 打开浏览器控制台查看错误信息
pause
