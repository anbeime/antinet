#!/usr/bin/env python3
# backend/main.py - 主API服务
"""
知易智能知识管家 - 后端API服务
基于FastAPI,提供数据分析和知识管理接口
"""

# 必须在任何导入之前设置环境变量
import os
import sys
from pathlib import Path

# 添加 backend 目录到 Python 路径，以支持正确的模块导入
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)

# 确保 backend 目录在 Python 路径中
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
# 同时添加项目根目录
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 设置NPU库路径 - 必须在导入模型加载器之前完成
# 【重要】只设置默认版本（2.37），匹配系统NPU驱动
# 模型加载时会根据模型的QNN版本动态切换，避免版本冲突
def find_qai_libs():
    """自动查找 QAI 库路径 - 默认使用 2.37（匹配系统NPU驱动）"""
    qualcomm_base = Path(project_root) / "QAIRT"
    
    # 【关键】默认使用 2.37 版本（匹配当前系统 NPU 驱动）
    # 只有匹配版本的 SDK 才能正确加载模型
    default_version_dirs = ["2.37.1.250807"]
    
    for ver_dir in default_version_dirs:
        version_path = qualcomm_base / ver_dir
        if version_path.is_dir():
            for lib_sub in ["lib/arm64x-windows-msvc", "lib/aarch64-windows-msvc"]:
                lib_path = version_path / lib_sub.replace("/", os.sep)
                if lib_path.exists():
                    return str(lib_path)
    
    # 回退：查找任意可用版本
    fallback_versions = ["2.45.40.260406", "2.42.0.251225", "2.34.0.250626"]
    for ver_dir in fallback_versions:
        version_path = qualcomm_base / ver_dir
        if version_path.is_dir():
            for lib_sub in ["lib/arm64x-windows-msvc", "lib/aarch64-windows-msvc"]:
                lib_path = version_path / lib_sub.replace("/", os.sep)
                if lib_path.exists():
                    print(f"[SETUP] ⚠️ 未找到2.37版本SDK，回退使用: {ver_dir}")
                    return str(lib_path)
    
    # 最后回退到 QAIRT_Runtime
    for lib_sub in ["arm64x-windows-msvc", "aarch64-windows-msvc"]:
        p = Path(project_root) / "QAIRT_Runtime" / lib_sub
        if p.exists():
            return str(p)
    
    return str(Path(project_root) / "QAIRT_Runtime" / "arm64x-windows-msvc")

lib_path = find_qai_libs()
bridge_lib_path = lib_path

print(f"[SETUP] QAI 库路径: {lib_path}")

# 只添加匹配版本的路径到 PATH，避免多版本 DLL 冲突
paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 显式添加 DLL 目录（Python 3.8+）- 只添加匹配版本
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)
        print(f"[SETUP] 添加 DLL 目录: {p}")

# 设置 QNN 日志级别
try:
    from config import settings
    qnn_log_level = settings.QNN_LOG_LEVEL
    os.environ['QNN_LOG_LEVEL'] = qnn_log_level
    print(f"[SETUP] QNN 日志级别设置为: {qnn_log_level}")
except ImportError:
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"
    print(f"[SETUP] 使用默认 QNN 日志级别: DEBUG")

print(f"[SETUP] NPU library paths configured:")
print(f"  - qai_libs: {lib_path}")
print(f"  - bridge libs: {bridge_lib_path}")
print(f"  - PATH updated: {lib_path in os.environ['PATH']}")

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
from pathlib import Path
import json
import time

from config import settings
# 可选导入 NPU 路由（如果依赖库可用）
try:
    from routes.npu_routes import router as npu_router
except Exception as e:
    print(f"[WARNING] 无法导入 NPU 路由: {e}")
    npu_router = None
from routes import data_routes  # 导入数据管理模块
# 可选导入聊天机器人路由（如果依赖库可用）
try:
    from routes.chat_routes import router as chat_router
except Exception as e:
    print(f"[WARNING] 无法导入聊天机器人路由: {e}")
    chat_router = None

from database import DatabaseManager

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="端侧智能数据中枢与协同分析平台"
)

# 初始化数据库
logger.info(f"[Database] 正在初始化数据库: {settings.DB_PATH}")
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
db_manager = DatabaseManager(settings.DB_PATH)

# 设置data_routes的数据库管理器
data_routes.set_db_manager(db_manager)
logger.info("[Database] 数据库初始化完成，已加载默认数据")

# 配置CORS - 允许所有源（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 注册路由
if npu_router is not None:
    app.include_router(npu_router)  # NPU 推理路由
app.include_router(data_routes.router)  # 数据管理路由
if chat_router is not None:
    app.include_router(chat_router)  # 聊天机器人路由
    # 设置chat_routes模块的数据库管理器
    import routes.chat_routes as chat_routes_module
    chat_routes_module.db_manager = db_manager
    chat_router.db_manager = db_manager  # 同时设置router属性
    
    # 初始化向量搜索
    try:
        from routes.chat_vector_patch import init_vector_search
        vector_enabled = init_vector_search(chat_routes_module, db_manager)
        if vector_enabled:
            logger.info("[OK] 向量搜索已启用")
        else:
            logger.warning("[Warning] 向量搜索初始化失败")
    except Exception as e:
        logger.error(f"[Error] 向量搜索初始化异常: {e}")
    
    logger.info("[OK] 聊天机器人路由已注册")

# 测试用简单端点
@app.get("/api/test")
async def test():
    return {"status": "ok"}

# 注册知识管理路由
try:
    from routes.knowledge_routes import router as knowledge_router
    app.include_router(knowledge_router)  # 知识管理路由
    logger.info("[OK] 知识管理路由已注册")
except Exception as e:
    logger.warning(f"无法导入知识管理路由: {e}")

# 注册思维导图路由
try:
    from routes.mindmap_routes import router as mindmap_router
    app.include_router(mindmap_router)
    logger.info("[OK] 思维导图路由已注册")
except Exception as e:
    logger.warning(f"无法导入思维导图路由: {e}")

# 注册 Remotion 动态演示路由
try:
    import routes.remotion_routes as remotion_routes_module
    app.include_router(remotion_routes_module.router)
    remotion_routes_module.set_db_manager(db_manager)
    logger.info("[OK] Remotion 动态演示路由已注册")
except Exception as e:
    logger.warning(f"无法导入 Remotion 路由: {e}")

# 注册专题研究路由
try:
    from routes.research_routes import router as research_router
    app.include_router(research_router)  # 专题研究路由
    logger.info("[OK] 专题研究路由已注册")
except Exception as e:
    logger.warning(f"无法导入专题研究路由: {e}")

# 注册 8-Agent 系统路由
try:
    from routes.agent_routes import router as agent_router
    app.include_router(agent_router)  # 8-Agent 系统路由
    logger.info("[OK] 8-Agent 系统路由已注册")
except Exception as e:
    logger.warning(f"无法导入 8-Agent 系统路由: {e}")

# 注册报告生成路由
try:
    from api.generate import router as generate_router
    app.include_router(generate_router, prefix="/api/generate", tags=["报告生成"])
    logger.info("[OK] 报告生成路由已注册")
except Exception as e:
    logger.warning(f"无法导入报告生成路由: {e}")

# 注册技能系统路由
try:
    from routes.skill_routes import router as skill_router
    app.include_router(skill_router)  # 技能系统路由
    logger.info("[OK] 技能系统路由已注册")
except Exception as e:
    logger.warning(f"无法导入技能系统路由: {e}")

# 注册 Excel 导出路由
try:
    from routes.excel_routes import router as excel_router
    app.include_router(excel_router)  # Excel 导出路由
    logger.info("[OK] Excel 导出路由已注册")
except Exception as e:
    logger.warning(f"无法导入 Excel 导出路由: {e}")

# 注册完整分析路由
try:
    from routes.analysis_routes import router as analysis_router
    app.include_router(analysis_router)  # 完整分析路由
    logger.info("[OK] 完整分析路由已注册")
except Exception as e:
    logger.warning(f"无法导入完整分析路由: {e}")

# 注册高级数据分析路由
try:
    from routes.analysis_advanced_routes import router as analysis_advanced_router
    app.include_router(analysis_advanced_router)  # 高级数据分析路由
    logger.info("[OK] 高级数据分析路由已注册")
except Exception as e:
    logger.warning(f"无法导入高级数据分析路由: {e}")

# 注册 PDF 处理路由
try:
    from routes.pdf_routes import router as pdf_router
    app.include_router(pdf_router)  # PDF 处理路由
    logger.info("[OK] PDF 处理路由已注册")
except Exception as e:
    logger.warning(f"无法导入 PDF 处理路由: {e}")

# 注册 PPT 处理路由
try:
    from routes.ppt_routes import router as ppt_router
    from routes.ppt_routes import set_db_manager as set_ppt_db_manager
    app.include_router(ppt_router)  # PPT 处理路由
    set_ppt_db_manager(db_manager)
    logger.info("[OK] PPT 处理路由已注册")
except Exception as e:
    logger.warning(f"无法导入 PPT 处理路由: {e}")

# 注册 OCR 路由 (qwen2.5vl3b NPU模型)
try:
    from routes.ocr_routes import router as ocr_router
    app.include_router(ocr_router)
    logger.info("[OK] OCR 路由已注册 (qwen2.5vl3b)")
except Exception as e:
    logger.warning(f"无法导入 OCR 路由: {e}")

# 注册报表自动化路由
try:
    from routes.report_routes import router as report_router
    app.include_router(report_router)  # 报表自动化路由 (prefix已在router中定义)
    logger.info("[OK] 报表自动化路由已注册")
except Exception as e:
    logger.warning(f"无法导入报表自动化路由: {e}")

# 注册 GTD 任务管理路由
try:
    from routes.gtd_routes import router as gtd_router
    app.include_router(gtd_router)  # GTD 任务管理路由
    logger.info("[OK] GTD 任务管理路由已注册")
except Exception as e:
    logger.warning(f"无法导入 GTD 任务管理路由: {e}")

# 注册双向链接路由
try:
    from routes.backlink_routes import router as backlink_router
    app.include_router(backlink_router)
    logger.info("[OK] 双向链接路由已注册")
except Exception as e:
    logger.warning(f"无法导入双向链接路由: {e}")

# 注册整合路由（任务-笔记双向链接 + 日历整合）
try:
    from routes.integration_routes import router as integration_router
    app.include_router(integration_router)
    logger.info("[OK] 整合路由（任务-笔记-日历）已注册")
except Exception as e:
    logger.warning(f"无法导入整合路由: {e}")

# 注册 MOC 多维筛选路由
try:
    from routes.moc_routes import router as moc_router
    app.include_router(moc_router)
    logger.info("[OK] MOC多维筛选路由已注册")
except Exception as e:
    logger.warning(f"无法导入MOC路由: {e}")

# 注册多模型API路由
try:
    from routes.multi_model_routes import router as multi_model_router
    app.include_router(multi_model_router)  # 多模型API路由
    logger.info("[OK] 多模型API路由已注册")
except Exception as e:
    logger.warning(f"无法导入多模型API路由: {e}")

# 注册视觉理解路由
try:
    from routes.vision_routes import router as vision_router
    app.include_router(vision_router)  # 视觉理解路由
    logger.info("[OK] 视觉理解路由已注册")
except Exception as e:
    logger.warning(f"无法导入视觉理解路由: {e}")

# 注册 Genie 模型测试场路由
try:
    from routes.genie_playground_routes import router as genie_playground_router
    app.include_router(genie_playground_router)  # Genie模型测试场路由
    logger.info("[OK] Genie 模型测试场路由已注册")
except Exception as e:
    logger.warning(f"无法导入 Genie 模型测试场路由: {e}")

# 注册8-Agent会议路由
try:
    from routes.meeting_routes import router as meeting_router
    from routes.meeting_routes import set_db_manager as set_meeting_db_manager
    app.include_router(meeting_router)  # 8-Agent会议路由
    set_meeting_db_manager(db_manager)
    logger.info("[OK] 8-Agent会议路由已注册")
except Exception as e:
    logger.warning(f"无法导入8-Agent会议路由: {e}")

# 注册增强版聊天路由
try:
    from routes.enhanced_chat_routes import router as enhanced_chat_router
    from routes.enhanced_chat_routes import set_db_manager as set_chat_db_manager
    app.include_router(enhanced_chat_router)  # 增强版聊天路由
    set_chat_db_manager(db_manager)
    logger.info("[OK] 增强版聊天路由已注册 (含知识图谱)")
except Exception as e:
    logger.warning(f"无法导入增强版聊天路由: {e}")

# 注册对话上下文链路由
try:
    from routes.chat_context_routes import router as context_router
    from routes.chat_context_routes import set_context_manager as set_ctx_mgr
    from routes.conversation_context import context_manager as ctx_mgr
    app.include_router(context_router)
    set_ctx_mgr(ctx_mgr)
    logger.info("[OK] 对话上下文链路由已注册")
except Exception as e:
    logger.warning(f"无法导入对话上下文链路由: {e}")

# 注册向量搜索模块
try:
    from routes.vector_search import set_db_manager as set_vec_db, init_on_startup
    from routes.auto_card import set_db_manager as set_card_db
    set_vec_db(db_manager)
    set_card_db(db_manager)
    logger.info("[OK] 向量搜索和自动卡片模块已注册")
except Exception as e:
    logger.warning(f"无法导入向量搜索模块: {e}")

# Wiki 知识网络路由
try:
    from routes.wiki import router as wiki_router
    app.include_router(wiki_router)
    logger.info("[OK] Wiki知识网络路由已注册")
except Exception as e:
    logger.warning(f"无法导入Wiki路由: {e}")

# 调试端点
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )

