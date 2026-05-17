"""
监察院 (Interpreter)
解释生成专家，基于事实和知识库，生成可理解的解释说明
"""
import logging
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)


class InterpreterAgent:
    """监察院"""
    
    def __init__(self, genie_api_base_url: str, model_path: str, knowledge_base_path: str = None):
        """
        初始化
        
        参数：
            genie_api_base_url: GenieAPIService基础URL
            model_path: 模型路径
            knowledge_base_path: 知识库路径（可选）
        """
        self.genie_api_base_url = genie_api_base_url
        self.model_path = model_path
        self.knowledge_base_path = knowledge_base_path
        self.task_status = "未执行"
        self.log = []
    
    async def generate_explanations(self, facts: Dict, user_query: str, current_date: str) -> Dict:
        """
        生成解释说明
        
        参数：
            facts: 事实卡片
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            解释说明清单
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[监察院] 开始生成解释说明")
            
            # 1. 上下文检索
            context = await self._retrieve_context(user_query, current_date)
            self.log.append(f"[监察院] 上下文检索完成: {len(context)}条上下文")
            
            # 2. 解释生成
            explanations = {}
            for color, fact_list in facts.items():
                explanations[color] = []
                for fact in fact_list:
                    explanation = await self._generate_explanation(fact, context, user_query)
                    explanations[color].append(explanation)
            
            self.log.append(f"[监察院] 解释生成完成: {sum(len(v) for v in explanations.values())}个解释")
            
            # 3. 解释验证
            verified_explanations = self._verify_explanations(explanations, facts)
            self.log.append(f"[监察院] 解释验证完成: {sum(len(v) for v in verified_explanations.values())}个有效解释")
            
            # 构建输出
            result = {
                "explanations": verified_explanations,
                "statistics": {
                    "total": sum(len(v) for v in verified_explanations.values()),
                    "by_color": {k: len(v) for k, v in verified_explanations.items()}
                },
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"解释生成完成: {sum(len(v) for v in verified_explanations.values())}个解释")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[监察院] 生成异常: {str(e)}")
            logger.error(f"解释生成失败: {e}", exc_info=True)
            # JSON解析失败不影响流程，回退到空列表
    
    async def _retrieve_context(self, user_query: str, current_date: str) -> List[str]:
        """
        检索上下文
        
        参数：
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            上下文列表
        """
        try:
            # 强制使用向量检索
            context = await self._vector_search(user_query)
            
            # 如果向量检索没有结果，回退到规则检索
            if not context:
                context = self._rule_based_retrieval(user_query, current_date)
            
            return context
        
        except Exception as e:
            logger.error(f"检索上下文失败: {e}", exc_info=True)
            return []
    
    def _rule_based_retrieval(self, user_query: str, current_date: str) -> List[str]:
        """
        基于规则的检索
        
        参数：
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            上下文列表
        """
        try:
            context = []
            
            # 时间上下文
            context.append(f"当前分析时间：{current_date}")
            
            # 业务上下文（根据用户查询推断）
            if "销售" in user_query or "业绩" in user_query:
                context.append("业务背景：销售数据分析")
            elif "用户" in user_query or "客户" in user_query:
                context.append("业务背景：用户行为分析")
            elif "风险" in user_query or "异常" in user_query:
                context.append("业务背景：风险监控分析")
            
            return context
        
        except Exception as e:
            logger.error(f"基于规则的检索失败: {e}", exc_info=True)
            return []
    
    async def _vector_search(self, query: str) -> List[str]:
        """
        向量检索 - 使用混合搜索（向量 + 关键词）
        """
        try:
            from routes.vector_search import set_db_manager, search_hybrid, fallback_keyword_search
            from routes import vector_search
            
            # 设置数据库管理器
            try:
                from database import DatabaseManager
                from config import settings
                db = DatabaseManager(settings.DB_PATH)
                vector_search.set_db_manager(db)
            except Exception as e:
                logger.warning(f"设置数据库失败: {e}")
            
            # 使用混合搜索
            results = search_hybrid(query, limit=10)
            
            if not results:
                # 回退到关键词搜索
                results = fallback_keyword_search(query, limit=10)
            
            # 返回格式化的文本
            context = []
            for r in results:
                text = f"【{r.title}】\n{r.content[:200]}..."
                context.append(text)
            
            logger.info(f"[Vector] 检索到 {len(results)} 条相关知识")
            return context
        
        except Exception as e:
            logger.error(f"向量检索失败: {e}", exc_info=True)
            return []
    
    async def _generate_explanation(self, fact: Dict, context: List[str], user_query: str) -> Dict:
        """
        生成单个解释
        
        参数：
            fact: 事实卡片
            context: 上下文
            user_query: 用户查询
        
        返回：
            解释说明
        """
        try:
            # 构建提示词
            prompt = f"""
            你是Antinet系统的监察院，负责为事实生成解释说明。
            
            用户查询：{user_query}
            
            事实卡片：
            标题：{fact['title']}
            描述：{fact['description']}
            证据：{fact['evidence']}
            置信度：{fact['confidence']}
            
            上下文：
            {'; '.join(context)}
            
            请生成解释说明，包括：
            1. 原因分析（为什么会出现这个事实）
            2. 影响评估（对业务的影响）
            3. 关联因素（相关因素和影响）
            
            输出格式（JSON）：
            {{
                "fact_title": "{fact['title']}",
                "explanation": "解释说明文本",
                "reasons": ["原因1", "原因2"],
                "impacts": ["影响1", "影响2"],
                "related_factors": ["因素1", "因素2"],
                "confidence": 0.90
            }}
            """
            
            # 调用NPU模型
            response = await self._call_genie_api(prompt)
            result = self._parse_json_response(response)
            
            return result
        
        except Exception as e:
            logger.error(f"生成解释失败: {e}", exc_info=True)
            return {
                "fact_title": fact.get("title", ""),
                "explanation": "解释生成失败",
                "reasons": [],
                "impacts": [],
                "related_factors": [],
                "confidence": 0.0
            }
    
    def _verify_explanations(self, explanations: Dict, facts: Dict) -> Dict:
        """
        验证解释
        
        参数：
            explanations: 解释清单
            facts: 事实卡片
        
        返回：
            验证后解释清单
        """
        try:
            verified = {}
            
            for color, exp_list in explanations.items():
                verified[color] = []
                for exp in exp_list:
                    # 验证置信度
                    if exp.get("confidence", 0) >= 0.7:
                        # 验证关联性
                        if exp.get("fact_title") in [f.get("title") for f in facts.get(color, [])]:
                            verified[color].append(exp)
            
            return verified
        
        except Exception as e:
            logger.error(f"验证解释失败: {e}", exc_info=True)
            return explanations
    
    async def _call_genie_api(self, prompt: str) -> str:
        """
        调用LLM推理（优先走 call_llm 降级链，回退到直接HTTP调用）
        
        降级链：8910 Genie API → Ollama → NPU进程内 → 失败
        """
        try:
            from routes.meeting_routes import call_llm
            result = await call_llm(
                "你是监察院，负责为事实生成解释说明。输出JSON格式，只输出JSON不要其他内容。", 
                prompt,
                max_tokens=1024
            )
            if result:
                return result
        except Exception as e:
            logger.debug(f"[监察院] call_llm降级链不可用，回退直接HTTP: {e}")
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    "http://127.0.0.1:8910/v1/chat/completions",
                    json={
                        "model": "qwen2.5vl3b-8380-2.42",
                        "messages": [
                            {"role": "system", "content": "你是监察院，负责为事实生成解释说明。"},
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
        except Exception as e:
            logger.debug(f"[监察院] 8910 Genie API不可用: {e}")
        
        try:
            from models.model_loader import get_model_loader
            loader = get_model_loader("qwen2.0-7b")
            loader.load()
            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: loader.infer(
                    prompt=prompt[:800], max_new_tokens=512, temperature=0.7
                )),
                timeout=30.0
            )
            if result:
                return result
        except Exception as e:
            logger.debug(f"[监察院] NPU进程内推理失败: {e}")
        
        # JSON解析失败不影响流程，回退到空列表
    
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
            
            # 修复双层大括号
            response = response.strip()
            if response.startswith('{{') and response.endswith('}}'):
                response = response[1:-1].strip()
            
            return json.loads(response, strict=False)
        
        except Exception as e:
            logger.error(f"解析JSON响应失败: {e}", exc_info=True)
            # JSON解析失败不影响流程，回退到空列表
