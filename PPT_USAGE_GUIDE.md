# PPT 技能快速使用指南

## 🚀 5分钟快速上手

### 1. 安装依赖（仅需一次）

```powershell
# 进入项目目录
cd C:\test\antinet

# 激活虚拟环境（推荐）
.\venv_arm64\Scripts\activate.bat

# 安装 PPT 依赖
pip install python-pptx>=0.6.21
```

### 2. 启动后端服务

```powershell
# 启动后端
.\start_backend.bat

# 等待服务启动完成，看到以下信息：
# ✓ PPT 处理路由已注册
```

### 3. 验证 PPT 功能

在浏览器中访问：http://localhost:8000/api/ppt/status

应该看到：
```json
{
  "available": true,
  "message": "PPT 功能已启用"
}
```

---

##  基础用法

### 示例 1：导出四色卡片为 PPT

创建文件 `test_ppt_export.py`：

```python
import requests

# 准备卡片数据
cards_data = {
    "cards": [
        {
            "type": "fact",
            "title": "销售数据",
            "content": "本月销售额达到100万元，环比增长15%",
            "tags": ["销售", "数据"]
        },
        {
            "type": "interpret",
            "title": "增长原因",
            "content": "主要得益于新客户开发和老客户复购率提升",
            "tags": ["分析"]
        },
        {
            "type": "risk",
            "title": "库存风险",
            "content": "部分热销产品库存不足，可能影响下月销售",
            "tags": ["风险", "库存"]
        },
        {
            "type": "action",
            "title": "补货建议",
            "content": "建议立即补充热销产品库存，预计需要3-5天到货",
            "tags": ["行动", "采购"]
        }
    ],
    "title": "月度销售分析报告",
    "include_summary": True,
    "filename": "monthly_sales_report.pptx"
}

# 发送请求
response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json=cards_data
)

# 保存文件
if response.status_code == 200:
    with open("monthly_sales_report.pptx", "wb") as f:
        f.write(response.content)
    print("✓ PPT 导出成功！")
    print("  文件位置: monthly_sales_report.pptx")
else:
    print(f"✗ 导出失败: {response.text}")
```

运行：
```powershell
python test_ppt_export.py
```

### 示例 2：创建 PPT 模板

```python
import requests

response = requests.post(
    "http://localhost:8000/api/ppt/template/create",
    params={
        "title": "我的分析模板",
        "slide_count": 5
    }
)

if response.status_code == 200:
    with open("my_template.pptx", "wb") as f:
        f.write(response.content)
    print("✓ 模板创建成功: my_template.pptx")
```

---

## 🎨 四色卡片说明

| 类型 | 颜色 | 用途 | 示例 |
|------|------|------|------|
| `fact` | 🔵 蓝色 | 客观事实和数据 | "销售额100万元" |
| `interpret` | 🟢 绿色 | 原因分析和解释 | "因新客户增加" |
| `risk` | 🟡 黄色 | 风险识别和预警 | "库存不足风险" |
| `action` | 🔴 红色 | 行动建议和决策 | "立即补货" |

---

## 🔧 常用场景

### 场景 1：数据分析汇报

```python
# 分析数据后导出 PPT
cards = [
    {"type": "fact", "title": "数据概况", "content": "..."},
    {"type": "interpret", "title": "趋势分析", "content": "..."},
    {"type": "risk", "title": "风险提示", "content": "..."},
    {"type": "action", "title": "改进建议", "content": "..."}
]

response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json={"cards": cards, "title": "数据分析报告"}
)
```

### 场景 2：项目总结

```python
# 项目总结 PPT
cards = [
    {"type": "fact", "title": "项目成果", "content": "完成5个核心功能..."},
    {"type": "interpret", "title": "成功因素", "content": "团队协作良好..."},
    {"type": "risk", "title": "遗留问题", "content": "性能优化待完成..."},
    {"type": "action", "title": "下一步计划", "content": "Q2优化性能..."}
]

response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json={"cards": cards, "title": "项目总结报告"}
)
```

### 场景 3：知识分享

```python
# 知识卡片导出
cards = [
    {"type": "fact", "title": "技术概念", "content": "NPU是神经网络处理单元..."},
    {"type": "interpret", "title": "工作原理", "content": "通过专用硬件加速..."},
    {"type": "risk", "title": "使用注意", "content": "需要特定驱动支持..."},
    {"type": "action", "title": "最佳实践", "content": "使用INT8量化..."}
]

response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json={"cards": cards, "title": "NPU 技术分享"}
)
```

---

## 🌐 通过 API 文档测试

1. 访问：http://localhost:8000/docs
2. 找到 **PPT** 标签
3. 展开 `/api/ppt/export/cards`
4. 点击 **Try it out**
5. 填写请求数据
6. 点击 **Execute**
7. 下载生成的 PPT 文件

---

##  提示和技巧

### 1. 内容格式化

支持列表格式：
```python
{
    "type": "fact",
    "title": "关键指标",
    "content": [
        "销售额: 100万元",
        "客户数: 500个",
        "转化率: 25%"
    ]
}
```

### 2. 添加标签

```python
{
    "type": "fact",
    "title": "数据事实",
    "content": "...",
    "tags": ["销售", "Q1", "2024"]  # 标签会显示在底部
}
```

### 3. 自定义文件名

```python
{
    "cards": [...],
    "filename": "report_2024_q1.pptx"  # 自定义文件名
}
```

### 4. 控制总结页

```python
{
    "cards": [...],
    "include_summary": False  # 不包含总结页
}
```

---

## ❓ 常见问题

### Q1: 如何查看生成的 PPT？

**A**: 文件会保存到当前目录，直接用 PowerPoint 打开即可。

### Q2: 可以批量生成多个 PPT 吗？

**A**: 可以，使用循环调用 API：
```python
for report in reports:
    response = requests.post(
        "http://localhost:8000/api/ppt/export/cards",
        json=report
    )
    # 保存文件...
```

### Q3: 支持自定义样式吗？

**A**: 当前版本使用预设样式，未来版本将支持自定义主题。

### Q4: PPT 文件保存在哪里？

**A**: 
- API 返回的是文件流，需要手动保存
- 临时文件在：`%TEMP%\antinet_ppt`

---

## 📚 更多资源

- **完整文档**: [PPT_DEPLOYMENT.md](./PPT_DEPLOYMENT.md)
- **API 文档**: http://localhost:8000/docs
- **项目主页**: [README.md](./README.md)

---

## 🎉 开始使用

现在你已经掌握了 PPT 技能的基础用法，快去试试吧！

```powershell
# 1. 确保后端运行
.\start_backend.bat

# 2. 运行示例代码
python test_ppt_export.py

# 3. 打开生成的 PPT
start monthly_sales_report.pptx
```

祝使用愉快！ 🚀
