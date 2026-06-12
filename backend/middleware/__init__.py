# backend/middleware/__init__.py - 中间件模块
"""
中间件模块 - 参考 SiYuan kernel/server/serve.go 架构
集中管理所有中间件：日志、并发控制、CORS、压缩等
"""

from .logging import RequestLoggingMiddleware, setup_logging
from .cors import setup_cors
from .compression import setup_compression
from .concurrency import ConcurrencyControlMiddleware
from .recovery import setup_recovery
from .auth import JWTAuthMiddleware
from .audit import AuditLogMiddleware

__all__ = [
    'RequestLoggingMiddleware',
    'setup_logging',
    'setup_cors',
    'setup_compression',
    'ConcurrencyControlMiddleware',
    'setup_recovery',
    'JWTAuthMiddleware',
    'AuditLogMiddleware',
    'create_middleware_stack',
]


def create_middleware_stack(app):
    """
    创建中间件栈
    参考 SiYuan 的中间件组合模式
    
    Args:
        app: FastAPI 应用实例
    """
    # 设置 CORS
    setup_cors(app)
    
    # 设置压缩
    setup_compression(app)
    
    # 添加 JWT 认证
    app.add_middleware(JWTAuthMiddleware)
    
    # 添加审计日志
    app.add_middleware(AuditLogMiddleware)
    
    # 添加请求日志
    app.add_middleware(RequestLoggingMiddleware)
    
    # 添加并发控制
    app.add_middleware(ConcurrencyControlMiddleware)
    
    # 添加恢复中间件
    setup_recovery(app)
    
    return app