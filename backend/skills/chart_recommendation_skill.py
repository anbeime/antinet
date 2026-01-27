"""
Chart Recommendation Skill
智能图表推荐技能 - 基于下载的 smart-chart-recommender.skill
"""
import logging
from typing import Dict, List, Any
import pandas as pd

logger = logging.getLogger(__name__)


class ChartRecommendationSkill:
    """智能图表推荐技能"""
    
    def __init__(self):
        self.name = "chart_recommendation"
        self.description = "根据数据特征推荐最佳图表类型并生成配置"
        self.category = "数据可视化"
        self.agent_name = "密卷房"
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(self, data: List[Dict], **kwargs) -> Dict[str, Any]:
        """
        推荐图表类型
        
        参数:
            data: 数据列表
        
        返回:
            {
                "recommended_chart": "bar",
                "reason": "数据包含分类变量和数值变量，适合柱状图",
                "chart_config": {...},
                "alternative_charts": [...]
            }
        """
        try:
            logger.info(f"[{self.name}] 开始分析数据特征")
            
            if not data:
                return {
                    "recommended_chart": "table",
                    "reason": "数据为空，建议使用表格",
                    "chart_config": {},
                    "alternative_charts": []
                }
            
            # 1. 分析数据特征
            features = self._analyze_data_features(data)
            logger.info(f"[{self.name}] 数据特征: {features}")
            
            # 2. 应用决策树推荐图表
            chart_type, reason = self._apply_decision_tree(features)
            logger.info(f"[{self.name}] 推荐图表: {chart_type}, 原因: {reason}")
            
            # 3. 生成图表配置
            chart_config = self._generate_chart_config(chart_type, data, features)
            
            # 4. 获取备选图表
            alternative_charts = self._get_alternative_charts(features)
            
            return {
                "recommended_chart": chart_type,
                "reason": reason,
                "chart_config": chart_config,
                "alternative_charts": alternative_charts,
                "data_features": features
            }
            
        except Exception as e:
            logger.error(f"[{self.name}] 图表推荐失败: {e}", exc_info=True)
            raise
    
    def _analyze_data_features(self, data: List[Dict]) -> Dict[str, Any]:
        """分析数据特征"""
        df = pd.DataFrame(data)
        
        features = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "numeric_columns": [],
            "categorical_columns": [],
            "datetime_columns": [],
            "has_time_series": False,
            "has_categories": False,
            "has_numeric": False,
            "has_proportions": False
        }
        
        # 分析每列的类型
        for col in df.columns:
            dtype = df[col].dtype
            
            if pd.api.types.is_numeric_dtype(dtype):
                features["numeric_columns"].append(col)
                features["has_numeric"] = True
                
                # 检查是否是比例数据
                if df[col].min() >= 0 and df[col].max() <= 1:
                    features["has_proportions"] = True
                elif df[col].min() >= 0 and df[col].max() <= 100:
                    features["has_proportions"] = True
                    
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                features["datetime_columns"].append(col)
                features["has_time_series"] = True
                
            else:
                features["categorical_columns"].append(col)
                features["has_categories"] = True
        
        return features
    
    def _apply_decision_tree(self, features: Dict) -> tuple:
        """应用决策树推荐图表类型"""
        # 时间序列数据 → 折线图
        if features.get("has_time_series"):
            return "line", "数据包含时间序列，适合折线图展示趋势"
        
        # 比例数据 + 少量类别 → 饼图
        if features.get("has_proportions") and features.get("row_count", 0) <= 7:
            return "pie", "数据表示比例关系且类别较少，适合饼图"
        
        # 分类 + 数值 → 柱状图
        if features.get("has_categories") and features.get("has_numeric"):
            return "bar", "数据包含分类变量和数值变量，适合柱状图"
        
        # 多个数值列 → 散点图
        if len(features.get("numeric_columns", [])) >= 2:
            return "scatter", "数据包含多个数值变量，适合散点图分析相关性"
        
        # 默认 → 表格
        return "table", "数据结构复杂，建议使用表格展示"
    
    def _generate_chart_config(self, chart_type: str, data: List[Dict], features: Dict) -> Dict:
        """生成 ECharts 配置"""
        df = pd.DataFrame(data)
        
        config = {
            "type": chart_type,
            "title": {"text": f"{chart_type.capitalize()} Chart"},
            "tooltip": {"trigger": "axis"},
            "legend": {},
            "xAxis": {},
            "yAxis": {},
            "series": []
        }
        
        if chart_type == "bar":
            x_col = features["categorical_columns"][0] if features["categorical_columns"] else df.columns[0]
            y_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["xAxis"] = {
                "type": "category",
                "data": df[x_col].tolist()
            }
            config["yAxis"] = {"type": "value"}
            config["series"] = [{
                "type": "bar",
                "data": df[y_col].tolist()
            }]
            
        elif chart_type == "line":
            x_col = features["datetime_columns"][0] if features["datetime_columns"] else df.columns[0]
            y_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["xAxis"] = {
                "type": "category",
                "data": df[x_col].tolist()
            }
            config["yAxis"] = {"type": "value"}
            config["series"] = [{
                "type": "line",
                "data": df[y_col].tolist(),
                "smooth": True
            }]
            
        elif chart_type == "pie":
            name_col = features["categorical_columns"][0] if features["categorical_columns"] else df.columns[0]
            value_col = features["numeric_columns"][0] if features["numeric_columns"] else df.columns[1]
            
            config["series"] = [{
                "type": "pie",
                "radius": "50%",
                "data": [
                    {"name": str(row[name_col]), "value": row[value_col]}
                    for _, row in df.iterrows()
                ]
            }]
        
        return config
    
    def _get_alternative_charts(self, features: Dict) -> List[Dict]:
        """获取备选图表"""
        alternatives = []
        
        if features.get("has_numeric"):
            alternatives.append({
                "type": "bar",
                "name": "柱状图",
                "reason": "适合比较数值大小"
            })
            alternatives.append({
                "type": "line",
                "name": "折线图",
                "reason": "适合展示趋势变化"
            })
        
        if features.get("has_proportions"):
            alternatives.append({
                "type": "pie",
                "name": "饼图",
                "reason": "适合展示比例关系"
            })
        
        if len(features.get("numeric_columns", [])) >= 2:
            alternatives.append({
                "type": "scatter",
                "name": "散点图",
                "reason": "适合分析相关性"
            })
        
        return alternatives
    
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
