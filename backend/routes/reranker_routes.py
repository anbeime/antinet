"""
Reranker 精排服务 API 路由
提供模型加载/卸载、单条评分、批量精排等接口
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reranker", tags=["Reranker 精排"])


class RerankerScoreRequest(BaseModel):
    """单条评分请求"""
    query: str = Field(..., description="用户查询")
    document: str = Field(..., description="候选文档文本")


class RerankerScoreResponse(BaseModel):
    """单条评分响应"""
    score: float = Field(..., description="相关性分数 (0.0 或 1.0)")
    label: str = Field(..., description="相关性标签 (yes/no)")


class RerankerBatchRequest(BaseModel):
    """批量精排请求"""
    query: str = Field(..., description="用户查询")
    documents: List[str] = Field(..., description="候选文档列表")
    top_k: int = Field(default=5, description="返回 Top-K 结果")


class RerankerBatchResponse(BaseModel):
    """批量精排响应"""
    results: List[Dict[str, Any]] = Field(default_factory=list)
    total: int = 0
    relevant_count: int = 0


@router.get("/status")
async def reranker_status():
    """获取 Reranker 服务状态"""
    try:
        from services.reranker_service import get_reranker_service
        service = get_reranker_service()
        return service.get_status()
    except ImportError:
        return {"error": "Reranker 服务未安装", "is_loaded": False}
    except Exception as e:
        return {"error": str(e), "is_loaded": False}


@router.post("/load")
async def load_reranker():
    """加载 Reranker 模型到 NPU"""
    try:
        from services.reranker_service import get_reranker_service
        service = get_reranker_service()
        success = service.load()
        if success:
            return {"message": "Reranker 模型加载成功", **service.get_status()}
        else:
            raise HTTPException(status_code=500, detail="Reranker 模型加载失败")
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"依赖缺失: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unload")
async def unload_reranker():
    """卸载 Reranker 模型，释放 NPU 资源"""
    try:
        from services.reranker_service import get_reranker_service
        service = get_reranker_service()
        service.unload()
        return {"message": "Reranker 模型已卸载"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score", response_model=RerankerScoreResponse)
async def score_document(request: RerankerScoreRequest):
    """对单个 query-document 对进行相关性评分"""
    try:
        from services.reranker_service import get_reranker_service
        service = get_reranker_service()

        if not service.is_loaded:
            raise HTTPException(status_code=400, detail="Reranker 模型未加载，请先调用 /api/reranker/load")

        score = service.score(request.query, request.document)
        return RerankerScoreResponse(
            score=score,
            label="yes" if score > 0.5 else "no"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rerank", response_model=RerankerBatchResponse)
async def rerank_documents(request: RerankerBatchRequest):
    """对多个候选文档进行批量精排"""
    try:
        from services.reranker_service import get_reranker_service
        service = get_reranker_service()

        if not service.is_loaded:
            raise HTTPException(status_code=400, detail="Reranker 模型未加载，请先调用 /api/reranker/load")

        # 将文档列表转换为 dict 格式
        candidates = [{"content": doc, "index": i} for i, doc in enumerate(request.documents)]

        ranked = service.rerank(request.query, candidates, content_key="content", top_k=request.top_k)

        results = []
        for item in ranked:
            results.append({
                "index": item.get("index"),
                "content": item.get("content", "")[:200],
                "rerank_score": item.get("rerank_score", 0.0),
                "label": "yes" if item.get("rerank_score", 0) > 0.5 else "no"
            })

        relevant_count = sum(1 for r in results if r["rerank_score"] > 0.5)

        return RerankerBatchResponse(
            results=results,
            total=len(request.documents),
            relevant_count=relevant_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
