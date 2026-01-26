"""
Excel 导出功能测试脚本
演示如何使用 Excel 导出功能
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# 添加项目路径
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from skills.xlsx import export_cards_to_excel, export_analysis_to_excel
import pandas as pd


def test_simple_export():
    """测试简单卡片导出"""
    print("\n" + "="*60)
    print("测试 1: 简单卡片导出")
    print("="*60)
    
    # 模拟卡片数据
    cards = [
        {
            "id": "fact_001",
            "type": "fact",
            "title": "2025年1月销售数据",
            "content": "总销售额为100万元，同比增长15%",
            "confidence": 0.95,
            "created_at": "2025-01-26 10:00:00",
            "tags": ["销售", "数据", "增长"]
        },
        {
            "id": "interpret_001",
            "type": "interpret",
            "title": "销售增长原因分析",
            "content": "销售增长主要归因于新产品线的推出和市场推广活动的成功",
            "confidence": 0.88,
            "created_at": "2025-01-26 10:05:00",
            "tags": ["分析", "原因", "营销"]
        },
        {
            "id": "risk_001",
            "type": "risk",
            "title": "库存不足风险",
            "content": "热销产品库存仅剩30%，可能导致断货",
            "confidence": 0.92,
            "created_at": "2025-01-26 10:10:00",
            "tags": ["风险", "库存", "供应链"]
        },
        {
            "id": "action_001",
            "type": "action",
            "title": "紧急补货建议",
            "content": "建议立即联系供应商，追加订单至少50%",
            "confidence": 0.90,
            "created_at": "2025-01-26 10:15:00",
            "tags": ["行动", "采购", "紧急"]
        }
    ]
    
    output_path = str(backend_dir / "data" / "exports" / "test_simple_export.xlsx")
    result = export_cards_to_excel(cards, output_path, "销售分析卡片")
    
    print(f"[OK] 导出成功: {result}")
    print(f"  - 卡片数量: {len(cards)}")
    print(f"  - 输出路径: {output_path}")


def test_full_report_export():
    """测试完整报告导出"""
    print("\n" + "="*60)
    print("测试 2: 完整分析报告导出")
    print("="*60)
    
    # 分析信息
    analysis_info = {
        "title": "2025年1月销售分析报告",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "data_source": "sales_data.csv",
        "card_counts": {
            "fact": 3,
            "interpret": 2,
            "risk": 2,
            "action": 3
        },
        "summary": "本报告分析了2025年1月的销售数据，发现销售额同比增长15%，但存在库存不足的风险。建议立即采取补货措施。"
    }
    
    # 按类型分组的卡片
    cards_by_type = {
        "fact": [
            {
                "id": "fact_001",
                "title": "总销售额",
                "content": "2025年1月总销售额为100万元",
                "confidence": 0.98,
                "created_at": "2025-01-26 10:00:00",
                "tags": ["销售", "总额"]
            },
            {
                "id": "fact_002",
                "title": "同比增长",
                "content": "同比增长15%，环比增长8%",
                "confidence": 0.95,
                "created_at": "2025-01-26 10:01:00",
                "tags": ["增长", "对比"]
            },
            {
                "id": "fact_003",
                "title": "热销产品",
                "content": "产品A销量占比35%，为最热销产品",
                "confidence": 0.96,
                "created_at": "2025-01-26 10:02:00",
                "tags": ["产品", "排名"]
            }
        ],
        "interpret": [
            {
                "id": "interpret_001",
                "title": "增长原因",
                "content": "新产品线推出和市场推广活动成功",
                "confidence": 0.88,
                "created_at": "2025-01-26 10:05:00",
                "tags": ["分析", "原因"]
            },
            {
                "id": "interpret_002",
                "title": "季节性因素",
                "content": "1月为传统销售旺季，符合历史规律",
                "confidence": 0.85,
                "created_at": "2025-01-26 10:06:00",
                "tags": ["季节", "趋势"]
            }
        ],
        "risk": [
            {
                "id": "risk_001",
                "title": "库存不足",
                "content": "热销产品库存仅剩30%",
                "confidence": 0.92,
                "created_at": "2025-01-26 10:10:00",
                "tags": ["风险", "库存"],
                "risk_level": "高"
            },
            {
                "id": "risk_002",
                "title": "供应链延迟",
                "content": "供应商交货周期延长至15天",
                "confidence": 0.87,
                "created_at": "2025-01-26 10:11:00",
                "tags": ["风险", "供应链"],
                "risk_level": "中"
            }
        ],
        "action": [
            {
                "id": "action_001",
                "title": "紧急补货",
                "content": "立即追加订单50%",
                "confidence": 0.90,
                "created_at": "2025-01-26 10:15:00",
                "tags": ["行动", "采购"],
                "priority": "高"
            },
            {
                "id": "action_002",
                "title": "优化库存管理",
                "content": "建立安全库存预警机制",
                "confidence": 0.85,
                "created_at": "2025-01-26 10:16:00",
                "tags": ["行动", "管理"],
                "priority": "中"
            },
            {
                "id": "action_003",
                "title": "拓展供应商",
                "content": "寻找备用供应商以降低风险",
                "confidence": 0.82,
                "created_at": "2025-01-26 10:17:00",
                "tags": ["行动", "战略"],
                "priority": "中"
            }
        ]
    }
    
    # 额外的数据工作表
    data_sheets = {
        "销售明细": pd.DataFrame({
            "日期": ["2025-01-01", "2025-01-02", "2025-01-03"],
            "产品": ["产品A", "产品B", "产品A"],
            "销量": [100, 80, 120],
            "销售额": [10000, 8000, 12000]
        }),
        "库存状态": pd.DataFrame({
            "产品": ["产品A", "产品B", "产品C"],
            "当前库存": [300, 500, 200],
            "安全库存": [500, 400, 300],
            "状态": ["不足", "正常", "不足"]
        })
    }
    
    # 图表数据
    charts = [
        {
            "name": "销售趋势",
            "type": "line",
            "title": "每日销售额趋势",
            "data": pd.DataFrame({
                "日期": ["01-01", "01-02", "01-03", "01-04", "01-05"],
                "销售额": [10000, 12000, 11000, 13000, 15000]
            }),
            "x_col": "日期",
            "y_cols": ["销售额"]
        }
    ]
    
    output_path = str(backend_dir / "data" / "exports" / "test_full_report.xlsx")
    result = export_analysis_to_excel(
        output_path=output_path,
        analysis_info=analysis_info,
        cards_by_type=cards_by_type,
        data_sheets=data_sheets,
        charts=charts
    )
    
    print(f"[OK] 导出成功: {result}")
    print(f"  - 总卡片数: {sum(analysis_info['card_counts'].values())}")
    print(f"  - 工作表数: {1 + 4 + len(data_sheets) + len(charts)}")  # 概览 + 4色卡片 + 数据 + 图表
    print(f"  - 输出路径: {output_path}")


def main():
    """主函数"""
    print("\n" + "="*60)
    print("Antinet Excel 导出功能测试")
    print("="*60)
    
    # 确保输出目录存在
    output_dir = backend_dir / "data" / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 运行测试
    test_simple_export()
    test_full_report_export()
    
    print("\n" + "="*60)
    print("所有测试完成！")
    print("="*60)
    print("\n请检查以下文件：")
    print(f"  - {output_dir / 'test_simple_export.xlsx'}")
    print(f"  - {output_dir / 'test_full_report.xlsx'}")


if __name__ == "__main__":
    main()
