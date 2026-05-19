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
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = request.headers.get('X-Request-ID', f'{int(start_time * 1000)}')
        logger.info(f"[Request] {request.method} {request.url.path} [ID: {request_id}] [Client: {request.client.host if request.client else 'unknown'}]")
        
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            logger.info(f"[Response] {request.method} {request.url.path} [Status: {response.status_code}] [Time: {process_time:.2f}ms]")
            response.headers['X-Process-Time'] = f'{process_time:.2f}ms'
            response.headers['X-Request-ID'] = request_id
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(f"[Error] {request.method} {request.url.path} [Time: {process_time:.2f}ms] [Error: {str(e)}]")
            raise


def setup_logging(app):
    import logging
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.INFO)
