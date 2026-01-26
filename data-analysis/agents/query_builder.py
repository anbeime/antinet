"""
查询构建与执行 Agent (Query Builder)
根据结构化条件生成可执行的查询语句（SQL、API调用），从本地数据库获取数据
"""

import json
import duckdb
import pandas as pd
from typing import Dict, List, Optional, Any


class QueryBuilderAgent:
    """
    查询构建与执行 Agent
    
    职责：
    - 接收来自Orchestrator的JSON查询条件
    - 映射到本地数据库的表和字段
    - 生成优化的SQL查询
    - 执行查询，将结果集（DataFrame）返回给Orchestrator
    
    部署位置：本地代码（Python），不依赖AI模型，连接本地SQLite/DuckDB
    """
    
    def __init__(self, db_path: str = "./data/analysis.db"):
        """
        初始化查询构建与执行 Agent
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
        self.conn = None
        self._init_db()
    
    def _init_db(self):
        """初始化数据库连接"""
        try:
            # 使用DuckDB连接数据库
            self.conn = duckdb.connect(self.db_path)
            print(f"[QueryBuilderAgent] 数据库连接成功: {self.db_path}")
        except Exception as e:
            print(f"[QueryBuilderAgent] 数据库连接失败: {str(e)}")
            raise
    
    def build_query(
        self,
        metrics: List[str],
        dimensions: List[str],
        filters: Optional[Dict[str, Any]] = None,
        time_range: Optional[Dict[str, str]] = None,
        aggregation: str = "sum"
    ) -> str:
        """
        构建SQL查询语句
        
        Args:
            metrics: 指标列表（如["profit", "sales"]）
            dimensions: 维度列表（如["city", "product"]）
            filters: 过滤条件（如{"city": ["北京", "上海"]}）
            time_range: 时间范围（如{"start": "2025-07-01", "end": "2025-09-30"}）
            aggregation: 聚合方式（sum/avg/max/min/count）
        
        Returns:
            SQL查询语句
        """
        # 构建SELECT子句
        select_parts = []
        
        # 添加维度字段
        for dim in dimensions:
            select_parts.append(f"{dim}")
        
        # 添加聚合指标
        for metric in metrics:
            select_parts.append(f"{aggregation.upper()}({metric}) AS {metric}_{aggregation}")
        
        select_clause = ", ".join(select_parts)
        
        # 构建FROM子句
        from_clause = "FROM sales_data"  # 假设表名为sales_data
        
        # 构建WHERE子句
        where_parts = []
        
        # 添加时间范围过滤
        if time_range:
            where_parts.append(f"date >= '{time_range['start']}'")
            where_parts.append(f"date <= '{time_range['end']}'")
        
        # 添加过滤条件
        if filters:
            for field, values in filters.items():
                if isinstance(values, list):
                    values_str = "', '".join(str(v) for v in values)
                    where_parts.append(f"{field} IN ('{values_str}')")
                else:
                    where_parts.append(f"{field} = '{values}'")
        
        where_clause = ""
        if where_parts:
            where_clause = "WHERE " + " AND ".join(where_parts)
        
        # 构建GROUP BY子句
        group_by_clause = ""
        if dimensions:
            group_by_clause = "GROUP BY " + ", ".join(dimensions)
        
        # 组装完整SQL
        sql = f"""
SELECT
  {select_clause}
{from_clause}
{where_clause}
{group_by_clause}
""".strip()
        
        print(f"[QueryBuilderAgent] 构建的SQL查询:\n{sql}")
        return sql
    
    def execute_query(self, sql: str) -> pd.DataFrame:
        """
        执行SQL查询
        
        Args:
            sql: SQL查询语句
        
        Returns:
            查询结果DataFrame
        """
        try:
            # 执行查询
            df = self.conn.execute(sql).df()
            print(f"[QueryBuilderAgent] 查询成功，返回{len(df)}行数据")
            return df
        except Exception as e:
            print(f"[QueryBuilderAgent] 查询失败: {str(e)}")
            raise
    
    def process_query_request(self, query_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理查询请求（完整流程）
        
        Args:
            query_request: 查询请求JSON
                {
                  "metrics": ["profit"],
                  "dimensions": ["city", "product"],
                  "filters": {"city": ["北京", "上海"]},
                  "time_range": {"start": "2025-07-01", "end": "2025-09-30"},
                  "aggregation": "sum"
                }
        
        Returns:
            查询结果
                {
                  "success": True,
                  "data": DataFrame.to_dict(),
                  "sql": "SELECT ...",
                  "row_count": 10,
                  "summary": {...}
                }
        """
        try:
            # 提取查询参数
            metrics = query_request.get("metrics", [])
            dimensions = query_request.get("dimensions", [])
            filters = query_request.get("filters", {})
            time_range = query_request.get("time_range")
            aggregation = query_request.get("aggregation", "sum")
            
            # 构建SQL查询
            sql = self.build_query(
                metrics=metrics,
                dimensions=dimensions,
                filters=filters,
                time_range=time_range,
                aggregation=aggregation
            )
            
            # 执行查询
            df = self.execute_query(sql)
            
            # 生成数据摘要
            summary = self._generate_summary(df, metrics, dimensions)
            
            # 返回结果
            result = {
                "success": True,
                "data": df.to_dict(orient="records"),
                "sql": sql,
                "row_count": len(df),
                "summary": summary
            }
            
            print(f"[QueryBuilderAgent] 查询处理成功: {result['row_count']}行")
            return result
            
        except Exception as e:
            print(f"[QueryBuilderAgent] 查询处理失败: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _generate_summary(
        self,
        df: pd.DataFrame,
        metrics: List[str],
        dimensions: List[str]
    ) -> Dict[str, Any]:
        """
        生成数据摘要
        
        Args:
            df: 查询结果DataFrame
            metrics: 指标列表
            dimensions: 维度列表
        
        Returns:
            数据摘要
        """
        summary = {
            "total_rows": len(df),
            "metrics_stats": {}
        }
        
        # 计算指标的统计信息
        for metric in metrics:
            metric_col = f"{metric}_sum"  # 假设聚合方式为sum
            if metric_col in df.columns:
                summary["metrics_stats"][metric] = {
                    "total": float(df[metric_col].sum()),
                    "mean": float(df[metric_col].mean()),
                    "max": float(df[metric_col].max()),
                    "min": float(df[metric_col].min())
                }
        
        return summary
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            print("[QueryBuilderAgent] 数据库连接已关闭")


# 示例使用
if __name__ == "__main__":
    # 示例1：处理查询请求
    print("=== 示例1：处理查询请求 ===")
    
    agent = QueryBuilderAgent(db_path="./data/analysis.db")
    
    query_request = {
        "metrics": ["profit", "sales"],
        "dimensions": ["city", "product"],
        "filters": {"city": ["北京", "上海"]},
        "time_range": {"start": "2025-07-01", "end": "2025-09-30"},
        "aggregation": "sum"
    }
    
    result = agent.process_query_request(query_request)
    
    if result["success"]:
        print(f"查询成功！返回{result['row_count']}行数据")
        print(f"SQL: {result['sql']}")
        print(f"摘要: {result['summary']}")
        print(f"前5行数据:")
        for row in result["data"][:5]:
            print(row)
    else:
        print(f"查询失败: {result['error']}")
    
    agent.close()
    print()
    
    # 示例2：构建查询语句
    print("=== 示例2：构建查询语句 ===")
    
    sql = agent.build_query(
        metrics=["profit"],
        dimensions=["city"],
        filters={"city": ["北京", "上海", "广州"]},
        time_range={"start": "2024-12-01", "end": "2024-12-31"},
        aggregation="sum"
    )
    
    print(f"构建的SQL:\n{sql}")
