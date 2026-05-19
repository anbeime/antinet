# backend/middleware/cors.py - CORS 中间件
"""
CORS 中间件 - 参考 SiYuan kernel/server/serve.go 的 corsMiddleware
提供统一的跨域资源共享配置
"""

from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware as FastAPICORSMiddleware

HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "CONNECT", "OPTIONS", "TRACE"]


def setup_cors(app: FastAPI, allow_origins: Optional[List[str]] = None, allow_credentials: bool = True,
                allow_methods: Optional[List[str]] = None, allow_headers: Optional[List[str]] = None):
    if allow_origins is None:
        allow_origins = ["*"]
    if allow_methods is None:
        allow_methods = HTTP_METHODS
    if allow_headers is None:
        allow_headers = ["*"]
    
    app.add_middleware(
        FastAPICORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )
    return app


def get_cors_config() -> dict:
    return {
        "allow_origins": ["*"],
        "allow_credentials": True,
        "allow_methods": HTTP_METHODS,
        "allow_headers": ["*"],
        "expose_headers": ["X-Request-ID", "X-Process-Time"],
        "max_age": 600,
    }
