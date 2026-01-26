@echo off
REM ============================================
REM 环境清理脚本 - 只保留venv_arm64
REM ============================================

echo [INFO] 开始清理冗余Python环境...
echo.

REM 1. 删除venv (x64，不适合NPU)
if exist "venv" (
    echo [DELETE] 删除 venv (x64环境，NPU不兼容)...
    rmdir /s /q venv
    echo [OK] venv已删除
) else (
    echo [SKIP] venv不存在
)
echo.

REM 2. 保留venv_arm64
if exist "venv_arm64" (
    echo [KEEP] 保留 venv_arm64 (ARM64环境，NPU原生支持)
    echo [INFO] 这是唯一推荐的Python环境
) else (
    echo [WARNING] venv_arm64不存在！需要创建
    echo [INFO] 运行: python -m venv venv_arm64
)
echo.

REM 3. 更新启动脚本
echo [INFO] 更新启动脚本使用venv_arm64...

REM 创建新的后端启动脚本
echo @echo off > start_backend.bat
echo cd /d c:\test\antinet >> start_backend.bat
echo venv_arm64\Scripts\python backend\main.py >> start_backend.bat
echo. >> start_backend.bat
echo [OK] 后端启动脚本已创建: start_backend.bat

REM 创建新的测试脚本
echo @echo off > test_npu.bat
echo cd /d c:\test\antinet >> test_npu.bat
echo venv_arm64\Scripts\python test_npu_simple.py >> test_npu.bat
echo pause >> test_npu.bat
echo. >> test_npu.bat
echo [OK] NPU测试脚本已创建: test_npu.bat

REM 创建新的API测试脚本
echo @echo off > test_api.bat
echo cd /d c:\test\antinet >> test_api.bat
echo venv_arm64\Scripts\python test_npu_api.py >> test_api.bat
echo pause >> test_api.bat
echo. >> test_npu.bat
echo [OK] API测试脚本已创建: test_api.bat

echo.
echo ============================================
echo 清理完成！
echo ============================================
echo.
echo 环境状态:
echo   - venv_arm64: 活跃 (唯一推荐)
echo   - venv: 已删除 (不兼容NPU)
echo.
echo 启动后端: start_backend.bat
echo 测试NPU:   test_npu.bat
echo 测试API:   test_api.bat
echo.
pause
