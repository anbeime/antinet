"""
FastAPI主应用
Antinet智能知识管家 - Windows ARM64端侧智能数据工作站
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import uvicorn
from pathlib import Path

from config import settings

# 创建日志目录
Path("./logs").mkdir(exist_ok=True)
Path("./data").mkdir(exist_ok=True)

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="Antinet智能知识管家",
    description="部署于Windows ARM64的端侧智能数据工作站，通过QNN SDK加速的Qwen2.0-7B实现自然语言驱动的数据分析与知识管理闭环。",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "Antinet智能知识管家",
        "version": "1.0.0",
        "description": "Windows ARM64端侧智能数据工作站",
        "architecture": "8-Agent锦衣卫风格",
        "agents": [
            "锦衣卫总指挥使 (Orchestrator)",
            "密卷房 (Preprocessor)",
            "通政司 (Fact Generator)",
            "监察院 (Interpreter)",
            "太史阁 (Memory)",
            "刑狱司 (Risk Detector)",
            "参谋司 (Action Advisor)",
            "驿传司 (Messenger + 知识检索)"
        ]
    }


@app.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "database": "connected",
            "vector_db": "ready",
            "npu": "available"
        }
    }


# 注册API路由
from api import cards, knowledge, rules, generate

app.include_router(cards.router, prefix="/api/cards", tags=["cards"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(rules.router, prefix="/api/rules", tags=["rules"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理"""
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc)
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
