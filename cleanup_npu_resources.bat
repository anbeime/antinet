@echo off
echo ========================================
echo NPU资源清理工具
echo ========================================
echo.

echo [1] 检查后端状态...
curl -s http://localhost:8000/api/health
echo.

echo [2] 尝试清理NPU资源...
curl -s -X POST http://localhost:8000/api/admin/cleanup
echo.

echo [3] 检查清理后的状态...
curl -s http://localhost:8000/api/health
echo.

echo [4] 检查NPU设备状态...
curl -s http://localhost:8000/api/npu/status
echo.

echo ========================================
echo 清理完成
echo ========================================
echo.

echo 如果问题仍然存在，请尝试以下步骤：
echo 1. 关闭所有Python进程
echo 2. 运行: fix_npu_device.bat
echo 3. 重启后端: python backend/main.py
echo 4. 重新测试
echo.

pause