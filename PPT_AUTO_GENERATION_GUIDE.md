# PPT 自动生成功能使用指南

## 功能概述

Antinet 现在支持从文本内容自动生成 PowerPoint 演示文稿！只需输入 Markdown 格式的文本，系统会自动解析并生成专业的 PPT。

## 新增功能

### 1. 文本转 PPT API

**端点**: `POST /api/ppt/generate/from-text`

**功能**: 从文本内容（支持 Markdown 格式）自动生成 PPT

**请求参数**:
```json
{
  "content": "# 标题\n\n## 章节\n\n- 要点1\n- 要点2",
  "title": "演示文稿标题",
  "theme": "professional",
  "filename": "my_presentation.pptx"
}
```

**参数说明**:
- `content` (必填): 文本内容，支持 Markdown 格式
- `title` (可选): 演示文稿标题，默认为"演示文稿"
- `theme` (可选): 主题风格，可选值：
  - `professional` (默认): 专业商务风格
  - `creative`: 创意活泼风格
  - `minimal`: 简约现代风格
- `filename` (可选): 输出文件名

**响应**: 返回生成的 PPT 文件

### 2. Markdown 格式支持

系统支持以下 Markdown 语法：

#### 标题
- `# 一级标题` → 创建新的标题幻灯片
- `## 二级标题` → 创建新的内容幻灯片
- `### 三级标题` → 在当前幻灯片中添加小标题

#### 列表
- `- 项目` 或 `* 项目` → 无序列表（项目符号）
- `1. 项目` → 有序列表（编号）

#### 段落
- 普通文本 → 作为段落内容

## 使用示例

### 示例 1: 基础使用

```python
import requests

content = """
# 产品发布会

欢迎参加我们的新品发布

## 产品特点

- 创新设计
- 高性能
- 易于使用

## 市场定位

面向年轻用户群体
"""

response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "title": "产品发布会",
        "theme": "professional"
    }
)

with open("presentation.pptx", "wb") as f:
    f.write(response.content)
```

### 示例 2: 使用不同主题

```python
# 专业主题（深蓝灰 + 蓝色 + 金色）
response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "theme": "professional"
    }
)

# 创意主题（紫色 + 蓝色 + 橙色）
response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "theme": "creative"
    }
)

# 简约主题（深灰 + 中灰 + 蓝色）
response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "theme": "minimal"
    }
)
```

### 示例 3: 完整的演示文稿

```python
content = """
# 2024 年度总结报告

公司年度工作回顾与展望

## 业绩概览

### 营收增长
全年营收达到 5000 万元，同比增长 35%

### 用户增长
- 新增用户 10 万
- 活跃用户 50 万
- 用户满意度 95%

## 重点项目

1. 产品升级项目
2. 市场拓展计划
3. 技术创新研发
4. 团队建设优化

## 2025 年规划

### 战略目标
继续保持高速增长，扩大市场份额

### 具体措施
- 加大研发投入
- 拓展新市场
- 优化用户体验
- 提升服务质量

## 总结

感谢团队的辛勤付出！
让我们共同创造更美好的未来！
"""

response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "title": "2024 年度总结报告",
        "theme": "professional",
        "filename": "annual_report_2024.pptx"
    }
)
```

## 主题配色方案

### Professional（专业）
- 主色：深蓝灰 (#1C2833)
- 辅色：蓝色 (#3498DB)
- 强调色：金色 (#F1C40F)
- 文本：深灰 (#2C3E50)
- 背景：浅灰 (#ECF0F1)

### Creative（创意）
- 主色：紫色 (#9B59B6)
- 辅色：蓝色 (#3498DB)
- 强调色：橙色 (#E67E22)
- 文本：深灰 (#2C3E50)
- 背景：浅灰 (#ECF0F1)

### Minimal（简约）
- 主色：深灰 (#2C3E50)
- 辅色：中灰 (#95A5A6)
- 强调色：蓝色 (#3498DB)
- 文本：深灰 (#2C3E50)
- 背景：白色 (#FFFFFF)

## 技术实现

### 核心组件

1. **Markdown 解析器** (`parse_markdown_content`)
   - 解析 Markdown 语法
   - 识别标题、列表、段落
   - 生成幻灯片结构数据

2. **PPT 生成器** (`PPTProcessor.create_from_text`)
   - 创建演示文稿
   - 应用主题配色
   - 添加幻灯片内容

3. **主题系统**
   - 预定义配色方案
   - 统一字体样式
   - 一致的排版布局

### 文件结构

```
backend/
├── routes/
│   └── ppt_routes.py          # API 路由定义
└── tools/
    └── ppt_processor.py       # PPT 处理核心逻辑
```

## 测试

运行测试脚本验证功能：

```bash
cd C:\test\antinet
python test_text_to_ppt.py
```

测试将生成三个不同主题的 PPT 文件：
- `test_generated_presentation.pptx` (professional)
- `test_generated_creative.pptx` (creative)
- `test_generated_minimal.pptx` (minimal)

## 注意事项

1. **依赖要求**: 需要安装 `python-pptx` 库
   ```bash
   pip install python-pptx
   ```

2. **内容格式**: 
   - 使用标准 Markdown 语法
   - 一级标题 (#) 创建标题页
   - 二级标题 (##) 创建内容页
   - 三级标题 (###) 作为页面小标题

3. **幻灯片数量**: 
   - 系统会根据标题自动分页
   - 建议每页内容不超过 5-7 个要点

4. **文件大小**: 
   - 生成的 PPT 文件通常在 50-200 KB
   - 不包含图片时文件较小

## 未来改进

计划添加的功能：
- [ ] 支持图片插入
- [ ] 支持表格和图表
- [ ] 更多主题模板
- [ ] 自定义配色方案
- [ ] AI 智能排版优化
- [ ] 从 Word/PDF 导入内容

## 反馈与支持

如有问题或建议，请联系开发团队。
