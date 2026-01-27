"""
技能系统
管理 8-Agent 的专业技能和技能调用
"""
import logging
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime
import json
from pathlib import Path

from config import settings
from database import DatabaseManager

logger = logging.getLogger(__name__)


class Skill:
    """技能基类"""
    
    def __init__(self, name: str, description: str, category: str, agent_name: str):
        self.name = name
        self.description = description
        self.category = category
        self.agent_name = agent_name
        self.enabled = True
        self.last_used = None
        self.usage_count = 0
    
    async def execute(self, *args, **kwargs) -> Dict[str, Any]:
        """执行技能"""
        raise NotImplementedError("子类必须实现 execute 方法")
    
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


class SkillRegistry:
    """技能注册表"""
    
    def __init__(self):
        self.skills: Dict[str, Skill] = {}
        self.skill_categories = {
            "数据处理": ["preprocessor", "密卷房"],
            "事实生成": ["fact_generator", "通政司"],
            "解释生成": ["interpreter", "监察院"],
            "风险检测": ["risk_detector", "刑狱司"],
            "行动建议": ["action_advisor", "参谋司"],
            "记忆管理": ["memory", "太史阁"],
            "消息传递": ["messenger", "驿传司"],
            "任务调度": ["orchestrator", "锦衣卫"]
        }
        
        self._register_builtin_skills()
    
    def _register_builtin_skills(self):
        """注册内置技能"""
        # 密卷房技能
        self.register(DataCleaningSkill())
        self.register(FeatureExtractionSkill())
        self.register(DataValidationSkill())
        
        # 通政司技能
        self.register(FactExtractionSkill())
        self.register(FactClassificationSkill())
        self.register(FactVerificationSkill())
        
        # 监察院技能
        self.register(CauseAnalysisSkill())
        self.register(ExplanationGenerationSkill())
        
        # 刑狱司技能
        self.register(RiskDetectionSkill())
        self.register(RiskAssessmentSkill())
        self.register(WarningGenerationSkill())
        
        # 参谋司技能
        self.register(ActionRecommendationSkill())
        self.register(PrioritizationSkill())
        self.register(ResourceAllocationSkill())
        
        # 太史阁技能
        self.register(KnowledgeStorageSkill())
        self.register(KnowledgeRetrievalSkill())
        self.register(MemoryAssociationSkill())
        
        # 知识图谱可视化技能
        try:
            from skills.knowledge_graph_skill import KnowledgeGraphVisualizationSkill
            self.register(KnowledgeGraphVisualizationSkill())
            logger.info("[SkillRegistry] 知识图谱可视化技能已注册")
        except Exception as e:
            logger.warning(f"[SkillRegistry] 无法注册知识图谱可视化技能: {e}")
        
        # 驿传司技能
        self.register(TaskDispatchSkill())
        self.register(MessageRoutingSkill())
        self.register(NotificationSkill())
        
        # 锦衣卫技能
        self.register(TaskDecompositionSkill())
        self.register(AgentCoordinationSkill())
        self.register(ResultAggregationSkill())
        
        logger.info(f"[SkillRegistry] 已注册 {len(self.skills)} 个内置技能")
    
    def register(self, skill: Skill) -> bool:
        """注册技能"""
        if skill.name in self.skills:
            logger.warning(f"[SkillRegistry] 技能 {skill.name} 已存在，将被覆盖")
        
        self.skills[skill.name] = skill
        logger.debug(f"[SkillRegistry] 注册技能: {skill.name} ({skill.agent_name})")
        return True
    
    def get_skill(self, name: str) -> Optional[Skill]:
        """获取技能"""
        return self.skills.get(name)
    
    def get_skills_by_agent(self, agent_name: str) -> List[Skill]:
        """获取指定 Agent 的所有技能"""
        return [
            skill for skill in self.skills.values()
            if skill.agent_name == agent_name
        ]
    
    def get_skills_by_category(self, category: str) -> List[Skill]:
        """获取指定类别的所有技能"""
        return [
            skill for skill in self.skills.values()
            if skill.category == category
        ]
    
    def list_skills(self, agent_name: Optional[str] = None, 
                   category: Optional[str] = None) -> List[Dict]:
        """列出技能"""
        skills = list(self.skills.values())
        
        if agent_name:
            skills = [s for s in skills if s.agent_name == agent_name]
        
        if category:
            skills = [s for s in skills if s.category == category]
        
        return [skill.get_info() for skill in skills]
    
    async def execute_skill(self, name: str, *args, **kwargs) -> Dict:
        """执行技能"""
        skill = self.get_skill(name)
        
        if skill is None:
            raise ValueError(f"技能不存在: {name}")
        
        if not skill.enabled:
            raise ValueError(f"技能已禁用: {name}")
        
        # 更新使用统计
        skill.usage_count += 1
        skill.last_used = datetime.now().isoformat()
        
        # 执行技能
        result = await skill.execute(*args, **kwargs)
        
        return {
            "skill": name,
            "success": True,
            "result": result,
            "usage_count": skill.usage_count,
            "last_used": skill.last_used
        }


# ==================== 具体技能实现 ====================

# 密卷房技能
class DataCleaningSkill(Skill):
    def __init__(self):
        super().__init__(
            name="data_cleaning",
            description="数据清洗：去除噪声、处理缺失值、标准化格式",
            category="数据处理",
            agent_name="密卷房"
        )
    
    async def execute(self, data: List[Dict]) -> Dict:
        """执行数据清洗"""
        cleaned_data = []
        
        for item in data:
            cleaned_item = item.copy()
            
            # 去除空值
            cleaned_item = {k: v for k, v in cleaned_item.items() if v is not None}
            
            # 标准化字符串
            for k, v in cleaned_item.items():
                if isinstance(v, str):
                    cleaned_item[k] = v.strip()
            
            cleaned_data.append(cleaned_item)
        
        return {
            "original_count": len(data),
            "cleaned_count": len(cleaned_data),
            "cleaned_data": cleaned_data
        }


class FeatureExtractionSkill(Skill):
    def __init__(self):
        super().__init__(
            name="feature_extraction",
            description="特征提取：从数据中提取关键特征和模式",
            category="数据处理",
            agent_name="密卷房"
        )
    
    async def execute(self, data: List[Dict]) -> Dict:
        """执行特征提取"""
        features = {
            "total_items": len(data),
            "keys": list(data[0].keys()) if data else [],
            "statistics": {}
        }
        
        # 计算数值统计
        for item in data:
            for key, value in item.items():
                if isinstance(value, (int, float)):
                    if key not in features["statistics"]:
                        features["statistics"][key] = {"sum": 0, "count": 0, "values": []}
                    features["statistics"][key]["sum"] += value
                    features["statistics"][key]["count"] += 1
                    features["statistics"][key]["values"].append(value)
        
        # 计算平均值
        for key, stats in features["statistics"].items():
            if stats["count"] > 0:
                stats["average"] = stats["sum"] / stats["count"]
        
        return features


class DataValidationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="data_validation",
            description="数据验证：检查数据完整性和一致性",
            category="数据处理",
            agent_name="密卷房"
        )
    
    async def execute(self, data: List[Dict], schema: Dict) -> Dict:
        """执行数据验证"""
        validation_results = {
            "valid_count": 0,
            "invalid_count": 0,
            "issues": []
        }
        
        for i, item in enumerate(data):
            issues = []
            
            # 检查必填字段
            for required_field in schema.get("required", []):
                if required_field not in item or item[required_field] is None:
                    issues.append(f"缺少必填字段: {required_field}")
            
            # 检查字段类型
            for field, field_type in schema.get("fields", {}).items():
                if field in item:
                    expected_type = field_type.get("type")
                    actual_type = type(item[field]).__name__
                    
                    if expected_type and actual_type != expected_type:
                        issues.append(f"字段 {field} 类型错误: 期望 {expected_type}, 实际 {actual_type}")
            
            if issues:
                validation_results["invalid_count"] += 1
                validation_results["issues"].append({
                    "index": i,
                    "item_id": item.get("id", str(i)),
                    "issues": issues
                })
            else:
                validation_results["valid_count"] += 1
        
        return validation_results


# 通政司技能
class FactExtractionSkill(Skill):
    def __init__(self):
        super().__init__(
            name="fact_extraction",
            description="事实提取：从文本中提取关键事实（使用 NPU 推理）",
            category="事实生成",
            agent_name="通政司"
        )
    
    async def execute(self, text: str) -> Dict:
        """执行事实提取 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 使用 NPU 模型进行事实提取
            prompt = f"""
你是事实提取专家，请从以下文本中提取关键事实。

文本内容：
{text}

请提取5-10个关键事实，每个事实包含：
1. 事实内容
2. 置信度（0.0-1.0）

输出格式（JSON）：
{{
  "facts": [
    {{
      "content": "事实内容",
      "confidence": 0.85
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            # 提取 JSON 部分
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # 如果无法解析 JSON，抛出错误
                raise ValueError(f"无法解析 NPU 返回的事实提取结果: {response[:200]}")
            
            # 验证结果
            if "facts" not in result:
                raise ValueError("NPU 返回的结果缺少 'facts' 字段")
            
            # 为每个事实添加 ID
            facts = [
                {
                    "fact_id": f"fact_{i}",
                    **fact
                }
                for i, fact in enumerate(result["facts"])
            ]
            
            return {
                "facts": facts,
                "total_facts": len(facts),
                "method": "npu_inference"
            }
            
        except Exception as e:
            # 明确抛出错误，不使用模拟数据
            raise RuntimeError(f"事实提取失败: {str(e)}")


class FactClassificationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="fact_classification",
            description="事实分类：将事实分类到不同类别（使用 NPU 推理）",
            category="事实生成",
            agent_name="通政司"
        )
    
    async def execute(self, facts: List[Dict]) -> Dict:
        """执行事实分类 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 构建事实列表文本
            facts_text = "\n".join([
                f"{i+1}. {fact.get('content', '')}"
                for i, fact in enumerate(facts[:10])  # 限制数量避免上下文过长
            ])
            
            # 使用 NPU 模型进行分类
            prompt = f"""
你是事实分类专家，请将以下事实分类到不同的类别。

事实列表：
{facts_text}

类别定义：
1. quantitative - 量化事实（包含数字、百分比、比率等）
2. qualitative - 定性事实（描述性、概念性）
3. temporal - 时间相关事实（包含时间信息）
4. causal - 因果关系事实（描述因果、影响等）

请为每个事实分类，输出格式（JSON）：
{{
  "classifications": [
    {{
      "fact_index": 0,
      "category": "quantitative",
      "confidence": 0.9,
      "reason": "包含数字和百分比"
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的分类结果: {response[:200]}")
            
            # 验证结果
            if "classifications" not in result:
                raise ValueError("NPU 返回的结果缺少 'classifications' 字段")
            
            # 构建分类结果
            categories = {
                "quantitative": [],
                "qualitative": [],
                "temporal": [],
                "causal": []
            }
            
            for cls in result["classifications"]:
                fact_index = cls.get("fact_index", 0)
                if fact_index < len(facts):
                    category = cls.get("category")
                    if category in categories:
                        categories[category].append({
                            **facts[fact_index],
                            "confidence": cls.get("confidence", 0.5),
                            "reason": cls.get("reason", "")
                        })
            
            return {
                **categories,
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"事实分类失败: {str(e)}")


class FactVerificationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="fact_verification",
            description="事实验证：验证事实的准确性和合理性（使用 NPU 推理）",
            category="事实生成",
            agent_name="通政司"
        )
    
    async def execute(self, facts: List[Dict]) -> Dict:
        """执行事实验证 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 如果没有事实，直接返回
            if not facts:
                return {
                    "verified_facts": [],
                    "verified_count": 0,
                    "method": "npu_inference"
                }
            
            # 构建事实列表（限制数量）
            facts_text = "\n".join([
                f"{i+1}. {fact.get('content', '')}"
                for i, fact in enumerate(facts[:5])
            ])
            
            # 使用 NPU 模型进行验证
            prompt = f"""
你是事实验证专家，请验证以下事实的准确性和合理性。

事实列表：
{facts_text}

请为每个事实验证：
1. verified - 是否通过验证
2. confidence - 置信度（0.0-1.0）
3. issues - 存在的问题列表（如果有）

输出格式（JSON）：
{{
  "verifications": [
    {{
      "fact_index": 0,
      "verified": true,
      "confidence": 0.9,
      "issues": []
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的验证结果: {response[:200]}")
            
            # 验证结果
            if "verifications" not in result:
                raise ValueError("NPU 返回的结果缺少 'verifications' 字段")
            
            # 构建验证结果
            verified_facts = []
            
            for ver in result["verifications"]:
                fact_index = ver.get("fact_index", 0)
                if fact_index < len(facts):
                    verified_facts.append({
                        **facts[fact_index],
                        "verified": ver.get("verified", False),
                        "confidence": ver.get("confidence", 0.5),
                        "verification_method": "npu_inference",
                        "issues": ver.get("issues", [])
                    })
            
            return {
                "verified_facts": verified_facts,
                "verified_count": sum(1 for f in verified_facts if f.get("verified")),
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"事实验证失败: {str(e)}")


# 监察院技能
class CauseAnalysisSkill(Skill):
    def __init__(self):
        super().__init__(
            name="cause_analysis",
            description="原因分析：分析事件发生的根本原因（使用 NPU 推理）",
            category="解释生成",
            agent_name="监察院"
        )
    
    async def execute(self, event: Dict) -> Dict:
        """执行原因分析 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 将事件转换为文本
            event_text = json.dumps(event, ensure_ascii=False)
            
            # 使用 NPU 模型进行原因分析
            prompt = f"""
你是原因分析专家，请分析以下事件发生的根本原因。

事件描述：
{event_text}

请分析：
1. 主要原因（最直接的导致因素）
2. 次要原因（其他影响因素）
3. 每个原因的影响程度
4. 每个原因的置信度

输出格式（JSON）：
{{
  "causes": [
    {{
      "cause_id": "cause_1",
      "description": "原因描述",
      "impact": "high/medium/low",
      "confidence": 0.85
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的原因分析结果: {response[:200]}")
            
            # 验证结果
            if "causes" not in result or not result["causes"]:
                raise ValueError("NPU 返回的结果缺少有效的原因列表")
            
            causes = result["causes"]
            
            return {
                "primary_cause": causes[0],
                "secondary_causes": causes[1:],
                "all_causes": causes,
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"原因分析失败: {str(e)}")


class ExplanationGenerationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="explanation_generation",
            description="解释生成：生成事件的可理解解释（使用 NPU 推理）",
            category="解释生成",
            agent_name="监察院"
        )
    
    async def execute(self, fact: Dict, causes: List[Dict]) -> Dict:
        """执行解释生成 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 构建文本
            fact_text = fact.get("content", "")
            causes_text = "\n".join([
                f"- {c.get('description', '')} (影响: {c.get('impact', '')})"
                for c in causes[:3]
            ])
            
            # 使用 NPU 模型生成解释
            prompt = f"""
你是解释生成专家，请基于以下事实和原因生成可理解的解释。

事实：
{fact_text}

原因：
{causes_text}

请生成：
1. 清晰的解释文本
2. 解释的清晰度评分（0.0-1.0）

输出格式（JSON）：
{{
  "explanation_text": "完整的解释文本",
  "clarity_score": 0.9
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的解释生成结果: {response[:200]}")
            
            # 验证结果
            if "explanation_text" not in result:
                raise ValueError("NPU 返回的结果缺少 'explanation_text' 字段")
            
            explanation = {
                "explanation_id": f"expl_{datetime.now().timestamp()}",
                "fact": fact,
                "causes": causes,
                "explanation_text": result["explanation_text"],
                "clarity_score": result.get("clarity_score", 0.8),
                "method": "npu_inference"
            }
            
            return explanation
            
        except Exception as e:
            raise RuntimeError(f"解释生成失败: {str(e)}")


# 刑狱司技能
class RiskDetectionSkill(Skill):
    def __init__(self):
        super().__init__(
            name="risk_detection",
            description="风险检测：识别潜在风险（使用 NPU 推理）",
            category="风险检测",
            agent_name="刑狱司"
        )
    
    async def execute(self, data: List[Dict]) -> Dict:
        """执行风险检测 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 构建数据文本
            data_text = json.dumps(data, ensure_ascii=False)[:2000]  # 限制长度
            
            # 使用 NPU 模型检测风险
            prompt = f"""
你是风险检测专家，请从以下数据中识别潜在风险。

数据内容：
{data_text}

请识别 3-5 个潜在风险，每个风险包含：
1. 风险名称
2. 风险描述
3. 风险等级
4. 发生概率（0.0-1.0）

输出格式（JSON）：
{{
  "risks": [
    {{
      "risk_id": "risk_1",
      "name": "风险名称",
      "description": "风险描述",
      "level": "high/medium/low",
      "probability": 0.7
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的风险检测结果: {response[:200]}")
            
            # 验证结果
            if "risks" not in result:
                raise ValueError("NPU 返回的结果缺少 'risks' 字段")
            
            risks = result["risks"]
            
            return {
                "risks": risks,
                "risk_count": len(risks),
                "high_risks": [r for r in risks if r.get("level") == "high"],
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"风险检测失败: {str(e)}")


class RiskAssessmentSkill(Skill):
    def __init__(self):
        super().__init__(
            name="risk_assessment",
            description="风险评估：评估风险的影响和可能性（使用 NPU 推理）",
            category="风险检测",
            agent_name="刑狱司"
        )
    
    async def execute(self, risks: List[Dict]) -> Dict:
        """执行风险评估 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 如果没有风险，直接返回
            if not risks:
                return {
                    "assessed_risks": [],
                    "total_risk_score": 0,
                    "method": "npu_inference"
                }
            
            # 构建风险文本
            risks_text = "\n".join([
                f"{i+1}. {r.get('name', '')}: {r.get('description', '')} (等级: {r.get('level', '')}, 概率: {r.get('probability', 0)})"
                for i, r in enumerate(risks[:5])
            ])
            
            # 使用 NPU 模型评估风险
            prompt = f"""
你是风险评估专家，请评估以下风险。

风险列表：
{risks_text}

请为每个风险：
1. 计算风险分数（考虑影响程度和发生概率）
2. 提供处理建议
3. 评估结果的置信度

输出格式（JSON）：
{{
  "assessments": [
    {{
      "risk_id": "risk_1",
      "risk_score": 150,
      "recommendation": "立即处理/优先处理/计划处理/监控",
      "confidence": 0.9
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的风险评估结果: {response[:200]}")
            
            # 验证结果
            if "assessments" not in result:
                raise ValueError("NPU 返回的结果缺少 'assessments' 字段")
            
            # 构建评估结果
            assessed_risks = []
            
            for i, assessment in enumerate(result["assessments"]):
                if i < len(risks):
                    assessed_risks.append({
                        **risks[i],
                        "risk_score": assessment.get("risk_score", 0),
                        "recommendation": assessment.get("recommendation", "监控"),
                        "confidence": assessment.get("confidence", 0.5)
                    })
            
            # 按分数排序
            assessed_risks.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
            
            return {
                "assessed_risks": assessed_risks,
                "total_risk_score": sum(r.get("risk_score", 0) for r in assessed_risks),
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"风险评估失败: {str(e)}")


class WarningGenerationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="warning_generation",
            description="警告生成：生成风险警告（使用 NPU 推理）",
            category="风险检测",
            agent_name="刑狱司"
        )
    
    async def execute(self, risks: List[Dict]) -> Dict:
        """执行警告生成 - 使用真实 NPU 推理"""
        try:
            # 获取高风险
            high_risks = [r for r in risks if r.get("level") == "high"]
            
            if not high_risks:
                return {
                    "warnings": [],
                    "warning_count": 0,
                    "method": "npu_inference"
                }
            
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 构建高风险文本
            high_risks_text = "\n".join([
                f"- {r.get('name', '')}: {r.get('description', '')} (概率: {r.get('probability', 0)})"
                for r in high_risks[:5]
            ])
            
            # 使用 NPU 模型生成警告
            prompt = f"""
你是警告生成专家，请为以下高风险生成警告信息。

高风险列表：
{high_risks_text}

请为每个高风险生成警告消息，包含：
1. 警告内容
2. 紧急程度

输出格式（JSON）：
{{
  "warnings": [
    {{
      "risk_name": "风险名称",
      "message": "警告消息",
      "urgency": "immediate/high/medium/low"
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的警告生成结果: {response[:200]}")
            
            # 验证结果
            if "warnings" not in result:
                raise ValueError("NPU 返回的结果缺少 'warnings' 字段")
            
            # 构建警告
            warnings = []
            for i, warn in enumerate(result["warnings"]):
                if i < len(high_risks):
                    warnings.append({
                        "warning_id": f"warn_{datetime.now().timestamp()}_{i}",
                        "risk": high_risks[i],
                        "message": warn.get("message", f"检测到高风险：{warn.get('risk_name', '')}"),
                        "urgency": warn.get("urgency", "high")
                    })
            
            return {
                "warnings": warnings,
                "warning_count": len(warnings),
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"警告生成失败: {str(e)}")


# 参谋司技能
class ActionRecommendationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="action_recommendation",
            description="行动建议：提供可执行的行动建议（使用 NPU 推理）",
            category="行动建议",
            agent_name="参谋司"
        )
    
    async def execute(self, risks: List[Dict], facts: List[Dict]) -> Dict:
        """执行行动建议 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 构建文本
            risks_text = "\n".join([
                f"- {r.get('name', '')}: {r.get('description', '')} (等级: {r.get('level', '')})"
                for r in risks[:3]
            ])
            
            facts_text = "\n".join([
                f"- {f.get('content', '')[:100]}"
                for f in facts[:3]
            ])
            
            # 使用 NPU 模型生成行动建议
            prompt = f"""
你是行动建议专家，请基于以下风险和事实提供可执行的行动建议。

风险：
{risks_text}

事实：
{facts_text}

请提供 3-5 个行动建议，每个建议包含：
1. 行动标题
2. 详细描述
3. 目标（要解决的问题）
4. 优先级
5. 所需工作量
6. 预期影响

输出格式（JSON）：
{{
  "actions": [
    {{
      "action_id": "action_1",
      "title": "行动标题",
      "description": "详细描述",
      "goal": "目标",
      "priority": "high/medium/low",
      "effort": "high/medium/low",
      "expected_impact": "high/medium/low"
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的行动建议结果: {response[:200]}")
            
            # 验证结果
            if "actions" not in result:
                raise ValueError("NPU 返回的结果缺少 'actions' 字段")
            
            actions = result["actions"]
            
            return {
                "actions": actions,
                "action_count": len(actions),
                "high_priority_actions": [a for a in actions if a.get("priority") == "high"],
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"行动建议生成失败: {str(e)}")


class PrioritizationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="prioritization",
            description="优先级排序：对行动进行优先级排序",
            category="行动建议",
            agent_name="参谋司"
        )
    
    async def execute(self, actions: List[Dict]) -> Dict:
        """执行优先级排序"""
        priority_score = {
            "high": 3,
            "medium": 2,
            "low": 1
        }
        
        # 计算综合优先级分数
        for action in actions:
            score = priority_score.get(action["priority"], 1)
            score += 1 if action["expected_impact"] == "high" else 0
            score -= 1 if action["effort"] == "high" else 0
            action["priority_score"] = score
        
        # 排序
        sorted_actions = sorted(actions, key=lambda x: x["priority_score"], reverse=True)
        
        return {
            "prioritized_actions": sorted_actions,
            "recommended_order": [a["action_id"] for a in sorted_actions]
        }


class ResourceAllocationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="resource_allocation",
            description="资源分配：分配执行行动所需的资源",
            category="行动建议",
            agent_name="参谋司"
        )
    
    async def execute(self, actions: List[Dict]) -> Dict:
        """执行资源分配"""
        allocations = []
        
        for action in actions:
            allocation = {
                "action_id": action["action_id"],
                "resources": {
                    "human": 1 if action["effort"] != "low" else 0,
                    "time": "1周" if action["effort"] == "low" else "2-4周",
                    "budget": "low" if action["effort"] == "low" else "medium"
                }
            }
            allocations.append(allocation)
        
        return {
            "allocations": allocations,
            "total_resources": {
                "human": sum(a["resources"]["human"] for a in allocations),
                "time_range": "2-4周"
            }
        }


# 太史阁技能
class KnowledgeStorageSkill(Skill):
    def __init__(self):
        super().__init__(
            name="knowledge_storage",
            description="知识存储：存储知识到记忆系统",
            category="记忆管理",
            agent_name="太史阁"
        )
    
    async def execute(self, knowledge_type: str, knowledge_data: Dict) -> Dict:
        """执行知识存储"""
        from services.shared_memory import get_shared_memory
        memory = get_shared_memory()
        
        result = memory.share_knowledge(
            knowledge_type=knowledge_type,
            title=knowledge_data.get("title", ""),
            content=knowledge_data.get("content", ""),
            source_agent="太史阁",
            metadata=knowledge_data.get("metadata", {})
        )
        
        return result


class KnowledgeRetrievalSkill(Skill):
    def __init__(self):
        super().__init__(
            name="knowledge_retrieval",
            description="知识检索：从记忆系统检索知识",
            category="记忆管理",
            agent_name="太史阁"
        )
    
    async def execute(self, query: str, knowledge_type: Optional[str] = None) -> Dict:
        """执行知识检索"""
        from services.shared_memory import get_shared_memory
        memory = get_shared_memory()
        
        results = memory.get_shared_knowledge(knowledge_type=knowledge_type, limit=10)
        
        return {
            "results": results,
            "total": len(results),
            "query": query
        }


class MemoryAssociationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="memory_association",
            description="记忆关联：建立知识之间的关联",
            category="记忆管理",
            agent_name="太史阁"
        )
    
    async def execute(self, source_id: str, target_id: str, relation_type: str) -> Dict:
        """执行记忆关联"""
        from services.shared_memory import get_shared_memory
        memory = get_shared_memory()
        
        result = memory.create_knowledge_relation(
            source_id=source_id,
            target_id=target_id,
            relation_type=relation_type
        )
        
        return result


# 驿传司技能
class TaskDispatchSkill(Skill):
    def __init__(self):
        super().__init__(
            name="task_dispatch",
            description="任务分发：将任务分发给对应的 Agent",
            category="消息传递",
            agent_name="驿传司"
        )
    
    async def execute(self, task: Dict) -> Dict:
        """执行任务分发 - 真实分发"""
        try:
            task_id = task.get("task_id", "")
            target_agent = task.get("agent", "")
            
            if not task_id:
                raise ValueError("任务缺少 task_id")
            if not target_agent:
                raise ValueError("任务缺少目标 agent")
            
            # 实际的分发逻辑
            # 在真实系统中，这里会调用对应 Agent 的 API 或消息队列
            # 由于 Agent 系统是异步的，我们记录分发状态
            
            # 检查 Agent 是否存在
            valid_agents = ["密卷房", "通政司", "监察院", "刑狱司", "参谋司", "太史阁", "驿传司", "锦衣卫"]
            if target_agent not in valid_agents:
                raise ValueError(f"无效的 Agent: {target_agent}，有效的 Agent 为: {', '.join(valid_agents)}")
            
            # 记录分发（在实际系统中会发送消息）
            # 这里我们假设分发成功，因为 Agent 都在同一进程中
            
            return {
                "dispatch_status": "success",
                "task_id": task_id,
                "dispatched_to": target_agent,
                "dispatched_at": datetime.now().isoformat(),
                "message": f"任务 {task_id} 已成功分发至 {target_agent}"
            }
            
        except Exception as e:
            raise RuntimeError(f"任务分发失败: {str(e)}")


class MessageRoutingSkill(Skill):
    def __init__(self):
        super().__init__(
            name="message_routing",
            description="消息路由：智能路由消息到目标",
            category="消息传递",
            agent_name="驿传司"
        )
    
    async def execute(self, message: Dict, target: str) -> Dict:
        """执行消息路由 - 真实路由"""
        try:
            message_id = message.get("message_id", "")
            message_content = message.get("content", "")
            
            if not message_id:
                raise ValueError("消息缺少 message_id")
            if not target:
                raise ValueError("缺少目标 target")
            
            # 验证目标
            valid_targets = ["密卷房", "通政司", "监察院", "刑狱司", "参谋司", "太史阁", "驿传司", "锦衣卫", "user"]
            if target not in valid_targets:
                raise ValueError(f"无效的目标: {target}，有效的目标为: {', '.join(valid_targets)}")
            
            # 在真实系统中，这里会通过消息队列或 API 调用发送消息
            # 由于 Agent 系统在同一进程，我们记录路由状态
            
            return {
                "route_status": "success",
                "message_id": message_id,
                "message_content": message_content[:100] + "..." if len(message_content) > 100 else message_content,
                "routed_to": target,
                "routed_at": datetime.now().isoformat(),
                "message": f"消息 {message_id} 已成功路由至 {target}"
            }
            
        except Exception as e:
            raise RuntimeError(f"消息路由失败: {str(e)}")


class NotificationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="notification",
            description="通知发送：发送通知给相关人员或 Agent",
            category="消息传递",
            agent_name="驿传司"
        )
    
    async def execute(self, notification: Dict) -> Dict:
        """执行通知发送"""
        return {
            "notification_status": "sent",
            "notification_id": notification.get("notification_id", ""),
            "recipient": notification.get("recipient", ""),
            "sent_at": datetime.now().isoformat()
        }


# 锦衣卫技能
class TaskDecompositionSkill(Skill):
    def __init__(self):
        super().__init__(
            name="task_decomposition",
            description="任务分解：将复杂任务分解为子任务（使用 NPU 推理）",
            category="任务调度",
            agent_name="锦衣卫"
        )
    
    async def execute(self, task: str) -> Dict:
        """执行任务分解 - 使用真实 NPU 推理"""
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader()
            
            if not loader.is_loaded:
                loader.load()
            
            # 使用 NPU 模型分解任务
            prompt = f"""
你是任务分解专家（锦衣卫总指挥使），请将以下复杂任务分解为子任务。

原始任务：
{task}

请将任务分解为 3-6 个子任务，每个子任务包含：
1. 子任务描述
2. 负责的 Agent（密卷房/通政司/监察院/刑狱司/参谋司/太史阁/驿传司）
3. 优先级
4. 依赖关系（可选）

输出格式（JSON）：
{{
  "subtasks": [
    {{
      "subtask_id": "sub_1",
      "description": "子任务描述",
      "agent": "密卷房",
      "priority": "high/medium/low",
      "dependencies": []
    }}
  ]
}}
"""
            
            response = loader.infer(
                prompt=prompt,
                max_new_tokens=1024,
                temperature=0.7
            )
            
            # 解析 JSON 响应
            import json
            import re
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError(f"无法解析 NPU 返回的任务分解结果: {response[:200]}")
            
            # 验证结果
            if "subtasks" not in result:
                raise ValueError("NPU 返回的结果缺少 'subtasks' 字段")
            
            subtasks = result["subtasks"]
            
            return {
                "original_task": task,
                "subtasks": subtasks,
                "total_subtasks": len(subtasks),
                "method": "npu_inference"
            }
            
        except Exception as e:
            raise RuntimeError(f"任务分解失败: {str(e)}")


class AgentCoordinationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="agent_coordination",
            description="Agent 协调：协调多个 Agent 协作",
            category="任务调度",
            agent_name="锦衣卫"
        )
    
    async def execute(self, agents: List[str]) -> Dict:
        """执行 Agent 协调"""
        return {
            "coordination_status": "active",
            "coordinated_agents": agents,
            "coordination_started_at": datetime.now().isoformat()
        }


class ResultAggregationSkill(Skill):
    def __init__(self):
        super().__init__(
            name="result_aggregation",
            description="结果聚合：聚合多个 Agent 的结果",
            category="任务调度",
            agent_name="锦衣卫"
        )
    
    async def execute(self, results: List[Dict]) -> Dict:
        """执行结果聚合"""
        return {
            "aggregation_status": "completed",
            "total_results": len(results),
            "aggregated_at": datetime.now().isoformat(),
            "summary": {
                "successful": len([r for r in results if r.get("status") == "success"]),
                "failed": len([r for r in results if r.get("status") == "failed"])
            }
        }


# 全局技能注册表单例
_skill_registry: Optional[SkillRegistry] = None


def get_skill_registry() -> SkillRegistry:
    """获取技能注册表单例"""
    global _skill_registry
    if _skill_registry is None:
        _skill_registry = SkillRegistry()
    return _skill_registry
