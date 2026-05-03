# backend/middleware/concurrency.py - 并发控制中间件
"""
并发控制中间件 - 参考 SiYuan kernel/server/serve.go 的 ControlConcurrency
限制并发请求数量，防止资源耗尽
"""

import asyncio
import time
import logging
from typing import Callable, Optional
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class ConcurrencyControlMiddleware(BaseHTTPMiddleware):
    """
    并发控制中间件
    参考 SiYuan 的 ControlConcurrency 实现
    限制每个 IP 的并发请求数
    """
    
    def __init__(
        self,
        app,
        max_concurrent_per_ip: int = 10,
        max_total_concurrent: int = 100,
        queue_timeout: float = 30.0
    ):
        super().__init__(app)
        self.max_concurrent_per_ip = max_concurrent_per_ip
        self.max_total_concurrent = max_total_concurrent
        self.queue_timeout = queue_timeout
        
        # 当前并发请求计数
        self._active_requests = 0
        self._ip_requests = defaultdict(int)
        self._locks = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        
        # 检查总并发数
        if self._active_requests >= self.max_total_concurrent:
            logger.warning(
                f"[Concurrency] 总并发数超限 ({self._active_requests}/{self.max_total_concurrent}) "
                f"[IP: {client_ip}] [Path: {request.url.path}]"
            )
            return Response(
                content="Service busy, please try again later",
                status_code=503,
                headers={"Retry-After": "30"}
            )
        
        # 检查单个 IP 并发数
        if self._ip_requests[client_ip] >= self.max_concurrent_per_ip:
            logger.warning(
                f"[Concurrency] IP 并发数超限 ({self._ip_requests[client_ip]}/{self.max_concurrent_per_ip}) "
                f"[IP: {client_ip}] [Path: {request.url.path}]"
            )
            return Response(
                content="Too many requests from this IP, please try again later",
                status_code=429,
                headers={"Retry-After": "60"}
            )
        
        # 增加计数
        self._active_requests += 1
        self._ip_requests[client_ip] += 1
        
        try:
            response = await call_next(request)
            return response
        finally:
            # 减少计数
            self._active_requests -= 1
            self._ip_requests[client_ip] -= 1
            
            # 清理空条目
            if self._ip_requests[client_ip] <= 0:
                del self._ip_requests[client_ip]
    
    @property
    def active_count(self) -> int:
        """当前活跃请求数"""
        return self._active_requests
    
    def get_ip_count(self, ip: str) -> int:
        """获取指定 IP 的活跃请求数"""
        return self._ip_requests.get(ip, 0)