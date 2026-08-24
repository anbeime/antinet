# 🧠 知易（ZhiYi）— 多模型智能知识管家

> **一个对话框，调度所有模型；一个知识库，记住所有事情。**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-green.svg)]()
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)]()
[![Skills](https://img.shields.io/badge/Skills-240%2B-brightgreen.svg)](https://github.com/anbeime/skill)

**不绑死任何一家API，不丢失任何一条知识。** 知易让你在一个对话框里自由切换所有主流大模型，自动故障转移永不断连；用四色卡片+知识图谱让AI真正记住你教过它的东西。配合240+可插拔技能，从文档解析到视频创作，即插即用。

🔗 **[立即在线体验 →](https://ai123.miyucaicai.cn)**

---

## 🔥 为什么需要知易？

2026年8月31日，Claude API 涨价50%，GPT-5.4 下线，Kimi K2.5 停服。只绑一家供应商，那天你的Agent就断了。

知易从第一天就不是某个模型的客户端：

| 痛点 | 知易的解法 |
|------|-----------|
| 模型挂了/429/涨价 | **自动切换**到备用模型，对话不中断 |
| 不同任务要用不同模型 | **智能路由**：写代码用Claude、推理用DeepSeek、工具调用用GPT，自动分配 |
| AI关了对话框就失忆 | **四色卡片+知识图谱**，知识持久保存，换模型也不丢 |
| 能力不够用 | **240+技能**即插即用，文档/视频/电商/编程全覆盖 |
| 数据不能出域 | **端侧NPU模式**，本地推理，数据不上云 |

> 「租来的算力会走，自有的知识留下。」

---

## ✨ 核心能力

### 🤖 多模型自由切换

一个对话框接入所有主流模型，不用来回切换平台：

- 支持 **20+ 提供商、600+ 模型**（OpenAI、Anthropic、DeepSeek、Google、通义、智谱、月之暗面等）
- **自动故障转移**：当前模型报错或超时，无缝切到下一家
- **对话中随时切换**：一句话换模型，上下文不丢
- **智能路由**：根据任务类型自动选最合适的模型
- **零配置启动**：内置免费模型通道，装好就能用

### 🧠 四色卡片知识系统

AI最大的问题是失忆。知易用卢曼卡片盒方法论解决：

- 🔵 **蓝卡（事实）**：核心数据、客观记录
- 🟢 **绿卡（解释）**：分析、原因、理论
- 🟡 **黄卡（风险）**：注意事项、潜在问题
- 🔴 **红卡（行动）**：执行步骤、决策建议
- **知识图谱**：卡片间双向链接，自动发现关联
- **多端同步**：冲突自动合并，不怕同时编辑
- 上传 PDF/PPT/Excel/Word → 自动提取 → 生成卡片 → 入图谱

### 🔌 240+ 技能即插即用

知易与 [技能商店](https://github.com/anbeime/skill)（⭐5700+）深度集成：

- 📝 内容创作：公众号发布、小红书图文、文章配图
- 🎬 视频创作：AI视频套件、爆款文案、数字人配音
- 🛒 电商营销：1688全链路、商品视频、闲鱼选品
- 📊 PPT演示：AI生成PPT、路演视频
- 📄 文档处理：PDF/Word/Excel/PPT 全套解析与生成
- 更多分类持续更新中…

技能仓库每24小时自动同步全球最新AI Agent技能。

### 📡 多端远程调度

- 在钉钉、飞书、Telegram 群里直接 @知易 调度模型和技能
- 定时任务：设定时间自动执行研究、生成报告
- 团队共享知识库

### 🔒 端侧隐私模式

- 支持高通骁龙 X Elite NPU 本地推理，450ms响应
- 数据不出设备，适合处理敏感文档
- 纯云端/端侧/混合三种模式自由选择

---

## 🚀 快速开始

### 在线体验（推荐）

直接访问 👉 **[ai123.miyucaicai.cn](https://ai123.miyucaicai.cn)**，无需安装。

### 本地部署

```bash
# 克隆项目
git clone https://gitee.com/anbeime/zhiyi.git
cd zhiyi

# 启动（一键脚本）
# Windows:
quick_start_v2.bat
# Linux/Mac:
bash quick_start.sh
```

启动后访问 http://localhost:3000

> 完整部署文档、API文档和企业版方案请参考 [在线文档](https://ai123.miyucaicai.cn/docs)。

---

## 📊 社区版 vs 专业版

| 能力 | 社区版 | 专业版 |
|------|--------|--------|
| 单模型对话 | ✅ | ✅ |
| 四色卡片知识管理 | ✅ | ✅ |
| 技能市场（基础技能） | ✅ | ✅（全部240+） |
| 文档上传与解析 | ✅（单文件≤10MB） | ✅（无限制） |
| 知识图谱可视化 | ✅ | ✅ |
| 多模型切换 | — | ✅ |
| 自动故障转移 | — | ✅ |
| 智能路由 | — | ✅ |
| 多端远程调度（钉钉/飞书/TG） | — | ✅ |
| 定时任务与多Agent并行 | — | ✅ |
| 团队协作与权限管理 | — | ✅ |
| 端侧NPU加速 | — | ✅ |
| API接口 | — | ✅ |
| 优先技术支持 | — | ✅ |

💡 **专业版申请**：联系 [ai123.miyucaicai.cn](https://ai123.miyucaicai.cn) 获取部署方案。

---

## 🌐 生态

| 项目 | 说明 | 链接 |
|------|------|------|
| 🎯 技能商店 | 240+ AI Agent 技能，⭐5700+ | [github.com/anbeime/skill](https://github.com/anbeime/skill) |
| 🔍 AI工具导航 | 860+ AI 工具收录 | [ai123.miyucaicai.cn](https://ai123.miyucaicai.cn) |
| ☀️ 光伏储能地图 | 990+ 项目实时数据库 | [solar.miyucaicai.cn](https://solar.miyucaicai.cn) |

---

## 📄 许可证

- 社区版：MIT License
- 专业版：商业许可，详见 [授权说明](https://ai123.miyucaicai.cn/license)

---

<p align="center">
  <b>知易</b> — 租来的算力会走，自有的知识留下。<br>
  <a href="https://ai123.miyucaicai.cn">🔗 立即体验</a> ·
  <a href="https://github.com/anbeime/skill">⭐ 技能商店</a>
</p>

---

## 💬 加入社区

扫码添加微信（备注「知易」），拉你进知易用户交流群，第一时间获取产品更新和使用技巧：

<p align="center">
  <img src="https://raw.githubusercontent.com/anbeime/skill/main/images/wechat-qr.jpg" alt="微信二维码" width="200" height="200" style="border-radius:12px;border:1px solid #e0e0e0;">
</p>

- 🧠 在线体验：[ai123.miyucaicai.cn](https://ai123.miyucaicai.cn)
- ⭐ 技能商店：[github.com/anbeime/skill](https://github.com/anbeime/skill)
- 🐛 问题反馈：[Gitee Issues](https://gitee.com/anbeime/zhiyi/issues)
