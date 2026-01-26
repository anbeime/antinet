"""
参谋司 (Action Advisor)
行动建议专家，基于事实、解释和风险，生成可执行的行动建议
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)


class ActionAdvisorAgent:
    """参谋司"""
    
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
    
    async def generate_actions(self, facts: Dict, explanations: Dict, risks: Dict, user_query: str) -> Dict:
        """
        生成行动建议
        
        参数：
            facts: 事实卡片
            explanations: 解释说明
            risks: 风险清单
            user_query: 用户查询
        
        返回：
            行动建议清单
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[参谋司] 开始生成行动建议")
            
            # 1. 优先级排序
            prioritized_items = self._prioritize_items(facts, explanations, risks)
            self.log.append(f"[参谋司] 优先级排序完成: {len(prioritized_items)}个待处理项")
            
            # 2. 建议生成
            actions = await self._generate_actions(prioritized_items, user_query)
            self.log.append(f"[参谋司] 建议生成完成: {len(actions)}个行动建议")
            
            # 3. 建议验证
            verified_actions = self._verify_actions(actions, risks)
            self.log.append(f"[参谋司] 建议验证完成: {len(verified_actions)}个有效建议")
            
            # 4. 建议分组
            grouped_actions = self._group_actions(verified_actions)
            self.log.append(f"[参谋司] 建议分组完成: {len(grouped_actions)}个分组")
            
            # 构建输出
            result = {
                "actions": grouped_actions,
                "statistics": {
                    "total": len(verified_actions),
                    "by_priority": self._count_by_priority(verified_actions),
                    "by_urgency": self._count_by_urgency(verified_actions)
                },
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"行动建议生成完成: {len(verified_actions)}个建议")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[参谋司] 生成异常: {str(e)}")
            logger.error(f"行动建议生成失败: {e}", exc_info=True)
            raise
    
    def _prioritize_items(self, facts: Dict, explanations: Dict, risks: Dict) -> List[Dict]:
        """
        优先级排序
        
        参数：
            facts: 事实卡片
            explanations: 解释说明
            risks: 风险清单
        
        返回：
            排序后的待处理项
        """
        try:
            items = []
            
            # 风险项（高优先级）
            for level, risk_list in risks.items():
                for risk in risk_list:
                    priority = 3 if level == "high" else (2 if level == "medium" else 1)
                    items.append({
                        "type": "risk",
                        "item": risk,
                        "priority": priority,
                        "urgency": "high" if level == "high" else "medium"
                    })
            
            # 红色事实（高优先级）
            for fact in facts.get("red", []):
                items.append({
                    "type": "fact",
                    "item": fact,
                    "priority": 3,
                    "urgency": "high"
                })
            
            # 黄色事实（中优先级）
            for fact in facts.get("yellow", []):
                items.append({
                    "type": "fact",
                    "item": fact,
                    "priority": 2,
                    "urgency": "medium"
                })
            
            # 绿色事实（低优先级）
            for fact in facts.get("green", []):
                items.append({
                    "type": "fact",
                    "item": fact,
                    "priority": 1,
                    "urgency": "low"
                })
            
            # 蓝色事实（最低优先级）
            for fact in facts.get("blue", []):
                items.append({
                    "type": "fact",
                    "item": fact,
                    "priority": 0,
                    "urgency": "low"
                })
            
            # 按优先级排序
            sorted_items = sorted(items, key=lambda x: (x["priority"], x["urgency"]), reverse=True)
            
            return sorted_items
        
        except Exception as e:
            logger.error(f"优先级排序失败: {e}", exc_info=True)
            return []
    
    async def _generate_actions(self, prioritized_items: List[Dict], user_query: str) -> List[Dict]:
        """
        生成建议
        
        参数：
            prioritized_items: 排序后的待处理项
            user_query: 用户查询
        
        返回：
            行动建议列表
        """
        try:
            actions = []
            
            # 为每个高优先级项生成建议
            for item in prioritized_items[:10]:  # 限制最多10个建议
                if item["priority"] >= 2:  # 只处理中高优先级
                    action = await self._generate_single_action(item, user_query)
                    actions.append(action)
            
            return actions
        
        except Exception as e:
            logger.error(f"生成建议失败: {e}", exc_info=True)
            return []
    
    async def _generate_single_action(self, item: Dict, user_query: str) -> Dict:
        """
        生成单个建议
        
        参数：
            item: 待处理项
            user_query: 用户查询
        
        返回：
            行动建议
        """
        try:
            # 准备上下文
            context = self._prepare_action_context(item)
            
            # 构建提示词
            prompt = f"""
            你是Antinet系统的参谋司，负责生成可执行的行动建议。
            
            用户查询：{user_query}
            
            待处理项：
            类型：{item['type']}
            {context}
            
            请生成可执行的行动建议，包括：
            1. 行动目标（期望达成的结果）
            2. 具体步骤（详细的执行步骤）
            3. 责任人（建议的负责角色）
            4. 时间期限（建议完成时间）
            5. 资源需求（所需资源）
            
            输出格式（JSON）：
            {{
                "title": "行动建议标题",
                "goal": "行动目标",
                "steps": ["步骤1", "步骤2"],
                "responsible": "责任人",
                "deadline": "时间期限",
                "resources": ["资源1", "资源2"],
                "priority": "high/medium/low",
                "urgency": "high/medium/low"
            }}
            """
            
            # 调用NPU模型
            response = await self._call_genie_api(prompt)
            result = self._parse_json_response(response)
            
            return result
        
        except Exception as e:
            logger.error(f"生成单个建议失败: {e}", exc_info=True)
            return {
                "title": "建议生成失败",
                "goal": "",
                "steps": [],
                "responsible": "",
                "deadline": "",
                "resources": [],
                "priority": "low",
                "urgency": "low"
            }
    
    def _prepare_action_context(self, item: Dict) -> str:
        """
        准备行动上下文
        
        参数：
            item: 待处理项
        
        返回：
            上下文文本
        """
        try:
            if item["type"] == "risk":
                risk = item["item"]
                return f"""
                风险名称：{risk['name']}
                风险描述：{risk['description']}
                严重程度：{risk['severity']}
                检测来源：{risk['source']}
                """
            elif item["type"] == "fact":
                fact = item["item"]
                return f"""
                事实标题：{fact['title']}
                事实描述：{fact['description']}
                证据：{fact['evidence']}
                置信度：{fact['confidence']}
                """
            else:
                return ""
        
        except Exception as e:
            logger.error(f"准备行动上下文失败: {e}", exc_info=True)
            return ""
    
    def _verify_actions(self, actions: List[Dict], risks: Dict) -> List[Dict]:
        """
        验证建议
        
        参数：
            actions: 行动建议列表
            risks: 风险清单
        
        返回：
            验证后行动建议列表
        """
        try:
            verified = []
            
            for action in actions:
                # 验证完整性
                if all([
                    action.get("title"),
                    action.get("goal"),
                    action.get("steps"),
                    action.get("responsible"),
                    action.get("deadline")
                ]):
                    # 验证相关性（与高严重性风险相关）
                    if action.get("priority") == "high":
                        verified.append(action)
                    else:
                        verified.append(action)
            
            return verified
        
        except Exception as e:
            logger.error(f"验证建议失败: {e}", exc_info=True)
            return actions
    
    def _group_actions(self, actions: List[Dict]) -> Dict:
        """
        分组建议
        
        参数：
            actions: 行动建议列表
        
        返回：
            分组后行动建议字典
        """
        try:
            grouped = {
                "immediate": [],  # 立即执行
                "short_term": [], # 短期（1-7天）
                "long_term": []   # 长期（8天以上）
            }
            
            for action in actions:
                urgency = action.get("urgency", "low").lower()
                if urgency == "high":
                    grouped["immediate"].append(action)
                elif urgency == "medium":
                    grouped["short_term"].append(action)
                else:
                    grouped["long_term"].append(action)
            
            return grouped
        
        except Exception as e:
            logger.error(f"分组建议失败: {e}", exc_info=True)
            return {"immediate": [], "short_term": [], "long_term": []}
    
    def _count_by_priority(self, actions: List[Dict]) -> Dict:
        """
        按优先级统计
        
        参数：
            actions: 行动建议列表
        
        返回：
            统计结果
        """
        try:
            count = {"high": 0, "medium": 0, "low": 0}
            for action in actions:
                priority = action.get("priority", "low").lower()
                if priority in count:
                    count[priority] += 1
            return count
        
        except Exception as e:
            logger.error(f"按优先级统计失败: {e}", exc_info=True)
            return {"high": 0, "medium": 0, "low": 0}
    
    def _count_by_urgency(self, actions: List[Dict]) -> Dict:
        """
        按紧急性统计
        
        参数：
            actions: 行动建议列表
        
        返回：
            统计结果
        """
        try:
            count = {"high": 0, "medium": 0, "low": 0}
            for action in actions:
                urgency = action.get("urgency", "low").lower()
                if urgency in count:
                    count[urgency] += 1
            return count
        
        except Exception as e:
            logger.error(f"按紧急性统计失败: {e}", exc_info=True)
            return {"high": 0, "medium": 0, "low": 0}
    
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
