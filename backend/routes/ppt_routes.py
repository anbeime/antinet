"""
PPT 路由
提供 PowerPoint 文档生成和处理的 API
"""
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pathlib import Path
import tempfile
from datetime import datetime

from tools.ppt_processor import PPTProcessor, PPTX_AVAILABLE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ppt", tags=["PPT"])

# ==================== API 模型 ====================

class CardData(BaseModel):
    """卡片数据模型"""
    type: str = Field(..., description="卡片类型: fact/interpret/risk/action")
    title: str = Field(..., description="卡片标题")
    content: str | List[str] = Field(..., description="卡片内容")
    tags: Optional[List[str]] = Field(default=None, description="标签")
    created_at: Optional[str] = Field(default=None, description="创建时间")


class ExportCardsRequest(BaseModel):
    """导出卡片请求"""
    cards: List[CardData] = Field(..., description="卡片列表")
    title: str = Field(default="Antinet 四色卡片分析报告", description="演示文稿标题")
    include_summary: bool = Field(default=True, description="是否包含总结页")
    filename: Optional[str] = Field(default=None, description="输出文件名")


class ChartData(BaseModel):
    """图表数据模型"""
    title: str = Field(..., description="图表标题")
    data: Dict[str, Any] = Field(..., description="图表数据")


class AnalysisReportRequest(BaseModel):
    """分析报告请求"""
    title: str = Field(default="Antinet 智能分析报告", description="报告标题")
    cards: List[CardData] = Field(default_factory=list, description="卡片列表")
    charts: Optional[List[ChartData]] = Field(default=None, description="图表列表")
    summary: Optional[Dict[str, Any]] = Field(default=None, description="总结数据")
    filename: Optional[str] = Field(default=None, description="输出文件名")


# ==================== 端点 ====================

@router.get("/status")
async def get_ppt_status():
    """检查 PPT 功能状态"""
    return {
        "available": PPTX_AVAILABLE,
        "message": "PPT 功能已启用" if PPTX_AVAILABLE else "PPT 功能不可用，请安装 python-pptx"
    }


@router.get("/health")
async def health_check():
    """健康检查"""
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 功能不可用，请安装依赖: pip install python-pptx"
        )
    
    return {
        "status": "healthy",
        "service": "ppt",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/export/cards")
async def export_cards_to_ppt(request: ExportCardsRequest):
    """
    将四色卡片导出为 PPT
    
    Args:
        request: 导出请求，包含卡片数据和配置
        
    Returns:
        PPT 文件
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 功能不可用，请安装依赖: pip install python-pptx"
        )
    
    try:
        # 创建临时文件
        filename = request.filename or f"antinet_cards_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
        temp_dir = Path(tempfile.gettempdir()) / "antinet_ppt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        output_path = temp_dir / filename
        
        # 转换卡片数据
        cards = [card.model_dump() for card in request.cards]
        
        # 生成 PPT
        processor = PPTProcessor()
        result_path = processor.export_cards_to_ppt(
            cards=cards,
            output_path=str(output_path),
            title=request.title,
            include_summary=request.include_summary
        )
        
        # 返回文件
        return FileResponse(
            path=result_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"导出卡片为 PPT 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/analysis")
async def export_analysis_report(request: AnalysisReportRequest):
    """
    创建完整的分析报告 PPT
    
    Args:
        request: 分析报告请求
        
    Returns:
        PPT 文件
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 功能不可用，请安装依赖: pip install python-pptx"
        )
    
    try:
        # 创建临时文件
        filename = request.filename or f"antinet_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
        temp_dir = Path(tempfile.gettempdir()) / "antinet_ppt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        output_path = temp_dir / filename
        
        # 准备分析数据
        analysis_data = {
            "title": request.title,
            "cards": [card.model_dump() for card in request.cards],
            "charts": [chart.model_dump() for chart in request.charts] if request.charts else [],
            "summary": request.summary
        }
        
        # 生成 PPT
        processor = PPTProcessor()
        result_path = processor.create_analysis_report(
            analysis_data=analysis_data,
            output_path=str(output_path)
        )
        
        # 返回文件
        return FileResponse(
            path=result_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"创建分析报告 PPT 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/template/create")
async def create_template_ppt(
    title: str = "Antinet 演示模板",
    slide_count: int = 5
):
    """
    创建 PPT 模板
    
    Args:
        title: 模板标题
        slide_count: 幻灯片数量
        
    Returns:
        PPT 模板文件
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 功能不可用，请安装依赖: pip install python-pptx"
        )
    
    try:
        # 创建临时文件
        filename = f"antinet_template_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pptx"
        temp_dir = Path(tempfile.gettempdir()) / "antinet_ppt"
        temp_dir.mkdir(parents=True, exist_ok=True)
        output_path = temp_dir / filename
        
        # 创建模板
        processor = PPTProcessor()
        prs = processor.create_presentation(title)
        
        # 添加示例卡片
        sample_cards = [
            {
                "type": "fact",
                "title": "事实卡片示例",
                "content": "这是一个事实卡片的示例内容",
                "tags": ["示例", "模板"]
            },
            {
                "type": "interpret",
                "title": "解释卡片示例",
                "content": "这是一个解释卡片的示例内容",
                "tags": ["示例", "模板"]
            },
            {
                "type": "risk",
                "title": "风险卡片示例",
                "content": "这是一个风险卡片的示例内容",
                "tags": ["示例", "模板"]
            },
            {
                "type": "action",
                "title": "行动卡片示例",
                "content": "这是一个行动卡片的示例内容",
                "tags": ["示例", "模板"]
            }
        ]
        
        for card in sample_cards[:slide_count-1]:  # -1 因为已有标题页
            processor.add_card_slide(prs, card)
        
        # 保存
        prs.save(str(output_path))
        
        # 返回文件
        return FileResponse(
            path=str(output_path),
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"创建 PPT 模板失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/card-types")
async def get_card_types():
    """获取支持的卡片类型"""
    return {
        "card_types": [
            {
                "type": "fact",
                "name": "事实卡片",
                "color": "#3498db",
                "description": "客观数据和事实陈述"
            },
            {
                "type": "interpret",
                "name": "解释卡片",
                "color": "#2ecc71",
                "description": "数据解释和原因分析"
            },
            {
                "type": "risk",
                "name": "风险卡片",
                "color": "#f1c40f",
                "description": "风险识别和预警"
            },
            {
                "type": "action",
                "name": "行动卡片",
                "color": "#e74c3c",
                "description": "行动建议和决策支持"
            }
        ]
    }
