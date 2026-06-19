# backend/middleware/compression.py - 压缩中间件
"""
压缩中间件 - 参考 SiYuan kernel/server/serve.go 的 gzip 配置
对响应进行 GZIP 压缩，减少传输大小

注意：GZipMiddleware 会缓冲 StreamingResponse（包括 SSE），导致前端收不到流式数据。
改用自定义中间件，跳过 text/event-stream 类型的响应。
"""

import gzip
import logging
from typing import Callable, List

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# 不压缩的响应 Content-Type
STREAMING_CONTENT_TYPES = [
    "text/event-stream",
    "application/octet-stream",
]


class SmartCompressionMiddleware(BaseHTTPMiddleware):
    """
    智能压缩中间件：
    - text/event-stream (SSE) → 不压缩，保持流式传输
    - 其他响应 → 内容大于 minimum_size 时 GZIP 压缩
    """

    def __init__(self, app: ASGIApp, minimum_size: int = 1000):
        super().__init__(app)
        self.minimum_size = minimum_size

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # 跳过流式内容类型的压缩（SSE等）
        content_type = response.headers.get("content-type", "")
        for ct in STREAMING_CONTENT_TYPES:
            if ct in content_type:
                return response

        # 对其他响应进行压缩
        if (
            hasattr(response, "body")
            and response.body
            and len(response.body) >= self.minimum_size
        ):
            compressed = gzip.compress(response.body)
            response.body = compressed
            response.headers["Content-Encoding"] = "gzip"
            response.headers["Content-Length"] = str(len(compressed))

        return response


def setup_compression(
    app: FastAPI,
    minimum_size: int = 1000,
):
    app.add_middleware(
        SmartCompressionMiddleware,
        minimum_size=minimum_size,
    )

    return app