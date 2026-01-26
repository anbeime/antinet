"""
刑狱司 (Risk Detector)
风险检测专家，基于历史数据和规则，识别潜在风险
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)


class RiskDetectorAgent:
    """刑狱司"""
    
    def __init__(self, genie_api_base_url: str, model_path: str):
        """
        初始化
        
        参数：
            genie_api_base_url: GenieAPIService基础URL
            model_path: 模型路径
        """
        self.genie_api_base_url = genie_api_base_url
        self.model_path = model_path
        self.task_status = "未执行"
        self.log = []
        self.risk_rules = self._load_risk_rules()
    
    async def detect_risks(self, preprocessed_data: Dict, facts: Dict, user_query: str) -> Dict:
        """
        检测风险
        
        参数：
            preprocessed_data: 预处理数据
            facts: 事实卡片
            user_query: 用户查询
        
        返回：
            风险清单
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[刑狱司] 开始风险检测")
            
            # 1. 规则检测
            rule_risks = self._rule_based_detection(preprocessed_data, facts)
            self.log.append(f"[刑狱司] 规则检测完成: {len(rule_risks)}个风险")
            
            # 2. AI检测
            ai_risks = await self._ai_based_detection(preprocessed_data, facts, user_query)
            self.log.append(f"[刑狱司] AI检测完成: {len(ai_risks)}个风险")
            
            # 3. 风险合并
            merged_risks = self._merge_risks(rule_risks, ai_risks)
            self.log.append(f"[刑狱司] 风险合并完成: {len(merged_risks)}个风险")
            
            # 4. 风险分级
            classified_risks = self._classify_risks(merged_risks)
            self.log.append(f"[刑狱司] 风险分级完成: 低{len(classified_risks.get('low', []))} 中{len(classified_risks.get('medium', []))} 高{len(classified_risks.get('high', []))}")
            
            # 构建输出
            result = {
                "risks": classified_risks,
                "statistics": {
                    "total": sum(len(v) for v in classified_risks.values()),
                    "by_level": {k: len(v) for k, v in classified_risks.items()}
                },
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"风险检测完成: {sum(len(v) for v in classified_risks.values())}个风险")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[刑狱司] 检测异常: {str(e)}")
            logger.error(f"风险检测失败: {e}", exc_info=True)
            raise
    
    def _load_risk_rules(self) -> List[Dict]:
        """
        加载风险规则
        
        返回：
            风险规则列表
        """
        try:
            rules = [
                {
                    "id": "rule_001",
                    "name": "数据异常风险",
                    "description": "数据中存在显著异常值",
                    "condition": lambda data, facts: self._check_data_anomalies(data),
                    "severity": "medium"
                },
                {
                    "id": "rule_002",
                    "name": "趋势恶化风险",
                    "description": "业务指标出现下降趋势",
                    "condition": lambda data, facts: self._check_trend_decline(facts),
                    "severity": "high"
                },
                {
                    "id": "rule_003",
                    "name": "数据缺失风险",
                    "description": "关键数据字段缺失率高",
                    "condition": lambda data, facts: self._check_data_missing(data),
                    "severity": "low"
                },
                {
                    "id": "rule_004",
                    "name": "重复数据风险",
                    "description": "数据中存在大量重复记录",
                    "condition": lambda data, facts: self._check_data_duplicates(data),
                    "severity": "low"
                }
            ]
            
            return rules
        
        except Exception as e:
            logger.error(f"加载风险规则失败: {e}", exc_info=True)
            return []
    
    def _rule_based_detection(self, preprocessed_data: Dict, facts: Dict) -> List[Dict]:
        """
        基于规则的风险检测
        
        参数：
            preprocessed_data: 预处理数据
            facts: 事实卡片
        
        返回：
            风险列表
        """
        try:
            risks = []
            
            for rule in self.risk_rules:
                try:
                    # 执行规则检测
                    is_risk = rule["condition"](preprocessed_data, facts)
                    
                    if is_risk:
                        risks.append({
                            "id": rule["id"],
                            "name": rule["name"],
                            "description": rule["description"],
                            "severity": rule["severity"],
                            "source": "规则检测",
                            "detected_at": datetime.now().isoformat(),
                            "details": {}
                        })
                
                except Exception as e:
                    logger.error(f"执行规则{rule['id']}失败: {e}", exc_info=True)
                    continue
            
            return risks
        
        except Exception as e:
            logger.error(f"规则检测失败: {e}", exc_info=True)
            return []
    
    async def _ai_based_detection(self, preprocessed_data: Dict, facts: Dict, user_query: str) -> List[Dict]:
        """
        基于AI的风险检测
        
        参数：
            preprocessed_data: 预处理数据
            facts: 事实卡片
            user_query: 用户查询
        
        返回：
            风险列表
        """
        try:
            # 准备数据摘要
            data_summary = self._prepare_data_summary(preprocessed_data, facts)
            
            # 构建提示词
            prompt = f"""
            你是Antinet系统的刑狱司，负责从数据中检测潜在风险。
            
            用户查询：{user_query}
            
            数据摘要：
            {data_summary}
            
            请检测潜在风险，包括：
            1. 数据质量风险（缺失、异常、重复）
            2. 业务趋势风险（下降、恶化、异常波动）
            3. 合规风险（违反规则、超出阈值）
            4. 操作风险（流程问题、执行错误）
            
            输出格式（JSON）：
            {{
                "risks": [
                    {{
                        "name": "风险名称",
                        "description": "风险描述",
                        "severity": "low/medium/high",
                        "evidence": "风险证据",
                        "suggestion": "处理建议"
                    }}
                ]
            }}
            """
            
            # 调用NPU模型
            response = await self._call_genie_api(prompt)
            result = self._parse_json_response(response)
            
            # 转换格式
            risks = []
            for i, risk in enumerate(result.get("risks", [])):
                risks.append({
                    "id": f"ai_risk_{i}",
                    "name": risk.get("name", ""),
                    "description": risk.get("description", ""),
                    "severity": risk.get("severity", "medium"),
                    "source": "AI检测",
                    "detected_at": datetime.now().isoformat(),
                    "details": {
                        "evidence": risk.get("evidence", ""),
                        "suggestion": risk.get("suggestion", "")
                    }
                })
            
            return risks
        
        except Exception as e:
            logger.error(f"AI检测失败: {e}", exc_info=True)
            return []
    
    def _merge_risks(self, rule_risks: List[Dict], ai_risks: List[Dict]) -> List[Dict]:
        """
        合并风险
        
        参数：
            rule_risks: 规则检测结果
            ai_risks: AI检测结果
        
        返回：
            合并后风险列表
        """
        try:
            merged = rule_risks + ai_risks
            
            # 去重（基于名称）
            seen = set()
            unique_risks = []
            for risk in merged:
                if risk["name"] not in seen:
                    seen.add(risk["name"])
                    unique_risks.append(risk)
            
            return unique_risks
        
        except Exception as e:
            logger.error(f"合并风险失败: {e}", exc_info=True)
            return merged
    
    def _classify_risks(self, risks: List[Dict]) -> Dict:
        """
        分级风险
        
        参数：
            risks: 风险列表
        
        返回：
            分级后风险字典
        """
        try:
            classified = {
                "low": [],
                "medium": [],
                "high": []
            }
            
            for risk in risks:
                severity = risk.get("severity", "medium").lower()
                if severity in classified:
                    classified[severity].append(risk)
                else:
                    classified["medium"].append(risk)
            
            return classified
        
        except Exception as e:
            logger.error(f"分级风险失败: {e}", exc_info=True)
            return {"low": [], "medium": [], "high": []}
    
    def _check_data_anomalies(self, preprocessed_data: Dict) -> bool:
        """
        检查数据异常
        
        参数：
            preprocessed_data: 预处理数据
        
        返回：
            是否存在异常
        """
        try:
            quality_report = preprocessed_data.get("quality_report", {})
            accuracy = quality_report.get("accuracy", 1.0)
            
            return accuracy < 0.95
        
        except Exception as e:
            logger.error(f"检查数据异常失败: {e}", exc_info=True)
            return False
    
    def _check_trend_decline(self, facts: Dict) -> bool:
        """
        检查趋势恶化
        
        参数：
            facts: 事实卡片
        
        返回：
            是否存在恶化趋势
        """
        try:
            red_facts = facts.get("red", [])
            yellow_facts = facts.get("yellow", [])
            
            return len(red_facts) > 0 or len(yellow_facts) > 0
        
        except Exception as e:
            logger.error(f"检查趋势恶化失败: {e}", exc_info=True)
            return False
    
    def _check_data_missing(self, preprocessed_data: Dict) -> bool:
        """
        检查数据缺失
        
        参数：
            preprocessed_data: 预处理数据
        
        返回：
            是否存在数据缺失
        """
        try:
            quality_report = preprocessed_data.get("quality_report", {})
            completeness = quality_report.get("completeness", 1.0)
            
            return completeness < 0.90
        
        except Exception as e:
            logger.error(f"检查数据缺失失败: {e}", exc_info=True)
            return False
    
    def _check_data_duplicates(self, preprocessed_data: Dict) -> bool:
        """
        检查数据重复
        
        参数：
            preprocessed_data: 预处理数据
        
        返回：
            是否存在数据重复
        """
        try:
            quality_report = preprocessed_data.get("quality_report", {})
            cleaning_ratio = quality_report.get("cleaning_ratio", 1.0)
            
            return cleaning_ratio < 0.95
        
        except Exception as e:
            logger.error(f"检查数据重复失败: {e}", exc_info=True)
            return False
    
    def _prepare_data_summary(self, preprocessed_data: Dict, facts: Dict) -> str:
        """
        准备数据摘要
        
        参数：
            preprocessed_data: 预处理数据
            facts: 事实卡片
        
        返回：
            数据摘要文本
        """
        try:
            data = preprocessed_data.get("preprocessed_data", {})
            quality_report = preprocessed_data.get("quality_report", {})
            
            summary = f"""
            数据规模：{len(data.get('data', []))}条记录
            数据质量：完整性{quality_report.get('completeness', 1.0)} 准确性{quality_report.get('accuracy', 1.0)}
            事实统计：总计{sum(len(v) for v in facts.values())}个（蓝{len(facts.get('blue', []))} 绿{len(facts.get('green', []))} 黄{len(facts.get('yellow', []))} 红{len(facts.get('red', []))}）
            """
            
            return summary
        
        except Exception as e:
            logger.error(f"准备数据摘要失败: {e}", exc_info=True)
            return ""
    
    async def _call_genie_api(self, prompt: str) -> str:
        """
        调用GenieAPIService进行NPU推理
        
        参数：
            prompt: 提示词
        
        返回：
            推理结果
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.genie_api_base_url}/generate",
                    json={
                        "model": self.model_path,
                        "prompt": prompt,
                        "max_tokens": 2000,
                        "temperature": 0.7
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result.get("text", "")
        
        except Exception as e:
            logger.error(f"调用GenieAPIService失败: {e}", exc_info=True)
            raise
    
    def _parse_json_response(self, response: str) -> Dict:
        """
        解析JSON响应
        
        参数：
            response: 响应文本
        
        返回：
            解析后的JSON
        """
        try:
            # 提取JSON部分（可能包含markdown代码块）
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            return json.loads(response)
        
        except Exception as e:
            logger.error(f"解析JSON响应失败: {e}", exc_info=True)
            raise
