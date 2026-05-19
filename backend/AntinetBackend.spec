# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for Antinet Backend
# 生成时间: 2026-05-16

import sys
import os
from pathlib import Path

block_cipher = None

# 绝对路径（硬编码，避免 __file__ 在 PyInstaller 上下文中不可用）
BACKEND_DIR = Path(r"C:\D\zhiyi\backend")
PUBLIC_DIR = Path(r"C:\D\zhiyi\public")

a = Analysis(
    [str(BACKEND_DIR / "main.py")],
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=[
        # 静态资源：字体文件
        (str(PUBLIC_DIR / "fonts" / "NotoSansSC-Regular.ttf"), "fonts"),
    ],
    hiddenimports=[
        # FastAPI 核心
        "uvicorn",
        "uvicorn.loop",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "pydantic",
        "pydantic.fields",
        "pydantic.main",
        "starlette",
        "starlette.routing",
        "starlette.middleware",
        "starlette.responses",
        "python_multipart",
        "multipart",
        "email_validator",
        "slowapi",
        "slowapi.middleware",

        # 数据库
        "database",
        "paths",
        "sqlalchemy",
        "sqlalchemy.orm",
        "sqlalchemy.ext",
        "aiosqlite",
        "sqlite3",

        # AI / 推理（可选，跳过缺失不报错）
        "onnx",
        "onnxruntime",

        # 文档处理
        "pdfplumber",
        "reportlab",
        "reportlab.pdfbase",
        "reportlab.pdfbase.ttfonts",
        "reportlab.platypus",
        "reportlab.lib",
        "python_pptx",
        "openpyxl",
        "PIL",
        "PIL.Image",

        # 数据处理
        "numpy",
        "numpy.core.multiarray",
        "pandas",
        "duckdb",

        # 日志
        "loguru",

        # 路由模块
        "routes.knowledge_routes",
        "routes.chat_routes",
        "routes.data_routes",
        "routes.agent_routes",
        "routes.skill_routes",
        "routes.npu_routes",
        "routes.pdf_routes",
        "routes.pdf_opendataloader_routes",
        "routes.ocr_routes",
        "routes.excel_routes",
        "routes.ppt_routes",
        "routes.multi_model_routes",
        "routes.genie_playground_routes",
        "routes.gtd_routes",
        "routes.backlink_routes",
        "routes.integration_routes",
        "routes.moc_routes",
        "routes.vision_routes",
        "routes.enhanced_chat_routes",
        "routes.evolving_chat_routes",
        "routes.hermes_chat_routes",
        "routes.chat_context_routes",
        "routes.md2pdf_routes",
        "routes.card_pdf_routes",
        "routes.libreoffice_routes",
        "routes.wiki",
        "routes.markdown_converter_routes",
        "routes.meeting_routes",
        "routes.speech_routes",
        "routes.research_routes",
        "routes.ppt_structure_routes",
        "routes.image_routes",
        "routes.analysis_routes",
        "routes.report_routes",
        "routes.collaboration_routes",
        "routes.mindmap_routes",

        # 配置模块
        "conf.app",
        "conf.database",
        "conf.npu",

        # 服务模块
        "services.ai",
        "services.reminder_service",

        # 中间件
        "middleware",

        # 向量搜索
        "routes.vector_search",

        # 工具模块
        "tools.pdf_processor",
        "tools.pdf_four_color_processor",
        "tools.pdf_processor_enhanced",

        # Agents
        "agents",

        # API
        "api",
    ],
    hookspath=[],
    hooksconfig={},
    keys=[],
    exclude_binaries=False,
    name="AntinetBackend",
    debug=False,
    bootloader_ignore_signals=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="AntinetBackend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)