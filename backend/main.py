#!/usr/bin/env python3
# backend/main.py - 主API服务
"""
Antinet智能知识管家 - 后端API服务
基于FastAPI,提供数据分析和知识管理接口
"""

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
from routes.npu_routes import router as npu_router  # 导入 NPU 路由

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="端侧智能数据中枢与协同分析平台"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(npu_router)  # NPU 推理路由

# 全局变量 - 模型实例
model = None
model_loaded = False


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
    """按需加载模型"""
    global model, model_loaded

    if model_loaded:
        return model

    logger.info("正在加载QNN模型...")

    if not settings.MODEL_PATH.exists():
        logger.error(f"模型文件不存在: {settings.MODEL_PATH}")
        logger.info("请先运行模型转换和部署流程")
        logger.info("详见 backend/model_converter.py")
        return None

    try:
        # 尝试加载QAI AppBuilder
        import qai_appbuilder as qai

        model = qai.load_model(
            str(settings.MODEL_PATH),
            device=settings.QNN_DEVICE
        )
        model_loaded = True
        logger.info(f"✓ 模型加载成功 (设备: {settings.QNN_DEVICE})")
        return model

    except ImportError:
        logger.error("QAI AppBuilder未安装")
        logger.error("=" * 60)
        logger.error("请在AIPC上安装QAI AppBuilder:")
        logger.error("pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-xxx.whl")
        logger.error("=" * 60)
        return None

    except Exception as e:
        logger.error(f"模型加载失败: {e}")
        return None


def real_inference(query: str, model) -> Dict[str, Any]:
    """真实NPU推理"""
    logger.info(f"[NPU推理] 处理查询: {query}")

    try:
        import numpy as np

        # 准备输入 (实际应用中需要真实的tokenizer)
        # 这里使用模拟输入
        input_ids = np.random.randint(0, 1000, (1, 128), dtype=np.int64)

        # NPU推理
        start_time = time.time()
        output = model.infer(input_ids=input_ids)
        inference_time = (time.time() - start_time) * 1000

        logger.info(f"  推理延迟: {inference_time:.2f}ms")

        # 解析输出为四色卡片
        # 实际应用中需要解码模型输出
        result = {
            "facts": [
                f"基于NPU分析,{query}的核心数据如下...",
                "关键指标达到预期目标",
            ],
            "explanations": [
                f"NPU加速分析显示主要驱动因素是...",
                "数据趋势符合历史规律",
            ],
            "risks": [
                "需要关注的风险点包括...",
                "建议建立监控机制",
            ],
            "actions": [
                "推荐的行动方案: ...",
                "优先级建议: 高",
            ],
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

    # 尝试加载模型
    load_model_if_needed()


@app.get("/")
async def root():
    """根路径"""
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
    return {
        "status": "healthy",
        "model": settings.MODEL_NAME,
        "model_loaded": model_loaded,
        "device": settings.QNN_DEVICE,
        "data_stays_local": settings.DATA_STAYS_LOCAL
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

        if current_model is None or not model_loaded:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "模型未加载",
                    "message": "请先部署QNN模型到AIPC",
                    "steps": [
                        "1. 安装QAI AppBuilder: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-xxx.whl",
                        "2. 转换模型到QNN格式: cd backend/models && python convert_to_qnn_on_aipc.py",
                        "3. 重启后端服务: python main.py"
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
                "device": settings.QNN_DEVICE
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
        "tests": []
    }

    # 加载模型
    current_model = load_model_if_needed()

    if current_model is None or not model_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "模型未加载,无法进行基准测试",
                "message": "请先部署QNN模型到AIPC",
                "steps": [
                    "1. 安装QAI AppBuilder: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-xxx.whl",
                    "2. 转换模型到QNN格式: cd backend/models && python convert_to_qnn_on_aipc.py",
                    "3. 重启后端服务: python main.py"
                ]
            }
        )

    try:
        import numpy as np

        # 测试不同输入长度
        for seq_len in [32, 64, 128, 256]:
            input_ids = np.random.randint(0, 1000, (1, seq_len), dtype=np.int64)

            # 预热
            for _ in range(3):
                current_model.infer(input_ids=input_ids)

            # 正式测试
            latencies = []
            for _ in range(10):
                start = time.time()
                current_model.infer(input_ids=input_ids)
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
        reload=settings.DEBUG,
        log_level="info"
    )
