#!/usr/bin/env python3
"""
Hermes Gateway WebSocket 服务器
将 Hermes TUI Gateway 通过 WebSocket 暴露给前端

启动方式:
    python hermes_ws_server.py
    # 或
    hermes --ws-server

默认端口: 18119
"""

import asyncio
import json
import logging
import os
import sys
import threading
from pathlib import Path

# 确定 Hermes 根目录（hermes-agent-main 在 zhiyi 的上一级目录）
SCRIPT_DIR = Path(__file__).parent.resolve()
ZHIYI_DIR = SCRIPT_DIR
HERMES_DIR = ZHIYI_DIR.parent / "hermes-agent-main"

# 确保 hermes_agent 包在路径中
if str(HERMES_DIR) not in sys.path:
    sys.path.insert(0, str(HERMES_DIR))

# 尝试加载 Hermes 模块
HERMES_AVAILABLE = False
try:
    from hermes_cli.env_loader import load_hermes_dotenv
    from hermes_constants import get_hermes_home
    hermes_home = get_hermes_home()
    load_hermes_dotenv(hermes_home=hermes_home)
    HERMES_AVAILABLE = True
except ImportError:
    print("Hermes modules not found, running in standalone mode", file=sys.stderr)
    hermes_home = None

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
logger = logging.getLogger("hermes_ws")

# FastAPI 和 WebSocket
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    print("需要安装 fastapi uvicorn: pip install fastapi uvicorn", file=sys.stderr)
    sys.exit(1)

import uvicorn

# TUI Gateway 服务器
try:
    from tui_gateway import server
    from tui_gateway.server import dispatch, _sessions, resolve_skin
    from tui_gateway.transport import StdioTransport
    TUI_AVAILABLE = True
except ImportError:
    print("TUI Gateway modules not found", file=sys.stderr)
    TUI_AVAILABLE = False
    # 创建空对象作为占位
    class PlaceholderServer:
        _sessions = {}
        @staticmethod
        def dispatch(*args, **kwargs):
            raise RuntimeError("TUI Gateway not available")
        @staticmethod
        def resolve_skin():
            return {}
    server = PlaceholderServer()

app = FastAPI(title="Hermes Gateway WebSocket")

# CORS - 允许所有来源（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 活跃连接
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"客户端连接，当前活跃: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"客户端断开，当前活跃: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """广播消息到所有连接"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


class WSGatewayTransport:
    """
    将 TUI Gateway 的输出重定向到 WebSocket 客户端
    """
    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.closed = False

    def write(self, obj: dict) -> bool:
        """非async写入 - 在to_thread中调用"""
        if self.closed:
            return False
        try:
            # 异步发送需要在事件循环中执行
            asyncio.create_task(self.ws.send_json(obj))
            return True
        except Exception:
            return False

    async def write_async(self, obj: dict) -> bool:
        """异步写入"""
        if self.closed:
            return False
        try:
            await self.ws.send_json(obj)
            return True
        except Exception:
            return False

    def close(self):
        self.closed = True


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点 - 处理 Hermes Gateway JSON-RPC"""
    await manager.connect(websocket)
    
    transport = WSGatewayTransport(websocket)
    
    # 发送 gateway.ready 事件
    await websocket.send_json({
        "jsonrpc": "2.0",
        "method": "event",
        "params": {
            "type": "gateway.ready",
            "payload": resolve_skin()
        }
    })
    
    # 为这个连接创建session
    session_key = f"ws_{id(websocket)}"
    session_data = {
        "transport": transport,
        "running": False
    }
    
    try:
        # 确保session被记录
        if not hasattr(server, '_sessions'):
            server._sessions = {}
        server._sessions[session_key] = session_data
        
        while True:
            try:
                # 接收消息
                data = await websocket.receive_text()
                
                if not data.strip():
                    continue
                
                # 解析 JSON-RPC
                try:
                    req = json.loads(data)
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "jsonrpc": "2.0",
                        "error": {"code": -32700, "message": "parse error"},
                        "id": None
                    })
                    continue
                
                # 设置当前transport和session
                from tui_gateway.transport import bind_transport
                with bind_transport(transport):
                    # 处理请求
                    try:
                        # 在线程池中执行dispatch（因为AIAgent是同步的）
                        loop = asyncio.get_event_loop()
                        resp = await loop.run_in_executor(
                            None,
                            lambda: dispatch(req, transport)
                        )
                        
                        # 如果有响应则发送
                        if resp is not None:
                            await websocket.send_json(resp)
                            
                    except Exception as e:
                        logger.exception("处理请求出错")
                        await websocket.send_json({
                            "jsonrpc": "2.0",
                            "error": {"code": -32603, "message": str(e)},
                            "id": req.get("id")
                        })
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.exception("WebSocket 错误")
                break
                
    except Exception as e:
        logger.exception("连接处理错误")
    finally:
        manager.disconnect(websocket)
        # 清理session
        if session_key in getattr(server, '_sessions', {}):
            del server._sessions[session_key]


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "hermes-gateway-ws"}


@app.get("/")
async def root():
    """根路径信息"""
    return {
        "service": "Hermes Gateway WebSocket Server",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws",
            "health": "/health"
        }
    }


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Hermes Gateway WebSocket Server")
    parser.add_argument("--host", default="0.0.0.0", help="绑定主机 (默认: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=18119, help="端口 (默认: 18119)")
    parser.add_argument("--reload", action="store_true", help="热重载 (开发用)")
    
    args = parser.parse_args()
    
    logger.info(f"启动 Hermes Gateway WebSocket Server")
    logger.info(f"WebSocket 端点: ws://{args.host}:{args.port}/ws")
    
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()