#!/bin/bash

# 停止Antinet后端服务

set -e

echo "停止Antinet后端服务..."

# 检查PID文件
if [ ! -f "logs/server.pid" ]; then
    echo "错误: PID文件不存在，服务可能未运行"
    exit 1
fi

# 读取PID
PID=$(cat logs/server.pid)

# 检查进程是否存在
if ! ps -p $PID > /dev/null 2>&1; then
    echo "服务未运行 (PID: $PID)"
    rm -f logs/server.pid
    exit 0
fi

# 停止服务
echo "正在停止服务 (PID: $PID)..."
kill $PID

# 等待进程结束
timeout=10
while ps -p $PID > /dev/null 2>&1; do
    sleep 1
    timeout=$((timeout - 1))
    if [ $timeout -eq 0 ]; then
        echo "超时，强制停止服务..."
        kill -9 $PID
        break
    fi
done

# 删除PID文件
rm -f logs/server.pid

echo "服务已停止"
