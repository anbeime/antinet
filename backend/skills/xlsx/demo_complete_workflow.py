"""
完整数据分析流程演示
展示从真实数据到 Excel 报告的完整流程
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from skills.xlsx.data_analysis_integration import DataAnalysisExporter
from agents import OrchestratorAgent, MemoryAgent
from database import DatabaseManager
import pandas as pd


async def demo_complete_workflow():
    """演示完整工作流程"""
    
    print("\n" + "="*80)
    print("Antinet 完整数据分析流程演示")
    print("真实数据 -> 8-Agent 分析 -> Excel 报告")
    print("="*80 + "\n")
    
    # ========== 步骤 1: 准备演示数据 ==========
    print("步骤 1: 准备演示数据...")
    
    # 创建演示销售数据
    demo_data = pd.DataFrame({
        "日期": pd.date_range("2025-01-01", periods=30, freq="D"),
        "产品": ["产品A", "产品B", "产品C"] * 10,
        "销量": [100, 80, 120, 95, 85, 110, 105, 90, 125, 98,
                 88, 115, 102, 92, 118, 96, 86, 122, 108, 94,
                 130, 100, 82, 112, 99, 89, 128, 106, 91, 119],
        "销售额": [10000, 8000, 12000, 9500, 8500, 11000, 10500, 9000, 12500, 9800,
                   8800, 11500, 10200, 9200, 11800, 9600, 8600, 12200, 10800, 9400,
                   13000, 10000, 8200, 11200, 9900, 8900, 12800, 10600, 9100, 11900]
    })
    
    # 保存演示数据
    demo_dir = backend_dir / "data" / "demo"
    demo_dir.mkdir(parents=True, exist_ok=True)
    demo_file = demo_dir / "sales_demo.csv"
    demo_data.to_csv(demo_file, index=False, encoding='utf-8-sig')
    
    print(f"  [OK] 演示数据已创建: {demo_file}")
    print(f"  - 数据行数: {len(demo_data)}")
    print(f"  - 字段: {list(demo_data.columns)}")
    print()
    
    # ========== 步骤 2: 初始化系统组件 ==========
    print("步骤 2: 初始化系统组件...")
    
    try:
        # 初始化数据库
        db_path = backend_dir / "data" / "antinet.db"
        db_manager = DatabaseManager(str(db_path))
        print("  [OK] 数据库管理器初始化完成")
        
        # 初始化记忆 Agent
        memory_path = backend_dir / "data" / "memory.db"
        memory = MemoryAgent(db_path=str(memory_path))
        print("  [OK] 太史阁（记忆）初始化完成")
        
        # 初始化总指挥 Agent
        orchestrator = OrchestratorAgent(
            genie_api_base_url="http://127.0.0.1:8000",
            model_path="path/to/model"  # 实际使用时需要真实路径
        )
        print("  [OK] 锦衣卫总指挥使初始化完成")
        print()
        
    except Exception as e:
        print(f"  [FAIL] 初始化失败: {e}")
        print("  注意: 这是演示模式，某些功能可能不可用")
        print()
        return
    
    # ========== 步骤 3: 创建分析导出器 ==========
    print("步骤 3: 创建数据分析导出器...")
    
    exporter = DataAnalysisExporter(
        db_manager=db_manager,
        orchestrator=orchestrator,
        memory=memory
    )
    print("  [OK] 导出器创建完成")
    print()
    
    # ========== 步骤 4: 执行完整分析 ==========
    print("步骤 4: 执行完整分析流程...")
    print("  - 加载数据")
    print("  - 8-Agent 协作分析")
    print("  - 生成四色卡片")
    print("  - 导出 Excel 报告")
    print()
    
    try:
        output_dir = backend_dir / "data" / "exports"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "demo_analysis_report.xlsx"
        
        result = await exporter.analyze_and_export(
            data_source=str(demo_file),
            query="分析销售数据，识别趋势、风险并提出行动建议",
            output_path=str(output_file),
            include_charts=True
        )
        
        print("  [OK] 分析完成！")
        print()
        
        # ========== 步骤 5: 显示结果 ==========
        print("步骤 5: 分析结果摘要")
        print("-" * 80)
        print(f"  输出文件: {output_file}")
        print(f"  数据行数: {result['data_rows']}")
        print(f"  卡片总数: {result['cards_count']}")
        print()
        
        print("  四色卡片分布:")
        cards_by_type = result['excel_data']['cards_by_type']
        print(f"    🔵 事实卡片: {len(cards_by_type['fact'])} 张")
        print(f"    🟢 解释卡片: {len(cards_by_type['interpret'])} 张")
        print(f"    🟡 风险卡片: {len(cards_by_type['risk'])} 张")
        print(f"    🔴 行动卡片: {len(cards_by_type['action'])} 张")
        print()
        
        print("  Excel 报告包含:")
        print("    - 📊 报告概览")
        print("    - 🔵 事实卡片工作表")
        print("    - 🟢 解释卡片工作表")
        print("    - 🟡 风险卡片工作表")
        print("    - 🔴 行动建议工作表")
        print("    - 📈 原始数据工作表")
        print("    - 📉 数据统计工作表")
        print("    - 📊 可视化图表工作表")
        print()
        
        print("-" * 80)
        print()
        
        # ========== 步骤 6: 完成 ==========
        print("="*80)
        print("演示完成！")
        print("="*80)
        print()
        print(f"请打开以下文件查看完整报告:")
        print(f"  {output_file}")
        print()
        print("报告特点:")
        print("  [OK] 基于真实数据分析")
        print("  [OK] 8-Agent 协作生成")
        print("  [OK] 四色卡片结构化呈现")
        print("  [OK] 专业 Excel 格式")
        print("  [OK] 包含数据可视化")
        print()
        
    except Exception as e:
        print(f"  [FAIL] 分析失败: {e}")
        print()
        import traceback
        traceback.print_exc()


async def demo_simple_export():
    """演示简单导出（不依赖 Agent）"""
    
    print("\n" + "="*80)
    print("简单 Excel 导出演示（不依赖 Agent）")
    print("="*80 + "\n")
    
    from skills.xlsx import export_cards_to_excel
    
    # 模拟卡片数据
    cards = [
        {
            "id": "fact_001",
            "type": "fact",
            "title": "销售数据统计",
            "content": "2025年1月总销售额150万元，同比增长18%",
            "confidence": 0.95,
            "created_at": "2025-01-26 10:00:00",
            "tags": ["销售", "数据"]
        },
        {
            "id": "interpret_001",
            "type": "interpret",
            "title": "增长原因分析",
            "content": "销售增长主要归因于新产品推出和市场推广活动",
            "confidence": 0.88,
            "created_at": "2025-01-26 10:05:00",
            "tags": ["分析", "原因"]
        },
        {
            "id": "risk_001",
            "type": "risk",
            "title": "库存不足风险",
            "content": "热销产品库存仅剩30%，存在断货风险",
            "confidence": 0.92,
            "created_at": "2025-01-26 10:10:00",
            "tags": ["风险", "库存"]
        },
        {
            "id": "action_001",
            "type": "action",
            "title": "紧急补货建议",
            "content": "建议立即追加订单50%，启动备用供应商",
            "confidence": 0.90,
            "created_at": "2025-01-26 10:15:00",
            "tags": ["行动", "采购"]
        }
    ]
    
    output_dir = backend_dir / "data" / "exports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "simple_demo.xlsx"
    
    result = export_cards_to_excel(cards, str(output_file), "演示卡片")
    
    print(f"[OK] 导出成功: {result}")
    print(f"  - 卡片数量: {len(cards)}")
    print(f"  - 输出路径: {output_file}")
    print()
    print("请打开文件查看效果！")
    print()


def main():
    """主函数"""
    print("\n请选择演示模式:")
    print("  1. 完整流程演示（数据 + 8-Agent + Excel）")
    print("  2. 简单导出演示（仅 Excel 导出）")
    print()
    
    choice = input("请输入选项 (1/2，默认2): ").strip() or "2"
    
    if choice == "1":
        print("\n注意: 完整流程需要 8-Agent 系统运行")
        print("如果系统未完全配置，可能会失败")
        confirm = input("是否继续? (y/n): ").strip().lower()
        if confirm == 'y':
            asyncio.run(demo_complete_workflow())
        else:
            print("已取消")
    else:
        asyncio.run(demo_simple_export())


if __name__ == "__main__":
    main()
