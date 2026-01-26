#!/usr/bin/env python3
# backend/main.py - 主API服务
"""
Antinet智能知识管家 - 后端API服务
基于FastAPI,提供数据分析和知识管理接口
"""

# 必须在任何导入之前设置环境变量
import os
import sys

# 添加项目根目录到 Python 路径，以支持绝对导入
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 设置NPU库路径 - 必须在导入模型加载器之前完成
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 确保两个目录都在 PATH 中
paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 设置 QNN 日志级别为 DEBUG 以启用详细日志输出
try:
    from backend.config import settings
    qnn_log_level = settings.QNN_LOG_LEVEL
    os.environ['QNN_LOG_LEVEL'] = qnn_log_level
    print(f"[SETUP] QNN 日志级别设置为: {qnn_log_level}")
except ImportError:
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"
    print(f"[SETUP] 使用默认 QNN 日志级别: DEBUG")

# 显式添加 DLL 目录（Python 3.8+）
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

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

from backend.config import settings
# 可选导入 NPU 路由（如果依赖库可用）
try:
    from backend.routes.npu_routes import router as npu_router
except Exception as e:
    print(f"[WARNING] 无法导入 NPU 路由: {e}")
    npu_router = None
from backend.routes import data_routes  # 导入数据管理模块
# 可选导入聊天机器人路由（如果依赖库可用）
try:
    from backend.routes.chat_routes import router as chat_router
except Exception as e:
    print(f"[WARNING] 无法导入聊天机器人路由: {e}")
    chat_router = None

# 可选导入 CodeBuddy 聊天路由（如果 SDK 可用）
try:
    from backend.routes.codebuddy_chat_routes import router as codebuddy_chat_router
    print("[INFO] CodeBuddy 聊天路由导入成功")
except Exception as e:
    print(f"[WARNING] 无法导入 CodeBuddy 聊天路由: {e}")
    codebuddy_chat_router = None
from backend.database import DatabaseManager

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

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
if npu_router is not None:
    app.include_router(npu_router)  # NPU 推理路由
app.include_router(data_routes.router)  # 数据管理路由
if chat_router is not None:
    app.include_router(chat_router)  # 聊天机器人路由
if codebuddy_chat_router is not None:
    app.include_router(codebuddy_chat_router)  # CodeBuddy 增强聊天路由
    logger.info("✓ CodeBuddy 聊天路由已注册")

# 注册知识管理路由
try:
    from backend.routes.knowledge_routes import router as knowledge_router
    app.include_router(knowledge_router)  # 知识管理路由
    logger.info("✓ 知识管理路由已注册")
except Exception as e:
    logger.warning(f"无法导入知识管理路由: {e}")

# 注册 8-Agent 系统路由
try:
    from backend.routes.agent_routes import router as agent_router
    app.include_router(agent_router)  # 8-Agent 系统路由
    logger.info("✓ 8-Agent 系统路由已注册")
except Exception as e:
    logger.warning(f"无法导入 8-Agent 系统路由: {e}")

# 注册技能系统路由
try:
    from backend.routes.skill_routes import router as skill_router
    app.include_router(skill_router)  # 技能系统路由
    logger.info("✓ 技能系统路由已注册")
except Exception as e:
    logger.warning(f"无法导入技能系统路由: {e}")

# 注册 Excel 导出路由
try:
    from backend.routes.excel_routes import router as excel_router
    app.include_router(excel_router)  # Excel 导出路由
    logger.info("✓ Excel 导出路由已注册")
except Exception as e:
    logger.warning(f"无法导入 Excel 导出路由: {e}")

# 注册完整分析路由（数据 + 8-Agent + Excel）
try:
    from backend.routes.analysis_routes import router as analysis_router
    app.include_router(analysis_router)  # 完整分析路由
    logger.info("✓ 完整分析路由已注册")
except Exception as e:
    logger.warning(f"无法导入完整分析路由: {e}")

# 注册 PDF 处理路由
try:
    from backend.routes.pdf_routes import router as pdf_router
    app.include_router(pdf_router)  # PDF 处理路由
    logger.info("✓ PDF 处理路由已注册")
except Exception as e:
    logger.warning(f"无法导入 PDF 处理路由: {e}")

# 注册 PPT 处理路由
try:
    from backend.routes.ppt_routes import router as ppt_router
    app.include_router(ppt_router)  # PPT 处理路由
    logger.info("✓ PPT 处理路由已注册")
except Exception as e:
    logger.warning(f"无法导入 PPT 处理路由: {e}")

# 初始化 8-Agent 系统
@app.on_event("startup")
async def initialize_agent_system():
    """初始化 8-Agent 系统"""
    try:
        logger.info("[AgentSystem] 正在初始化 8-Agent 系统...")
        from backend.routes.agent_routes import initialize_agents
        initialize_agents()

        # 初始化技能系统
        logger.info("[SkillSystem] 正在初始化技能系统...")
        from backend.services.skill_system import get_skill_registry
        skill_registry = get_skill_registry()
        logger.info(f"✓ 技能系统初始化完成，已注册 {len(skill_registry.skills)} 个技能")

        logger.info("✓ 8-Agent 系统初始化完成")
    except Exception as e:
        logger.warning(f"8-Agent 系统初始化失败: {e}")
        logger.info("系统将继续运行，但 8-Agent 功能可能不可用")


class QueryRequest(BaseModel):
    """数据查询请求"""
    query: str = Field(..., description="自然语言查询")
    data_source: str = Field(default="local", description="数据源")
    context: Dict[str, Any] = Field(default_factory=dict, description="上下文信息")


class FourColorCard(BaseModel):
    """四色卡片"""
    color: str = Field(..., description="卡片颜色: blue|green|yellow|red")
    title: str = Field(..., description="卡片标题")
    content: str = Field(..., description="卡片内容")
    category: str = Field(..., description="类别: 事实|解释|风险|行动")


class AnalysisResult(BaseModel):
    """分析结果"""
    query: str
    facts: List[str] = Field(default_factory=list, description="事实卡片")
    explanations: List[str] = Field(default_factory=list, description="解释卡片")
    risks: List[str] = Field(default_factory=list, description="风险卡片")
    actions: List[str] = Field(default_factory=list, description="行动卡片")
    cards: List[FourColorCard] = Field(default_factory=list, description="生成的四色卡片")
    visualizations: List[Dict] = Field(default_factory=list, description="可视化配置")
    performance: Dict[str, float] = Field(default_factory=dict, description="性能指标")


def load_model_if_needed():
    """按需加载模型 - 使用全局单例，返回加载器实例"""
    try:
        from backend.models.model_loader import get_model_loader
        loader = get_model_loader()
        logger.info(f"[DEBUG] loader.is_loaded before: {loader.is_loaded}")

        # 检查是否已加载
        if not loader.is_loaded:
            logger.info("正在加载QNN模型...")
            try:
                loader.load()
            except Exception as load_err:
                logger.warning(f"loader.load() 抛出异常: {load_err}")
                # 检查是否模型实例已存在（可能热重载后状态不一致）
                if loader.model is not None:
                    logger.info(f"模型实例已存在，手动设置 is_loaded=True")
                    loader.is_loaded = True
                else:
                    # 重新抛出异常
                    raise
            
            logger.info(f"[DEBUG] loader.is_loaded after load: {loader.is_loaded}")

            if not loader.is_loaded:
                # 再次检查 model 属性
                if loader.model is not None:
                    logger.info(f"模型实例存在但 is_loaded=False，修正状态")
                    loader.is_loaded = True
                else:
                    raise RuntimeError("模型加载器返回但 is_loaded=False 且 model=None")

            logger.info("✓ 模型加载成功")
        else:
            logger.info("模型已加载，直接使用")

        logger.info(f"[DEBUG] returning loader with is_loaded={loader.is_loaded}")
        return loader

    except Exception as e:
        logger.error(f" 模型加载失败: {e}")
        import traceback
        logger.error(f"完整堆栈:\n{traceback.format_exc()}")
        return None


def real_inference(query: str, loader) -> Dict[str, Any]:
    """真实NPU推理"""
    logger.info(f"[NPU推理] 处理查询: {query}")

    try:
        # NPU推理 - 使用文本prompt
        start_time = time.time()
        response = loader.infer(
            prompt=f"请分析以下数据查询并生成四色卡片分析结果: {query}",
            max_new_tokens=512,
            temperature=0.7
        )

        inference_time = (time.time() - start_time) * 1000

        logger.info(f"  推理延迟: {inference_time:.2f}ms")

        # 解析模型输出为四色卡片
        # 将响应按句号分割成句子
        sentences = [s.strip() for s in response.split('。') if s.strip()]
        
        # 分配句子到不同类别（简单启发式）
        facts = []
        explanations = []
        risks = []
        actions = []
        
        if sentences:
            # 第一个句子作为事实
            facts.append(sentences[0])
            # 如果有更多句子，分配给其他类别
            if len(sentences) > 1:
                explanations.append(sentences[1])
            if len(sentences) > 2:
                risks.append(sentences[2])
            if len(sentences) > 3:
                actions.append(sentences[3])
            # 剩余句子添加到事实中
            if len(sentences) > 4:
                facts.extend(sentences[4:])
        else:
            # 如果响应为空，抛出错误（模拟数据已被禁止）
            logger.error("模型响应为空，推理失败")
            raise RuntimeError("模型推理返回空响应，NPU推理失败")
        
        result = {
            "facts": facts,
            "explanations": explanations,
            "risks": risks,
            "actions": actions,
            "inference_time_ms": inference_time
        }

        return result

    except Exception as e:
        logger.error(f"推理失败: {e}")
        raise


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("=" * 60)
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("端侧智能数据中枢与协同分析平台")
    logger.info("=" * 60)
    logger.info(f"运行环境: {settings.QNN_DEVICE}")
    logger.info(f"数据不出域: {settings.DATA_STAYS_LOCAL}")
    logger.info("")

    # 创建必要的目录
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

        # 检查是否自动加载模型（为 True 时启动时加载，False 时按需加载）
    if settings.AUTO_LOAD_MODEL:
        # 使用全局单例加载器（确保 /api/npu/status 能正确返回状态）
        try:
            logger.info("[startup_event] 开始初始化模型加载器...")
            from backend.models.model_loader import get_model_loader
            loader = get_model_loader()
            logger.info(f"[startup_event] get_model_loader() returned: {loader}")
            logger.info(f"[startup_event] loader.is_loaded before load(): {loader.is_loaded}")

            model = loader.load()
            logger.info(f"[startup_event] loader.load() completed")
            logger.info(f"[startup_event] loader.is_loaded after load(): {loader.is_loaded}")
            logger.info(f"[startup_event] loader.model exists: {loader.model is not None}")

            # 验证模型是否真的加载成功
            if not loader.is_loaded:
                logger.error(f"[startup_event] loader.is_loaded=False，但 load() 没有抛出异常")
                raise RuntimeError("模型加载器报告 is_loaded=False，但未抛出异常")

            logger.info("✓ 全局模型加载器已初始化")
            logger.info(f"  - 模型: {loader.model_config['name']}")
            logger.info(f"  - 参数: {loader.model_config['params']}")
            logger.info(f"  - 量化: {loader.model_config['quantization']}")
            logger.info(f"  - 状态: 已加载")

            # 验证全局变量
            from backend.models.model_loader import _global_model_loader
            logger.info(f"[startup_event] _global_model_loader: {_global_model_loader}")
            logger.info(f"[startup_event] _global_model_loader is loader: {_global_model_loader is loader}")

        except ImportError as e:
            logger.warning(f"NPU 模型加载器不可用: {e}")
            logger.warning("NPU 功能将被禁用，但其他 API 仍可正常工作")
        except Exception as e:
            logger.error(f" 模型加载失败: {e}")
            logger.error(f"错误类型: {type(e).__name__}")
            import traceback
            logger.error(f"完整堆栈:\n{traceback.format_exc()}")

            # 特殊处理NPU设备创建错误
            error_msg = str(e)
            if "14001" in error_msg or "Failed to create device" in error_msg:
                logger.error("")
                logger.error("=" * 60)
                logger.error("CRITICAL: NPU设备创建失败（错误代码14001）")
                logger.error("=" * 60)
                logger.error("")
                logger.error("可能原因:")
                logger.error("  1. NPU驱动未正确安装")
                logger.error("  2. 另一个进程已占用NPU资源")
                logger.error("  3. DLL版本不匹配")
                logger.error("  4. 系统权限不足")
                logger.error("")
                logger.error("建议操作:")
                logger.error("  1. 运行 fix_npu_device.bat 修复NPU占用")
                logger.error("  2. 重启AIPC以完全释放NPU资源")
                logger.error("  3. 检查Windows事件查看器 -> Windows日志 -> 应用")
                logger.error("  4. 确认NPU驱动在设备管理器中正常运行")
                logger.error("")
                logger.error("临时方案:")
                logger.error("  - 系统将忽略NPU错误继续启动")
                logger.error("  - API仍可使用，但NPU推理功能不可用")
                logger.error("=" * 60)
                logger.error("")
    else:
        logger.info("[startup_event] AUTO_LOAD_MODEL=False，跳过启动时自动加载模型")
        logger.info("[startup_event] 模型将在首次使用时按需加载")
        # 不再吞掉异常，让问题暴露出来


@app.get("/")
async def root():
    """根路径"""
    try:
        from backend.models.model_loader import _global_model_loader
        model_loaded = _global_model_loader is not None and _global_model_loader.is_loaded
    except:
        model_loaded = False

    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Antinet智能知识管家 - 后端API",
        "status": "running",
        "model_loaded": model_loaded,
        "device": settings.QNN_DEVICE
    }


@app.get("/api/health")
async def health_check():
    """健康检查"""
    logger.info("[/api/health] 开始健康检查")

    try:
        # 导入全局模型加载器
        from backend.models.model_loader import _global_model_loader

        # 如果全局加载器不存在，创建它
        if _global_model_loader is None:
            logger.info("[/api/health] 全局模型加载器为空，正在初始化...")
            from backend.models.model_loader import get_model_loader
            _global_model_loader = get_model_loader()
            logger.info(f"[/api/health] 创建了加载器: {_global_model_loader}")
        
        # 检查模型是否已加载
        is_loaded = False
        model_exists = _global_model_loader.model is not None
        
        if _global_model_loader.is_loaded:
            is_loaded = True
            logger.info(f"[/api/health] 模型已加载 (is_loaded=True)")
        elif model_exists and not _global_model_loader.is_loaded:
            # 模型实例存在但is_loaded=False，修正状态
            logger.warning("[/api/health] 模型实例存在但is_loaded=False，修正状态")
            _global_model_loader.is_loaded = True
            is_loaded = True
            logger.info("[/api/health] 已设置is_loaded=True")
        else:
            # 尝试加载模型
            logger.info("[/api/health] 尝试加载模型...")
            try:
                model = _global_model_loader.load()
                is_loaded = _global_model_loader.is_loaded
                logger.info(f"[/api/health] 模型加载结果: is_loaded={is_loaded}")
            except Exception as load_err:
                logger.error(f"[/api/health] 模型加载失败: {load_err}")
                is_loaded = False
        
        status = "healthy" if is_loaded else "degraded"
        logger.info(f"[/api/health] 最终状态: {status}, model_loaded={is_loaded}")
        
    except Exception as e:
        logger.error(f"[/api/health] 健康检查异常: {e}")
        import traceback
        logger.error(f"[/api/health] 详细堆栈:\n{traceback.format_exc()}")
        is_loaded = False
        status = "degraded"
    
    return {
        "status": status,
        "model": settings.MODEL_NAME,
        "model_loaded": is_loaded,
        "device": settings.QNN_DEVICE,
        "data_stays_local": settings.DATA_STAYS_LOCAL,
        "qai_libs_path": os.environ.get('QAI_LIBS_PATH', 'Not set')
    }


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_data(request: QueryRequest):
    """
    数据分析接口 - 核心功能

    接收自然语言查询,返回四色卡片分析结果
    """
    logger.info(f"收到分析请求: {request.query}")

    try:
        # 检查模型是否加载
        current_model = load_model_if_needed()

        if current_model is None:
            logger.error(f"模型加载失败，无法进行分析")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "模型加载失败",
                    "message": "NPU模型未加载，请检查后端日志获取详细错误信息",
                    "debug_info": {
                        "model_path": str(settings.MODEL_PATH),
                        "qai_libs_exists": os.path.exists("C:/ai-engine-direct-helper/samples/qai_libs/QnnHtp.dll"),
                        "bridge_libs_exists": os.path.exists("C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc/QnnHtp.dll"),
                        "qai_libs_path": os.environ.get('QAI_LIBS_PATH', 'Not set')
                    },
                    "suggestions": [
                        "1. 检查模型文件是否存在",
                        "2. 检查DLL文件和依赖库",
                        "3. 查看后端启动日志中的详细错误堆栈",
                        "4. 确保使用正确的 Python 环境（ARM64 + arm64x DLL）"
                    ]
                }
            )

        start_time = time.time()

        # 执行NPU推理
        raw_result = real_inference(request.query, current_model)
        inference_time = raw_result.get("inference_time_ms", 0)

        # 生成四色卡片
        cards = []

        # 蓝色卡片 - 事实
        for fact in raw_result["facts"]:
            cards.append(FourColorCard(
                color="blue",
                title="数据事实",
                content=fact,
                category="事实"
            ))

        # 绿色卡片 - 解释
        for explanation in raw_result["explanations"]:
            cards.append(FourColorCard(
                color="green",
                title="原因解释",
                content=explanation,
                category="解释"
            ))

        # 黄色卡片 - 风险
        for risk in raw_result["risks"]:
            cards.append(FourColorCard(
                color="yellow",
                title="风险预警",
                content=risk,
                category="风险"
            ))

        # 红色卡片 - 行动
        for action in raw_result["actions"]:
            cards.append(FourColorCard(
                color="red",
                title="行动建议",
                content=action,
                category="行动"
            ))

        # 生成可视化配置 (示例)
        visualizations = [
            {
                "type": "bar",
                "title": "数据分布",
                "data": [
                    {"name": "指标A", "value": 85},
                    {"name": "指标B", "value": 72},
                    {"name": "指标C", "value": 91}
                ]
            }
        ]

        total_time = (time.time() - start_time) * 1000

        # 构建响应
        result = AnalysisResult(
            query=request.query,
            facts=raw_result["facts"],
            explanations=raw_result["explanations"],
            risks=raw_result["risks"],
            actions=raw_result["actions"],
            cards=cards,
            visualizations=visualizations,
            performance={
                "total_time_ms": total_time,
                "inference_time_ms": inference_time,
                "meets_target": float(inference_time < 2000)
            }
        )

        logger.info(f"分析完成 (总耗时: {total_time:.2f}ms)")
        logger.info(f"  生成卡片数: {len(cards)}")
        logger.info(f"  NPU推理: {inference_time:.2f}ms")

        return result

    except Exception as e:
        logger.error(f"分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data/upload")
async def upload_data(file: UploadFile = File(...)):
    """
    数据上传接口

    上传数据文件进行本地化处理 (数据不出域)
    """
    logger.info(f"收到文件上传: {file.filename}")

    # 验证文件大小
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件过大,最大支持 {settings.MAX_UPLOAD_SIZE/(1024**2)}MB"
        )

    # 保存到本地
    upload_path = settings.DATA_DIR / "uploads" / file.filename
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    with open(upload_path, 'wb') as f:
        f.write(contents)

    logger.info(f"✓ 文件已保存到本地: {upload_path}")
    logger.info(f"  大小: {len(contents)/(1024**2):.2f}MB")

    return {
        "filename": file.filename,
        "size_bytes": len(contents),
        "saved_path": str(upload_path),
        "data_stays_local": True  # 强调数据不出域
    }


@app.get("/api/performance/benchmark")
async def run_benchmark():
    """
    性能基准测试

    测试NPU推理性能并与CPU对比
    """
    logger.info("开始性能基准测试...")

    results = {
        "device": settings.QNN_DEVICE,
        "model": settings.MODEL_NAME,
        "performance_mode": "BURST",  # 已启用BURST性能模式以优化延迟
        "tests": []
    }

    # 加载模型
    current_model = load_model_if_needed()

    if current_model is None:
        logger.error("模型加载失败，无法进行基准测试")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "模型加载失败",
                "message": "NPU模型未加载，无法进行基准测试",
                "debug_info": {
                    "model_path": str(settings.MODEL_PATH),
                    "model_exists": os.path.exists(settings.MODEL_PATH)
                },
                "suggestions": [
                    "1. 检查后端启动日志中的详细错误",
                    "2. 确保模型文件完整",
                    "3. 验证 DLL 依赖库是否正确"
                ]
            }
        )

    try:
        import random
        import string

        # 生成随机单词列表用于创建不同长度的提示
        word_list = [
            '数据', '分析', '模型', '推理', '性能', '测试', '延迟', '吞吐', '优化', '加速',
            '计算', '算法', '网络', '深度', '学习', '机器', '智能', '人工', '视觉', '语音',
            '自然', '语言', '处理', '特征', '提取', '分类', '回归', '聚类', '降维', '增强',
            '训练', '验证', '测试', '评估', '指标', '精度', '召回', '准确', '误差', '损失'
        ]

        # 测试不同输入长度（以单词数为近似）
        for seq_len in [32, 64, 128, 256]:
            # 创建包含seq_len个随机单词的提示
            prompt_words = random.choices(word_list, k=seq_len)
            prompt = ' '.join(prompt_words)

            # 预热
            for _ in range(3):
                current_model.infer(prompt=prompt, max_new_tokens=32)

            # 正式测试
            latencies = []
            for _ in range(10):
                start = time.time()
                current_model.infer(prompt=prompt, max_new_tokens=32)
                latency = (time.time() - start) * 1000
                latencies.append(latency)

            avg_latency = sum(latencies) / len(latencies)
            min_latency = min(latencies)
            max_latency = max(latencies)

            results["tests"].append({
                "sequence_length": seq_len,
                "avg_latency_ms": round(avg_latency, 2),
                "min_latency_ms": round(min_latency, 2),
                "max_latency_ms": round(max_latency, 2),
                "throughput_qps": round(1000 / avg_latency, 2)
            })

            logger.info(f"  序列长度 {seq_len}: {avg_latency:.2f}ms")

        # 计算总体平均延迟
        overall_avg_latency = sum(test["avg_latency_ms"] for test in results["tests"]) / len(results["tests"])
        results["overall_avg_latency_ms"] = round(overall_avg_latency, 2)
        results["target_latency_ms"] = 500
        results["meets_target"] = overall_avg_latency < 500
        
        logger.info(f"基准测试完成 - 总体平均延迟: {overall_avg_latency:.2f}ms, 目标: <500ms, 达标: {results['meets_target']}")
        
        return results

    except Exception as e:
        logger.error(f"基准测试失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    logger.info("启动开发服务器...")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,  # 禁用热重载，避免状态丢失
        workers=1,     # 确保单进程，避免多进程间的状态隔离
        log_level="info"
    )
