# 🤖 AI操作指南 - Antinet（全自动开发模式）

> **项目**：Antinet - AI智能体网络平台
> **开发模式**：🚀 全自动持续开发（无需反复确认）
> **版本**：v1.0 | 2026-02-17

---

## 🎯 核心特点

本项目采用**全自动开发模式**，AI助手可以：

✅ **自主决策** - 根据配置自主决定下一步行动
✅ **持续执行** - 完成一个任务立即开始下一个
✅ **自我验证** - 自动检查结果是否符合要求
✅ **自动修复** - 发现问题时尝试自动修复
✅ **完整记录** - 所有操作记录到 progress.txt

**你只需要说一次"开始开发"，AI会自动完成所有任务！**

---

## 🚀 快速开始

### 启动全自动开发

复制以下指令发送给AI：

```markdown
请开始为"Antinet"项目进行全自动开发。

操作要求：
1. 读取 skills-config.yaml 了解项目配置
2. 读取 task-status.json 了解当前任务状态
3. 按照任务清单持续开发，无需等待确认
4. 每个任务完成后自动开始下一个
5. 所有输出保存到 output/ 目录
6. 记录进度到 progress.txt
7. 实时更新 task-status.json
8. 直到所有任务完成或遇到无法解决的问题

开始执行！
```

---

## 📋 项目概览

```yaml
项目名称: Antinet
描述: AI智能体网络平台 - 多智能体协作系统
开发模式: 全自动持续开发

核心功能:
  - 智能卡片管理: 四色卡片系统（蓝/绿/黄/红）
  - AI对话系统: 多模型支持（Qwen/Qwen-VL等）
  - 知识库管理: 向量搜索、智能导入
  - GTD任务系统: 任务管理、执行跟踪
  - 文档处理: PDF、Word、Excel、PPT
  - 视觉能力: 图像识别、多模态交互
  - NPU加速: 本地AI推理加速

技术栈:
  - 前端: React + TypeScript + Vite + TailwindCSS
  - 后端: FastAPI + Python
  - 数据库: SQLite + 向量数据库
  - AI模型: Qwen2.5-VL、BGE嵌入模型
  - 硬件加速: Qualcomm NPU (QNN)
```

---

## 🗂️ 目录结构

```
antinet/
├── 📄 CLAUDE.md                   # ⭐ 自动化开发指导（本文件）
├── 📄 skills-config.yaml          # ⭐ 技能配置（必读）
├── 📄 task-status.json            # 任务状态跟踪
├── 📄 progress.txt                # 进度记录
├── 📄 project.md                  # 项目说明
├── 📁 auto/                       # 自动化配置目录
│   ├── CLAUDE.md
│   ├── skills-config.yaml
│   └── task-status.json
├── 📁 backend/                    # 后端代码
│   ├── agents/                   # AI智能体
│   ├── api/                      # API路由
│   ├── routes/                   # 业务路由
│   ├── services/                 # 服务层
│   ├── skills/                   # 技能系统
│   └── models/                   # 模型管理
├── 📁 src/                        # 前端代码
├── 📁 data/                       # 数据文件
├── 📁 scripts/                    # 脚本工具
└── 📁 output/                     # 输出文件
    ├── docs/                     # 文档
    ├── analysis/                 # 分析报告
    └── exports/                  # 导出文件
```

---

## 🛠️ 核心技能

### 系统内置技能（直接使用）

| 技能 | 用途 | 优先级 |
|-----|------|-------|
| pptx | PPT演示文稿创建与编辑 | ⭐⭐⭐⭐⭐ |
| xlsx | Excel数据处理与分析 | ⭐⭐⭐⭐⭐ |
| docx | Word文档创建与编辑 | ⭐⭐⭐⭐⭐ |
| pdf | PDF文档处理 | ⭐⭐⭐⭐ |

### Antinet专用技能

| 技能 | 用途 | 优先级 |
|-----|------|-------|
| card-management | 四色卡片系统管理 | ⭐⭐⭐⭐⭐ |
| knowledge-import | 知识库智能导入 | ⭐⭐⭐⭐⭐ |
| vector-search | 向量搜索 | ⭐⭐⭐⭐⭐ |
| gtd-task | GTD任务管理 | ⭐⭐⭐⭐ |
| multi-model | 多模型管理 | ⭐⭐⭐⭐ |
| vision-analysis | 视觉分析 | ⭐⭐⭐⭐ |
| npu-optimization | NPU优化 | ⭐⭐⭐ |

---

## 📊 开发任务清单

### Task 1: 系统架构文档 ⏱️ 30分钟

**自动执行流程**：
```
Step 1: 分析现有架构
  → 读取 ../backend/ 目录结构
  → 读取 ../src/ 目录结构
  → 分析核心模块依赖关系

Step 2: 生成架构图
  → 首选：使用 hand-drawn-infographic 技能（如可用）
  → 备选：使用Python代码生成（matplotlib/graphviz）
  → 生成系统架构图
  → 保存：../output/images/系统架构图_Antinet.png

Step 3: 编写技术文档
  → 使用 docx 技能
  → 生成技术架构文档
  → 保存：../output/docs/技术架构文档_Antinet.docx
```

---

### Task 2: API文档整理 ⏱️ 45分钟

**自动执行流程**：
```
Step 1: 扫描API路由
  → 读取 ../backend/routes/ 下所有路由文件
  → 提取API端点信息
  → 整理请求/响应格式

Step 2: 生成OpenAPI规范
  → 整理为OpenAPI 3.0格式
  → 保存：../output/docs/openapi.json

Step 3: 生成API文档
  → 使用 docx 技能
  → 生成API接口文档
  → 保存：../output/docs/API接口文档_Antinet.docx
```

---

### Task 3: 功能清单与测试报告 ⏱️ 40分钟

**自动执行流程**：
```
Step 1: 功能清单整理
  → 读取所有功能模块
  → 整理功能清单表格
  → 使用 xlsx 技能生成
  → 保存：../output/docs/功能清单_Antinet.xlsx

Step 2: 测试用例设计
  → 为每个功能设计测试用例
  → 整理测试矩阵
  → 保存：../output/docs/测试用例_Antinet.xlsx

Step 3: 生成测试报告模板
  → 使用 docx 技能
  → 保存：../output/docs/测试报告模板_Antinet.docx
```

---

### Task 4: 用户操作手册 ⏱️ 60分钟

**自动执行流程**：
```
Step 1: 核心功能说明
  → 卡片管理功能
  → AI对话功能
  → 知识库功能
  → GTD任务功能

Step 2: 操作步骤编写
  → 详细操作步骤
  → 截图占位符
  → 常见问题解答

Step 3: 生成手册
  → 使用 docx 技能
  → 保存：../output/docs/用户操作手册_Antinet.docx
```

---

### Task 5: 部署文档 ⏱️ 30分钟

**自动执行流程**：
```
Step 1: 环境要求整理
  → 系统要求
  → 依赖软件
  → 硬件要求（NPU）

Step 2: 部署步骤编写
  → 开发环境部署
  → 生产环境部署
  → 常见问题排查

Step 3: 生成部署文档
  → 使用 docx 技能
  → 保存：../output/docs/部署指南_Antinet.docx
```

---

### Task 6: 前后端对接检查 ⏱️ 40分钟

**自动执行流程**：
```
Step 1: 分析前端API调用
  → 扫描 ../src/ 目录
  → 识别所有API调用代码
  → 提取接口路径、方法、参数

Step 2: 对比后端API定义
  → 扫描 ../backend/routes/ 目录
  → 对比前端调用与后端定义
  → 检查路径、方法、参数匹配性

Step 3: 识别问题
  → 前端调用但后端未定义的接口
  → 后端定义但前端未调用的接口
  → 参数不匹配的接口

Step 4: 生成报告
  → 使用 docx 技能生成对接检查报告
  → 使用 xlsx 技能生成问题清单
  → 保存：../output/docs/前后端对接检查报告_Antinet.docx
  → 保存：../output/docs/接口对接问题清单.xlsx
```

---

### Task 7: 功能测试执行 ⏱️ 60分钟

**自动执行流程**：
```
Step 1: 环境准备
  → 安装依赖：pip install -r ../backend/requirements.txt
  → 启动后端服务：python ../backend/main.py
  → 等待服务启动完成

Step 2: API测试
  → 测试健康检查接口
  → 测试卡片管理API（增删改查）
  → 测试AI对话API
  → 测试知识库API
  → 测试GTD任务API
  → 测试文档处理API
  → 测试视觉API

Step 3: 记录结果
  → 记录每个API的测试结果
  → 记录响应时间
  → 记录错误信息

Step 4: 生成报告
  → 使用 docx 技能生成测试执行报告
  → 使用 xlsx 技能生成结果汇总
  → 保存：../output/docs/功能测试执行报告_Antinet.docx
  → 保存：../output/docs/测试结果汇总.xlsx
```

---

### Task 8: 材料整合与检查 ⏱️ 20分钟

**自动执行流程**：
```
Step 1: 检查文件完整性
  → 检查 ../output/docs/
  → 检查 ../output/images/
  → 检查 ../output/analysis/

Step 2: 统一命名规范
  → 确保命名符合规范
  → 自动重命名（如有问题）

Step 3: 生成文档清单
  → 创建：文档清单.md
  → 列出所有文件及说明
```

---

### Task 9: 推送到代码仓库 ⏱️ 15分钟

**自动执行流程**：
```
Step 1: 检查Git状态
  → 确认在Git仓库中
  → 检查远程仓库配置
  → 检查当前分支

Step 2: 准备提交
  → 查看变更文件列表
  → 添加文档文件：git add ../output/
  → 添加配置文件：git add ./

Step 3: 创建提交
  → 编写提交信息（包含任务摘要）
  → 创建提交：git commit

Step 4: 推送到远程
  → 拉取最新代码：git pull
  → 推送到远程：git push
  → 验证推送成功
```

---

## 🎨 输出规范

### 文件命名

```
技术架构:           ../output/docs/技术架构文档_Antinet_v1.docx
API文档:            ../output/docs/API接口文档_Antinet_v1.docx
功能清单:           ../output/docs/功能清单_Antinet_v1.xlsx
测试用例:           ../output/docs/测试用例_Antinet_v1.xlsx
用户手册:           ../output/docs/用户操作手册_Antinet_v1.docx
部署指南:           ../output/docs/部署指南_Antinet_v1.docx
架构图:             ../output/images/系统架构图_Antinet_v1.png
对接检查报告:       ../output/docs/前后端对接检查报告_Antinet_v1.docx
接口问题清单:       ../output/docs/接口对接问题清单_v1.xlsx
功能测试报告:       ../output/docs/功能测试执行报告_Antinet_v1.docx
测试结果汇总:       ../output/docs/测试结果汇总_v1.xlsx
```

### 目录结构

```
../output/
├── docs/
│   ├── 技术架构文档_Antinet_v1.docx
│   ├── API接口文档_Antinet_v1.docx
│   ├── 功能清单_Antinet_v1.xlsx
│   ├── 测试用例_Antinet_v1.xlsx
│   ├── 用户操作手册_Antinet_v1.docx
│   └── 部署指南_Antinet_v1.docx
├── images/
│   └── 系统架构图_Antinet_v1.png
└── analysis/
    └── 代码分析报告_Antinet_v1.docx
```

---

## ⚡ 一键启动指令

### 完整开发（推荐）

```markdown
请为"Antinet"项目进行全自动开发：

1. 读取 auto/skills-config.yaml
2. 按照 auto/task-status.json 中的任务清单执行
3. 每个任务完成后自动开始下一个
4. 所有输出保存到 output/ 目录
5. 实时更新 auto/task-status.json 和 auto/progress.txt
6. 完成后报告总进度和输出文件清单

开始执行！
```

### 单任务开发

```markdown
请执行 Task 1（系统架构文档）：

1. 分析现有代码架构
2. 生成系统架构图
3. 编写技术架构文档
4. 保存所有文件到正确目录
5. 更新 task-status.json 和 progress.txt

完成后报告结果。
```

---

## ⚠️ 自动化规则

### AI自动确认（无需人工干预）

✅ 文件保存成功 → 自动继续
✅ 技能调用成功 → 自动继续
✅ 格式符合要求 → 自动继续
✅ 内容完整 → 自动继续
✅ 任务步骤完成 → 自动开始下一任务

### 需要报告的情况

❌ 技能调用失败（重试3次后）
❌ 代码分析失败
❌ 文件保存失败（权限问题）
❌ 任务描述不明确
❌ 需要人工决策

---

## 📞 参考资料

- **自动化指导**：auto/CLAUDE.md（本文件）
- **技能配置**：auto/skills-config.yaml（技能配置和提示词）
- **任务状态**：auto/task-status.json（实时跟踪）
- **进度记录**：auto/progress.txt（历史记录）

---

**最后更新**：2026-02-17
**版本**：v1.0 - 全自动开发模式
**预计总耗时**：约3.5小时（6个任务连续执行）
