# Antinet 项目技能安装指南

## 已安装技能

### 1. 系统内置技能（AI助手已具备）
| 技能 | 状态 | 用途 |
|------|------|------|
| pptx | ✅ 可用 | PPT演示文稿创建与编辑 |
| xlsx | ✅ 可用 | Excel数据处理与分析 |
| docx | ✅ 可用 | Word文档创建与编辑 |
| pdf | ✅ 可用 | PDF文档处理 |

### 2. 本地技能文件（已复制）
| 技能 | 文件 | 状态 | 用途 |
|------|------|------|------|
| reddit-sentiment-analysis | reddit-sentiment-analysis.skill | ✅ 已复制 | Reddit舆情情感分析 |

### 3. 需要获取的技能（参考项目中有定义但无文件）
| 技能 | 状态 | 用途 | 获取方式 |
|------|------|------|----------|
| hand-drawn-infographic | ⚠️ 缺失 | 手绘风格信息图生成 | 从参考项目复制或重新下载 |
| concept-sector-analysis | ⚠️ 缺失 | 概念板块分析 | 从参考项目复制或重新下载 |

## 技能文件位置

```
C:\test\antinet\
├── skills\
│   └── reddit-sentiment-analysis.skill    ✅ 已安装
├── auto\
│   ├── CLAUDE.md
│   ├── skills-config.yaml                 # 技能配置文件
│   ├── task-status.json
│   └── progress.txt
└── SKILLS_INSTALL.md                      # 本文件
```

## 技能使用方式

### 方式1：AI助手自动加载（推荐）
AI助手在执行任务时会根据 `skills-config.yaml` 中的配置自动使用相应技能。

### 方式2：手动指定技能
在指令中明确指定要使用的技能：
```markdown
请使用 docx 技能生成技术架构文档...
请使用 hand-drawn-infographic 技能生成系统架构图...
```

## 缺失技能处理方案

### 方案A：从参考项目复制（如果存在）
```powershell
# 检查参考项目中是否存在技能文件
ls "C:\test\数字健康赛道-揭榜领题赛-榜题6\skills\"

# 复制到antinet项目
copy "C:\test\数字健康赛道-揭榜领题赛-榜题6\skills\hand-drawn-infographic.skill" "C:\test\antinet\skills\"
copy "C:\test\数字健康赛道-揭榜领题赛-榜题6\skills\concept-sector-analysis.skill" "C:\test\antinet\skills\"
```

### 方案B：使用替代方案
如果技能文件无法获取，可以使用以下替代方案：

| 缺失技能 | 替代方案 |
|----------|----------|
| hand-drawn-infographic | 使用Python代码生成架构图（matplotlib/graphviz） |
| concept-sector-analysis | 使用WebSearch + xlsx技能进行市场分析 |

### 方案C：AI助手自动处理
AI助手可以在没有专用技能文件的情况下，使用通用工具完成任务：
- 架构图：使用代码生成或描述性文字
- 市场分析：使用网络搜索+Excel分析

## 技能配置更新

已在 `skills-config.yaml` 中配置：

```yaml
skills:
  # 系统内置技能 - 直接使用
  builtin:
    - name: pptx
    - name: xlsx
    - name: docx
    - name: pdf

  # 本地技能 - 从参考项目复制
  local:
    - name: reddit-sentiment-analysis
      file: "../skills/reddit-sentiment-analysis.skill"
    - name: hand-drawn-infographic
      file: "../skills/hand-drawn-infographic.skill"  # 如缺失则使用替代方案
    - name: concept-sector-analysis
      file: "../skills/concept-sector-analysis.skill"  # 如缺失则使用替代方案
```

## 任务执行时的技能使用策略

### Task 1: 系统架构文档
- **主要技能**: docx
- **辅助技能**: hand-drawn-infographic（如不可用则使用代码生成架构图）

### Task 2: API文档整理
- **主要技能**: docx, xlsx
- **辅助技能**: 无需特殊技能

### Task 3: 功能清单与测试报告
- **主要技能**: xlsx, docx
- **辅助技能**: 无需特殊技能

### Task 4: 用户操作手册
- **主要技能**: docx
- **辅助技能**: 无需特殊技能

### Task 5: 部署文档
- **主要技能**: docx
- **辅助技能**: 无需特殊技能

### Task 6: 前后端对接检查
- **主要技能**: 代码分析（无需特殊技能）
- **输出**: docx, xlsx

### Task 7: 功能测试执行
- **主要技能**: 代码执行（无需特殊技能）
- **输出**: docx, xlsx

### Task 8: 材料整合与检查
- **主要技能**: 文件操作（无需特殊技能）
- **输出**: markdown

### Task 9: 推送到代码仓库
- **主要技能**: Git命令（无需特殊技能）

## 建议

1. **当前配置已足够**：系统内置技能（pptx/xlsx/docx/pdf）已能满足大部分文档生成需求

2. **hand-drawn-infographic 技能**：用于生成美观的架构图，如缺失可使用以下Python代码替代：
   ```python
   import matplotlib.pyplot as plt
   import matplotlib.patches as mpatches
   # 绘制架构图代码...
   ```

3. **让AI助手自行处理**：在全自动开发模式下，AI助手会根据可用技能自动选择最佳方案完成任务

## 验证技能安装

运行以下指令验证技能是否可用：
```markdown
请检查以下技能是否可用：
1. docx - 生成一个测试Word文档
2. xlsx - 生成一个测试Excel表格
3. reddit-sentiment-analysis - 检查技能文件是否存在
```
