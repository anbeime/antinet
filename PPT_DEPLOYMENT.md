# PPT 技能部署文档

## 📦 部署完成

PPT 技能已成功集成到 Antinet 智能知识管家项目中！

## 已完成的工作

### 1. 依赖更新
已在 `backend/requirements.txt` 中添加：
```txt
python-pptx>=0.6.21    # PowerPoint 文档生成
```

### 2. 核心模块
创建了 `backend/tools/ppt_processor.py`，提供：
- 创建 PowerPoint 演示文稿
- 四色卡片导出为 PPT（蓝/绿/黄/红）
- 添加总结幻灯片
- 添加图表幻灯片
- 完整分析报告生成
- 自动排版和样式设计

### 3. API 路由
创建了 `backend/routes/ppt_routes.py`，提供以下接口：

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/ppt/status` | GET | 检查 PPT 功能状态 |
| `/api/ppt/health` | GET | 健康检查 |
| `/api/ppt/export/cards` | POST | 导出四色卡片为 PPT |
| `/api/ppt/export/analysis` | POST | 导出完整分析报告为 PPT |
| `/api/ppt/template/create` | POST | 创建 PPT 模板 |
| `/api/ppt/card-types` | GET | 获取支持的卡片类型 |

### 4. 主应用集成
已在 `backend/main.py` 中注册 PPT 路由。

---

## 🚀 安装依赖

### 方式 1：使用虚拟环境（推荐）

```powershell
# 激活虚拟环境
.\venv_arm64\Scripts\activate.bat

# 安装 PPT 依赖
pip install python-pptx>=0.6.21

# 验证安装
python -c "import pptx; print('✓ python-pptx 安装成功')"
```

### 方式 2：全局安装

```powershell
pip install python-pptx>=0.6.21
```

---

##  测试 PPT 功能

### 1. 启动后端服务

```powershell
cd C:\test\antinet
.\start_backend.bat
```

### 2. 检查 PPT 功能状态

访问：http://localhost:8000/api/ppt/status

预期响应：
```json
{
  "available": true,
  "message": "PPT 功能已启用"
}
```

### 3. 测试导出四色卡片为 PPT

```python
import requests
import json

# 准备卡片数据
cards_data = {
    "cards": [
        {
            "type": "fact",
            "title": "销售数据事实",
            "content": "2024年第四季度销售额达到500万元，同比增长25%",
            "tags": ["销售", "数据"],
            "created_at": "2024-01-15"
        },
        {
            "type": "interpret",
            "title": "增长原因分析",
            "content": "销售增长主要得益于新产品线的推出和市场推广活动的成功",
            "tags": ["分析", "原因"]
        },
        {
            "type": "risk",
            "title": "潜在风险",
            "content": "库存周转率下降，可能导致资金占用增加",
            "tags": ["风险", "库存"]
        },
        {
            "type": "action",
            "title": "行动建议",
            "content": "建议优化库存管理，加强供应链协调",
            "tags": ["建议", "行动"]
        }
    ],
    "title": "2024 Q4 销售分析报告",
    "include_summary": True
}

# 发送请求
response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json=cards_data
)

# 保存 PPT 文件
if response.status_code == 200:
    with open("sales_analysis.pptx", "wb") as f:
        f.write(response.content)
    print("✓ PPT 导出成功: sales_analysis.pptx")
else:
    print(f"✗ 导出失败: {response.text}")
```

### 4. 测试创建 PPT 模板

```python
import requests

response = requests.post(
    "http://localhost:8000/api/ppt/template/create",
    params={
        "title": "Antinet 分析模板",
        "slide_count": 5
    }
)

if response.status_code == 200:
    with open("template.pptx", "wb") as f:
        f.write(response.content)
    print("✓ 模板创建成功: template.pptx")
```

---

## 📊 四色卡片设计

PPT 技能支持 Antinet 的四色卡片体系：

| 卡片类型 | 颜色 | 用途 | RGB 值 |
|---------|------|------|--------|
| **事实卡片** | 🔵 蓝色 | 客观数据和事实陈述 | (52, 152, 219) |
| **解释卡片** | 🟢 绿色 | 数据解释和原因分析 | (46, 204, 113) |
| **风险卡片** | 🟡 黄色 | 风险识别和预警 | (241, 196, 15) |
| **行动卡片** | 🔴 红色 | 行动建议和决策支持 | (231, 76, 60) |

---

## 🎨 PPT 样式特点

### 1. 标题页
- 演示文稿标题
- 生成时间戳
- 简洁专业的布局

### 2. 卡片页
- **左上角色块**：显示卡片类型（带颜色标识）
- **大标题**：卡片标题（28pt，粗体）
- **内容区域**：卡片内容（16pt，行距 1.5）
- **底部元数据**：标签和创建时间（10pt，灰色）

### 3. 总结页
- 卡片统计信息
- 各类型卡片数量
- 分析总结

### 4. 图表页
- 支持添加图表说明
- 预留图表数据展示区域

---

## 🔧 高级功能

### 1. 批量导出

```python
# 导出多个分析报告
reports = [
    {"cards": [...], "title": "报告1"},
    {"cards": [...], "title": "报告2"},
    {"cards": [...], "title": "报告3"}
]

for i, report in enumerate(reports):
    response = requests.post(
        "http://localhost:8000/api/ppt/export/cards",
        json=report
    )
    with open(f"report_{i+1}.pptx", "wb") as f:
        f.write(response.content)
```

### 2. 自定义文件名

```python
cards_data = {
    "cards": [...],
    "title": "销售分析",
    "filename": "sales_analysis_2024_q4.pptx"  # 自定义文件名
}
```

### 3. 完整分析报告

```python
analysis_data = {
    "title": "2024 年度综合分析报告",
    "cards": [
        # 四色卡片数据
    ],
    "charts": [
        {
            "title": "销售趋势图",
            "data": {"labels": [...], "values": [...]}
        }
    ],
    "summary": {
        "title": "分析总结",
        "总销售额": "5000万元",
        "同比增长": "25%",
        "关键发现": "新产品线表现优异"
    }
}

response = requests.post(
    "http://localhost:8000/api/ppt/export/analysis",
    json=analysis_data
)
```

---

## 🎯 使用场景

### 1. 数据分析报告
将 Antinet 的数据分析结果导出为 PPT，方便汇报和分享。

### 2. 知识卡片整理
将知识库中的四色卡片导出为演示文稿，用于团队培训和知识传播。

### 3. 项目总结
将项目分析结果、风险评估、行动计划整合为 PPT，用于项目汇报。

### 4. 定期报告
自动生成周报、月报、季报等定期分析报告。

---

## 🐛 故障排查

### 问题 1：PPT 功能不可用

**症状**：访问 `/api/ppt/status` 返回 `available: false`

**解决方案**：
```powershell
# 安装 python-pptx
pip install python-pptx>=0.6.21

# 重启后端服务
.\start_backend.bat
```

### 问题 2：中文显示乱码

**症状**：生成的 PPT 中中文显示为方块或乱码

**解决方案**：
- PPT 处理器已自动使用系统字体
- Windows 系统默认支持中文
- 如果仍有问题，检查系统字体设置

### 问题 3：文件下载失败

**症状**：API 返回 500 错误

**解决方案**：
```powershell
# 检查临时目录权限
# Windows: C:\Users\<用户名>\AppData\Local\Temp\antinet_ppt

# 手动创建目录
mkdir %TEMP%\antinet_ppt

# 检查后端日志
tail -f backend.log
```

---

## 📚 API 文档

启动后端后，访问完整的 API 文档：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

在文档中可以：
- 查看所有 PPT 相关接口
- 在线测试 API
- 查看请求/响应示例

---

## 🔄 与其他功能集成

### 1. 与 8-Agent 系统集成

```python
# 使用 8-Agent 分析数据，然后导出为 PPT
analysis_result = requests.post(
    "http://localhost:8000/api/agent/analyze",
    json={"query": "分析上季度销售数据"}
).json()

# 导出分析结果为 PPT
ppt_response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json={
        "cards": analysis_result["cards"],
        "title": "8-Agent 智能分析报告"
    }
)
```

### 2. 与 Excel 技能集成

```python
# 先导出 Excel
excel_response = requests.post(
    "http://localhost:8000/api/excel/export",
    json={"data": [...]}
)

# 再导出 PPT（包含数据总结）
ppt_response = requests.post(
    "http://localhost:8000/api/ppt/export/analysis",
    json={
        "title": "数据分析报告",
        "cards": [...],
        "summary": {
            "数据来源": "Excel 导出",
            "记录数": 1000
        }
    }
)
```

### 3. 与 PDF 技能集成

```python
# 提取 PDF 中的知识
pdf_knowledge = requests.post(
    "http://localhost:8000/api/pdf/extract/knowledge",
    files={"file": open("report.pdf", "rb")}
).json()

# 将提取的知识导出为 PPT
ppt_response = requests.post(
    "http://localhost:8000/api/ppt/export/cards",
    json={
        "cards": pdf_knowledge["suggested_cards"],
        "title": "PDF 知识提取报告"
    }
)
```

---

## 📈 性能优化

### 1. 批量生成优化
- 使用异步处理大量卡片
- 分页处理避免内存溢出

### 2. 文件缓存
- 临时文件自动清理
- 支持自定义缓存目录

### 3. 并发处理
- 支持多个请求同时生成 PPT
- 使用独立的临时文件避免冲突

---

## 🎓 最佳实践

### 1. 卡片内容
- **简洁明了**：每张卡片聚焦一个核心观点
- **结构化**：使用列表或分段组织内容
- **可视化**：配合图表增强表达效果

### 2. 演示文稿设计
- **逻辑清晰**：按事实→解释→风险→行动的顺序组织
- **重点突出**：使用颜色和排版强调关键信息
- **适度留白**：避免信息过载

### 3. 自动化流程
- **定期生成**：设置定时任务自动生成报告
- **模板复用**：创建标准模板提高效率
- **版本管理**：为生成的 PPT 添加时间戳和版本号

---

## 🚀 未来增强

### 计划中的功能
- [ ] 支持自定义主题和配色方案
- [ ] 集成图表库（Matplotlib/Plotly）
- [ ] 支持动画效果
- [ ] 支持多语言（英文、日文等）
- [ ] 支持从模板导入
- [ ] 支持批注和备注
- [ ] 支持嵌入视频和音频

---

## 📞 技术支持

如有问题，请：
1. 查看后端日志：`backend.log`
2. 访问 API 文档：http://localhost:8000/docs
3. 查看项目文档：`README.md`

---

**部署完成时间**: 2026-01-26
**版本**: 1.0.0
**状态**: 已部署并可用
