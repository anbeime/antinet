#!/bin/bash

# 启动Antinet后端服务

set -e

echo "启动Antinet后端服务..."

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "错误: 虚拟环境不存在，请先运行部署脚本"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate

# 检查配置文件
if [ ! -f ".env" ]; then
    echo "错误: .env配置文件不存在，请先运行部署脚本"
    exit 1
fi

# 创建日志目录
mkdir -p logs

# 启动服务
echo "服务启动中..."
nohup python main.py > logs/server.log 2>&1 &
echo $! > logs/server.pid

echo "后端服务已启动，PID: $(cat logs/server.pid)"
echo "日志文件: logs/server.log"
echo ""
echo "查看日志: tail -f logs/server.log"
echo "停止服务: ./stop.sh"
