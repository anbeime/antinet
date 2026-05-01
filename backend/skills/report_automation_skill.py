"""
Report Automation Skill

一键生成完整报表：Data → Excel → PDF → PPT
使用 8-Agent 系统进行智能分析，生成四色卡片
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ReportAutomationSkill:
    """
    报表自动化技能
    
    一键生成完整数据分析报表，包含：
    - Excel 报告（数据 + 图表 + 四色卡片）
    - PDF 报告（适合打印和分享）
    - PPT 演示文稿（适合汇报展示）
    
    使用 8-Agent 协作系统进行智能分析
    """
    
    def __init__(self):
        self.name = "report_automation"
        self.description = "报表自动化：一键生成 Excel + PDF + PPT 完整报告"
        self.category = "数据处理"
        self.agent_name = "丞相府"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(
        self,
        data: List[Dict],
        title: str = "数据分析报告",
        config: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        执行报表自动生成
        
        Args:
            data: 数据列表
            title: 报告标题
            config: 配置选项
        
        Returns:
            {
                "status": "success",
                "excel": "path/to/report.xlsx",
                "pdf": "path/to/report.pdf", 
                "ppt": "path/to/report.pptx",
                "cards_count": {...},
                "stats": {...}
            }
        """
        try:
            self.usage_count += 1
            self.last_used = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] 开始生成完整报表: {title}")
            
            config = config or {}
            config['title'] = title
            
            # 使用 ReportAutomationService
            from services.report_automation_service import ReportAutomationService
            
            service = ReportAutomationService()
            
            # 生成完整报表
            result = service.generate_full_report(data, config)
            
            logger.info(f"[{self.name}] 报表生成完成")
            
            return {
                "status": "success",
                "excel": result.get('excel'),
                "pdf": result.get('pdf'),
                "ppt": result.get('ppt'),
                "timestamp": result.get('timestamp'),
                "title": title
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 生成报表失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def execute_from_file(
        self,
        data_source: str,
        query: str = "",
        output_path: str = "./report_output",
        output_format: str = "all"
    ) -> Dict[str, Any]:
        """
        从数据源生成报表（集成 8-Agent 分析）
        
        Args:
            data_source: 数据源路径（.csv, .xlsx, .xls）
            query: 分析需求描述
            output_path: 输出路径前缀
            output_format: 输出格式 ("excel", "pdf", "ppt", "all")
        
        Returns:
            生成结果
        """
        try:
            self.usage_count += 1
            self.last_used = datetime.now().isoformat()
            
            logger.info(f"[{self.name}] 从数据源生成报表: {data_source}")
            
            # 使用 DataAnalysisExporter 进行 8-Agent 分析
            from skills.xlsx.data_analysis_integration import DataAnalysisExporter
            from agents import OrchestratorAgent, MemoryAgent
            from database import DatabaseManager
            
            db_manager = DatabaseManager()
            orchestrator = OrchestratorAgent()
            memory = MemoryAgent()
            
            exporter = DataAnalysisExporter(
                db_manager=db_manager,
                orchestrator=orchestrator,
                memory=memory
            )
            
            # 根据 output_format 确定格式
            format_map = {
                "excel": "excel",
                "pdf": "html",  # PDF 从 HTML 生成
                "ppt": "excel",  # PPT 从 Excel 数据生成
                "all": "both"
            }
            
            result = await exporter.analyze_and_export(
                data_source=data_source,
                query=query or f"分析数据生成{output_format}报告",
                output_path=output_path,
                include_charts=True,
                output_format=format_map.get(output_format, "both")
            )
            
            return {
                "status": "success",
                "output_paths": result.get("output_paths", {}),
                "cards_count": result.get("cards_count", 0),
                "data_rows": result.get("data_rows", 0)
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 从数据源生成报表失败: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }


# 便捷函数
async def generate_full_report(
    data: List[Dict],
    title: str = "数据分析报告"
) -> Dict[str, str]:
    """生成完整报表的快捷函数"""
    skill = ReportAutomationSkill()
    result = await skill.execute(data, title)
    return {
        "excel": result.get("excel"),
        "pdf": result.get("pdf"),
        "ppt": result.get("ppt")
    }