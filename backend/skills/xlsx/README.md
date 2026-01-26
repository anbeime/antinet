# Excel 技能使用指南

## 概述

Excel 技能为 Antinet 项目提供了完整的 Excel 文件操作能力，包括：
- 创建和编辑 Excel 文件
- 导出四色卡片分析报告
- 生成多工作表报告
- 添加数据可视化图表
- 格式化和样式设置

## 快速开始

### 1. 简单卡片导出

```python
from skills.xlsx import export_cards_to_excel

# 准备卡片数据
cards = [
    {
        "id": "fact_001",
        "type": "fact",
        "title": "销售数据",
        "content": "2025年1月销售额为100万",
        "confidence": 0.95,
        "created_at": "2025-01-26",
        "tags": ["销售", "数据"]
    }
]

# 导出到 Excel
output_path = export_cards_to_excel(
    cards=cards,
    output_path="./exports/cards.xlsx",
    title="销售分析卡片"
)

print(f"导出成功: {output_path}")
```

### 2. 完整报告导出

```python
from skills.xlsx import export_analysis_to_excel
import pandas as pd

# 分析信息
analysis_info = {
    "title": "2025年1月销售分析报告",
    "date": "2025-01-26",
    "data_source": "sales_data.csv",
    "card_counts": {
        "fact": 3,
        "interpret": 2,
        "risk": 2,
        "action": 3
    },
    "summary": "本报告分析了1月销售数据..."
}

# 按类型分组的卡片
cards_by_type = {
    "fact": [...],      # 事实卡片列表
    "interpret": [...], # 解释卡片列表
    "risk": [...],      # 风险卡片列表
    "action": [...]     # 行动卡片列表
}

# 额外的数据工作表
data_sheets = {
    "销售明细": pd.DataFrame({...}),
    "库存状态": pd.DataFrame({...})
}

# 图表数据
charts = [
    {
        "name": "销售趋势",
        "type": "line",
        "title": "每日销售额趋势",
        "data": pd.DataFrame({...}),
        "x_col": "日期",
        "y_cols": ["销售额"]
    }
]

# 导出完整报告
output_path = export_analysis_to_excel(
    output_path="./exports/report.xlsx",
    analysis_info=analysis_info,
    cards_by_type=cards_by_type,
    data_sheets=data_sheets,
    charts=charts
)
```

## API 端点

### 1. 导出卡片

**POST** `/api/excel/export-cards`

```json
{
    "cards": [
        {
            "id": "fact_001",
            "type": "fact",
            "title": "销售数据",
            "content": "2025年1月销售额为100万",
            "confidence": 0.95,
            "created_at": "2025-01-26",
            "tags": ["销售", "数据"]
        }
    ],
    "title": "销售分析卡片",
    "filename": "sales_cards.xlsx"
}
```

**响应：**
```json
{
    "status": "success",
    "message": "卡片导出成功",
    "filename": "sales_cards.xlsx",
    "path": "./data/exports/sales_cards.xlsx",
    "download_url": "/api/excel/download/sales_cards.xlsx"
}
```

### 2. 导出分析报告

**POST** `/api/excel/export-analysis`

```json
{
    "analysis_info": {
        "title": "2025年1月销售分析报告",
        "date": "2025-01-26",
        "data_source": "sales_data.csv",
        "card_counts": {
            "fact": 5,
            "interpret": 3,
            "risk": 2,
            "action": 4
        },
        "summary": "本报告分析了1月销售数据..."
    },
    "cards_by_type": {
        "fact": [...],
        "interpret": [...],
        "risk": [...],
        "action": [...]
    },
    "data_sheets": {
        "销售明细": [...]
    },
    "charts": [...]
}
```

### 3. 下载文件

**GET** `/api/excel/download/{filename}`

下载导出的 Excel 文件。

### 4. 列出所有导出

**GET** `/api/excel/list`

```json
{
    "status": "success",
    "count": 5,
    "files": [
        {
            "filename": "report_20250126_143022.xlsx",
            "size": 45678,
            "created_at": "2025-01-26T14:30:22",
            "download_url": "/api/excel/download/report_20250126_143022.xlsx"
        }
    ]
}
```

### 5. 删除文件

**DELETE** `/api/excel/delete/{filename}`

## 高级功能

### 1. 自定义 Excel 导出器

```python
from skills.xlsx import AntinetExcelExporter

# 创建导出器实例
exporter = AntinetExcelExporter()

# 创建工作簿
exporter.create_workbook()

# 添加概览工作表
exporter.add_overview_sheet(analysis_info)

# 添加卡片工作表
exporter.add_cards_sheet('fact', fact_cards)
exporter.add_cards_sheet('risk', risk_cards)

# 添加数据工作表
exporter.add_data_sheet('销售数据', sales_df)

# 添加图表工作表
exporter.add_chart_sheet('销售趋势', chart_data)

# 保存文件
exporter.wb.save('custom_report.xlsx')
```

### 2. 四色卡片颜色定义

```python
CARD_COLORS = {
    'fact': 'ADD8E6',      # 🔵 蓝色 - 事实
    'interpret': '90EE90',  # 🟢 绿色 - 解释
    'risk': 'FFFF99',       # 🟡 黄色 - 风险
    'action': 'FFB6C1'      # 🔴 红色 - 行动
}
```

### 3. 支持的图表类型

- **bar**: 柱状图
- **line**: 折线图
- **pie**: 饼图

## 测试

运行测试脚本：

```bash
cd C:\test\antinet\backend
python skills\xlsx\test_excel_export.py
```

测试将生成两个示例文件：
- `./data/exports/test_simple_export.xlsx` - 简单卡片导出
- `./data/exports/test_full_report.xlsx` - 完整报告导出

## 前端集成示例

### React 组件示例

```typescript
// 导出卡片到 Excel
const exportCards = async (cards: Card[]) => {
  try {
    const response = await fetch('/api/excel/export-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: cards,
        title: '分析卡片',
        filename: `cards_${Date.now()}.xlsx`
      })
    });
    
    const result = await response.json();
    
    // 下载文件
    window.location.href = result.download_url;
    
    console.log('导出成功:', result);
  } catch (error) {
    console.error('导出失败:', error);
  }
};

// 导出完整报告
const exportReport = async (analysisData: AnalysisData) => {
  try {
    const response = await fetch('/api/excel/export-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis_info: analysisData.info,
        cards_by_type: analysisData.cardsByType,
        data_sheets: analysisData.dataSheets,
        charts: analysisData.charts,
        filename: `report_${Date.now()}.xlsx`
      })
    });
    
    const result = await response.json();
    window.location.href = result.download_url;
  } catch (error) {
    console.error('导出失败:', error);
  }
};
```

## 常见问题

### Q1: 如何添加自定义格式？

使用 `openpyxl` 的样式功能：

```python
from openpyxl.styles import Font, PatternFill, Alignment

cell.font = Font(bold=True, color='FF0000', size=14)
cell.fill = PatternFill(start_color='FFFF00', fill_type='solid')
cell.alignment = Alignment(horizontal='center', vertical='center')
```

### Q2: 如何处理大量数据？

对于大量数据，建议：
1. 使用 `write_only=True` 模式
2. 分批写入数据
3. 避免过多的格式化操作

```python
from openpyxl import Workbook

wb = Workbook(write_only=True)
ws = wb.create_sheet('大数据')

for row in large_dataset:
    ws.append(row)

wb.save('large_file.xlsx')
```

### Q3: 如何添加公式？

```python
# 添加 SUM 公式
sheet['B10'] = '=SUM(B2:B9)'

# 添加 AVERAGE 公式
sheet['C10'] = '=AVERAGE(C2:C9)'

# 添加条件公式
sheet['D10'] = '=IF(B10>1000, "达标", "未达标")'
```

### Q4: 如何使用 recalc.py 重算公式？

```bash
# 基本用法
python skills/xlsx/recalc.py output.xlsx

# 指定超时时间（秒）
python skills/xlsx/recalc.py output.xlsx 60
```

**注意：** recalc.py 需要安装 LibreOffice。

## 依赖项

- `openpyxl >= 3.1.0` - Excel 文件操作
- `pandas >= 2.0.0` - 数据处理
- `LibreOffice` (可选) - 公式重算

## 更新日志

### v1.0.0 (2025-01-26)
- 初始版本
- 支持四色卡片导出
- 支持多工作表报告
- 支持数据可视化图表
- 提供 REST API 接口

## 许可证

MIT License

## 支持

如有问题，请查看：
- 项目文档: `C:\test\antinet\README.md`
- API 文档: http://localhost:8000/docs
- 测试脚本: `skills\xlsx\test_excel_export.py`
