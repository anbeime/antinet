#!/usr/bin/env python3
# backend/main.py - 主API服务 (重构版)
"""
知易智能知识管家 - 后端API服务
参考 SiYuan 架构重构，配置和中间件集中管理
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# ============================================================
# 1. 路径设置（必须在导入之前）
# ============================================================
if getattr(sys, 'frozen', False):
    # PyInstaller 打包后，exe 已在 backend/ 目录下
    backend_dir = os.path.dirname(sys.executable)
    project_root = os.path.dirname(backend_dir)
else:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# ============================================================
# 2. NPU 库路径配置（使用新的配置模块）
# ============================================================
try:
    from conf.npu import NPUConfig

    npu_config = NPUConfig()
    lib_path = npu_config.get_libs_path()

    print(f"[SETUP] QAI 库路径: {lib_path}")

    # 设置环境变量
    paths_to_add = [lib_path]
    current_path = os.environ.get('PATH', '')
    for p in paths_to_add:
        if p not in current_path:
            current_path = p + ';' + current_path
    os.environ['PATH'] = current_path
    os.environ['QAI_LIBS_PATH'] = lib_path
    os.environ['QNN_LOG_LEVEL'] = npu_config.QNN_LOG_LEVEL

    # 添加 DLL 目录
    for p in paths_to_add:
        if os.path.exists(p):
            os.add_dll_directory(p)
            print(f"[SETUP] 添加 DLL 目录: {p}")

    print(f"[SETUP] NPU 配置: backend={npu_config.QNN_BACKEND}, device={npu_config.QNN_DEVICE}")
except Exception as e:
    print(f"[WARN] NPU 初始化失败（不影响 Genie HTTP 调用）: {e}")

# ============================================================
# 3. FastAPI 应用创建
# ============================================================
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# 使用新的配置模块
from conf.app import AppConfig

app_config = AppConfig()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 生命周期管理（替代已弃用的 on_event）"""
    # 启动时
    try:
        from services.reminder_service import start_reminder_service
        start_reminder_service()
        print("[OK] 提醒服务已启动")
    except Exception as e:
        print(f"[WARN] 提醒服务启动失败: {e}")
    yield
    # 关闭时
    try:
        from services.reminder_service import stop_reminder_service
        stop_reminder_service()
        print("[OK] 提醒服务已停止")
    except Exception as e:
        print(f"[WARN] 提醒服务停止失败: {e}")

app = FastAPI(
    title=app_config.APP_NAME,
    version=app_config.APP_VERSION,
    description=app_config.APP_DESCRIPTION,
    lifespan=lifespan,
    max_form_memory_size=app_config.MAX_UPLOAD_SIZE,
)

# ============================================================
# 4. 中间件设置（使用新的中间件模块）
# ============================================================
from middleware import create_middleware_stack

create_middleware_stack(app)
print("[OK] 中间件栈已配置")

# ============================================================
# 5. 数据库初始化
# ============================================================
from conf.database import DatabaseConfig

db_config = DatabaseConfig()
print(f"[Database] 数据库路径: {db_config.DB_PATH}")

from database import DatabaseManager

db_manager = DatabaseManager(db_config.DB_PATH)
print("[OK] 数据库初始化完成")

# ============================================================
# 6. AI 服务初始化（使用新的 AI 服务模块）
# ============================================================
from services.ai import AIServiceFactory

AIServiceFactory.create_default_services()

# 注册 Sensenova 云服务（用于特定场景：聊天/技能/工作流）
# 注意：不设为默认，本地 NPU 仍为默认
_sensenova_cfg = {
    'api_key': 'sk-aMuGLXz1jMSznP9zSUxOfS4uTG7wlsFI',
    'base_url': 'https://token.sensenova.cn/v1',
    'model': 'sensenova-6.7-flash-lite',
    'timeout': 60,
    'max_tokens': 2048,
    'temperature': 1.0,
}
_sensenova = AIServiceFactory.create_ai_service('openai', _sensenova_cfg)
if _sensenova:
    AIServiceFactory.register('sensenova', _sensenova, set_default=False)
    print("[OK] Sensenova 服务已注册（chat/skill/workflow 专用）")

print("[OK] AI 服务工厂已初始化")

# ============================================================
# 6.5 AI 模型预热（使用 QAI/QAIRT SDK 的本地模型，无须 Ollama）
# ============================================================

# ============================================================
# 7. 提醒服务已通过 lifespan 事件管理（见上方 app = FastAPI(lifespan=...) 定义）
# ============================================================

# ============================================================
# 8. 路由注册（简化版）
# ============================================================
def register_router(module_name: str):
    """直接注册路由模块"""
    try:
        # 动态导入
        parts = module_name.split('.')
        if len(parts) == 2:
            # routes.xxx 格式
            router_module = __import__(module_name, fromlist=['router'])
            router = getattr(router_module, 'router', None)
            if router:
                # 直接使用路由自己的 prefix
                actual_prefix = getattr(router, 'prefix', '') or '(无前缀)'
                app.include_router(router)
                print(f"[OK] 路由已注册: {module_name} -> {actual_prefix}")
                return True
            else:
                print(f"[WARN] {module_name} 无 router 属性")
        return False
    except Exception as e:
        print(f"[WARN] 无法导入 {module_name}: {e}")
        return False

# 核心路由 - 使用各自的 prefix
print("[INFO] 开始注册路由...")
register_router("routes.knowledge_routes")
register_router("routes.chat_routes")
register_router("routes.data_routes")
register_router("routes.agent_routes")
register_router("routes.skill_routes")
register_router("routes.npu_routes")
register_router("routes.pdf_routes")
register_router("routes.pdf_opendataloader_routes")  # OpenDataLoader 长 PDF 专用路由
register_router("routes.ocr_routes")  # OCR 路由已存在但未注册
register_router("routes.excel_routes")
register_router("routes.ppt_routes")
register_router("routes.multi_model_routes")
register_router("routes.genie_playground_routes")
register_router("routes.gtd_routes")
register_router("routes.backlink_routes")
register_router("routes.integration_routes")
register_router("routes.moc_routes")
register_router("routes.vision_routes")
register_router("routes.invoice_routes")

print("[INFO] 注册增强版聊天路由...")
register_router("routes.enhanced_chat_routes")
register_router("routes.hermes_chat_routes")  # Hermes + 8 Agent 协同
register_router("routes.evolving_chat_routes")  # 自进化聊天
register_router("routes.chat_context_routes")
register_router("routes.md2pdf_routes")
register_router("routes.card_pdf_routes")
register_router("routes.libreoffice_routes")
# register_router("routes.vector_search")  # 无router属性，是工具模块
register_router("routes.wiki")
register_router("routes.markdown_converter_routes")
register_router("routes.meeting_routes")
register_router("routes.speech_routes")
register_router("routes.research_routes")
register_router("routes.ppt_structure_routes")
register_router("routes.image_routes")  # 图片上传路由
register_router("routes.analysis_routes")
register_router("routes.report_routes")
register_router("routes.collaboration_routes")  # 实时协作 (WebSocket + REST)
register_router("routes.mindmap_routes")  # 思维导图
register_router("routes.remotion_routes")  # Remotion 动态演示
register_router("routes.pdf_edit_routes")  # PDF 文本编辑
register_router("routes.design_system_routes")  # 统一设计系统
register_router("routes.ppt_preview_routes")  # PPT 预览（增强版）
register_router("routes.ppt_native_routes")  # PPT 原生形状生成（SVG→DrawingML）

# ============================================================
# 9. 初始化各模块的数据库连接
# ============================================================
print("[INFO] 开始初始化各模块数据库连接...")

# 自动设置所有路由模块的db_manager
import routes
for attr_name in dir(routes):
    mod = getattr(routes, attr_name, None)
    if hasattr(mod, 'db_manager') and hasattr(mod, 'set_db_manager'):
        try:
            mod.set_db_manager(db_manager)
            print(f"[OK] {attr_name} 数据库已连接")
        except Exception as e:
            print(f"[WARN] {attr_name} 设置失败: {e}")
    elif hasattr(mod, 'db_manager'):
        try:
            mod.db_manager = db_manager
            print(f"[OK] {attr_name} db_manager已设置")
        except Exception as e:
            pass

# 单独设置其他需要db_manager的模块
try:
    from routes import auto_card
    if hasattr(auto_card, 'set_db_manager'):
        auto_card.set_db_manager(db_manager)
        print("[OK] auto_card 数据库已连接")
    auto_card.db_manager = db_manager
except Exception as e:
    print(f"[WARN] auto_card: {e}")

try:
    from routes import data_routes
    if hasattr(data_routes, 'set_db_manager'):
        data_routes.set_db_manager(db_manager)
        print("[OK] data_routes 数据库已连接")
except Exception as e:
    print(f"[WARN] data_routes: {e}")

try:
    from routes import enhanced_chat_routes
    enhanced_chat_routes.set_db_manager(db_manager)
    print("[OK] enhanced_chat 数据库已连接")
except Exception as e:
    print(f"[WARN] enhanced_chat: {e}")

try:
    from routes import chat_routes
    chat_routes.db_manager = db_manager
    print("[OK] chat_routes 数据库已连接")
except Exception as e:
    print(f"[WARN] chat_routes: {e}")

try:
    from routes import ppt_routes
    ppt_routes.set_db_manager(db_manager)
    print("[OK] ppt_routes 数据库已连接")
except Exception as e:
    print(f"[WARN] ppt_routes: {e}")

try:
    from routes import invoice_routes
    invoice_routes.set_db_manager(db_manager)
    print("[OK] invoice_routes 数据库已连接")
except Exception as e:
    print(f"[WARN] invoice_routes: {e}")

try:
    from routes import vector_search
    vector_search.set_db_manager(db_manager)
    vector_search.init_on_startup()
    vector_search._precompute_all_embeddings_async()
    print("[OK] vector_search 数据库已连接，embedding 已初始化")
except Exception as e:
    print(f"[WARN] vector_search: {e}")

try:
    from routes import collaboration_routes
    collaboration_routes.set_db_manager(db_manager)
    print("[OK] collaboration_routes 数据库已连接")
except Exception as e:
    print(f"[WARN] collaboration_routes: {e}")

print("[INFO] 数据库连接初始化完成")

# ============================================================
# 10. 健康检查端点
# ============================================================
@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "app": app_config.APP_NAME,
        "version": app_config.APP_VERSION,
        "database_initialized": True,
    }

@app.get("/api/debug/routes")
async def debug_routes():
    """调试端点 - 列出所有已注册的路由"""
    all_routes = []
    for route in app.routes:
        if hasattr(route, 'path'):
            all_routes.append(route.path)
    return {
        "total_routes": len(all_routes),
        "routes": sorted(all_routes)
    }

# ============================================================
# 11. 启动服务
# ============================================================
if __name__ == "__main__":
    import socket
    import subprocess
    import uvicorn
    
    # 检查端口是否被占用，如果是则释放
    def check_and_free_port(port: int):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('127.0.0.1', port))
                if result == 0:
                    print(f"[PORT] 端口 {port} 已被占用，尝试释放...")
                    output = subprocess.run(
                        ['powershell', '-Command',
                         f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object {{ Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}"],
                        capture_output=True, text=True, timeout=10
                    )
                    import time
                    time.sleep(2)
                    # 再次检查
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s2:
                        s2.settimeout(1)
                        result2 = s2.connect_ex(('127.0.0.1', port))
                        if result2 == 0:
                            print(f"[WARN] 无法释放端口 {port}，请手动关闭占用进程")
                            return False
                        else:
                            print(f"[OK] 端口 {port} 已释放")
                            return True
                else:
                    print(f"[OK] 端口 {port} 可用")
                    return True
        except Exception as e:
            print(f"[WARN] 检查端口 {port} 时出错: {e}")
            return True  # 继续尝试启动
    
    check_and_free_port(app_config.PORT)
    
    print(f"\n{'='*50}")
    print(f"启动 {app_config.APP_NAME} v{app_config.APP_VERSION}")
    print(f"服务地址: http://{app_config.HOST}:{app_config.PORT}")
    print(f"{'='*50}\n")
    
    uvicorn.run(
        app,  # 直接传递 app 对象（PyInstaller frozen 模式需要，避免 "main:app" 字符串导入失败）
        host=app_config.HOST,
        port=app_config.PORT,
        reload=False,
        log_level="info"
    )
