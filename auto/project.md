# Antinet 项目说明

## 项目概述

**项目名称**: Antinet  
**项目描述**: AI智能体网络平台 - 多智能体协作系统  
**版本**: 1.0.0  
**状态**: 开发中

## 核心功能

### 1. 智能卡片管理
- 四色卡片系统（蓝/绿/黄/红）
- 卡片创建、编辑、删除
- 卡片搜索与筛选
- 卡片导出功能

### 2. AI对话系统
- 多模型支持（Qwen/Qwen-VL等）
- 多轮对话能力
- 对话历史记录
- 模型切换功能

### 3. 知识库管理
- 文档智能导入
- 向量搜索
- 语义匹配
- 知识问答

### 4. GTD任务系统
- 任务创建与管理
- 任务执行跟踪
- 提醒功能
- 效率统计

### 5. 文档处理
- PDF解析与处理
- Word文档导出
- Excel数据分析
- PPT自动生成

### 6. 视觉能力
- 图像识别
- 多模态交互
- 视觉分析

### 7. NPU加速
- 本地AI推理加速
- Qualcomm NPU (QNN)支持
- 性能优化

## 技术栈

### 前端
- React 18+
- TypeScript
- Vite
- TailwindCSS
- Framer Motion

### 后端
- FastAPI
- Python 3.9+
- SQLite
- 向量数据库

### AI模型
- Qwen2.5-VL（视觉语言模型）
- BGE嵌入模型（向量嵌入）
- 多模型路由

### 硬件加速
- Qualcomm NPU (QNN)
- ONNX Runtime

## 目录结构

```
antinet/
├── auto/                    # 自动化配置目录
│   ├── CLAUDE.md           # AI操作指南
│   ├── skills-config.yaml  # 技能配置
│   ├── task-status.json    # 任务状态
│   └── progress.txt        # 进度记录
├── backend/                 # 后端代码
│   ├── agents/             # AI智能体
│   ├── api/                # API路由
│   ├── routes/             # 业务路由
│   ├── services/           # 服务层
│   ├── skills/             # 技能系统
│   ├── models/             # 模型管理
│   └── data/               # 数据库文件
├── src/                     # 前端代码
│   ├── components/         # 组件
│   ├── pages/              # 页面
│   └── utils/              # 工具函数
├── data/                    # 数据文件
├── scripts/                 # 脚本工具
└── output/                  # 输出文件
    ├── docs/               # 文档
    ├── images/             # 图片
    └── analysis/           # 分析报告
```

## 快速开始

### 环境要求
- Windows 10/11, Linux, macOS
- Python 3.9+
- Node.js 18+
- 支持NPU（可选）

### 安装步骤

1. 克隆代码
```bash
git clone <repository-url>
cd antinet
```

2. 安装Python依赖
```bash
pip install -r backend/requirements.txt
```

3. 安装Node.js依赖
```bash
npm install
```

4. 配置环境变量
```bash
copy .env.example .env
# 编辑 .env 文件配置必要参数
```

5. 启动后端服务
```bash
python backend/main.py
```

6. 启动前端服务
```bash
npm run dev
```

## 技能配置

### 已安装技能

**系统内置技能**（AI助手已具备）：
- `pptx` - PPT演示文稿创建与编辑
- `xlsx` - Excel数据处理与分析
- `docx` - Word文档创建与编辑
- `pdf` - PDF文档处理

**本地技能文件**（已复制）：
- `reddit-sentiment-analysis` - Reddit舆情情感分析

**缺失技能**（将使用替代方案）：
- `hand-drawn-infographic` - 手绘风格信息图生成 → 使用Python代码替代
- `concept-sector-analysis` - 概念板块分析 → 使用WebSearch + xlsx替代

### 技能检查

运行技能检查脚本：
```bash
python scripts/check_skills.py
```

查看技能安装指南：
- `SKILLS_INSTALL.md` - 完整的技能安装和配置说明

## 自动化开发

本项目支持全自动开发模式，AI助手可以：

✅ **自主决策** - 根据配置自主决定下一步行动  
✅ **持续执行** - 完成一个任务立即开始下一个  
✅ **自我验证** - 自动检查结果是否符合要求  
✅ **自动修复** - 发现问题时尝试自动修复  
✅ **完整记录** - 所有操作记录到 progress.txt

### 启动全自动开发

```markdown
请开始为"Antinet"项目进行全自动开发。

操作要求：
1. 读取 auto/skills-config.yaml 了解项目配置
2. 读取 auto/task-status.json 了解当前任务状态
3. 按照任务清单持续开发，无需等待确认
4. 每个任务完成后自动开始下一个
5. 所有输出保存到 ../output/ 目录
6. 记录进度到 ./progress.txt
7. 实时更新 ./task-status.json
8. 直到所有任务完成或遇到无法解决的问题

开始执行！
```

## 开发任务

1. **系统架构文档** - 分析代码架构并生成技术文档
2. **API文档整理** - 扫描并整理所有API接口
3. **功能清单与测试报告** - 整理功能清单和测试用例
4. **用户操作手册** - 编写用户操作手册
5. **部署文档** - 编写部署指南
6. **前后端对接检查** - 检查前后端接口对接情况
7. **功能测试执行** - 执行自动化功能测试
8. **材料整合与检查** - 整合所有材料并检查
9. **推送到代码仓库** - 将所有更新推送到Git仓库

## 输出文件

自动化开发将生成以下文档：

- `../output/docs/技术架构文档_Antinet.docx`
- `../output/docs/API接口文档_Antinet.docx`
- `../output/docs/功能清单_Antinet.xlsx`
- `../output/docs/测试用例_Antinet.xlsx`
- `../output/docs/用户操作手册_Antinet.docx`
- `../output/docs/部署指南_Antinet.docx`
- `../output/images/系统架构图_Antinet.png`
- `../output/docs/前后端对接检查报告_Antinet.docx`
- `../output/docs/接口对接问题清单.xlsx`
- `../output/docs/功能测试执行报告_Antinet.docx`
- `../output/docs/测试结果汇总.xlsx`

## 许可证

[许可证信息]

## 联系方式

[联系信息]

---

**最后更新**: 2026-02-17
