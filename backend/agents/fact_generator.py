"""
通政司 (Fact Generator)
事实生成专家，基于数据挖掘关键事实，生成结构化事实卡片
"""
import logging
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)


class FactGeneratorAgent:
    """通政司"""
    
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
    
    async def generate_facts(self, preprocessed_data: Dict, user_query: str, current_date: str) -> Dict:
        """
        生成事实卡片
        
        参数：
            preprocessed_data: 预处理数据
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            事实卡片清单
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[通政司] 开始生成事实卡片")
            
            # 1. 数据分析（调用NPU模型）
            facts = await self._analyze_data(preprocessed_data, user_query, current_date)
            self.log.append(f"[通政司] 分析完成: 生成{len(facts)}个事实")
            
            # 2. 事实筛选
            filtered_facts = self._filter_facts(facts)
            self.log.append(f"[通政司] 筛选完成: {len(filtered_facts)}个有效事实")
            
            # 3. 事实分类（四色卡片）
            categorized_facts = self._categorize_facts(filtered_facts)
            self.log.append(f"[通政司] 分类完成: 蓝{len(categorized_facts.get('blue', []))} 绿{len(categorized_facts.get('green', []))} 黄{len(categorized_facts.get('yellow', []))} 红{len(categorized_facts.get('red', []))}")
            
            # 4. 事实验证
            verified_facts = self._verify_facts(categorized_facts, preprocessed_data)
            self.log.append(f"[通政司] 验证完成: {len(verified_facts)}个验证通过")
            
            # 构建输出
            result = {
                "facts": verified_facts,
                "statistics": {
                    "total": len(verified_facts),
                    "by_color": {k: len(v) for k, v in verified_facts.items()}
                },
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"事实生成完成: {len(verified_facts)}个事实卡片")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[通政司] 生成异常: {str(e)}")
            logger.error(f"事实生成失败: {e}", exc_info=True)
            raise
    
    async def _analyze_data(self, preprocessed_data: Dict, user_query: str, current_date: str) -> List[Dict]:
        """
        分析数据
        
        参数：
            preprocessed_data: 预处理数据
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            原始事实列表
        """
        try:
            # 准备数据摘要
            data_summary = self._prepare_data_summary(preprocessed_data, current_date)
            
            # 构建提示词
            prompt = f"""
            你是Antinet系统的通政司，负责从数据中挖掘关键事实。
            
            用户查询：{user_query}
            当前日期：{current_date}
            
            数据摘要：
            {data_summary}
            
            请从数据中挖掘关键事实，包括：
            1. 趋势事实（上升、下降、稳定）
            2. 异常事实（显著偏离正常值）
            3. 对比事实（同比、环比、行业对比）
            4. 结构事实（占比、分布）
            
            输出格式（JSON）：
            {{
                "facts": [
                    {{
                        "title": "事实标题",
                        "description": "详细描述",
                        "evidence": "数据证据（具体数值或对比）",
                        "source": "数据来源字段",
                        "confidence": 0.95
                    }}
                ]
            }}
            """
            
            # 调用NPU模型
            response = await self._call_genie_api(prompt)
            result = self._parse_json_response(response)
            
            return result.get("facts", [])
        
        except Exception as e:
            logger.error(f"数据分析失败: {e}", exc_info=True)
            raise
    
    def _prepare_data_summary(self, preprocessed_data: Dict, current_date: str) -> str:
        """
        准备数据摘要
        
        参数：
            preprocessed_data: 预处理数据
            current_date: 当前日期
        
        返回：
            数据摘要文本
        """
        try:
            data = preprocessed_data.get("preprocessed_data", {})
            features = data.get("features", {})
            
            summary = f"""
            数据规模：{len(data.get('data', []))}条记录
            字段：{', '.join(data.get('schema', {}).keys())}
            时间范围：{current_date}
            """
            
            return summary
        
        except Exception as e:
            logger.error(f"准备数据摘要失败: {e}", exc_info=True)
            raise
    
    def _filter_facts(self, facts: List[Dict]) -> List[Dict]:
        """
        筛选事实
        
        参数：
            facts: 原始事实列表
        
        返回：
            筛选后事实列表
        """
        try:
            filtered = []
            for fact in facts:
                # 过滤低置信度事实
                if fact.get("confidence", 0) >= 0.7:
                    # 过滤重复事实
                    if not any(f.get("title") == fact.get("title") for f in filtered):
                        filtered.append(fact)
            
            return filtered
        
        except Exception as e:
            logger.error(f"筛选事实失败: {e}", exc_info=True)
            raise
    
    def _categorize_facts(self, facts: List[Dict]) -> Dict:
        """
        分类事实（四色卡片）
        
        参数：
            facts: 事实列表
        
        返回：
            分类后事实字典
        """
        try:
            categorized = {
                "blue": [],    # 蓝卡：基础事实（客观、稳定、可验证）
                "green": [],   # 绿卡：积极事实（增长、优化、改善）
                "yellow": [],  # 黄卡：警示事实（异常、波动、潜在风险）
                "red": []      # 红卡：严重事实（危机、严重错误、重大损失）
            }
            
            for fact in facts:
                title = fact.get("title", "").lower()
                description = fact.get("description", "").lower()
                
                # 分类逻辑（简单实现）
                if any(word in title or word in description for word in ["下降", "减少", "降低", "风险", "异常", "错误", "危机"]):
                    if any(word in title or word in description for word in ["严重", "重大", "紧急", "危机"]):
                        categorized["red"].append(fact)
                    else:
                        categorized["yellow"].append(fact)
                elif any(word in title or word in description for word in ["增长", "上升", "提高", "优化", "改善"]):
                    categorized["green"].append(fact)
                else:
                    categorized["blue"].append(fact)
            
            return categorized
        
        except Exception as e:
            logger.error(f"分类事实失败: {e}", exc_info=True)
            raise
    
    def _verify_facts(self, categorized_facts: Dict, preprocessed_data: Dict) -> Dict:
        """
        验证事实
        
        参数：
            categorized_facts: 分类后事实
            preprocessed_data: 预处理数据
        
        返回：
            验证后事实字典
        """
        try:
            verified = {k: [] for k in categorized_facts.keys()}
            
            for color, facts in categorized_facts.items():
                for fact in facts:
                    # 验证证据是否存在
                    evidence = fact.get("evidence", "")
                    if evidence:
                        # 验证数据来源
                        source = fact.get("source", "")
                        if source in preprocessed_data.get("preprocessed_data", {}).get("schema", {}):
                            verified[color].append(fact)
            
            return verified
        
        except Exception as e:
            logger.error(f"验证事实失败: {e}", exc_info=True)
            raise
    
    async def _call_genie_api(self, prompt: str) -> str:
        """
        调用LLM推理（直接使用 genie 8910 HTTP API）
        带重试逻辑：遇到429限流时等待后重试
        """
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "http://127.0.0.1:8910/v1/chat/completions",
                        json={
                            "model": "qwen2.5vl3b-8380-2.42",
                            "messages": [
                                {"role": "system", "content": "你是通政司，负责从数据中挖掘关键事实。输出JSON格式，只输出JSON不要其他内容。"},
                                {"role": "user", "content": prompt}
                            ],
                            "size": 1024,
                            "seed": 42,
                            "temp": 0.7,
                            "top_k": 1,
                            "top_p": 1.0
                        }
                    )
                    response.raise_for_status()
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    if content:
                        return content
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 秒
                    logger.warning(f"[通政司] 8910限流(429)，{wait_time}秒后重试 ({attempt+1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                    continue
                logger.error(f"[通政司] 8910 Genie API HTTP错误: {e}")
                break
            except Exception as e:
                logger.error(f"[通政司] 8910 Genie API不可用: {e}")
                break
        
        return ""
    
    def _parse_json_response(self, response: str) -> Dict:
        """
        解析JSON响应

        参数：
            response: 响应文本

        返回：
            解析后的JSON，解析失败时返回 {"text": response}
        """
        try:
            # 提取JSON部分（可能包含markdown代码块）
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            # 修复双层大括号
            response = response.strip()
            if response.startswith('{{') and response.endswith('}}'):
                response = response[1:-1].strip()
            
            return json.loads(response, strict=False)
        except Exception as e:
            logger.warning(f"解析JSON响应失败，返回原始文本: {e}")
            # JSON解析失败时返回原始文本作为后备，避免整个流程崩溃
            return {"text": response, "_parse_error": str(e)}
