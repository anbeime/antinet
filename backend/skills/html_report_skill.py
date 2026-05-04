"""
HTML Report Generation Skill

使用 Chart.js 生成交互式 HTML 数据分析报告
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class HtmlReportSkill:
    """
    HTML 报告生成技能
    
    使用 Chart.js 生成交互式 HTML 数据分析报告，支持：
    - 折线图（趋势分析）
    - 柱状图（对比分析）
    - 饼图（占比分析）
    - 双Y轴图表（多指标分析）
    """
    
    def __init__(self):
        self.name = "html_report"
        self.description = "HTML报告生成：使用Chart.js生成交互式数据分析报告"
        self.category = "数据处理"
        self.agent_name = "丞相府"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    def get_info(self) -> Dict:
        """获取技能信息"""
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "agent_name": self.agent_name,
            "enabled": self.enabled,
            "last_used": self.last_used,
            "usage_count": self.usage_count
        }
    
    async def execute(
        self,
        data: List[Dict],
        title: str = "数据分析报告",
        chart_type: str = "auto",
        include_table: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        生成 HTML 报告
        
        Args:
            data: 数据列表，每项为字典
            title: 报告标题
            chart_type: 图表类型 (line/bar/pie/doughnut/mixed/auto)
            include_table: 是否包含数据表格
        
        Returns:
            {
                "html": "<html>...</html>",
                "charts": [{"type": "line", "data": {...}}],
                "summary": {...}
            }
        """
        try:
            self.usage_count += 1
            self.last_used = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] 开始生成HTML报告: {title}")
            
            # 分析数据结构
            columns = list(data[0].keys()) if data else []
            numeric_cols = [c for c in columns if self._is_numeric(data[0].get(c))]
            date_col = self._find_date_column(columns, data)
            
            # 生成图表配置
            charts = self._generate_chart_configs(
                data, columns, numeric_cols, date_col, chart_type
            )
            
            # 生成 HTML
            html = self._build_html(
                title=title,
                data=data,
                columns=columns,
                charts=charts,
                include_table=include_table,
                date_col=date_col
            )
            
            return {
                "status": "success",
                "html": html,
                "charts": charts,
                "summary": {
                    "title": title,
                    "data_rows": len(data),
                    "columns": columns,
                    "numeric_columns": numeric_cols,
                    "chart_count": len(charts),
                    "generated_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 生成HTML报告失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _is_numeric(self, value: Any) -> bool:
        """判断值是否为数字"""
        if value is None:
            return False
        if isinstance(value, (int, float)):
            return True
        if isinstance(value, str):
            try:
                float(value.replace(',', ''))
                return True
            except ValueError:
                return False
        return False
    
    def _find_date_column(self, columns: List[str], data: List[Dict]) -> Optional[str]:
        """查找日期列"""
        date_keywords = ['date', '日期', 'time', '时间', 'day', '日', '周', '月']
        for col in columns:
            col_lower = col.lower()
            if any(kw in col_lower for kw in date_keywords):
                return col
        return None
    
    def _generate_chart_configs(
        self,
        data: List[Dict],
        columns: List[str],
        numeric_cols: List[str],
        date_col: Optional[str],
        chart_type: str
    ) -> List[Dict[str, Any]]:
        """生成图表配置"""
        charts = []
        
        if chart_type == "auto":
            # 根据数据特征自动选择图表类型
            if date_col and len(numeric_cols) >= 1:
                chart_type = "mixed"  # 时间序列用混合图
            elif len(numeric_cols) >= 2:
                chart_type = "bar"  # 多指标用柱状图
            else:
                chart_type = "line"  # 单指标用折线图
        
        if chart_type == "mixed" and date_col:
            # 混合图：折线 + 柱状
            charts.append({
                "type": "mixed",
                "title": "数据趋势分析",
                "date_column": date_col,
                "value_columns": numeric_cols[:3],  # 最多3个指标
                "y_axes": [
                    {"position": "left", "columns": numeric_cols[:2] if len(numeric_cols) > 1 else numeric_cols},
                    {"position": "right", "columns": numeric_cols[2:3] if len(numeric_cols) > 2 else []}
                ]
            })
        elif chart_type == "line" and date_col:
            # 折线图
            for col in numeric_cols[:3]:
                charts.append({
                    "type": "line",
                    "title": f"{col} 趋势",
                    "date_column": date_col,
                    "value_column": col
                })
        elif chart_type == "bar":
            # 柱状图
            charts.append({
                "type": "bar",
                "title": "数据对比",
                "columns": numeric_cols[:4],
                "data": data[:20]  # 限制数据量
            })
        elif chart_type == "pie" and len(numeric_cols) >= 1:
            # 饼图
            charts.append({
                "type": "pie",
                "title": f"{numeric_cols[0]} 分布",
                "value_column": numeric_cols[0],
                "label_column": date_col or columns[0]
            })
        
        return charts
    
    def _build_html(
        self,
        title: str,
        data: List[Dict],
        columns: List[str],
        charts: List[Dict],
        include_table: bool,
        date_col: Optional[str]
    ) -> str:
        """构建 HTML 页面"""
        
        # 生成 Chart.js 配置
        chart_configs = self._generate_chart_js_config(charts, data)
        
        # 生成表格 HTML
        table_html = ""
        if include_table:
            table_html = self._generate_table_html(data, columns)
        
        # 计算摘要统计
        summary_stats = self._calculate_summary(data, columns)
        
        html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}
        .header h1 {{ color: #2d3748; margin-bottom: 10px; }}
        .header .meta {{ color: #718096; font-size: 14px; }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }}
        .stat-card {{
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }}
        .stat-card .label {{ color: #718096; font-size: 13px; margin-bottom: 8px; }}
        .stat-card .value {{ color: #2d3748; font-size: 28px; font-weight: 700; }}
        .stat-card .change {{ font-size: 12px; margin-top: 4px; }}
        .stat-card .change.up {{ color: #48bb78; }}
        .stat-card .change.down {{ color: #f56565; }}
        .chart-section {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}
        .chart-section h2 {{ color: #2d3748; margin-bottom: 20px; font-size: 18px; }}
        .chart-container {{ position: relative; height: 350px; margin-bottom: 20px; }}
        .chart-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 24px; }}
        .table-section {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow-x: auto;
        }}
        .table-section h2 {{ color: #2d3748; margin-bottom: 20px; font-size: 18px; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f7fafc; color: #4a5568; font-weight: 600; font-size: 13px; text-transform: uppercase; }}
        tr:hover {{ background: #f7fafc; }}
        .footer {{ text-align: center; color: rgba(255,255,255,0.8); margin-top: 24px; font-size: 13px; }}
        .color-fact {{ color: #3182ce; }}
        .color-interpret {{ color: #805ad5; }}
        .color-risk {{ color: #e53e3e; }}
        .color-action {{ color: #38a169; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{title}</h1>
            <div class="meta">生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
        
        <div class="stats-grid">
            {self._generate_stats_html(summary_stats)}
        </div>
        
        <div class="chart-section">
            <h2>📈 数据可视化</h2>
            <div class="chart-grid">
                {self._generate_chart_html(chart_configs)}
            </div>
        </div>
        
        {table_html}
        
        <div class="footer">
            <p>由 8-Agent 智能分析系统生成 | 知易平台</p>
        </div>
    </div>
    
    <script>
        // Chart.js 全局配置
        Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        Chart.defaults.color = '#718096';
        
        {chart_configs}
    </script>
</body>
</html>'''
        
        return html
    
    def _calculate_summary(self, data: List[Dict], columns: List[str]) -> Dict[str, Any]:
        """计算摘要统计"""
        stats = {
            "total_rows": len(data),
            "total_columns": len(columns)
        }
        
        for col in columns:
            values = [d.get(col) for d in data if d.get(col) is not None]
            if values and self._is_numeric(values[0]):
                nums = [float(str(v).replace(',', '')) for v in values]
                stats[f"{col}_sum"] = sum(nums)
                stats[f"{col}_avg"] = round(sum(nums) / len(nums), 2)
                stats[f"{col}_max"] = max(nums)
                stats[f"{col}_min"] = min(nums)
        
        return stats
    
    def _generate_stats_html(self, stats: Dict[str, Any]) -> str:
        """生成统计卡片 HTML"""
        html_parts = []
        
        html_parts.append(f'''
        <div class="stat-card">
            <div class="label">数据行数</div>
            <div class="value">{stats.get('total_rows', 0)}</div>
        </div>''')
        
        html_parts.append(f'''
        <div class="stat-card">
            <div class="label">数据列数</div>
            <div class="value">{stats.get('total_columns', 0)}</div>
        </div>''')
        
        # 添加数值列的汇总
        for key, value in stats.items():
            if key.endswith('_sum') and isinstance(value, (int, float)):
                col_name = key.replace('_sum', '')
                html_parts.append(f'''
        <div class="stat-card">
            <div class="label">{col_name} 合计</div>
            <div class="value">{value:,.2f}</div>
        </div>''')
        
        return ''.join(html_parts)
    
    def _generate_chart_js_config(self, charts: List[Dict], data: List[Dict]) -> str:
        """生成 Chart.js 配置代码"""
        js_parts = []
        
        for i, chart in enumerate(charts):
            if chart["type"] == "mixed":
                js_parts.append(self._generate_mixed_chart(chart, data, i))
            elif chart["type"] == "line":
                js_parts.append(self._generate_line_chart(chart, data, i))
            elif chart["type"] == "bar":
                js_parts.append(self._generate_bar_chart(chart, data, i))
            elif chart["type"] == "pie":
                js_parts.append(self._generate_pie_chart(chart, data, i))
        
        return '\n'.join(js_parts)
    
    def _generate_mixed_chart(self, chart: Dict, data: List[Dict], index: int) -> str:
        """生成混合图表"""
        date_col = chart["date_column"]
        labels = [str(d.get(date_col, "")) for d in data]
        
        datasets = []
        colors = ['#3182ce', '#805ad5', '#e53e3e', '#38a169', '#d69e2e']
        
        left_cols = chart["y_axes"][0]["columns"]
        right_cols = chart["y_axes"][1]["columns"] if len(chart["y_axes"]) > 1 else []
        
        for j, col in enumerate(left_cols):
            values = [float(str(d.get(col, 0)).replace(',', '')) for d in data]
            datasets.append(f'''
        {{
            label: '{col}',
            data: {values},
            borderColor: '{colors[j % len(colors)]}',
            backgroundColor: 'transparent',
            yAxisID: 'y',
            tension: 0.4
        }}''')
        
        for j, col in enumerate(right_cols):
            values = [float(str(d.get(col, 0)).replace(',', '')) for d in data]
            datasets.append(f'''
        {{
            label: '{col}',
            data: {values},
            borderColor: '{colors[(len(left_cols) + j) % len(colors)]}',
            backgroundColor: '{colors[(len(left_cols) + j) % len(colors)]}33',
            yAxisID: 'y1',
            tension: 0.4
        }}''')
        
        return f'''
var ctx{index} = document.getElementById('chart{index}').getContext('2d');
new Chart(ctx{index}, {{
    type: 'line',
    data: {{
        labels: {labels},
        datasets: [{','.join(datasets)}
        ]
    }},
    options: {{
        responsive: true,
        maintainAspectRatio: false,
        interaction: {{ mode: 'index', intersect: false }},
        plugins: {{
            title: {{ display: true, text: '{chart["title"]}', font: {{ size: 16 }} }},
            legend: {{ position: 'top' }}
        }},
        scales: {{
            y: {{ type: 'linear', display: true, position: 'left', title: {{ display: true, text: '左侧指标' }} }},
            y1: {{ type: 'linear', display: true, position: 'right', title: {{ display: true, text: '右侧指标' }}, grid: {{ drawOnChartArea: false }} }}
        }}
    }}
}});'''
    
    def _generate_line_chart(self, chart: Dict, data: List[Dict], index: int) -> str:
        """生成折线图"""
        date_col = chart["date_column"]
        value_col = chart["value_column"]
        
        labels = [str(d.get(date_col, "")) for d in data]
        values = [float(str(d.get(value_col, 0)).replace(',', '')) for d in data]
        
        return f'''
var ctx{index} = document.getElementById('chart{index}').getContext('2d');
new Chart(ctx{index}, {{
    type: 'line',
    data: {{
        labels: {labels},
        datasets: [{{
            label: '{value_col}',
            data: {values},
            borderColor: '#3182ce',
            backgroundColor: '#3182ce33',
            fill: true,
            tension: 0.4
        }}]
    }},
    options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{
            title: {{ display: true, text: '{chart["title"]}', font: {{ size: 16 }} }}
        }},
        scales: {{
            y: {{ beginAtZero: true }}
        }}
    }}
}});'''
    
    def _generate_bar_chart(self, chart: Dict, data: List[Dict], index: int) -> str:
        """生成柱状图"""
        columns = chart["columns"]
        labels = [str(d.get(chart.get("label_column", columns[0]), f"Item {i}")) for i, d in enumerate(data)]
        
        datasets = []
        colors = ['#3182ce', '#805ad5', '#e53e3e', '#38a169']
        
        for j, col in enumerate(columns):
            values = [float(str(d.get(col, 0)).replace(',', '')) for d in data]
            datasets.append(f'''
            {{
                label: '{col}',
                data: {values},
                backgroundColor: '{colors[j % len(colors)]}cc',
                borderColor: '{colors[j % len(colors)]}',
                borderWidth: 1
            }}''')
        
        return f'''
var ctx{index} = document.getElementById('chart{index}').getContext('2d');
new Chart(ctx{index}, {{
    type: 'bar',
    data: {{
        labels: {labels},
        datasets: [{','.join(datasets)}
        ]
    }},
    options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{
            title: {{ display: true, text: '{chart["title"]}', font: {{ size: 16 }} }}
        }},
        scales: {{
            y: {{ beginAtZero: true }}
        }}
    }}
}});'''
    
    def _generate_pie_chart(self, chart: Dict, data: List[Dict], index: int) -> str:
        """生成饼图"""
        value_col = chart["value_column"]
        label_col = chart["label_column"]
        
        labels = [str(d.get(label_col, f"Item {i}")) for i, d in enumerate(data)]
        values = [float(str(d.get(value_col, 0)).replace(',', '')) for d in data]
        
        return f'''
var ctx{index} = document.getElementById('chart{index}').getContext('2d');
new Chart(ctx{index}, {{
    type: 'doughnut',
    data: {{
        labels: {labels},
        datasets: [{{
            data: {values},
            backgroundColor: ['#3182ce', '#805ad5', '#e53e3e', '#38a169', '#d69e2e', '#00b5d8', '#ed8936', '#9f7aea']
        }}]
    }},
    options: {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{
            title: {{ display: true, text: '{chart["title"]}', font: {{ size: 16 }} }}
        }}
    }}
}});'''
    
    def _generate_chart_html(self, chart_configs: str) -> str:
        """生成图表容器 HTML"""
        # 解析有多少个图表
        import re
        chart_count = len(re.findall(r'ctx\d+', chart_configs))
        
        html_parts = []
        for i in range(chart_count):
            html_parts.append(f'<div class="chart-container"><canvas id="chart{i}"></canvas></div>')
        
        return ''.join(html_parts)
    
    def _generate_table_html(self, data: List[Dict], columns: List[str]) -> str:
        """生成表格 HTML"""
        # 表头
        headers = ''.join([f'<th>{col}</th>' for col in columns])
        
        # 数据行
        rows = []
        for d in data[:50]:  # 限制显示50行
            cells = ''.join([f'<td>{d.get(col, "-")}</td>' for col in columns])
            rows.append(f'<tr>{cells}</tr>')
        
        table_html = f'''
        <div class="table-section">
            <h2>📋 原始数据</h2>
            <table>
                <thead><tr>{headers}</tr></thead>
                <tbody>{"".join(rows)}</tbody>
            </table>
            {'<p style="color:#718096;margin-top:12px;">（仅显示前50行）</p>' if len(data) > 50 else ''}
        </div>'''
        
        return table_html


# 快捷函数
async def generate_html_report(
    data: List[Dict],
    title: str = "数据分析报告",
    chart_type: str = "auto"
) -> str:
    """生成 HTML 报告的快捷函数"""
    skill = HtmlReportSkill()
    result = await skill.execute(data, title, chart_type)
    return result.get("html", "")