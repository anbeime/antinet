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

logger = logging.getLogger(__name__)

try:
    from skills.pptx.ppt_processor_enhanced import EnhancedPPTProcessor, PPTX_AVAILABLE
    USE_ENHANCED = True
except ImportError:
    from tools.ppt_processor import PPTProcessor, PPTX_AVAILABLE
    USE_ENHANCED = False
    logger.warning("增强版 PPT 处理器不可用，使用基础版本")

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


class TextToPPTRequest(BaseModel):
    """文本转PPT请求"""
    text: str = Field(..., description="Markdown格式的文本内容")
    title: str = Field(default="演示文稿", description="PPT标题")
    theme: str = Field(default="professional", description="主题: professional/creative/minimal")


class ThemeResponse(BaseModel):
    """主题信息响应"""
    id: str
    name: str
    description: str
    preview_colors: List[str]


# ==================== API 端点 ====================

@router.get("/status")
async def get_ppt_status():
    """获取 PPT 服务状态"""
    return {
        "available": PPTX_AVAILABLE,
        "enhanced": USE_ENHANCED,
        "message": "PPT 服务正常运行" if PPTX_AVAILABLE else "PPT 功能不可用，请安装 python-pptx"
    }


@router.get("/themes", response_model=List[ThemeResponse])
async def get_themes():
    """获取可用的 PPT 主题列表"""
    themes = [
        ThemeResponse(
            id="professional",
            name="Professional",
            description="专业商务风格，适合正式场合",
            preview_colors=["#1C2833", "#3498DB", "#F1C40F"]
        ),
        ThemeResponse(
            id="creative",
            name="Creative",
            description="创意活泼风格，适合创意展示",
            preview_colors=["#9B59B6", "#3498DB", "#E67E22"]
        ),
        ThemeResponse(
            id="minimal",
            name="Minimal",
            description="简约现代风格，适合简洁演示",
            preview_colors=["#2C3E50", "#95A5A6", "#3498DB"]
        ),
    ]
    return themes


@router.post("/generate/from-text")
async def generate_ppt_from_text(request: TextToPPTRequest):
    """从文本生成 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            output_path = tmp.name
        
        # 使用 PPT 处理器生成
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 解析 Markdown 并生成 PPT
        from tools.ppt_processor import parse_markdown_content
        slides_data = parse_markdown_content(request.text)
        
        # 根据主题生成 PPT
        processor.create_presentation_from_slides(
            slides_data=slides_data,
            title=request.title,
            output_path=output_path,
            theme=request.theme
        )
        
        # 返回文件
        filename = f"{request.title.replace(' ', '_')}.pptx"
        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"生成 PPT 失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成 PPT 失败: {str(e)}")


@router.post("/export/cards")
async def export_cards_to_ppt(request: ExportCardsRequest):
    """将卡片导出为 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            output_path = tmp.name
        
        # 使用 PPT 处理器
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 转换卡片数据
        cards_data = []
        for card in request.cards:
            cards_data.append({
                'type': card.type,
                'title': card.title,
                'content': card.content if isinstance(card.content, list) else [card.content],
                'tags': card.tags or [],
                'created_at': card.created_at or datetime.now().isoformat()
            })
        
        # 生成 PPT
        processor.create_presentation_from_cards(
            cards=cards_data,
            title=request.title,
            output_path=output_path,
            include_summary=request.include_summary
        )
        
        # 返回文件
        filename = request.filename or f"{request.title.replace(' ', '_')}.pptx"
        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"导出卡片到 PPT 失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/export/analysis-report")
async def export_analysis_report(request: AnalysisReportRequest):
    """导出分析报告为 PPT"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            output_path = tmp.name
        
        # 使用 PPT 处理器
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        # 转换数据
        cards_data = []
        for card in request.cards:
            cards_data.append({
                'type': card.type,
                'title': card.title,
                'content': card.content if isinstance(card.content, list) else [card.content],
                'tags': card.tags or [],
                'created_at': card.created_at or datetime.now().isoformat()
            })
        
        charts_data = []
        if request.charts:
            for chart in request.charts:
                charts_data.append({
                    'title': chart.title,
                    'data': chart.data
                })
        
        # 生成报告
        processor.create_analysis_report(
            title=request.title,
            cards=cards_data,
            charts=charts_data,
            summary=request.summary,
            output_path=output_path
        )
        
        # 返回文件
        filename = request.filename or f"{request.title.replace(' ', '_')}_report.pptx"
        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"导出分析报告失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/process")
async def process_ppt_file(file: UploadFile = File(...)):
    """处理上传的 PPT 文件"""
    if not PPTX_AVAILABLE:
        raise HTTPException(status_code=503, detail="PPT 功能不可用，请安装 python-pptx")
    
    try:
        # 保存上传的文件
        with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            input_path = tmp.name
        
        # 处理 PPT
        if USE_ENHANCED:
            processor = EnhancedPPTProcessor()
        else:
            processor = PPTProcessor()
        
        result = processor.process_ppt(input_path)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"处理 PPT 文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")
