# Antinet 智能知识管家 - 文档中心

## 概述

本文档中心包含 Antinet 智能知识管理系统的完整文档,涵盖架构设计、NPU 集成、API 规范、性能优化、隐私合规等方面。

## 文档目录

### 快速开始

- [README.md](../../README.md) - 项目概述和快速开始
- [QUICKSTART.md](../../QUICKSTART.md) - 5分钟快速上手指南
- [DEPLOY.md](../../DEPLOY.md) - 完整部署指南

### 规格文档 (`.specs/`)

- [架构设计](../.specs/architecture.md) - 系统架构图、算力分配、技术栈
- [NPU 集成方案](../.specs/npu-integration.md) - QNN 模型转换、QAI AppBuilder API
- [模型部署规范](../.specs/model-deployment.md) - 模型部署流程、配置和测试
- [端侧隐私合规](../.specs/privacy-compliance.md) - 数据不出域、安全措施
- [API 接口规范](../.specs/api-spec.md) - API 端点、数据模型、使用示例

### 设计文档 (`.design/`)

- [用户流程图](../.design/user-flows.md) - 核心功能的使用路径和操作步骤
- [四色卡片设计](../.design/four-color-cards.md) - 四色卡片方法论、数据结构、展示设计
- [NPU 性能监控界面](../.design/npu-dashboard.md) - 性能监控仪表板设计、组件设计
- [组件库](../.design/component-library.md) - Tailwind CSS 组件库、颜色系统、响应式设计
- [动画规范](../.design/animations.md) - Framer Motion 动画设计、性能优化

### 专项文档 (`.docs/`)

- [NPU 性能说明](NPU_PERFORMANCE.md) - NPU 性能指标、性能对比、优化策略
- [端侧隐私合规](PRIVACY_COMPLIANCE.md) - 隐私保护、技术实现、合规验证
- [故障排查指南](TROUBLESHOOTING.md) - 常见问题排查方法和解决方案

### 其他文档

- [DEMO_GUIDE.md](../../DEMO_GUIDE.md) - 演示视频录制指南
- [PROJECT_STATUS.md](../../PROJECT_STATUS.md) - 项目状态和完成清单
- [backend/DEPENDENCIES.md](../../backend/DEPENDENCIES.md) - 后端依赖安装说明

## 按角色查找文档

### 开发者

- [快速开始](../../QUICKSTART.md) - 环境配置和启动
- [架构设计](../.specs/architecture.md) - 系统架构理解
- [API 接口规范](../.specs/api-spec.md) - API 使用
- [模型部署规范](../.specs/model-deployment.md) - 模型部署
- [组件库](../.design/component-library.md) - 前端组件使用

### 运维人员

- [完整部署指南](../../DEPLOY.md) - 部署到 AIPC
- [故障排查指南](TROUBLESHOOTING.md) - 问题排查
- [NPU 性能说明](NPU_PERFORMANCE.md) - 性能监控

### 演示人员

- [演示视频录制指南](../../DEMO_GUIDE.md) - 录制演示视频
- [NPU 性能说明](NPU_PERFORMANCE.md) - 性能展示要点
- [项目状态](../../PROJECT_STATUS.md) - 当前状态

### 评估人员

- [架构设计](../.specs/architecture.md) - 系统架构评估
- [NPU 集成方案](../.specs/npu-integration.md) - NPU 集成评估
- [端侧隐私合规](PRIVACY_COMPLIANCE.md) - 隐私合规评估
- [性能基准测试](#运行合规性验证) - 性能验证

## 快速链接

### 验证项目

```bash
# 运行合规性验证
python backend/verify_compliance.py

# 运行 NPU 性能测试
curl http://localhost:8000/api/performance/benchmark

# 检查后端健康状态
curl http://localhost:8000/api/health
```

### 常用命令

```bash
# 前端启动
pnpm run dev

# 后端启动
cd backend
python main.py

# 模型转换
cd backend/models
python convert_to_qnn_on_aipc.py

# 部署到 AIPC
.\deploy-to-aipc.ps1

# 快速测试
.\quick-test-aipc.ps1
```

## 文档贡献

如果您发现文档问题或有改进建议,欢迎提交 Issue 或 Pull Request。

### 文档规范

1. 使用 Markdown 格式
2. 包含代码示例
3. 提供清晰的步骤说明
4. 添加必要的图表和示意图
5. 保持文档更新

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../../LICENSE)。

## 联系方式

- 项目主页: https://github.com/anbeime/antinet
- 高通开发者论坛: https://bbs.csdn.net/forums/qualcomm

---

**最后更新**: 2026-01-12
