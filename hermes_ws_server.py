#!/usr/bin/env python3
"""
Hermes Gateway WebSocket 服务器
将 Hermes TUI Gateway 通过 WebSocket 暴露给前端，复用 tui_gateway.ws.handle_ws

启动方式:
    python hermes_ws_server.py

默认端口: 18119
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
ZHIYI_DIR = SCRIPT_DIR
HERMES_DIR = ZHIYI_DIR.parent / "hermes-agent-main"

if str(HERMES_DIR) not in sys.path:
    sys.path.insert(0, str(HERMES_DIR))

HERMES_AVAILABLE = False
try:
    from hermes_cli.env_loader import load_hermes_dotenv
    from hermes_constants import get_hermes_home
    hermes_home = get_hermes_home()
    load_hermes_dotenv(hermes_home=hermes_home)
    HERMES_AVAILABLE = True
except ImportError:
    print("Hermes modules not found", file=sys.stderr)
    hermes_home = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
logger = logging.getLogger("hermes_ws")

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    print("Need fastapi uvicorn: pip install fastapi uvicorn", file=sys.stderr)
    sys.exit(1)

import uvicorn

TUI_AVAILABLE = False
try:
    from tui_gateway.ws import handle_ws
    from tui_gateway.server import resolve_skin, _sessions
    TUI_AVAILABLE = True
except ImportError as e:
    print(f"TUI Gateway not available: {e}", file=sys.stderr)

app = FastAPI(title="Hermes Gateway WebSocket")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)
        logger.info(f"Client connected, active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Client disconnected, active: {len(self.active_connections)}")


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    if not TUI_AVAILABLE:
        await websocket.accept()
        await manager.connect(websocket)
        await websocket.send_json({
            "jsonrpc": "2.0",
            "method": "event",
            "params": {
                "type": "gateway.ready",
                "payload": {
                    "error": "Hermes TUI Gateway unavailable — check hermes-agent-main/tui_gateway",
                    "skin": {}
                }
            }
        })
        await websocket.send_json({
            "jsonrpc": "2.0",
            "method": "event",
            "params": {
                "type": "error",
                "payload": {"message": "TUI Gateway not available; check server logs"}
            }
        })
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            manager.disconnect(websocket)
        return

    # TUI Gateway 可用，让 handle_ws 处理 accept + gateway.ready + 消息循环
    await manager.connect(websocket)
    try:
        await handle_ws(websocket)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket handler error")
    finally:
        manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    return {
        "status": "ok" if TUI_AVAILABLE else "degraded",
        "service": "hermes-gateway-ws",
        "tui_available": TUI_AVAILABLE,
    }


@app.get("/")
async def root():
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
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=18119, help="Port (default: 18119)")
    parser.add_argument("--reload", action="store_true", help="Hot reload (dev)")

    args = parser.parse_args()

    logger.info(f"Starting Hermes Gateway WebSocket Server")
    logger.info(f"WebSocket endpoint: ws://{args.host}:{args.port}/ws")
    logger.info(f"Hermes TUI Gateway available: {TUI_AVAILABLE}")

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
