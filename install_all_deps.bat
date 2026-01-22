@echo off
echo 安装 GenieAPIService 所有依赖...
echo.

pip install sse-starlette json-repair langchain-core langchain langchain-community langchain-text-splitters python-multipart numpy -q

echo.
echo 验证安装...
python -c "import sse_starlette, json_repair, langchain, langchain_core, langchain_community, langchain_text_splitters; print('All dependencies OK')" 2>&1

echo.
echo 按任意键退出...
pause >nul