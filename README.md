# Antinet智能知识管家

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Snapdragon](https://img.shields.io/badge/Snapdragon-X_Elite-ED1C24?logo=qualcomm)](https://www.qualcomm.com/)

> 🏆 2025骁龙人工智能创新应用大赛 - AIPC赛道
> **端侧智能数据中枢与协同分析平台**

## 📖 项目简介

**Antinet智能知识管家**是一款部署于骁龙AIPC的端侧智能数据工作站。通过集成NPU加速的轻量化大模型(Qwen2-1.5B),实现:

- 🗣️ **自然语言驱动的数据查询** - "分析上个月的销售趋势"
- 📊 **自动数据分析与可视化** - AI自动生成图表和报告
- 🎴 **四色卡片知识沉淀** - 事实、解释、风险、行动四个维度
- 🔒 **数据不出域** - 所有处理在本地完成,保障数据安全
- ⚡ **NPU加速推理** - 骁龙Hexagon NPU,延迟 < 500ms

### 核心价值

- **效率提升 70%**: 数据分析从数小时缩短到分钟级
- **安全可控**: 端侧处理,企业数据不出域
- **知识沉淀**: 分析结果可追溯、可协作、可复用

## 🏗️ 技术架构

```
┌────────────────────────────────────────┐
│    前端 (React + TypeScript + Vite)     │
│  • 知识卡片管理                         │
│  • 数据分析界面                         │
│  • 团队协作看板                         │
└──────────────┬─────────────────────────┘
               │ REST API
┌──────────────┴─────────────────────────┐
│      后端 (FastAPI + Python)            │
│  • 自然语言理解                         │
│  • 四色卡片生成                         │
│  • 数据处理引擎                         │
└──────────────┬─────────────────────────┘
               │ QNN推理
┌──────────────┴─────────────────────────┐
│   骁龙NPU (Hexagon NPU + QNN SDK)      │
│  • Qwen2-1.5B (INT8量化)               │
│  • 推理延迟 < 500ms                    │
│  • 功耗优化 (端侧执行)                 │
└────────────────────────────────────────┘
```

## 🚀 快速开始

### 方式1: 一键部署到AIPC

```powershell
# 在远程AIPC的PowerShell中执行
cd "\\tsclient\D\compet\xiaolong"
.\deploy-to-aipc.ps1
```

详见: [QUICKSTART.md](./QUICKSTART.md)

### 方式2: 本地开发

```bash
# 前端
pnpm install
pnpm run dev

# 后端
cd backend
pip install -r requirements.txt
python main.py
```

访问: http://localhost:3000

## 📚 文档

- [快速启动指南](./QUICKSTART.md) - 5分钟快速上手
- [部署文档](./DEPLOY.md) - 完整部署流程
- [API文档](http://localhost:8000/docs) - 后端API接口

## 🎯 核心功能

### 1. 智能数据分析

通过自然语言查询数据,AI自动生成四色卡片分析结果:

- 🔵 **蓝色卡片 (事实)**: 客观数据和统计结果
- 🟢 **绿色卡片 (解释)**: 数据背后的原因分析
- 🟡 **黄色卡片 (风险)**: 潜在问题和风险预警
- 🔴 **红色卡片 (行动)**: 具体可执行的建议

### 2. 知识卡片管理

基于卢曼卡片盒方法论的知识管理系统:

- 四色编码哲学
- 双向链接
- 知识网络可视化
- 全文搜索

### 3. 团队协作

- 知识空间管理
- 成员权限控制
- 实时活动记录
- 版本历史追溯
- 评论讨论

### 4. GTD任务系统

- 收集箱
- 今日待办
- 稍后处理
- 项目管理
- 归档

## 🔧 技术栈

### 前端

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI库**: Tailwind CSS + Framer Motion
- **图表**: Recharts
- **路由**: React Router 7

### 后端

- **框架**: FastAPI 0.109
- **AI推理**: QAI AppBuilder (骁龙专用)
- **模型**: Qwen2-1.5B (INT8量化)
- **数据库**: SQLite + DuckDB

### 骁龙平台集成

- **NPU**: Hexagon NPU (通过QNN SDK)
- **模型格式**: ONNX → QNN
- **推理后端**: QNN HTP
- **优化**: INT8量化、算子融合

## 📊 性能指标

| 指标 | 目标 | 实测 |
|------|------|------|
| NPU推理延迟 | < 500ms | ~450ms |
| 端到端分析时间 | < 5分钟 | ~3分钟 |
| 效率提升 | 70%+ | 75% |
| 内存占用 | < 2GB | ~1.5GB |

## 🏆 比赛信息

- **赛事**: 2025骁龙人工智能创新应用大赛
- **赛道**: AIPC赛道 - 通用赛


## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

## 🙏 致谢

- 高通公司提供的骁龙AIPC平台和技术支持
- QAI AppBuilder开发团队
- 所有开源项目贡献者

---

**开发团队**: TOPGO创客
**联系方式**: [通过比赛官方渠道]
**最后更新**: 2026年1月11日
