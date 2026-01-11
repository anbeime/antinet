# 🚀 Antinet智能知识管家 - 快速启动指南

## 立即开始 (5分钟快速测试)

您已经配置好磁盘重定向,可以立即在远程AIPC上测试项目!

### 📋 前置确认

- ✅ 已通过远程桌面连接到AIPC (ai-pc.cvmart.net:1007)
- ✅ 账号: AI-PC-19
- ✅ 已启用D盘重定向 (在AIPC的"此电脑"中可以看到"LISTEN 上的 D")
- ✅ 访问时段: 4:00-12:00

---

## 方式1: 使用一键部署脚本 (推荐)

### 在远程AIPC的PowerShell中执行:

```powershell
# 进入项目目录
cd "\\tsclient\D\compet\xiaolong"

# 运行一键部署脚本
.\deploy-to-aipc.ps1
```

脚本会自动:
1. ✅ 复制项目到 C:\workspace\antinet
2. ✅ 检查开发环境 (Node.js, Python, pnpm)
3. ✅ 安装前后端依赖
4. ✅ 检查QAI AppBuilder和模型文件

完成后按提示启动前后端服务即可。

---

## 方式2: 手动部署 (了解详细步骤)

### 步骤1: 复制项目到AIPC

**在远程AIPC的PowerShell中:**

```powershell
# 从重定向的D盘复制项目到本地
xcopy "\\tsclient\D\compet\xiaolong" "C:\workspace\antinet" /E /I /Y

# 进入项目目录
cd C:\workspace\antinet

# 确认文件已复制
dir
```

### 步骤2: 启动前端 (第一个PowerShell窗口)

```powershell
cd C:\workspace\antinet

# 确保pnpm已安装
npm install -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

**预期输出:**
```
VITE v6.2.0  ready in 523 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
  ➜  press h + enter to show help
```

**✓ 前端就绪!** 在AIPC浏览器中访问: http://localhost:3000

### 步骤3: 启动后端 (第二个PowerShell窗口)

```powershell
cd C:\workspace\antinet\backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 安装QAI AppBuilder (骁龙专用)
pip install C:\ai-engine-direct-helper\samples\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl

# 启动后端服务
python main.py
```

**预期输出:**
```
============================================================
Antinet智能知识管家 v1.0.0
端侧智能数据中枢与协同分析平台
============================================================
运行环境: NPU
数据不出域: True

⚠ 警告: QAI AppBuilder未安装,使用模拟模式
INFO: Uvicorn running on http://0.0.0.0:8000
```

**✓ 后端就绪!** 健康检查: http://localhost:8000/api/health

---

## 🧪 快速测试 (无需模型,体验界面)

即使没有QNN模型,也可以体验完整的前端界面!后端会自动切换到**模拟模式**。

### 在AIPC浏览器中:

1. **访问首页**: http://localhost:3000

2. **测试数据分析**:
   - 点击顶部导航 → "数据分析"
   - 点击"检测服务" → 应该显示"后端服务运行中,但模型未加载"
   - 输入查询: "分析上个月的销售数据趋势"
   - 点击"开始分析"
   - ✓ 查看四色卡片结果 (模拟数据)

3. **测试其他功能**:
   - 知识卡片管理
   - 团队协作
   - GTD系统
   - 分析报告

---

## 🔧 部署QNN模型 (完整功能,需要时间)

如果时间充足,可以部署真实的QNN模型以使用NPU加速:

### 选项A: 使用预训练模型 (如果已提供)

```powershell
# 检查是否有预转换的QNN模型
dir C:\ai-engine-direct-helper\samples\models\

# 如果有,复制到项目
copy C:\ai-engine-direct-helper\samples\models\qwen2-1.5b.bin C:\workspace\antinet\backend\models\qnn\

# 重启后端服务
```

### 选项B: 从ONNX转换 (需要30分钟-1小时)

```powershell
cd C:\workspace\antinet\backend\models

# 运行转换脚本
python convert_to_qnn_on_aipc.py
```

这会:
1. 检测ONNX模型
2. 转换为QNN格式
3. 编译到NPU
4. 运行性能测试

**注意**:
- 首次转换需要较长时间
- 需要良好的网络下载模型
- 可能遇到兼容性问题需要调试

---

## 📊 验证NPU加速 (如果QNN模型已部署)

### 方法1: 通过Web界面

1. 访问 http://localhost:3000
2. 数据分析 → 检测服务
3. 应显示: "✓ 后端服务正常,NPU模型已加载"
4. 执行查询,查看性能指标

### 方法2: 通过API测试

```powershell
# 健康检查
curl http://localhost:8000/api/health

# 性能基准测试
curl http://localhost:8000/api/performance/benchmark

# 数据分析测试
curl -X POST http://localhost:8000/api/analyze `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"分析销售数据\", \"data_source\": \"local\"}'
```

---

## ⏱️ 时间分配建议 (8小时时段)

### 如果第一次部署 (建议分配):

- **00:00-00:30**: 复制项目、安装依赖
- **00:30-01:00**: 启动前后端,验证模拟模式
- **01:00-03:00**: 转换QNN模型(后台运行,可以同时做其他事)
- **03:00-06:00**: 功能开发/调试/优化
- **06:00-07:30**: 性能测试、截图、准备演示材料
- **07:30-08:00**: 同步代码回本地,备份

### 如果已完成基础部署:

直接进入功能开发和测试阶段。

---

## 💾 重要提示

### 1. 及时保存代码到本地

```powershell
# 定期同步代码回本地磁盘
xcopy "C:\workspace\antinet" "\\tsclient\D\compet\xiaolong" /E /I /Y

# 或者使用Git
cd C:\workspace\antinet
git add .
git commit -m "在AIPC上的开发进度"
# 推送到GitHub/Gitee
```

### 2. 会话即将结束时

```powershell
# 停止服务
# 前端: Ctrl+C
# 后端: Ctrl+C

# 保存重要文件
# 复制生成的模型文件回本地 (如果有)
copy C:\workspace\antinet\backend\models\qnn\*.bin "\\tsclient\D\compet\xiaolong\backend\models\qnn\"

# 复制日志和测试结果
copy C:\workspace\antinet\*.log "\\tsclient\D\compet\xiaolong\"
```

### 3. 下次登录恢复工作

```powershell
# 直接从本地磁盘启动 (不需要重新复制)
cd "\\tsclient\D\compet\xiaolong"

# 前端
pnpm run dev

# 后端 (新窗口)
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

---

## 🆘 常见问题快速解决

### Q: 找不到重定向的D盘?

**A**:
```powershell
# 检查重定向
net use

# 应该看到类似:
# \\tsclient\D      Microsoft Terminal Services  OK
```

如果没有,说明磁盘重定向未生效,需要:
1. 断开远程桌面
2. 重新配置磁盘重定向
3. 重新连接

### Q: pnpm install很慢?

**A**:
```powershell
# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### Q: Python包安装失败?

**A**:
```powershell
# 使用阿里云镜像
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

### Q: 端口被占用?

**A**:
```powershell
# 检查端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# 杀死占用进程
taskkill /PID <进程ID> /F

# 或者修改端口
# 前端: vite.config.ts → server.port
# 后端: backend/config.py → PORT
```

---

## 📞 获取帮助

- **技术问题**: 论坛 https://bbs.csdn.net/forums/qualcomm?typeId=9305416
- **项目文档**: C:\workspace\antinet\DEPLOY.md
- **API文档**: http://localhost:8000/docs (后端运行时)

---

**祝您开发顺利!记得定期保存代码到本地磁盘!** 🎉
