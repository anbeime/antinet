"""
卡片生成与分类 Agent (Card Classifier)
分析数据结果，决定需要生成哪几类卡片，并触发对应的卡片生成器
"""

import json
from typing import Dict, List, Optional, Any


class CardClassifierAgent:
    """
    卡片生成与分类 Agent
    
    职责：
    - 基于数据摘要和用户原始问题，判断需要生成哪些类型的分析卡片
    - 路由到对应的卡片生成器
    
    部署位置：骁龙NPU，与Orchestrator共享模型或使用超轻量分类模型
    
    四色卡片规则：
    - 🔵事实卡片：必须生成，总结核心数据事实
    - 🟢解释卡片：当数据有显著变化、模式或对比差异时生成
    - 🟡风险卡片：当数据触及预设阈值（如增长率< -5%）、发现异常点或潜在问题时生成
    - 🔴行动卡片：当问题本身要求建议，或识别出明确风险和机会时生成
    """
    
    # 风险阈值配置
    RISK_THRESHOLDS = {
        "growth_rate_negative": -5.0,  # 增长率低于-5%触发风险
        "growth_rate_positive": 20.0,   # 增长率高于20%触发机会
        "anomaly_detection": 3.0,      # 异常检测标准差倍数
    }
    
    def __init__(self, model_key: str = "builtin-rule"):
        self.model_key = model_key
        self._model = {"is_loaded": True}
    
    def _load_model(self):
        pass
    
    def classify_cards(
        self,
        data_summary: Dict[str, Any],
        user_query: str,
        current_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        分类卡片生成需求
        
        Args:
            data_summary: 数据摘要
                {
                  "metrics_stats": {
                    "profit": {
                      "total": 1000000,
                      "mean": 100000,
                      "growth_rate": -15.0
                    }
                  },
                  "total_rows": 10,
                  ...
                }
            user_query: 用户原始查询（如"分析上个月销售趋势"）
            current_date: 当前日期（用于时间推断）
        
        Returns:
            分类结果
                {
                  "card_types": ["fact", "interpret", "risk", "action"],
                  "reasons": {
                    "fact": "必须生成，总结核心数据事实",
                    "interpret": "数据有显著变化（增长率-15%）",
                    "risk": "触及风险阈值（增长率<-5%）",
                    "action": "识别出明确风险，需要行动建议"
                  },
                  "priority": {
                    "fact": 1,
                    "interpret": 2,
                    "risk": 1,
                    "action": 2
                  }
                }
        """
        try:
            # 分析数据摘要和用户查询
            card_types = []
            reasons = {}
            priority = {}
            
            # 1. 事实卡片：必须生成
            card_types.append("fact")
            reasons["fact"] = "必须生成，总结核心数据事实"
            priority["fact"] = 1
            
            # 2. 检查是否有显著变化
            has_significant_change = self._check_significant_change(data_summary)
            
            # 3. 检查是否触及风险阈值
            has_risk = self._check_risk_thresholds(data_summary)
            
            # 4. 检查是否有机会
            has_opportunity = self._check_opportunity(data_summary)
            
            # 5. 用户查询是否要求建议
            user_requests_advice = self._check_user_request(user_query)
            
            # 决策逻辑
            if has_significant_change:
                card_types.append("interpret")
                reasons["interpret"] = self._get_interpretation_reason(data_summary)
                priority["interpret"] = 2
            
            if has_risk:
                card_types.append("risk")
                reasons["risk"] = self._get_risk_reason(data_summary)
                priority["risk"] = 1  # 高优先级
            elif has_opportunity:
                card_types.append("risk")
                reasons["risk"] = self._get_opportunity_reason(data_summary)
                priority["risk"] = 2
            
            if user_requests_advice or has_risk or has_opportunity:
                card_types.append("action")
                reasons["action"] = self._get_action_reason(user_query, data_summary)
                priority["action"] = 2
            
            # 返回分类结果
            result = {
                "card_types": card_types,
                "reasons": reasons,
                "priority": priority
            }
            
            print(f"[CardClassifierAgent] 分类结果: {card_types}")
            print(f"[CardClassifierAgent] 原因: {reasons}")
            print(f"[CardClassifierAgent] 优先级: {priority}")
            
            return result
            
        except Exception as e:
            print(f"[CardClassifierAgent] 分类失败: {str(e)}")
            # 返回默认分类（至少生成事实卡片）
            return {
                "card_types": ["fact"],
                "reasons": {"fact": "默认生成事实卡片"},
                "priority": {"fact": 1}
            }
    
    def _check_significant_change(self, data_summary: Dict[str, Any]) -> bool:
        """
        检查数据是否有显著变化
        
        Args:
            data_summary: 数据摘要
        
        Returns:
            是否有显著变化
        """
        try:
            metrics_stats = data_summary.get("metrics_stats", {})
            
            for metric_name, stats in metrics_stats.items():
                # 检查增长率
                if "growth_rate" in stats:
                    growth_rate = stats["growth_rate"]
                    if abs(growth_rate) > 10.0:  # 增长率绝对值大于10%
                        return True
                
                # 检查标准差
                if "std" in stats and "mean" in stats:
                    std = stats["std"]
                    mean = stats["mean"]
                    if mean != 0 and (std / abs(mean)) > 0.2:  # 变异系数大于20%
                        return True
            
            return False
            
        except Exception as e:
            print(f"[CardClassifierAgent] 检查显著变化失败: {str(e)}")
            return False
    
    def _check_risk_thresholds(self, data_summary: Dict[str, Any]) -> bool:
        """
        检查是否触及风险阈值
        
        Args:
            data_summary: 数据摘要
        
        Returns:
            是否触及风险阈值
        """
        try:
            metrics_stats = data_summary.get("metrics_stats", {})
            
            for metric_name, stats in metrics_stats.items():
                # 检查负增长率
                if "growth_rate" in stats:
                    growth_rate = stats["growth_rate"]
                    if growth_rate < self.RISK_THRESHOLDS["growth_rate_negative"]:
                        return True
            
            return False
            
        except Exception as e:
            print(f"[CardClassifierAgent] 检查风险阈值失败: {str(e)}")
            return False
    
    def _check_opportunity(self, data_summary: Dict[str, Any]) -> bool:
        """
        检查是否有机会
        
        Args:
            data_summary: 数据摘要
        
        Returns:
            是否有机会
        """
        try:
            metrics_stats = data_summary.get("metrics_stats", {})
            
            for metric_name, stats in metrics_stats.items():
                # 检查高增长率（机会）
                if "growth_rate" in stats:
                    growth_rate = stats["growth_rate"]
                    if growth_rate > self.RISK_THRESHOLDS["growth_rate_positive"]:
                        return True
            
            return False
            
        except Exception as e:
            print(f"[CardClassifierAgent] 检查机会失败: {str(e)}")
            return False
    
    def _check_user_request(self, user_query: str) -> bool:
        """
        检查用户查询是否要求建议
        
        Args:
            user_query: 用户查询
        
        Returns:
            是否要求建议
        """
        advice_keywords = ["建议", "如何", "怎么办", "策略", "行动"]
        
        for keyword in advice_keywords:
            if keyword in user_query:
                return True
        
        return False
    
    def _get_interpretation_reason(self, data_summary: Dict[str, Any]) -> str:
        """获取解释卡片生成原因"""
        reasons = []
        
        metrics_stats = data_summary.get("metrics_stats", {})
        for metric_name, stats in metrics_stats.items():
            if "growth_rate" in stats:
                growth_rate = stats["growth_rate"]
                if growth_rate > 0:
                    reasons.append(f"{metric_name}增长{growth_rate:.1f}%")
                else:
                    reasons.append(f"{metric_name}下降{abs(growth_rate):.1f}%")
        
        return "；".join(reasons) if reasons else "数据有显著变化"
    
    def _get_risk_reason(self, data_summary: Dict[str, Any]) -> str:
        """获取风险卡片生成原因"""
        reasons = []
        
        metrics_stats = data_summary.get("metrics_stats", {})
        for metric_name, stats in metrics_stats.items():
            if "growth_rate" in stats:
                growth_rate = stats["growth_rate"]
                if growth_rate < self.RISK_THRESHOLDS["growth_rate_negative"]:
                    reasons.append(f"{metric_name}增长率低于{self.RISK_THRESHOLDS['growth_rate_negative']}%")
        
        return "；".join(reasons) if reasons else "触及风险阈值"
    
    def _get_opportunity_reason(self, data_summary: Dict[str, Any]) -> str:
        """获取机会卡片生成原因"""
        reasons = []
        
        metrics_stats = data_summary.get("metrics_stats", {})
        for metric_name, stats in metrics_stats.items():
            if "growth_rate" in stats:
                growth_rate = stats["growth_rate"]
                if growth_rate > self.RISK_THRESHOLDS["growth_rate_positive"]:
                    reasons.append(f"{metric_name}增长率高于{self.RISK_THRESHOLDS['growth_rate_positive']}%")
        
        return "；".join(reasons) if reasons else "发现机会"
    
    def _get_action_reason(self, user_query: str, data_summary: Dict[str, Any]) -> str:
        """获取行动卡片生成原因"""
        if self._check_user_request(user_query):
            return "用户查询要求建议"
        
        if self._check_risk_thresholds(data_summary):
            return "识别出明确风险，需要行动建议"
        
        if self._check_opportunity(data_summary):
            return "识别出机会，需要行动建议"
        
        return "需要行动建议"


# 示例使用
if __name__ == "__main__":
    # 示例1：分类卡片生成需求（风险场景）
    print("=== 示例1：分类卡片生成需求（风险场景） ===")
    
    agent = CardClassifierAgent()
    
    data_summary = {
        "metrics_stats": {
            "profit": {
                "total": 1000000,
                "mean": 100000,
                "growth_rate": -15.0
            },
            "sales": {
                "total": 2000000,
                "mean": 200000,
                "growth_rate": -12.0
            }
        },
        "total_rows": 10
    }
    
    user_query = "分析上个月销售趋势"
    
    result = agent.classify_cards(data_summary, user_query)
    
    print(f"需要生成的卡片类型: {result['card_types']}")
    print(f"生成原因: {result['reasons']}")
    print(f"优先级: {result['priority']}")
    print()
    
    # 示例2：分类卡片生成需求（机会场景）
    print("=== 示例2：分类卡片生成需求（机会场景） ===")
    
    data_summary_opportunity = {
        "metrics_stats": {
            "profit": {
                "total": 1000000,
                "mean": 100000,
                "growth_rate": 25.0
            }
        },
        "total_rows": 10
    }
    
    user_query_opportunity = "查看销售额增长情况"
    
    result_opportunity = agent.classify_cards(data_summary_opportunity, user_query_opportunity)
    
    print(f"需要生成的卡片类型: {result_opportunity['card_types']}")
    print(f"生成原因: {result_opportunity['reasons']}")
    print(f"优先级: {result_opportunity['priority']}")
    print()
    
    # 示例3：分类卡片生成需求（用户要求建议）
    print("=== 示例3：分类卡片生成需求（用户要求建议） ===")
    
    data_summary_normal = {
        "metrics_stats": {
            "profit": {
                "total": 1000000,
                "mean": 100000,
                "growth_rate": 5.0
            }
        },
        "total_rows": 10
    }
    
    user_query_advice = "如何提升下个月销售额"
    
    result_advice = agent.classify_cards(data_summary_normal, user_query_advice)
    
    print(f"需要生成的卡片类型: {result_advice['card_types']}")
    print(f"生成原因: {result_advice['reasons']}")
    print(f"优先级: {result_advice['priority']}")
