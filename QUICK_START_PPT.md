# 🚀 PPT 自动生成功能 - 快速开始

## 一分钟快速上手

### 步骤 1: 确认环境

确保已安装 `python-pptx`：

```bash
cd C:\test\antinet
.\venv\Scripts\activate
pip install python-pptx
```

### 步骤 2: 启动后端服务

```bash
cd C:\test\antinet
python backend/main.py
```

后端服务将在 `http://localhost:8000` 启动

### 步骤 3: 使用功能

#### 选项 A: Web 界面（推荐）

1. 用浏览器打开 `C:\test\antinet\ppt_generator.html`
2. 输入标题和内容
3. 选择主题
4. 点击"生成 PPT"
5. 文件自动下载 ✅

#### 选项 B: 命令行测试

```bash
cd C:\test\antinet
python test_text_to_ppt.py
```

会在 `C:\test\` 目录生成三个测试文件。

#### 选项 C: API 调用

```python
import requests

content = """
# 我的演示文稿

这是一个示例

## 第一章节

- 要点 1
- 要点 2
- 要点 3

## 第二章节

1. 步骤一
2. 步骤二
3. 步骤三
"""

response = requests.post(
    "http://localhost:8000/api/ppt/generate/from-text",
    json={
        "content": content,
        "title": "我的演示文稿",
        "theme": "professional"
    }
)

# 保存文件
with open("my_presentation.pptx", "wb") as f:
    f.write(response.content)

print("✅ PPT 生成成功！")
```

## 🎨 Markdown 语法速查

| 语法 | 效果 | 示例 |
|------|------|------|
| `#` | 标题页 | `# 欢迎使用` |
| `##` | 新幻灯片 | `## 第一章` |
| `###` | 小标题 | `### 核心功能` |
| `-` 或 `*` | 项目符号 | `- 要点一` |
| `1.` | 编号列表 | `1. 第一步` |
| 文本 | 段落 | `这是内容` |

## 💡 实用示例

### 示例 1: 产品发布

```markdown
# 新品发布会

欢迎参加 2024 新品发布

## 产品亮点

### 创新设计
全新的外观设计理念

### 核心优势
- 性能提升 50%
- 续航增加 30%
- 价格更实惠

## 上市信息

1. 发布日期：3月1日
2. 预售渠道：官网、电商
3. 首发优惠：限时 8 折
```

### 示例 2: 工作汇报

```markdown
# 2024 Q1 工作总结

部门季度工作回顾

## 完成情况

### 重点项目
按时完成三个重要项目

### 业绩数据
- 营收同比增长 25%
- 新客户增加 100+
- 客户满意度 95%

## 下季度计划

1. 扩大市场份额
2. 优化产品线
3. 加强团队建设
```

### 示例 3: 培训课程

```markdown
# Python 编程入门

欢迎学习 Python 编程

## 课程目标

学会 Python 基础语法和应用

## 课程大纲

### 第一部分：基础
- 变量和数据类型
- 控制流程
- 函数定义

### 第二部分：进阶
- 面向对象编程
- 文件操作
- 异常处理

## 学习建议

1. 多动手练习
2. 阅读官方文档
3. 参与开源项目
```

## 🎯 主题选择建议

| 场景 | 推荐主题 | 原因 |
|------|---------|------|
| 商务汇报 | Professional | 专业稳重 |
| 产品发布 | Creative | 充满活力 |
| 技术分享 | Minimal | 简洁清晰 |
| 学术报告 | Minimal | 专注内容 |
| 市场营销 | Creative | 吸引眼球 |

## ⚡ 常见问题

**Q: 生成失败怎么办？**  
A: 确保后端服务正在运行 (`http://localhost:8000`)

**Q: 支持中文吗？**  
A: 完全支持中文内容

**Q: 可以修改生成的 PPT 吗？**  
A: 可以！生成的是标准 .pptx 文件，可用 PowerPoint/WPS 编辑

**Q: 有文件大小限制吗？**  
A: 建议单个 PPT 不超过 30 页

**Q: 能添加图片吗？**  
A: 当前版本暂不支持，将在后续版本添加

## 📚 相关文档

- 详细指南：`PPT_AUTO_GENERATION_GUIDE.md`
- 完成报告：`PPT_COMPLETION_REPORT.md`
- 测试脚本：`test_text_to_ppt.py`

## ✅ 成功标志

生成成功后，你将看到：
- ✅ 浏览器自动下载 .pptx 文件
- ✅ 文件可以用 PowerPoint/WPS 打开
- ✅ 内容和格式符合预期

祝你使用愉快！🎉
