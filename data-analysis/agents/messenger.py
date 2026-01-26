"""
驿传司 (Messenger)
消息传递专家，负责Agent间的消息转发、通知推送、人工协同
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import httpx
import json

logger = logging.getLogger(__name__)


class MessengerAgent:
    """驿传司"""
    
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
        self.message_queue = []
    
    async def forward_message(self, from_agent: str, to_agent: str, message: Dict, priority: str = "normal") -> Dict:
        """
        转发消息
        
        参数：
            from_agent: 发送方Agent
            to_agent: 接收方Agent
            message: 消息内容
            priority: 优先级（normal/urgent/特级）
        
        返回：
            转发结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[驿传司] 开始转发消息: {from_agent} -> {to_agent}")
            
            # 1. 消息打包
            packed_message = self._pack_message(from_agent, to_agent, message, priority)
            self.log.append(f"[驿传司] 消息打包完成: ID={packed_message['id']}")
            
            # 2. 消息路由
            routed_message = self._route_message(packed_message, to_agent)
            self.log.append(f"[驿传司] 消息路由完成: 路由={routed_message['route']}")
            
            # 3. 消息发送
            sent_result = await self._send_message(routed_message)
            self.log.append(f"[驿传司] 消息发送完成: 状态={sent_result['status']}")
            
            # 4. 回执确认
            receipt = await self._confirm_receipt(routed_message, sent_result)
            self.log.append(f"[驿传司] 回执确认完成: 已确认")
            
            # 构建输出
            result = {
                "message_id": packed_message["id"],
                "from": from_agent,
                "to": to_agent,
                "priority": priority,
                "status": sent_result["status"],
                "sent_at": packed_message["sent_at"],
                "receipt": receipt,
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"消息转发完成: {packed_message['id']}")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[驿传司] 转发异常: {str(e)}")
            logger.error(f"消息转发失败: {e}", exc_info=True)
            raise
    
    async def send_notification(self, recipient: str, notification: Dict, channels: List[str] = None) -> Dict:
        """
        发送通知
        
        参数：
            recipient: 接收者
            notification: 通知内容
            channels: 通知渠道（email/sms/push）
        
        返回：
            发送结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[驿传司] 开始发送通知: {recipient}")
            
            # 默认渠道
            if not channels:
                channels = ["push"]
            
            # 1. 通知生成
            generated_notification = self._generate_notification(notification)
            self.log.append(f"[驿传司] 通知生成完成")
            
            # 2. 多渠道发送
            sent_results = {}
            for channel in channels:
                try:
                    result = await self._send_to_channel(channel, recipient, generated_notification)
                    sent_results[channel] = result
                    self.log.append(f"[驿传司] {channel}发送完成: {result['status']}")
                except Exception as e:
                    logger.error(f"{channel}发送失败: {e}", exc_info=True)
                    sent_results[channel] = {"status": "failed", "error": str(e)}
            
            # 3. 发送统计
            statistics = self._calculate_statistics(sent_results)
            self.log.append(f"[驿传司] 发送统计: 成功{statistics['success']} 失败{statistics['failed']}")
            
            # 构建输出
            result = {
                "recipient": recipient,
                "channels": channels,
                "sent_results": sent_results,
                "statistics": statistics,
                "sent_at": datetime.now().isoformat(),
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"通知发送完成: {recipient}")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[驿传司] 发送异常: {str(e)}")
            logger.error(f"通知发送失败: {e}", exc_info=True)
            raise
    
    async def request_human_intervention(self, context: Dict, priority: str = "normal") -> Dict:
        """
        请求人工介入
        
        参数：
            context: 上下文信息
            priority: 优先级
        
        返回：
            请求结果
        """
        try:
            self.task_status = "执行中"
            self.log.append(f"[驿传司] 开始请求人工介入")
            
            # 1. 上下文汇总
            summary = await self._summarize_context(context)
            self.log.append(f"[驿传司] 上下文汇总完成")
            
            # 2. 人工请求生成
            request = self._generate_human_request(summary, priority)
            self.log.append(f"[驿传司] 人工请求生成完成: ID={request['id']}")
            
            # 3. 请求发送
            sent_result = await self._send_human_request(request)
            self.log.append(f"[驿传司] 请求发送完成: 状态={sent_result['status']}")
            
            # 4. 响应等待（简化实现）
            # TODO: 实现异步等待人工响应
            response = {
                "request_id": request["id"],
                "status": "pending",
                "response": None
            }
            
            # 构建输出
            result = {
                "request_id": request["id"],
                "priority": priority,
                "summary": summary,
                "sent_at": request["sent_at"],
                "response": response,
                "log": self.log
            }
            
            self.task_status = "完成"
            logger.info(f"人工介入请求完成: {request['id']}")
            
            return result
        
        except Exception as e:
            self.task_status = "失败"
            self.log.append(f"[驿传司] 请求异常: {str(e)}")
            logger.error(f"人工介入请求失败: {e}", exc_info=True)
            raise
    
    def _pack_message(self, from_agent: str, to_agent: str, message: Dict, priority: str) -> Dict:
        """
        打包消息
        
        参数：
            from_agent: 发送方
            to_agent: 接收方
            message: 消息内容
            priority: 优先级
        
        返回：
            打包后消息
        """
        try:
            packed = {
                "id": f"msg_{datetime.now().timestamp()}",
                "from": from_agent,
                "to": to_agent,
                "content": message,
                "priority": priority,
                "sent_at": datetime.now().isoformat(),
                "status": "pending"
            }
            
            return packed
        
        except Exception as e:
            logger.error(f"打包消息失败: {e}", exc_info=True)
            raise
    
    def _route_message(self, message: Dict, to_agent: str) -> Dict:
        """
        路由消息
        
        参数：
            message: 消息
            to_agent: 接收方
        
        返回：
            路由后消息
        """
        try:
            # 简化实现：直接路由
            # TODO: 实现复杂路由逻辑
            message["route"] = f"direct:{to_agent}"
            
            return message
        
        except Exception as e:
            logger.error(f"路由消息失败: {e}", exc_info=True)
            raise
    
    async def _send_message(self, message: Dict) -> Dict:
        """
        发送消息
        
        参数：
            message: 消息
        
        返回：
            发送结果
        """
        try:
            # 简化实现：记录到消息队列
            # TODO: 实现实际消息发送
            self.message_queue.append(message)
            
            return {
                "status": "sent",
                "sent_at": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"发送消息失败: {e}", exc_info=True)
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def _confirm_receipt(self, message: Dict, send_result: Dict) -> Dict:
        """
        确认回执
        
        参数：
            message: 消息
            send_result: 发送结果
        
        返回：
            回执
        """
        try:
            # 简化实现：直接确认
            # TODO: 实现回执确认逻辑
            return {
                "confirmed": True,
                "confirmed_at": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"确认回执失败: {e}", exc_info=True)
            return {
                "confirmed": False,
                "error": str(e)
            }
    
    def _generate_notification(self, notification: Dict) -> Dict:
        """
        生成通知
        
        参数：
            notification: 通知内容
        
        返回：
            生成后通知
        """
        try:
            generated = {
                "title": notification.get("title", "Antinet通知"),
                "body": notification.get("body", ""),
                "data": notification.get("data", {}),
                "priority": notification.get("priority", "normal"),
                "generated_at": datetime.now().isoformat()
            }
            
            return generated
        
        except Exception as e:
            logger.error(f"生成通知失败: {e}", exc_info=True)
            raise
    
    async def _send_to_channel(self, channel: str, recipient: str, notification: Dict) -> Dict:
        """
        发送到指定渠道
        
        参数：
            channel: 渠道
            recipient: 接收者
            notification: 通知
        
        返回：
            发送结果
        """
        try:
            # 简化实现：记录日志
            # TODO: 实现实际渠道发送（email/sms/push）
            logger.info(f"[{channel}] 发送通知给{recipient}: {notification['title']}")
            
            return {
                "status": "sent",
                "sent_at": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"发送到渠道失败: {e}", exc_info=True)
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _calculate_statistics(self, sent_results: Dict) -> Dict:
        """
        计算统计
        
        参数：
            sent_results: 发送结果
        
        返回：
            统计结果
        """
        try:
            success = sum(1 for r in sent_results.values() if r.get("status") == "sent")
            failed = sum(1 for r in sent_results.values() if r.get("status") != "sent")
            
            return {
                "total": len(sent_results),
                "success": success,
                "failed": failed
            }
        
        except Exception as e:
            logger.error(f"计算统计失败: {e}", exc_info=True)
            return {"total": 0, "success": 0, "failed": 0}
    
    async def _summarize_context(self, context: Dict) -> str:
        """
        汇总上下文
        
        参数：
            context: 上下文
        
        返回：
            汇总文本
        """
        try:
            # 构建提示词
            prompt = f"""
            你是Antinet系统的驿传司，负责汇总上下文信息，生成人工介入请求摘要。
            
            上下文信息：
            {json.dumps(context, ensure_ascii=False, indent=2)}
            
            请生成简洁的上下文摘要（不超过200字）。
            """
            
            # 调用NPU模型
            response = await self._call_genie_api(prompt)
            summary = response.strip()
            
            return summary
        
        except Exception as e:
            logger.error(f"汇总上下文失败: {e}", exc_info=True)
            return json.dumps(context, ensure_ascii=False)[:200]
    
    def _generate_human_request(self, summary: str, priority: str) -> Dict:
        """
        生成人工请求
        
        参数：
            summary: 上下文摘要
            priority: 优先级
        
        返回：
            人工请求
        """
        try:
            request = {
                "id": f"human_req_{datetime.now().timestamp()}",
                "summary": summary,
                "priority": priority,
                "sent_at": datetime.now().isoformat(),
                "status": "pending"
            }
            
            return request
        
        except Exception as e:
            logger.error(f"生成人工请求失败: {e}", exc_info=True)
            raise
    
    async def _send_human_request(self, request: Dict) -> Dict:
        """
        发送人工请求
        
        参数：
            request: 人工请求
        
        返回：
            发送结果
        """
        try:
            # 简化实现：记录到消息队列
            # TODO: 实现实际人工请求发送
            self.message_queue.append(request)
            
            return {
                "status": "sent",
                "sent_at": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"发送人工请求失败: {e}", exc_info=True)
            return {
                "status": "failed",
                "error": str(e)
            }
    
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
                        "max_tokens": 500,
                        "temperature": 0.7
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result.get("text", "")
        
        except Exception as e:
            logger.error(f"调用GenieAPIService失败: {e}", exc_info=True)
            raise
