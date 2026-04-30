"""
数据分析与 Excel 导出集成模块
将真实数据、8-Agent 分析和 Excel 导出无缝连接
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import pandas as pd

from agents import (
    OrchestratorAgent,
    MemoryAgent,
    PreprocessorAgent,
    FactGeneratorAgent,
    InterpreterAgent,
    RiskDetectorAgent,
    ActionAdvisorAgent
)
from skills.xlsx import export_analysis_to_excel
from database import DatabaseManager

logger = logging.getLogger(__name__)


class DataAnalysisExporter:
    """
    数据分析导出器
    
    功能流程：
    1. 从数据库/文件读取真实数据
    2. 通过 8-Agent 系统进行智能分析
    3. 生成四色卡片
    4. 导出为专业 Excel 报告
    """
    
    def __init__(
        self,
        db_manager: DatabaseManager,
        orchestrator: OrchestratorAgent,
        memory: MemoryAgent
    ):
        """
        初始化导出器
        
        Args:
            db_manager: 数据库管理器
            orchestrator: 总指挥 Agent
            memory: 记忆 Agent
        """
        self.db = db_manager
        self.orchestrator = orchestrator
        self.memory = memory
        
        # 初始化各个专业 Agent
        self.preprocessor = PreprocessorAgent()
        
        # 需要 API 配置的 Agent，使用 try-except 处理
        try:
            from config import settings
            api_base = "http://localhost:8000"
            model_path = str(settings.MODEL_PATH) if hasattr(settings, 'MODEL_PATH') else ""
            
            self.fact_generator = FactGeneratorAgent(
                genie_api_base_url=api_base,
                model_path=model_path
            )
            self.interpreter = InterpreterAgent(
                genie_api_base_url=api_base,
                model_path=model_path
            )
            self.risk_detector = RiskDetectorAgent(
                genie_api_base_url=api_base,
                model_path=model_path
            )
            self.action_advisor = ActionAdvisorAgent(
                genie_api_base_url=api_base,
                model_path=model_path
            )
        except Exception as e:
            logger.warning(f"Agent 初始化失败，使用简化版本: {e}")
            self.fact_generator = None
            self.interpreter = None
            self.risk_detector = None
            self.action_advisor = None
        
        logger.info("[DataAnalysisExporter] 初始化完成")
    
    async def analyze_and_export(
        self,
        data_source: str,
        query: str,
        output_path: str,
        include_charts: bool = True,
        output_format: str = "excel"
    ) -> Dict[str, Any]:
        """
        完整的分析和导出流程
        
        Args:
            data_source: 数据源（文件路径或数据库表名）
            query: 用户查询/分析需求
            output_path: 输出路径（.xlsx 或 .html）
            include_charts: 是否包含图表
            output_format: 输出格式 ("excel", "html", "both")
        
        Returns:
            结果字典，包含分析结果和导出路径
        """
        logger.info(f"[DataAnalysisExporter] 开始分析: {query}")
        logger.info(f"[DataAnalysisExporter] 数据源: {data_source}")
        
        try:
            # ========== 步骤 1: 加载真实数据 ==========
            data = await self._load_data(data_source)
            logger.info(f"[DataAnalysisExporter] 数据加载完成: {len(data)} 行")
            
            # ========== 步骤 2: 数据预处理 ==========
            preprocessed = await self._preprocess_data(data, query)
            logger.info(f"[DataAnalysisExporter] 数据预处理完成")
            
            # ========== 步骤 3: 8-Agent 智能分析 ==========
            analysis_result = await self._run_agent_analysis(
                data=preprocessed,
                query=query
            )
            logger.info(f"[DataAnalysisExporter] Agent 分析完成")
            
            # ========== 步骤 4: 生成四色卡片 ==========
            cards_by_type = await self._generate_cards(analysis_result)
            logger.info(f"[DataAnalysisExporter] 卡片生成完成")
            
            # ========== 步骤 5: 准备 Excel 数据 ==========
            excel_data = await self._prepare_excel_data(
                data=data,
                preprocessed=preprocessed,
                cards_by_type=cards_by_type,
                include_charts=include_charts
            )
            logger.info(f"[DataAnalysisExporter] Excel 数据准备完成")
            
            # ========== 步骤 6: 导出报告 ==========
            export_results = {}
            
            if output_format in ["excel", "both"]:
                excel_path = output_path if output_path.endswith('.xlsx') else output_path + '.xlsx'
                export_result = await self._export_to_excel(
                    output_path=excel_path,
                    excel_data=excel_data,
                    query=query
                )
                export_results["excel"] = excel_path
                logger.info(f"[DataAnalysisExporter] Excel 导出完成: {excel_path}")
            
            if output_format in ["html", "both"]:
                html_path = output_path if output_path.endswith('.html') else output_path + '.html'
                html_result = await self._export_to_html(
                    output_path=html_path,
                    excel_data=excel_data,
                    data=data.to_dict('records')
                )
                export_results["html"] = html_path
                logger.info(f"[DataAnalysisExporter] HTML 导出完成: {html_path}")
            
            # ========== 步骤 7: 保存到记忆库 ==========
            await self._save_to_memory(cards_by_type, query)
            logger.info(f"[DataAnalysisExporter] 保存到记忆库完成")
            
            return {
                "status": "success",
                "output_paths": export_results,
                "cards_count": sum(len(cards) for cards in cards_by_type.values()),
                "data_rows": len(data),
                "analysis_result": analysis_result,
                "excel_data": excel_data
            }
            
        except Exception as e:
            logger.error(f"[DataAnalysisExporter] 分析导出失败: {e}", exc_info=True)
            raise
    
    async def _load_data(self, data_source: str) -> pd.DataFrame:
        """
        加载真实数据
        
        支持：
        - CSV/Excel 文件
        - 数据库表
        - DuckDB 查询
        """
        if data_source.endswith('.csv'):
            # CSV 文件
            return pd.read_csv(data_source)
        
        elif data_source.endswith(('.xlsx', '.xls')):
            # Excel 文件
            return pd.read_excel(data_source)
        
        elif data_source.startswith('db:'):
            # 数据库表
            table_name = data_source.replace('db:', '')
            # 从数据库读取
            # 这里需要根据您的数据库结构调整
            query = f"SELECT * FROM {table_name}"
            # 假设使用 DuckDB
            import duckdb
            conn = duckdb.connect(str(self.db.db_path))
            df = conn.execute(query).fetchdf()
            conn.close()
            return df
        
        else:
            raise ValueError(f"不支持的数据源格式: {data_source}")
    
    async def _preprocess_data(
        self, 
        data: pd.DataFrame, 
        query: str
    ) -> Dict[str, Any]:
        """
        数据预处理
        
        使用 PreprocessorAgent (密卷房) 进行数据清洗和特征提取
        """
        # 基础统计信息
        stats = {
            "row_count": len(data),
            "column_count": len(data.columns),
            "columns": list(data.columns),
            "dtypes": data.dtypes.to_dict(),
            "missing_values": data.isnull().sum().to_dict(),
            "numeric_summary": data.describe().to_dict() if len(data.select_dtypes(include='number').columns) > 0 else {}
        }
        
        # 简化预处理：直接使用 pandas 处理，不调用 Agent
        # （Agent 预处理需要文件路径，不适合内存数据）
        try:
            # 基本数据清洗
            cleaned_data = data.copy()
            
            # 处理缺失值
            for col in cleaned_data.columns:
                if cleaned_data[col].dtype in ['int64', 'float64']:
                    cleaned_data[col].fillna(cleaned_data[col].mean(), inplace=True)
                else:
                    cleaned_data[col].fillna('', inplace=True)
            
            # 删除重复行
            cleaned_data.drop_duplicates(inplace=True)
            
            preprocessed = {
                "data": cleaned_data.to_dict('records'),
                "query": query,
                "stats": stats,
                "cleaned_rows": len(cleaned_data)
            }
            logger.info(f"[DataAnalysisExporter] 数据清洗完成: {len(cleaned_data)} 行")
        except Exception as e:
            logger.warning(f"预处理失败，使用原始数据: {e}")
            preprocessed = {
                "data": data.to_dict('records'),
                "query": query,
                "stats": stats
            }
        
        return {
            "original_data": data,
            "stats": stats,
            "preprocessed": preprocessed
        }
    
    async def _run_agent_analysis(
        self,
        data: Dict[str, Any],
        query: str
    ) -> Dict[str, Any]:
        """
        运行 8-Agent 协作分析
        
        流程：
        1. 锦衣卫总指挥使 - 任务分解
        2. 密卷房 - 数据预处理
        3. 通政司 - 事实提取
        4. 监察院 - 解释生成
        5. 刑狱司 - 风险识别
        6. 参谋司 - 行动建议
        7. 太史阁 - 知识存储
        8. 驿传司 - 结果整合
        """
        # 构建任务请求
        task_request = {
            "raw_material": str(data['stats']),
            "user_query": query,
            "request_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 1. 任务分解
        task_instructions = self.orchestrator.parse_user_request(task_request)
        
        # 2. 下发任务
        dispatch_result = self.orchestrator.dispatch_task(task_instructions)
        
        # 3. 监控执行
        task_ids = dispatch_result.get('task_ids', [])
        status_report = self.orchestrator.monitor_agent_status(task_ids)
        
        # 4. 收集结果
        all_results = self.orchestrator.receive_all_results(task_ids)
        
        return {
            "task_id": task_instructions['task_id'],
            "dispatch_result": dispatch_result,
            "status_report": status_report,
            "agent_results": all_results
        }
    
    async def _generate_cards(
        self,
        analysis_result: Dict[str, Any]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        生成四色卡片
        
        从 Agent 分析结果中提取并格式化为标准卡片格式
        """
        agent_results = analysis_result.get('agent_results', {})
        
        cards_by_type = {
            'fact': [],
            'interpret': [],
            'risk': [],
            'action': []
        }
        
        # 🔵 蓝色卡片 - 事实（通政司）
        tongzhengsi_result = agent_results.get('tongzhengsi', {})
        if tongzhengsi_result:
            facts = tongzhengsi_result.get('facts', [])
            for idx, fact in enumerate(facts):
                cards_by_type['fact'].append({
                    "id": f"fact_{datetime.now().strftime('%Y%m%d%H%M%S')}_{idx}",
                    "title": fact.get('title', '数据事实'),
                    "content": fact.get('content', ''),
                    "confidence": fact.get('confidence', 0.9),
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tags": fact.get('tags', ['数据', '事实']),
                    "source": "通政司"
                })
        
        # 🟢 绿色卡片 - 解释（监察院）
        jianchayuan_result = agent_results.get('jianchayuan', {})
        if jianchayuan_result:
            interpretations = jianchayuan_result.get('interpretations', [])
            for idx, interp in enumerate(interpretations):
                cards_by_type['interpret'].append({
                    "id": f"interpret_{datetime.now().strftime('%Y%m%d%H%M%S')}_{idx}",
                    "title": interp.get('title', '原因分析'),
                    "content": interp.get('content', ''),
                    "confidence": interp.get('confidence', 0.85),
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tags": interp.get('tags', ['分析', '解释']),
                    "source": "监察院"
                })
        
        # 🟡 黄色卡片 - 风险（刑狱司）
        xingyusi_result = agent_results.get('xingyusi', {})
        if xingyusi_result:
            risks = xingyusi_result.get('risks', [])
            for idx, risk in enumerate(risks):
                cards_by_type['risk'].append({
                    "id": f"risk_{datetime.now().strftime('%Y%m%d%H%M%S')}_{idx}",
                    "title": risk.get('title', '风险预警'),
                    "content": risk.get('content', ''),
                    "confidence": risk.get('confidence', 0.88),
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tags": risk.get('tags', ['风险', '预警']),
                    "risk_level": risk.get('level', '中'),
                    "source": "刑狱司"
                })
        
        # 🔴 红色卡片 - 行动（参谋司）
        canmousi_result = agent_results.get('canmousi', {})
        if canmousi_result:
            actions = canmousi_result.get('actions', [])
            for idx, action in enumerate(actions):
                cards_by_type['action'].append({
                    "id": f"action_{datetime.now().strftime('%Y%m%d%H%M%S')}_{idx}",
                    "title": action.get('title', '行动建议'),
                    "content": action.get('content', ''),
                    "confidence": action.get('confidence', 0.87),
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "tags": action.get('tags', ['行动', '建议']),
                    "priority": action.get('priority', '中'),
                    "source": "参谋司"
                })
        
        return cards_by_type
    
    async def _prepare_excel_data(
        self,
        data: pd.DataFrame,
        preprocessed: Dict[str, Any],
        cards_by_type: Dict[str, List[Dict[str, Any]]],
        include_charts: bool
    ) -> Dict[str, Any]:
        """
        准备 Excel 导出数据
        """
        # 分析信息
        analysis_info = {
            "title": f"Antinet 智能分析报告",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "data_source": "真实业务数据",
            "card_counts": {
                card_type: len(cards)
                for card_type, cards in cards_by_type.items()
            },
            "summary": self._generate_summary(cards_by_type)
        }
        
        # 数据工作表
        data_sheets = {
            "原始数据": data.head(1000),  # 限制行数避免文件过大
            "数据统计": pd.DataFrame(preprocessed['stats']['numeric_summary'])
        }
        
        # 图表数据
        charts = []
        if include_charts:
            charts = self._generate_charts(data, cards_by_type)
        
        return {
            "analysis_info": analysis_info,
            "cards_by_type": cards_by_type,
            "data_sheets": data_sheets,
            "charts": charts
        }
    
    def _generate_summary(
        self,
        cards_by_type: Dict[str, List[Dict[str, Any]]]
    ) -> str:
        """生成报告摘要"""
        total_cards = sum(len(cards) for cards in cards_by_type.values())
        
        summary_parts = [
            f"本报告基于真实业务数据进行智能分析，",
            f"通过 8-Agent 协作系统生成了 {total_cards} 张四色卡片。"
        ]
        
        if cards_by_type['fact']:
            summary_parts.append(
                f"发现 {len(cards_by_type['fact'])} 个关键数据事实，"
            )
        
        if cards_by_type['risk']:
            summary_parts.append(
                f"识别 {len(cards_by_type['risk'])} 项潜在风险，"
            )
        
        if cards_by_type['action']:
            summary_parts.append(
                f"提出 {len(cards_by_type['action'])} 项可执行建议。"
            )
        
        return "".join(summary_parts)
    
    def _generate_charts(
        self,
        data: pd.DataFrame,
        cards_by_type: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """生成图表数据"""
        charts = []
        
        # 图表 1: 卡片分布
        chart_data = pd.DataFrame({
            "类型": ["事实", "解释", "风险", "行动"],
            "数量": [
                len(cards_by_type['fact']),
                len(cards_by_type['interpret']),
                len(cards_by_type['risk']),
                len(cards_by_type['action'])
            ]
        })
        
        charts.append({
            "name": "卡片分布",
            "type": "bar",
            "title": "四色卡片分布统计",
            "data": chart_data,
            "x_col": "类型",
            "y_cols": ["数量"]
        })
        
        # 图表 2: 数据趋势（如果有时间列）
        if 'date' in data.columns or '日期' in data.columns:
            date_col = 'date' if 'date' in data.columns else '日期'
            numeric_cols = data.select_dtypes(include='number').columns[:3]  # 取前3个数值列
            
            if len(numeric_cols) > 0:
                trend_data = data[[date_col] + list(numeric_cols)].copy()
                trend_data = trend_data.groupby(date_col).mean().reset_index()
                
                charts.append({
                    "name": "数据趋势",
                    "type": "line",
                    "title": "关键指标趋势分析",
                    "data": trend_data,
                    "x_col": date_col,
                    "y_cols": list(numeric_cols)
                })
        
        return charts
    
    async def _export_to_excel(
        self,
        output_path: str,
        excel_data: Dict[str, Any],
        query: str
    ) -> str:
        """导出到 Excel"""
        return export_analysis_to_excel(
            output_path=output_path,
            analysis_info=excel_data['analysis_info'],
            cards_by_type=excel_data['cards_by_type'],
            data_sheets=excel_data['data_sheets'],
            charts=excel_data['charts']
        )
    
    async def _export_to_html(
        self,
        output_path: str,
        excel_data: Dict[str, Any],
        data: List[Dict]
    ) -> str:
        """导出到 HTML 报告（使用 Chart.js）"""
        from skills.html_report_skill import HtmlReportSkill
        
        skill = HtmlReportSkill()
        result = await skill.execute(
            data=data,
            title=excel_data['analysis_info']['title'],
            chart_type="mixed",
            include_table=True
        )
        
        if result.get("status") == "success":
            html_content = result.get("html", "")
            
            # 添加四色卡片摘要到 HTML
            cards_html = self._generate_cards_html(excel_data['cards_by_type'])
            html_content = html_content.replace(
                '</div>\n    <div class="table-section">',
                f'</div>\n    {cards_html}\n    <div class="table-section">'
            )
            
            # 保存 HTML 文件
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            return output_path
        else:
            raise Exception(f"HTML 报告生成失败: {result.get('error')}")
    
    def _generate_cards_html(self, cards_by_type: Dict[str, List[Dict]]) -> str:
        """生成四色卡片 HTML"""
        card_colors = {
            'fact': ('#3182ce', '事实'),
            'interpret': ('#805ad5', '解释'),
            'risk': ('#e53e3e', '风险'),
            'action': ('#38a169', '行动')
        }
        
        html_parts = ['<div class="cards-section" style="background:white;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 10px 40px rgba(0,0,0,0.1);">']
        html_parts.append('<h2 style="color:#2d3748;margin-bottom:20px;font-size:18px;">📋 四色卡片分析结果</h2>')
        html_parts.append('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">')
        
        for card_type, (color, label) in card_colors.items():
            cards = cards_by_type.get(card_type, [])
            html_parts.append(f'''
            <div style="border-left:4px solid {color};padding:16px;background:#f7fafc;border-radius:8px;">
                <h3 style="color:{color};margin-bottom:12px;font-size:14px;text-transform:uppercase;">{label} ({len(cards)})</h3>
                <ul style="list-style:none;padding:0;margin:0;">''')
            
            for card in cards[:5]:  # 最多显示5个
                html_parts.append(f'''
                    <li style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                        <strong style="color:#2d3748;">{card.get('title', '无标题')}</strong>
                        <p style="color:#718096;font-size:13px;margin:4px 0 0 0;">{card.get('content', '')[:100]}...</p>
                    </li>''')
            
            if len(cards) > 5:
                html_parts.append(f'<li style="color:#718096;font-size:13px;padding:8px 0;">还有 {len(cards) - 5} 项...</li>')
            
            html_parts.append('</ul></div>')
        
        html_parts.append('</div></div>')
        return ''.join(html_parts)
    
    async def _save_to_memory(
        self,
        cards_by_type: Dict[str, List[Dict[str, Any]]],
        query: str
    ):
        """保存到记忆库（太史阁）"""
        for card_type, cards in cards_by_type.items():
            for card in cards:
                self.memory.store_card({
                    **card,
                    "type": card_type,
                    "query": query
                })


# ==================== 便捷函数 ====================

async def quick_analyze_and_export(
    data_source: str,
    query: str,
    output_path: str,
    db_manager: DatabaseManager,
    orchestrator: OrchestratorAgent,
    memory: MemoryAgent
) -> Dict[str, Any]:
    """
    快速分析和导出
    
    使用示例：
    ```python
    result = await quick_analyze_and_export(
        data_source="./data/sales_data.csv",
        query="分析上个月的销售趋势和风险",
        output_path="./exports/sales_analysis.xlsx",
        db_manager=db_manager,
        orchestrator=orchestrator,
        memory=memory
    )
    ```
    """
    exporter = DataAnalysisExporter(db_manager, orchestrator, memory)
    return await exporter.analyze_and_export(
        data_source=data_source,
        query=query,
        output_path=output_path
    )
