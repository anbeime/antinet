# backend/middleware/recovery.py - 恢复中间件
"""
恢复中间件 - 参考 SiYuan kernel/server/serve.go 的 Recover 中间件
捕获异常，防止服务崩溃
"""

import traceback
import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RecoveryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            return self._handle_exception(request, e)
    
    def _handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"[Error] {request.method} {request.url.path}\nException: {exc}\nTraceback: {traceback.format_exc()}")
        
        if isinstance(exc, ValueError):
            return JSONResponse(status_code=400, content={"code": -1, "msg": f"Invalid request: {str(exc)}", "data": None})
        if isinstance(exc, PermissionError):
            return JSONResponse(status_code=403, content={"code": -1, "msg": "Permission denied", "data": None})
        if isinstance(exc, FileNotFoundError):
            return JSONResponse(status_code=404, content={"code": -1, "msg": f"Resource not found: {str(exc)}", "data": None})
        return JSONResponse(status_code=500, content={"code": -1, "msg": "Internal server error, please try again later", "data": None})


def setup_recovery(app):
    app.add_middleware(RecoveryMiddleware)
    return app
