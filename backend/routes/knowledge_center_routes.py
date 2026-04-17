"""
智能知识中枢路由
整合知识图谱、多源接入、智能推荐、多模态检索功能
"""
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/knowledge-center", tags=["智能知识中枢"])


# ==================== 知识图谱引擎 ====================

@router.get("/kg/statistics")
async def get_kg_statistics():
    """获取知识图谱统计"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        stats = kg.get_statistics()
        
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"获取图谱统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/entities")
async def query_kg_entities(
    entity_type: str = None,
    keyword: str = None,
    limit: int = 100
):
    """查询知识图谱实体"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        entities = kg.query_entities(entity_type, keyword, limit)
        
        return {"status": "success", "data": entities, "count": len(entities)}
    except Exception as e:
        logger.error(f"查询实体失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/relations")
async def query_kg_relations(
    source_id: str = None,
    target_id: str = None,
    relation_type: str = None,
    limit: int = 100
):
    """查询知识图谱关系"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        relations = kg.query_relations(source_id, target_id, relation_type, limit)
        
        return {"status": "success", "data": relations, "count": len(relations)}
    except Exception as e:
        logger.error(f"查询关系失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/neighbors/{entity_id}")
async def get_entity_neighbors(entity_id: str, depth: int = 1):
    """获取实体邻居"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        neighbors = kg.get_neighbors(entity_id, depth)
        
        return {"status": "success", "data": neighbors}
    except Exception as e:
        logger.error(f"获取邻居失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kg/conflicts")
async def detect_kg_conflicts():
    """检测知识冲突"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        conflicts = kg.detect_conflicts()
        
        return {"status": "success", "data": conflicts, "count": len(conflicts)}
    except Exception as e:
        logger.error(f"检测冲突失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/entity")
async def add_kg_entity(
    name: str,
    entity_type: str,
    description: str = "",
    properties: Dict = None,
    confidence: float = 1.0
):
    """添加知识图谱实体"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        entity_id = kg.add_entity(name, entity_type, description, properties, confidence)
        
        return {"status": "success", "entity_id": entity_id}
    except Exception as e:
        logger.error(f"添加实体失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/relation")
async def add_kg_relation(
    source_name: str,
    target_name: str,
    relation_type: str,
    properties: Dict = None,
    confidence: float = 1.0
):
    """添加知识图谱关系"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_path)
        relation_id = kg.add_relation(
            source_name, target_name, relation_type, properties, confidence
        )
        
        return {"status": "success", "relation_id": relation_id}
    except Exception as e:
        logger.error(f"添加关系失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kg/build-from-doc")
async def build_graph_from_document(
    doc_id: str,
    content: str
):
    """从文档构建图谱"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine, EntityExtractor
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        extractor = EntityExtractor(kg)
        
        result = extractor.build_graph_from_document(doc_id, content)
        
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"构建图谱失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 多源数据接入 ====================

class IngestRequest(BaseModel):
    """数据接入请求"""
    source: str = Field(..., description="数据来源: email/im/local/cloud/bookmark")
    content: Optional[str] = Field(None, description="内容")
    metadata: Optional[Dict] = Field(default_factory=dict, description="元数据")


@router.post("/ingest")
async def ingest_data(request: IngestRequest):
    """接入数据"""
    try:
        from services.multi_source_ingest import MultiSourceIngest
        
        ingest = MultiSourceIngest()
        
        if request.source == "local" and request.metadata.get("file_path"):
            result = ingest.ingest(
                source=request.source,
                file_path=request.metadata["file_path"],
                metadata=request.metadata
            )
        else:
            result = ingest.ingest(
                source=request.source,
                content=request.content,
                metadata=request.metadata
            )
        
        return result
    except Exception as e:
        logger.error(f"数据接入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    """通过文件上传接入数据"""
    try:
        from services.multi_source_ingest import MultiSourceIngest
        
        # 读取文件内容
        content = await file.read()
        
        # 保存到临时文件
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        ingest = MultiSourceIngest()
        result = ingest.ingest(
            source="local",
            file_path=tmp_path,
            metadata={
                "file_name": file.filename,
                "content_type": file.content_type
            }
        )
        
        return result
    except Exception as e:
        logger.error(f"文件接入失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/scan-directory")
async def scan_directory(directory: str, extensions: List[str] = None):
    """扫描目录接入文档"""
    try:
        from services.multi_source_ingest import LocalDocIngest
        
        scanner = LocalDocIngest()
        results = scanner.scan_directory(directory, extensions)
        
        return {
            "status": "success",
            "scanned_count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"目录扫描失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 智能推荐 ====================

class RecommendationRequest(BaseModel):
    """推荐请求"""
    user_id: str
    query: Optional[str] = None
    recommendation_type: str = Field(default="auto", description="auto/completion/warning/expansion/correlation")
    context: Optional[Dict] = Field(default_factory=dict, description="上下文信息")


@router.post("/recommendations")
async def get_recommendations(request: RecommendationRequest):
    """获取智能推荐"""
    try:
        from services.recommendation_engine import RecommendationEngine
        
        engine = RecommendationEngine(request.user_id)
        
        # 更新上下文
        if request.context:
            engine.update_context(request.context)
        
        # 获取推荐
        recommendations = engine.get_recommendations(
            query=request.query,
            recommendation_type=request.recommendation_type
        )
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "count": len(recommendations)
        }
    except Exception as e:
        logger.error(f"获取推荐失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/feedback")
async def record_recommendation_feedback(
    user_id: str,
    recommendation_id: str,
    feedback: str
):
    """记录推荐反馈"""
    try:
        from services.recommendation_engine import RecommendationEngine
        
        engine = RecommendationEngine(user_id)
        engine.record_feedback(recommendation_id, feedback)
        
        return {"status": "success", "message": "反馈已记录"}
    except Exception as e:
        logger.error(f"记录反馈失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations/stats/{user_id}")
async def get_recommendation_stats(user_id: str):
    """获取推荐统计"""
    try:
        from services.recommendation_engine import RecommendationEngine
        
        engine = RecommendationEngine(user_id)
        stats = engine.get_recommendation_stats()
        
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"获取统计失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations/context")
async def update_recommendation_context(
    user_id: str,
    context: Dict
):
    """更新推荐上下文"""
    try:
        from services.recommendation_engine import RecommendationEngine
        
        engine = RecommendationEngine(user_id)
        engine.update_context(context)
        
        return {"status": "success", "message": "上下文已更新"}
    except Exception as e:
        logger.error(f"更新上下文失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 多模态检索 ====================

class SearchRequest(BaseModel):
    """检索请求"""
    query: str
    query_type: str = Field(default="semantic", description="semantic/graph/visual/natural_language")
    top_k: int = 10
    filters: Optional[Dict] = None
    params: Optional[Dict] = None


@router.post("/search")
async def unified_search(request: SearchRequest):
    """统一检索"""
    try:
        from services.multimodal_fusion import UnifiedRetrieval
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        fusion = UnifiedRetrieval(kg)
        
        results = fusion.retrieve(
            query=request.query,
            query_type=request.query_type,
            params={**(request.params or {}), "top_k": request.top_k, "filters": request.filters}
        )
        
        return {"status": "success", "data": results}
    except Exception as e:
        logger.error(f"检索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/semantic")
async def semantic_search(query: str, top_k: int = 10, filters: Dict = None):
    """语义搜索"""
    try:
        from services.multimodal_fusion import SemanticSearchEngine
        
        search = SemanticSearchEngine()
        results = search.search(query, top_k, filters)
        
        return {"status": "success", "results": results, "count": len(results)}
    except Exception as e:
        logger.error(f"语义搜索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/graph")
async def graph_explore(
    entity_id: str,
    mode: str = "BreadthFirst",
    max_depth: int = 3,
    max_nodes: int = 50
):
    """图谱探索"""
    try:
        from services.multimodal_fusion import KnowledgeGraphExplorer
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        
        kg = KnowledgeGraphEngine(settings.DB_path)
        explorer = KnowledgeGraphExplorer(kg)
        
        results = explorer.explore(entity_id, mode, max_depth, max_nodes)
        
        return {"status": "success", "data": results}
    except Exception as e:
        logger.error(f"图谱探索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 隐私安全 ====================

@router.post("/security/encrypt")
async def encrypt_data(data: str):
    """加密数据"""
    try:
        from services.security_manager import SecurityManager
        
        security = SecurityManager()
        encrypted = security.encrypt_data(data)
        
        return {"status": "success", "encrypted_data": encrypted}
    except Exception as e:
        logger.error(f"加密失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/decrypt")
async def decrypt_data(encrypted_data: str):
    """解密数据"""
    try:
        from services.security_manager import SecurityManager
        
        security = SecurityManager()
        decrypted = security.decrypt_data(encrypted_data)
        
        return {"status": "success", "decrypted_data": decrypted}
    except Exception as e:
        logger.error(f"解密失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/security/audit-logs")
async def get_audit_logs(
    actor: str = None,
    resource: str = None,
    start_time: str = None,
    end_time: str = None
):
    """获取审计日志"""
    try:
        from services.security_manager import SecurityManager
        
        security = SecurityManager()
        logs = security.audit_logger.query_logs(actor, resource, start_time, end_time)
        
        return {"status": "success", "logs": logs, "count": len(logs)}
    except Exception as e:
        logger.error(f"获取审计日志失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/security/report")
async def get_security_report():
    """获取安全报告"""
    try:
        from services.security_manager import SecurityManager
        
        security = SecurityManager()
        report = security.audit_logger.get_security_report()
        
        return {"status": "success", "data": report}
    except Exception as e:
        logger.error(f"获取安全报告失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/security/permission-check")
async def check_permission(
    agent_name: str,
    resource: str,
    required_permission: str
):
    """检查智能体权限"""
    try:
        from services.security_manager import SecurityManager
        
        security = SecurityManager()
        allowed = security.check_agent_permission(agent_name, resource, required_permission)
        
        return {"status": "success", "allowed": allowed}
    except Exception as e:
        logger.error(f"权限检查失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 统一仪表盘 ====================

@router.get("/dashboard")
async def get_knowledge_center_dashboard():
    """获取知识中枢仪表盘"""
    try:
        from services.knowledge_graph_engine import KnowledgeGraphEngine
        from services.recommendation_engine import RecommendationEngine
        from services.security_manager import SecurityManager
        
        kg = KnowledgeGraphEngine(settings.DB_PATH)
        kg_stats = kg.get_statistics()
        
        security = SecurityManager()
        security_report = security.audit_logger.get_security_report()
        
        return {
            "status": "success",
            "data": {
                "knowledge_graph": kg_stats,
                "security": security_report,
                "features": {
                    "multi_source_ingest": True,
                    "knowledge_graph": True,
                    "smart_recommendation": True,
                    "multimodal_search": True,
                    "privacy_security": True
                },
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"获取仪表盘失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 场景化应用 ====================

class ScenarioRequest(BaseModel):
    """场景请求"""
    scenario: str  # product_manager/researcher/decision_maker
    action: str
    context: Dict


@router.post("/scenario")
async def execute_scenario(request: ScenarioRequest):
    """执行场景化应用"""
    try:
        if request.scenario == "product_manager":
            return await _product_manager_scenario(request.action, request.context)
        elif request.scenario == "researcher":
            return await _researcher_scenario(request.action, request.context)
        elif request.scenario == "decision_maker":
            return await _decision_maker_scenario(request.action, request.context)
        else:
            raise HTTPException(status_code=400, detail="未知场景")
    except Exception as e:
        logger.error(f"场景执行失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _product_manager_scenario(action: str, context: Dict) -> Dict:
    """产品经理场景"""
    if action == "requirement_analysis":
        return {
            "status": "success",
            "data": {
                "message": "需求分析完成",
                "steps": [
                    "收集用户反馈",
                    "聚类分析高频需求",
                    "关联历史相似需求"
                ]
            }
        }
    return {"status": "unknown_action"}


async def _researcher_scenario(action: str, context: Dict) -> Dict:
    """研究人员场景"""
    if action == "literature_discovery":
        return {
            "status": "success",
            "data": {
                "message": "文献发现完成",
                "steps": [
                    "抓取最新论文",
                    "智能分类",
                    "构建研究脉络"
                ]
            }
        }
    return {"status": "unknown_action"}


async def _decision_maker_scenario(action: str, context: Dict) -> Dict:
    """决策者场景"""
    if action == "market_insight":
        return {
            "status": "success",
            "data": {
                "message": "市场洞察完成",
                "steps": [
                    "整合行业报告",
                    "识别市场趋势",
                    "监控竞品动态"
                ]
            }
        }
    return {"status": "unknown_action"}


from pathlib import Path