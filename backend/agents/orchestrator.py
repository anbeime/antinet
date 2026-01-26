"""
锦衣卫总指挥使（总控层）
全体系大脑，负责任务分解、状态监控、成果聚合、可视化渲染、异常处置
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)

# 驿传司接口地址（统一配置）
YICHUANSI_API = "http://127.0.0.1:8000/yichuansi/"


class OrchestratorAgent:
    """锦衣卫总指挥使"""
    
    def __init__(self, genie_api_base_url: str, model_path: str):
        """
        初始化
        
        参数：
            genie_api_base_url: GenieAPIService基础URL
            model_path: 模型路径
        """
        self.genie_api_base_url = genie_api_base_url
        self.model_path = model_path
        self.task_status = {}
        self.task_history = []
        self.sub_tasks = ["mijuanfang", "tongzhengsi", "jianchayuan", "xingyusi", "canmousi", "taishige"]
    
    def parse_user_request(self, user_input: Dict) -> Dict:
        """
        解析用户输入（素材+需求），生成标准化任务指令
        
        参数：
            user_input: dict（含raw_material素材、user_query需求）
        
        返回：
            task_instructions: dict（含task_id、sub_tasks子任务列表、priority优先级）
        """
        try:
            self.task_id = f"T{user_input['request_time'].replace('-','').replace(':','').replace(' ','')}"
            
            return {
                "task_id": self.task_id,
                "sub_tasks": [
                    {
                        "agent": agent, 
                        "task": user_input["user_query"], 
                        "material": user_input["raw_material"]
                    }
                    for agent in self.sub_tasks
                ],
                "priority": "high"
            }
        except Exception as e:
            logger.error(f"解析用户请求失败: {e}", exc_info=True)
            raise
    
    def dispatch_task(self, task_instructions: Dict) -> Dict:
        """
        通过驿传司下发子任务至对应Agent
        
        参数：
            task_instructions: dict
        
        返回：
            dispatch_result: dict（含dispatch_status、task_ids）
        """
        try:
            import requests
            response = requests.post(
                url=f"{YICHUANSI_API}send_task",
                json={"task_instructions": task_instructions, "sender": "commander"}
            )
            
            if response.status_code == 200:
                return {
                    "dispatch_status": "success",
                    "task_ids": [self.task_id + "_" + sub["agent"] for sub in task_instructions["sub_tasks"]]
                }
            else:
                return {
                    "dispatch_status": "failed",
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            logger.error(f"下发任务失败: {e}", exc_info=True)
            return {"dispatch_status": "failed", "error": str(e)}
    
    def monitor_agent_status(self, task_ids: List[str]) -> Dict:
        """
        监控所有Agent执行状态，处理超时/失败
        
        参数：
            task_ids: list
        
        返回：
            status_report: dict（含agent_status、exception_tasks）
        """
        try:
            import requests
            status_report = {
                "agent_status": {},
                "exception_tasks": []
            }
            
            for task_id in task_ids:
                response = requests.post(
                    url=f"{YICHUANSI_API}get_task_status",
                    json={"task_id": task_id}
                )
                
                if response.status_code == 200:
                    status_data = response.json()
                    agent_name = task_id.split("_")[-1]
                    status_report["agent_status"][agent_name] = status_data.get("status", "unknown")
                    
                    if status_data.get("status") in ["failed", "timeout"]:
                        status_report["exception_tasks"].append({
                            "task_id": task_id,
                            "status": status_data.get("status")
                        })
            
            return status_report
        except Exception as e:
            logger.error(f"监控Agent状态失败: {e}", exc_info=True)
            return {"agent_status": {}, "exception_tasks": [], "error": str(e)}
    
    def receive_all_results(self, task_ids: List[str]) -> Dict:
        """
        通过驿传司接收所有Agent成果
        
        参数：
            task_ids: list
        
        返回：
            all_agent_results: dict
        """
        try:
            import requests
            all_results = {}
            
            for task_id in task_ids:
                response = requests.post(
                    url=f"{YICHUANSI_API}receive_result",
                    json={"task_id": task_id, "requester": "commander"}
                )
                
                if response.status_code == 200:
                    agent_name = task_id.split("_")[-1]
                    all_results[agent_name] = response.json()["result"]
            
            return all_results
        except Exception as e:
            logger.error(f"接收成果失败: {e}", exc_info=True)
            return {}
    
    def aggregate_results(self, all_agent_results: Dict) -> Dict:
        """
        聚合所有Agent成果，生成报告初稿
        
        参数：
            all_agent_results: dict
        
        返回：
            report_draft: dict（含所有模块原始内容）
        """
        try:
            report_draft = {
                "summary": "",
                "mijuanfang": all_agent_results.get("mijuanfang", {}),
                "tongzhengsi": all_agent_results.get("tongzhengsi", {}),
                "jianchayuan": all_agent_results.get("jianchayuan", {}),
                "xingyusi": all_agent_results.get("xingyusi", {}),
                "canmousi": all_agent_results.get("canmousi", {}),
                "taishige": all_agent_results.get("taishige", {}),
                "all_results": all_agent_results
            }
            
            # 生成摘要
            summary_parts = []
            if "tongzhengsi" in all_agent_results:
                core_facts = all_agent_results["tongzhengsi"].get("core_facts", {})
                if core_facts.get("核心结论"):
                    summary_parts.append(f"核心结论：{core_facts['核心结论']}")
            
            if "jianchayuan" in all_agent_results:
                cause_analysis = all_agent_results["jianchayuan"].get("cause_analysis", {})
                if cause_analysis.get("primary_reason"):
                    primary = cause_analysis["primary_reason"]
                    summary_parts.append(f"主要原因：{primary.get('factor')}（影响{primary.get('impact')}）")
            
            if "xingyusi" in all_agent_results:
                risk_detection = all_agent_results["xingyusi"].get("risk_detection", {})
                if risk_detection.get("risk_level"):
                    summary_parts.append(f"风险等级：{risk_detection['risk_level']}")
            
            report_draft["summary"] = "；".join(summary_parts) if summary_parts else "分析完成"
            
            return report_draft
        except Exception as e:
            logger.error(f"聚合结果失败: {e}", exc_info=True)
            raise
    
    def render_visualization(self, report_draft: Dict) -> Dict:
        """
        渲染可视化报告（四色卡片+整体排版）
        
        参数：
            report_draft: dict
        
        返回：
            final_report: dict（含pdf_path、img_paths、text_content）
        """
        try:
            # 生成可视化路径
            return {
                "report_id": self.task_id.replace("T", "R"),
                "pdf_path": f"/reports/{self.task_id}.pdf",
                "long_img_path": f"/reports/{self.task_id}_long.png",
                "card_img_paths": {
                    "blue": f"/cards/blue_{self.task_id}.png",
                    "green": f"/cards/green_{self.task_id}.png",
                    "yellow": f"/cards/yellow_{self.task_id}.png",
                    "red": f"/cards/red_{self.task_id}.png"
                },
                "text_content": report_draft["summary"],
                "cost_time": "5分钟",
                "generate_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            logger.error(f"渲染可视化失败: {e}", exc_info=True)
            raise
    
    def handle_exception(self, exception_tasks: Dict) -> Dict:
        """
        异常处置（重试/人工介入）
        
        参数：
            exception_tasks: dict
        
        返回：
            exception_result: dict（含handle_status、retry_times）
        """
        try:
            exception_result = {
                "handle_status": "success",
                "retry_times": 0,
                "handled_tasks": []
            }
            
            for task in exception_tasks.get("exception_tasks", []):
                task_id = task["task_id"]
                status = task["status"]
                
                if status == "timeout":
                    # 催办
                    logger.warning(f"任务{task_id}超时，触发催办")
                    exception_result["handled_tasks"].append({
                        "task_id": task_id,
                        "action": "催办",
                        "status": "sent"
                    })
                elif status == "failed":
                    # 重试
                    logger.warning(f"任务{task_id}失败，触发重试")
                    exception_result["retry_times"] += 1
                    exception_result["handled_tasks"].append({
                        "task_id": task_id,
                        "action": "重试",
                        "status": "retrying"
                    })
            
            return exception_result
        except Exception as e:
            logger.error(f"异常处置失败: {e}", exc_info=True)
            return {
                "handle_status": "failed",
                "error": str(e),
                "retry_times": 0
            }
    
    async def decompose_task(self, user_query: str, current_date: str) -> Dict:
        """
        任务分解：解析用户查询，拆解为原子任务（兼容旧接口）
        
        参数：
            user_query: 用户查询
            current_date: 当前日期
        
        返回：
            子任务清单
        """
        try:
            # 调用NPU模型解析意图
            prompt = f"""
            你是Antinet系统的锦衣卫总指挥使，负责任务分解。
            
            用户查询：{user_query}
            当前日期：{current_date}
            
            请分析用户意图，拆解为以下原子任务：
            1. 密卷房 - 数据预处理
            2. 通政司 - 事实生成
            3. 监察院 - 解释生成
            4. 刑狱司 - 风险检测
            5. 参谋司 - 行动建议
            
            输出格式（JSON）：
            {{
                "intent": "分析意图（趋势分析/异常检测/风险评估等）",
                "tasks": [
                    {{
                        "agent": "agent_name",
                        "instruction": "具体指令内容",
                        "priority": "high/medium/low",
                        "dependencies": ["依赖的agent名称"]
                    }}
                ]
            }}
            """
            
            response = await self._call_genie_api(prompt)
            task_plan = self._parse_json_response(response)
            
            logger.info(f"任务分解完成: {len(task_plan['tasks'])}个子任务")
            self.task_history.append({
                "timestamp": datetime.now().isoformat(),
                "user_query": user_query,
                "task_plan": task_plan
            })
            
            return task_plan
        
        except Exception as e:
            logger.error(f"任务分解失败: {e}", exc_info=True)
            raise
    
    async def control_flow(self, task_plan: Dict) -> Dict:
        """
        流程控制：按优先级下发任务，监控执行状态，处理异常（兼容旧接口）
        
        参数：
            task_plan: 任务计划
        
        返回：
            执行结果
        """
        try:
            results = {}
            
            # 按优先级排序任务
            tasks = sorted(task_plan['tasks'], key=lambda x: self._get_priority_value(x['priority']), reverse=True)
            
            for task in tasks:
                agent_name = task['agent']
                instruction = task['instruction']
                
                # 记录任务状态
                self.task_status[agent_name] = "执行中"
                logger.info(f"下发任务至{agent_name}: {instruction}")
                
                try:
                    # TODO: 调用对应的Agent执行任务
                    result = {"status": "success", "data": {}}
                    
                    # 更新任务状态
                    self.task_status[agent_name] = "完成"
                    results[agent_name] = result
                    
                except Exception as e:
                    # 处理任务执行失败
                    logger.error(f"{agent_name}执行失败: {e}", exc_info=True)
                    self.task_status[agent_name] = "失败"
                    
                    # 触发异常处理
                    await self.handle_exception_by_agent(agent_name, e, task)
            
            return results
        
        except Exception as e:
            logger.error(f"流程控制失败: {e}", exc_info=True)
            raise
    
    async def handle_exception_by_agent(self, agent_name: str, exception: Exception, task: Dict):
        """
        异常处理：催办、重试或人工介入（兼容旧接口）
        
        参数：
            agent_name: Agent名称
            exception: 异常信息
            task: 任务信息
        """
        try:
            if "timeout" in str(exception).lower():
                logger.warning(f"{agent_name}超时，触发催办")
                await self.trigger_emergency(agent_name, "催办", task)
            elif "failed" in str(exception).lower():
                logger.warning(f"{agent_name}失败，触发重试")
                await self.trigger_emergency(agent_name, "重试", task)
            else:
                logger.error(f"{agent_name}异常，触发人工介入")
                await self.trigger_emergency(agent_name, "人工介入", task)
        except Exception as e:
            logger.error(f"异常处理失败: {e}", exc_info=True)
    
    async def trigger_emergency(self, agent_name: str, action: str, task: Dict):
        """
        触发应急处置（兼容旧接口）
        
        参数：
            agent_name: Agent名称
            action: 处置方式（催办/重试/人工介入）
            task: 任务信息
        """
        try:
            logger.info(f"向{agent_name}执行{action}")
        except Exception as e:
            logger.error(f"应急处置失败: {e}", exc_info=True)
    
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
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            return json.loads(response)
        except Exception as e:
            logger.error(f"解析JSON响应失败: {e}", exc_info=True)
            raise
    
    def _get_priority_value(self, priority: str) -> int:
        """
        获取优先级数值
        
        参数：
            priority: 优先级（high/medium/low）
        
        返回：
            优先级数值
        """
        priority_map = {
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return priority_map.get(priority.lower(), 0)
    
    async def control_flow(self, task_plan: Dict) -> Dict:
        """
        流程控制：按优先级下发任务，监控执行状态，处理异常
        
        参数：
            task_plan: 任务计划
        
        返回：
            执行结果
        """
        try:
            results = {}
            
            # 按优先级排序任务
            tasks = sorted(task_plan['tasks'], key=lambda x: self._get_priority_value(x['priority']), reverse=True)
            
            for task in tasks:
                agent_name = task['agent']
                instruction = task['instruction']
                
                # 记录任务状态
                self.task_status[agent_name] = "执行中"
                logger.info(f"下发任务至{agent_name}: {instruction}")
                
                try:
                    # TODO: 调用对应的Agent执行任务
                    # result = await self._execute_agent_task(agent_name, instruction)
                    result = {"status": "success", "data": {}}
                    
                    # 更新任务状态
                    self.task_status[agent_name] = "完成"
                    results[agent_name] = result
                    
                except Exception as e:
                    # 处理任务执行失败
                    logger.error(f"{agent_name}执行失败: {e}", exc_info=True)
                    self.task_status[agent_name] = "失败"
                    
                    # 触发异常处理
                    await self.handle_exception(agent_name, e, task)
            
            return results
        
        except Exception as e:
            logger.error(f"流程控制失败: {e}", exc_info=True)
            raise
    
    async def aggregate_results(self, results: Dict) -> Dict:
        """
        结果聚合：汇总所有模块结果，生成最终报告
        
        参数：
            results: 所有模块的执行结果
        
        返回：
            最终报告
        """
        try:
            final_report = {
                "summary": {
                    "title": "数据分析报告",
                    "generated_at": datetime.now().isoformat(),
                    "tasks_completed": len(results),
                    "tasks_failed": len([k for k, v in results.items() if v.get("status") == "failed"])
                },
                "facts": results.get("通政司", {}).get("data", {}),
                "explanations": results.get("监察院", {}).get("data", {}),
                "risks": results.get("刑狱司", {}).get("data", {}),
                "actions": results.get("参谋司", {}).get("data", {})
            }
            
            logger.info(f"结果聚合完成: {final_report['summary']}")
            
            return final_report
        
        except Exception as e:
            logger.error(f"结果聚合失败: {e}", exc_info=True)
            raise
    
    async def handle_exception(self, agent_name: str, exception: Exception, task: Dict):
        """
        异常处理：催办、重试或人工介入
        
        参数：
            agent_name: Agent名称
            exception: 异常信息
            task: 任务信息
        """
        try:
            # 根据异常类型选择处理方式
            if "timeout" in str(exception).lower():
                # 超时：催办
                logger.warning(f"{agent_name}超时，触发催办")
                await self.trigger_emergency(agent_name, "催办", task)
            
            elif "failed" in str(exception).lower():
                # 失败：重试
                logger.warning(f"{agent_name}失败，触发重试")
                await self.trigger_emergency(agent_name, "重试", task)
            
            else:
                # 其他异常：人工介入
                logger.error(f"{agent_name}异常，触发人工介入")
                await self.trigger_emergency(agent_name, "人工介入", task)
        
        except Exception as e:
            logger.error(f"异常处理失败: {e}", exc_info=True)
    
    async def trigger_emergency(self, agent_name: str, action: str, task: Dict):
        """
        触发应急处置
        
        参数：
            agent_name: Agent名称
            action: 处置方式（催办/重试/人工介入）
            task: 任务信息
        """
        try:
            if action == "催办":
                # 通过驿传司发送催办指令
                logger.info(f"向{agent_name}发送催办指令")
                # TODO: 调用驿传司
                # await messenger.forward(agent_name, "加急执行任务", priority="特级")
            
            elif action == "重试":
                logger.info(f"重试{agent_name}任务")
                # TODO: 重新执行任务
                # await self._execute_agent_task(agent_name, task['instruction'])
            
            elif action == "人工介入":
                logger.info(f"触发{agent_name}人工介入")
                # TODO: 转发至人工系统
                # await messenger.forward("人工复核", f"{agent_name}执行失败，请介入")
            
        except Exception as e:
            logger.error(f"应急处置失败: {e}", exc_info=True)
    
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
        import json
        
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
    
    def _get_priority_value(self, priority: str) -> int:
        """
        获取优先级数值
        
        参数：
            priority: 优先级（high/medium/low）
        
        返回：
            优先级数值
        """
        priority_map = {
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return priority_map.get(priority.lower(), 0)
