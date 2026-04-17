"""
智能推荐模块 - 参谋司扩展
基于上下文感知、多维推荐和个性化学习
"""
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

logger = logging.getLogger(__name__)


class ContextAwareRecommender:
    """上下文感知推荐器"""
    
    def __init__(self):
        self.current_context = {}
        self.context_history = []
    
    def update_context(self, context: Dict):
        """更新当前上下文"""
        self.current_context = {
            **self.current_context,
            **context,
            "timestamp": datetime.now().isoformat()
        }
        
        self.context_history.append(self.current_context)
        
        # 保持最近50条上下文
        if len(self.context_history) > 50:
            self.context_history = self.context_history[-50:]
    
    def get_context(self) -> Dict:
        """获取当前上下文"""
        return self.current_context
    
    def get_task_type(self) -> str:
        """识别当前任务类型"""
        task_keywords = {
            "writing": ["撰写", "写", "起草", "编辑", "修改"],
            "analysis": ["分析", "评估", "判断", "研究"],
            "decision": ["决策", "决定", "选择", "建议"],
            "meeting": ["会议", "讨论", "汇报"],
            "research": ["调研", "研究", "探索", "发现"]
        }
        
        current_task = self.current_context.get("current_task", "")
        
        for task_type, keywords in task_keywords.items():
            if any(kw in current_task for kw in keywords):
                return task_type
        
        return "unknown"
    
    def predict_information_needs(self) -> List[str]:
        """预测信息需求"""
        task_type = self.get_task_type()
        current_doc = self.current_context.get("current_document", "")
        schedule = self.current_context.get("schedule", [])
        
        needs = []
        
        if task_type == "writing":
            # 撰写文档时，推荐相关背景资料
            if current_doc:
                needs.append("related_background")
                needs.append("reference_documents")
        
        elif task_type == "decision":
            # 决策时，推荐历史类似案例
            needs.append("historical_cases")
            needs.append("risk_analysis")
            needs.append("similar_decisions")
        
        elif task_type == "research":
            # 研究时，推荐跨领域相关概念
            needs.append("cross_domain_concepts")
            needs.append("latest_research")
        
        elif task_type == "meeting":
            # 会议时，推荐议程相关资料
            needs.append("meeting_materials")
            needs.append("previous_discussions")
        
        return needs


class MultiDimRecommender:
    """多维推荐器"""
    
    def __init__(self, knowledge_store=None):
        self.knowledge_store = knowledge_store or {}
        self.recommendation_templates = {
            "completion": self._completion_recommendation,
            "warning": self._warning_recommendation,
            "expansion": self._expansion_recommendation,
            "correlation": self._correlation_recommendation
        }
    
    def recommend(self, recommendation_type: str, context: Dict) -> List[Dict]:
        """多维推荐"""
        if recommendation_type in self.recommendation_templates:
            return self.recommendation_templates[recommendation_type](context)
        return []
    
    def _completion_recommendation(self, context: Dict) -> List[Dict]:
        """补全推荐 - 撰写文档时推荐相关背景资料"""
        current_doc = context.get("current_document", "")
        recommendations = []
        
        if not current_doc:
            return recommendations
        
        # 提取文档关键词
        keywords = self._extract_keywords(current_doc)
        
        # 从知识库检索相关文档
        related_docs = self._search_related_documents(keywords, limit=5)
        
        for doc in related_docs:
            recommendations.append({
                "type": "completion",
                "title": doc.get("title", ""),
                "content": doc.get("content", "")[:200],
                "relevance": doc.get("score", 0.8),
                "reason": f"与当前文档「{current_doc[:20]}...」主题相关"
            })
        
        return recommendations
    
    def _warning_recommendation(self, context: Dict) -> List[Dict]:
        """预警推荐 - 决策时推荐历史类似案例的风险与教训"""
        decision_topic = context.get("decision_topic", "")
        recommendations = []
        
        # 检索相似决策
        historical_cases = self._search_historical_cases(decision_topic, limit=3)
        
        for case in historical_cases:
            recommendations.append({
                "type": "warning",
                "title": case.get("title", ""),
                "risk": case.get("risk", ""),
                "lesson": case.get("lesson", ""),
                "relevance": case.get("score", 0.7),
                "reason": f"与当前决策「{decision_topic[:20]}...」相似，需关注风险"
            })
        
        return recommendations
    
    def _expansion_recommendation(self, context: Dict) -> List[Dict]:
        """拓展推荐 - 研究时推荐跨领域相关概念"""
        research_topic = context.get("research_topic", "")
        recommendations = []
        
        # 检索跨领域概念
        cross_domain = self._search_cross_domain_concepts(research_topic, limit=5)
        
        for concept in cross_domain:
            recommendations.append({
                "type": "expansion",
                "title": concept.get("name", ""),
                "domain": concept.get("domain", ""),
                "description": concept.get("description", ""),
                "relevance": concept.get("score", 0.6),
                "reason": f"跨领域概念「{concept.get('name', '')}」与研究主题相关"
            })
        
        return recommendations
    
    def _correlation_recommendation(self, context: Dict) -> List[Dict]:
        """关联推荐 - 基于知识图谱的关联推荐"""
        entity = context.get("entity", "")
        recommendations = []
        
        # 从知识图谱获取关联实体
        related_entities = self._get_related_entities(entity, limit=5)
        
        for ent in related_entities:
            recommendations.append({
                "type": "correlation",
                "title": ent.get("name", ""),
                "relation": ent.get("relation", ""),
                "entity_type": ent.get("type", ""),
                "relevance": ent.get("score", 0.8),
                "reason": f"与「{entity}」存在「{ent.get('relation', '')}」关系"
            })
        
        return recommendations
    
    def _extract_keywords(self, text: str) -> List[str]:
        """提取关键词"""
        import re
        words = re.findall(r'\b\w{2,}\b', text.lower())
        word_freq = defaultdict(int)
        for word in words:
            word_freq[word] += 1
        
        # 返回频率最高的10个词
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [w[0] for w in sorted_words[:10]]
    
    def _search_related_documents(self, keywords: List[str], limit: int = 5) -> List[Dict]:
        """搜索相关文档"""
        # 简化实现
        return [{"title": "相关文档", "content": "示例内容", "score": 0.8} for _ in range(min(limit, 3))]
    
    def _search_historical_cases(self, topic: str, limit: int = 3) -> List[Dict]:
        """搜索历史案例"""
        return [
            {"title": f"历史案例{i}", "risk": f"风险{i}", "lesson": f"教训{i}", "score": 0.7}
            for i in range(1, min(limit + 1, 4))
        ]
    
    def _search_cross_domain_concepts(self, topic: str, limit: int = 5) -> List[Dict]:
        """搜索跨领域概念"""
        return [
            {"name": f"跨领域概念{i}", "domain": f"领域{i}", "description": "描述", "score": 0.6}
            for i in range(1, min(limit + 1, 6))
        ]
    
    def _get_related_entities(self, entity: str, limit: int = 5) -> List[Dict]:
        """获取关联实体"""
        return [
            {"name": f"关联实体{i}", "relation": "相关", "type": "概念", "score": 0.8}
            for i in range(1, min(limit + 1, 6))
        ]


class PersonalizedLearning:
    """个性化学习器 - 基于用户行为持续优化"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.user_preferences = {}
        self.interaction_history = []
        self.recommendation_scores = defaultdict(float)
    
    def record_interaction(self, interaction: Dict):
        """记录用户交互"""
        interaction_record = {
            "timestamp": datetime.now().isoformat(),
            "interaction_type": interaction.get("type", ""),
            "content_id": interaction.get("content_id", ""),
            "action": interaction.get("action", "")
        }
        
        self.interaction_history.append(interaction_record)
        
        # 更新推荐分数
        content_id = interaction.get("content_id", "")
        action = interaction.get("action", "")
        
        if action == "adopt":
            self.recommendation_scores[content_id] += 1.0
        elif action == "ignore":
            self.recommendation_scores[content_id] -= 0.1
        elif action == "favorite":
            self.recommendation_scores[content_id] += 0.5
        
        logger.info(f"[PersonalizedLearning] 记录交互: {action} - {content_id}")
    
    def get_recommendation_adjustments(self) -> Dict:
        """获取推荐调整参数"""
        if not self.interaction_history:
            return {}
        
        # 分析最近交互
        recent_count = sum(1 for i in self.interaction_history[-10:] 
                         if i["action"] == "adopt")
        
        adoption_rate = recent_count / min(len(self.interaction_history[-10:]), 10)
        
        return {
            "adoption_rate": adoption_rate,
            "top_preferred_types": self._get_preferred_content_types(),
            "adjustment_factor": 1.0 if adoption_rate > 0.5 else 0.8
        }
    
    def _get_preferred_content_types(self) -> List[str]:
        """获取偏好内容类型"""
        type_freq = defaultdict(int)
        
        for interaction in self.interaction_history:
            content_type = interaction.get("content_id", "").split("_")[0]
            type_freq[content_type] += 1
        
        sorted_types = sorted(type_freq.items(), key=lambda x: x[1], reverse=True)
        return [t[0] for t in sorted_types[:3]]
    
    def learn_from_feedback(self, recommendation_id: str, feedback: str):
        """从反馈中学习"""
        if feedback == "positive":
            self.recommendation_scores[recommendation_id] += 0.2
        elif feedback == "negative":
            self.recommendation_scores[recommendation_id] -= 0.1
        
        logger.info(f"[PersonalizedLearning] 学习反馈: {recommendation_id} -> {feedback}")


class ProactiveRecommender:
    """主动推荐器 - 主动推送而非被动响应"""
    
    def __init__(self, context_aware: ContextAwareRecommender,
                 multi_dim: MultiDimRecommender,
                 personalized: PersonalizedLearning):
        self.context_aware = context_aware
        self.multi_dim = multi_dim
        self.personalized = personalized
        self.active_recommendations = []
    
    def generate_proactive_recommendations(self) -> List[Dict]:
        """生成主动推荐"""
        context = self.context_aware.get_context()
        task_type = self.context_aware.get_task_type()
        
        recommendations = []
        
        # 基于任务类型的推荐
        if task_type == "writing":
            recommendations.extend(
                self.multi_dim.recommend("completion", context)
            )
        elif task_type == "decision":
            recommendations.extend(
                self.multi_dim.recommend("warning", context)
            )
        elif task_type == "research":
            recommendations.extend(
                self.multi_dim.recommend("expansion", context)
            )
        
        # 个性化调整
        adjustments = self.personalized.get_recommendation_adjustments()
        
        for rec in recommendations:
            rec["adjustment"] = adjustments.get("adjustment_factor", 1.0)
        
        # 保存活跃推荐
        self.active_recommendations = recommendations
        
        return recommendations
    
    def notify_user(self, recommendation: Dict) -> Dict:
        """通知用户推荐"""
        return {
            "type": "notification",
            "title": recommendation.get("title", "推荐"),
            "content": recommendation.get("reason", ""),
            "action_url": recommendation.get("action_url", ""),
            "priority": recommendation.get("adjustment", 1.0) * recommendation.get("relevance", 0.5)
        }
    
    def get_recommendation_feedback(self, recommendation_id: str, 
                                     user_action: str):
        """获取推荐反馈"""
        self.personalized.record_interaction({
            "type": "recommendation",
            "content_id": recommendation_id,
            "action": user_action
        })
        
        # 基于反馈调整
        if user_action == "adopt":
            return {"message": "已采纳推荐，系统将学习您的偏好"}
        elif user_action == "ignore":
            return {"message": "已忽略，系统将减少此类推荐"}
        elif user_action == "feedback":
            return {"message": "感谢反馈，系统将持续优化"}


class RecommendationEngine:
    """推荐引擎 - 整合所有推荐功能"""
    
    def __init__(self, user_id: str, knowledge_store=None):
        self.user_id = user_id
        
        # 初始化各组件
        self.context_aware = ContextAwareRecommender()
        self.multi_dim = MultiDimRecommender(knowledge_store)
        self.personalized = PersonalizedLearning(user_id)
        self.proactive = ProactiveRecommender(
            self.context_aware,
            self.multi_dim,
            self.personalized
        )
    
    def update_context(self, context: Dict):
        """更新上下文"""
        self.context_aware.update_context(context)
    
    def get_recommendations(self, query: str = None, 
                           recommendation_type: str = "auto") -> List[Dict]:
        """获取推荐"""
        if recommendation_type == "auto":
            # 自动模式 - 主动推荐
            return self.proactive.generate_proactive_recommendations()
        
        elif recommendation_type == "completion":
            return self.multi_dim.recommend("completion", 
                self.context_aware.get_context())
        
        elif recommendation_type == "warning":
            return self.multi_dim.recommend("warning",
                self.context_aware.get_context())
        
        elif recommendation_type == "expansion":
            return self.multi_dim.recommend("expansion",
                self.context_aware.get_context())
        
        elif recommendation_type == "correlation":
            return self.multi_dim.recommend("correlation",
                {"entity": query})
        
        else:
            return []
    
    def record_feedback(self, recommendation_id: str, feedback: str):
        """记录反馈"""
        self.personalized.learn_from_feedback(recommendation_id, feedback)
        self.proactive.get_recommendation_feedback(recommendation_id, feedback)
    
    def get_recommendation_stats(self) -> Dict:
        """获取推荐统计"""
        return {
            "user_id": self.user_id,
            "total_interactions": len(self.personalized.interaction_history),
            "adoption_rate": self.personalized.get_recommendation_adjustments().get("adoption_rate", 0),
            "active_recommendations": len(self.proactive.active_recommendations),
            "top_scores": dict(sorted(
                self.personalized.recommendation_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10])
        }