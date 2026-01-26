#!/bin/bash

# Antinet 部署脚本
# 用于在Windows ARM64环境下部署Antinet智能知识管家

set -e

echo "==================================="
echo "Antinet 智能知识管家部署脚本"
echo "==================================="

# 检查Python环境
echo "[1/6] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3，请先安装Python 3.10+"
    exit 1
fi

python3_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Python版本: $python3_version"

# 创建虚拟环境
echo "[2/6] 创建Python虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在"
fi

# 激活虚拟环境
echo "[3/6] 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "[4/6] 安装Python依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 创建必要目录
echo "[5/6] 创建必要目录..."
mkdir -p data
mkdir -p logs
mkdir -p temp

# 配置环境变量
echo "[6/6] 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "已创建.env配置文件，请根据实际情况修改配置"
else
    echo ".env配置文件已存在"
fi

# 检查GenieAPIService配置
echo ""
echo "==================================="
echo "部署完成！"
echo "==================================="
echo ""
echo "请确保："
echo "1. GenieAPIService已安装并运行"
echo "2. QNN SDK已正确配置"
echo "3. 模型路径正确: C:/model/Qwen2.0-7B-SSD-8380-2.34/"
echo "4. .env配置文件已正确设置"
echo ""
echo "启动后端服务："
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "启动前端服务："
echo "  cd frontend"
echo "  npm install"
echo "  npm run dev"
echo ""
