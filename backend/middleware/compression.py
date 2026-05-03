# backend/middleware/compression.py - 压缩中间件
"""
压缩中间件 - 参考 SiYuan kernel/server/serve.go 的 gzip 配置
对响应进行 GZIP 压缩，减少传输大小
"""

from fastapi import FastAPI, Request
from starlette.middleware.gzip import GZipMiddleware


# 不压缩的文件类型
EXCLUDED_EXTENSIONS = [
    ".pdf",
    ".mp3",
    ".wav",
    ".ogg",
    ".mov",
    ".weba",
    ".mkv",
    ".mp4",
    ".webm",
    ".flac",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".webp",
]


def setup_compression(
    app: FastAPI,
    minimum_size: int = 1000,
    excluded_extensions: list = None
):
    """
    设置 GZIP 压缩中间件
    参考 SiYuan 的 gzip.Gzip 配置
    
    Args:
        app: FastAPI 应用实例
        minimum_size: 最小压缩字节数
        excluded_extensions: 不压缩的文件扩展名列表
    """
    if excluded_extensions is None:
        excluded_extensions = EXCLUDED_EXTENSIONS
    
    app.add_middleware(
        GZipMiddleware,
        minimum_size=minimum_size,
    )
    
    return app


def should_compress(path: str, excluded_extensions: list = None) -> bool:
    """
    判断路径是否应该压缩
    
    Args:
        path: 请求路径
        excluded_extensions: 不压缩的扩展名列表
        
    Returns:
        bool: 是否应该压缩
    """
    if excluded_extensions is None:
        excluded_extensions = EXCLUDED_EXTENSIONS
    
    for ext in excluded_extensions:
        if path.lower().endswith(ext):
            return False
    
    return True