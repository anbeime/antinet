# backend/middleware/cors.py - CORS 中间件
"""
CORS 中间件 - 参考 SiYuan kernel/server/serve.go 的 corsMiddleware
提供统一的跨域资源共享配置
"""

from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware as FastAPICORSMiddleware

# 允许的 HTTP 方法
HTTP_METHODS = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "CONNECT",
    "OPTIONS",
    "TRACE",
]

# WebDAV 方法（用于文件服务）
WEBDAV_METHODS = [
    "OPTIONS",
    "HEAD",
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "MKCOL",
    "COPY",
    "MOVE",
    "LOCK",
    "UNLOCK",
    "PROPFIND",
    "PROPPATCH",
    "REPORT",
]

# CalDAV 方法
CALDAV_METHODS = [
    "OPTIONS",
    "HEAD",
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "MKCOL",
    "COPY",
    "MOVE",
    "PROPFIND",
    "PROPPATCH",
    "REPORT",
]

# CardDAV 方法
CARDDAV_METHODS = [
    "OPTIONS",
    "HEAD",
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "MKCOL",
    "COPY",
    "MOVE",
    "PROPFIND",
    "PROPPATCH",
    "REPORT",
]


def setup_cors(
    app: FastAPI,
    allow_origins: Optional[List[str]] = None,
    allow_credentials: bool = True,
    allow_methods: Optional[List[str]] = None,
    allow_headers: Optional[List[str]] = None,
):
    """
    设置 CORS 中间件
    参考 SiYuan 的 corsMiddleware 实现
    
    Args:
        app: FastAPI 应用实例
        allow_origins: 允许的源列表
        allow_credentials: 是否允许凭证
        allow_methods: 允许的方法列表
        allow_headers: 允许的头部列表
    """
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
    """
    获取 CORS 配置
    用于动态配置或文档生成
    """
    return {
        "allow_origins": ["*"],
        "allow_credentials": True,
        "allow_methods": HTTP_METHODS,
        "allow_headers": ["*"],
        "expose_headers": ["X-Request-ID", "X-Process-Time"],
        "max_age": 600,  # 预检请求缓存时间（秒）
    }