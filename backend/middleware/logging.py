# backend/middleware/logging.py - 请求日志中间件
"""
请求日志中间件 - 参考 SiYuan kernel/server/serve.go 的 Timing 中间件
记录请求时间、状态等信息
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件
    参考 SiYuan 的 Timing 中间件，记录请求处理时间
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 记录开始时间
        start_time = time.time()
        
        # 记录请求信息
        request_id = request.headers.get('X-Request-ID', f'{int(start_time * 1000)}')
        logger.info(
            f"[Request] {request.method} {request.url.path} "
            f"[ID: {request_id}] "
            f"[Client: {request.client.host if request.client else 'unknown'}]"
        )
        
        # 处理请求
        try:
            response = await call_next(request)
            
            # 计算处理时间
            process_time = (time.time() - start_time) * 1000  # 毫秒
            
            # 记录响应信息
            logger.info(
                f"[Response] {request.method} {request.url.path} "
                f"[Status: {response.status_code}] "
                f"[Time: {process_time:.2f}ms] "
                f"[ID: {request_id}]"
            )
            
            # 添加处理时间到响应头
            response.headers['X-Process-Time'] = f'{process_time:.2f}ms'
            response.headers['X-Request-ID'] = request_id
            
            return response
            
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"[Error] {request.method} {request.url.path} "
                f"[Time: {process_time:.2f}ms] "
                f"[Error: {str(e)}] "
                f"[ID: {request_id}]"
            )
            raise


def setup_logging(app):
    """
    设置日志配置
    """
    import logging
    
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 设置第三方库日志级别
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.INFO)