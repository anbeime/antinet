"""
报表自动化API路由
提供完整报表自动化功能: 数据处理 → Excel → PDF → PPT
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/report", tags=["report"])

OUTPUT_DIR = Path("./data/exports")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

try:
    from services.report_automation_service import service, ReportAutomationService
    SERVICE_AVAILABLE = True
except ImportError:
    SERVICE_AVAILABLE = False
    logger.warning("报表自动化服务不可用")


class ReportDataRequest(BaseModel):
    """报表数据请求"""
    data: List[Dict[str, Any]] = Field(..., description="数据列表")
    title: str = Field(default="报表分析报告", description="报表标题")
    filename: Optional[str] = Field(default=None, description="输出文件名")
    config: Optional[Dict[str, Any]] = Field(default=None, description="配置选项")


class ExportFormatRequest(BaseModel):
    """导出格式请求"""
    data: List[Dict[str, Any]] = Field(..., description="数据列表")
    title: str = Field(default="报表分析报告", description="报表标题")
    format: str = Field(default="all", description="格式: excel/pdf/ppt/all")
    filename: Optional[str] = Field(default=None, description="输出文件名")
    include_charts: bool = Field(default=True, description="是否包含图表")


class CardsReportRequest(BaseModel):
    """卡片报表请求"""
    cards_by_type: Dict[str, List[Dict[str, Any]]] = Field(..., description="按类型分类的卡片")
    stats: Optional[Dict[str, Any]] = Field(default=None, description="统计数据")
    title: str = Field(default="四色卡片分析报告", description="报表标题")
    format: str = Field(default="all", description="格式: excel/pdf/ppt/all")
    filename: Optional[str] = Field(default=None, description="输出文件名")


@router.get("/status")
async def get_report_status():
    """获取报表服务状态"""
    if not SERVICE_AVAILABLE:
        return {
            "available": False,
            "message": "报表服务不可用，请安装必要依赖"
        }
    
    return {
        "available": True,
        "message": "报表服务正常运行",
        "features": {
            "excel": True,
            "pdf": True,
            "ppt": True,
            "full_report": True
        }
    }


@router.post("/generate")
async def generate_report(request: ReportDataRequest):
    """生成完整报表"""
    if not SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="报表服务不可用")
    
    try:
        result = service.generate_full_report(
            data=request.data,
            config={
                'title': request.title,
                'filename': request.filename,
                **(request.config or {})
            }
        )
        
        return {
            "status": "success",
            "message": "报表生成成功",
            "files": {
                "excel": {
                    "path": result['excel'],
                    "download_url": f"/api/report/download/excel?file={Path(result['excel']).name}"
                },
                "pdf": {
                    "path": result['pdf'],
                    "download_url": f"/api/report/download/pdf?file={Path(result['pdf']).name}"
                },
                "ppt": {
                    "path": result['ppt'],
                    "download_url": f"/api/report/download/ppt?file={Path(result['ppt']).name}"
                }
            },
            "timestamp": result['timestamp']
        }
        
    except Exception as e:
        logger.error(f"生成报表失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成报表失败: {str(e)}")


@router.post("/export")
async def export_report(request: ExportFormatRequest):
    """导出指定格式的报表"""
    if not SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="报表服务不可用")
    
    try:
        result = {}
        timestamp = request.filename or Path(request.filename).stem if request.filename else ""
        
        if request.format in ("excel", "all"):
            config = {
                'title': request.title,
                'filename': f"{timestamp}.xlsx" if timestamp else None
            }
            result['excel'] = service.generate_excel(
                data=request.data,
                config=config,
                include_charts=request.include_charts
            )
        
        if request.format in ("pdf", "all"):
            config = {
                'title': request.title,
                'filename': f"{timestamp}.pdf" if timestamp else None
            }
            cards_data = service._generate_cards_from_data(
                service.process_data(request.data)
            )
            result['pdf'] = service.generate_pdf(cards_data, config)
        
        if request.format in ("ppt", "all"):
            config = {
                'title': request.title,
                'filename': f"{timestamp}.pptx" if timestamp else None
            }
            cards_data = service._generate_cards_from_data(
                service.process_data(request.data)
            )
            result['ppt'] = service.generate_ppt(cards_data, config)
        
        return {
            "status": "success",
            "message": f"报表导出成功 ({request.format})",
            "files": result
        }
        
    except Exception as e:
        logger.error(f"导出报表失败: {e}")
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/cards")
async def generate_cards_report(request: CardsReportRequest):
    """从卡片数据生成报表"""
    if not SERVICE_AVAILABLE:
        raise HTTPException(status_code=503, detail="报表服务不可用")
    
    try:
        result = {}
        
        if request.format in ("excel", "all"):
            excel_file = service.generate_excel(
                data=[],
                config={
                    **request.cards_by_type,
                    'stats': request.stats,
                    'title': request.title,
                    'filename': request.filename
                }
            )
            result['excel'] = excel_file
        
        if request.format in ("pdf", "all"):
            pdf_file = service.generate_pdf(
                data={
                    **request.cards_by_type,
                    'stats': request.stats
                },
                config={'title': request.title}
            )
            result['pdf'] = pdf_file
        
        if request.format in ("ppt", "all"):
            ppt_file = service.generate_ppt(
                data={
                    **request.cards_by_type,
                    'stats': request.stats
                },
                config={'title': request.title}
            )
            result['ppt'] = ppt_file
        
        return {
            "status": "success",
            "message": "卡片报表生成成功",
            "files": result
        }
        
    except Exception as e:
        logger.error(f"生成卡片报表失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@router.get("/download")
async def download_report(
    format: str = Query("excel"),
    file: str = Query(...)
):
    """下载报表文件"""
    file_path = OUTPUT_DIR / file
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    media_types = {
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pdf': 'application/pdf',
        'ppt': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    }
    
    return FileResponse(
        path=str(file_path),
        filename=file,
        media_type=media_types.get(format, 'application/octet-stream')
    )


@router.get("/list")
async def list_reports():
    """列出所有报表文件"""
    try:
        files = {}
        for fmt in ['xlsx', 'pdf', 'pptx']:
            files[fmt] = [
                {
                    "name": f.name,
                    "size": f.stat().st_size,
                    "created_at": datetime.fromtimestamp(f.stat().st_ctime).isoformat()
                }
                for f in OUTPUT_DIR.glob(f"*.{fmt}")]
        
        return {
            "status": "success",
            "files": files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")