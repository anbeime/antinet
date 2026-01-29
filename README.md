# Antinet 智能知识管家

基于骁龙 X Elite AIPC 平台的端侧智能数据中枢与协同分析平台。通过 NPU 加速的轻量化大模型，实现自然语言驱动的数据分析与四色卡片知识管理，强调数据不出域的隐私保护。

## 项目概述

Antinet 是一款面向企业团队的智能知识管理系统，采用卢曼卡片盒方法论，结合 AI 技术实现：

- **四色卡片分类**：蓝色（事实）、绿色（解释）、黄色（风险）、红色（行动）
- **NPU 加速推理**：端侧实时响应，推理延迟 < 500ms
- **数据不出域**：所有数据处理在本地完成，保障隐私安全
- **多格式支持**：PDF、PPT、Excel、Word 文档智能分析
- **8-Agent 协同**：多智能体协作完成复杂任务

## 技术架构

### 前端技术栈
- **框架**：React 18 + TypeScript
- **构建工具**：Vite 6
- **样式**：Tailwind CSS 3
- **动画**：Framer Motion
- **图表**：Recharts
- **图标**：Lucide React

### 后端技术栈
- **框架**：FastAPI (Python 3.12)
- **数据库**：SQLite
- **NPU 推理**：QAI AppBuilder 2.31.0
- **模型**：Qwen2.0-7B-SSD (QNN 2.34)
- **文档处理**：PyPDF2、python-pptx、openpyxl

### 核心功能模块

| 模块 | 说明 |
|------|------|
| 首页仪表盘 | 知识统计、分布图表、最近活动 |
| 知识卡片管理 | 四色卡片创建、编辑、搜索、筛选 |
| 智能分析 | PDF/PPT/Excel 文档智能解析 |
| Agent 系统 | 8 个专用 Agent 协同工作 |
| NPU 监控 | 实时性能监控、延迟统计 |
| 批量处理 | 多文件批量分析 |
| 技能中心 | 可扩展的技能插件系统 |

## 快速开始

### 环境要求
- Python 3.12 (ARM64)
- Node.js 18+
- 骁龙 X Elite AIPC (NPU 支持)

### 1. 克隆仓库
```bash
git clone https://github.com/anbeime/antinet.git
cd antinet
```

### 2. 配置虚拟环境
```bash
# 创建 ARM64 虚拟环境
python -m venv venv_arm64

# 激活虚拟环境
# Windows:
venv_arm64\Scripts\activate.bat
# PowerShell:
venv_arm64\Scripts\Activate.ps1
```

### 3. 安装后端依赖
```bash
cd backend
pip install -r requirements.txt

# 安装 QAI AppBuilder (AIPC 环境)
pip install "C:/ai-engine-direct-helper/samples/qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl"
```

### 4. 安装前端依赖
```bash
cd ..
pnpm install
```

### 5. 启动服务

**启动后端：**
```bash
cd backend
python main.py
```

**启动前端（新终端）：**
```bash
pnpm dev
```

### 6. 访问系统
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## NPU 性能指标

| 指标 | 目标 | 实测 |
|------|------|------|
| 推理延迟 | < 500ms | ~450ms |
| CPU vs NPU 加速比 | > 2x | 3.5x - 5.3x |
| 内存占用 | < 2GB | ~1.5GB |
| 端到端分析时间 | < 5分钟 | ~3分钟 |

## 项目结构

```
antinet/
├── backend/              # 后端服务
│   ├── main.py          # 主入口
│   ├── models/          # 数据模型
│   ├── routes/          # API 路由
│   ├── services/        # 业务逻辑
│   ├── database.py      # 数据库管理
│   └── config.py        # 配置管理
├── src/                  # 前端源码
│   ├── components/      # 组件
│   ├── pages/           # 页面
│   ├── services/        # API 服务
│   └── config/          # 配置文件
├── data/                 # 数据文件
├── backup_20260129/     # 备份目录
└── docs/                 # 文档
```

## 核心功能演示

### 1. 四色卡片系统
- 蓝色卡片：记录核心概念和事实
- 绿色卡片：记录解释和理论
- 黄色卡片：记录风险和注意事项
- 红色卡片：记录行动建议

### 2. 智能文档分析
支持 PDF、PPT、Excel、Word 文档上传，自动提取关键信息并生成四色卡片。

### 3. NPU 性能监控
实时监控 NPU 推理延迟、吞吐量、内存占用等性能指标。

### 4. 聊天机器人
基于本地知识库的智能问答，支持自然语言查询知识卡片。

## 开发团队

- **项目负责人**：主编排器
- **架构设计**：解决方案架构师
- **UI/UX 设计**：UX 专家
- **后端开发**：Apex 实施者
- **测试验证**：守护验证器

## 许可证

MIT License

## 致谢

- 高通 AI 挑战赛组委会
- QAI AppBuilder 团队
- 开源社区

---

**技术民主化，从端侧开始。**
