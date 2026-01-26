"""
Excel Export API Routes
提供 Excel 导出功能的 API 端点
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from datetime import datetime
from pathlib import Path

from skills.xlsx import export_cards_to_excel, export_analysis_to_excel

router = APIRouter(prefix="/api/excel", tags=["excel"])

# 输出目录
OUTPUT_DIR = Path("./data/exports")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class CardExportRequest(BaseModel):
    """卡片导出请求"""
    cards: List[Dict[str, Any]]
    title: Optional[str] = "Antinet 卡片导出"
    filename: Optional[str] = None


class AnalysisExportRequest(BaseModel):
    """分析报告导出请求"""
    analysis_info: Dict[str, Any]
    cards_by_type: Dict[str, List[Dict[str, Any]]]
    data_sheets: Optional[Dict[str, Any]] = None
    charts: Optional[List[Dict[str, Any]]] = None
    filename: Optional[str] = None


@router.post("/export-cards")
async def export_cards(request: CardExportRequest):
    """
    导出卡片到 Excel
    
    请求体示例：
    ```json
    {
        "cards": [
            {
                "id": "fact_001",
                "type": "fact",
                "title": "销售数据",
                "content": "2025年1月销售额为100万",
                "confidence": 0.95,
                "created_at": "2025-01-26",
                "tags": ["销售", "数据"]
            }
        ],
        "title": "销售分析卡片",
        "filename": "sales_cards.xlsx"
    }
    ```
    """
    try:
        # 生成文件名
        if request.filename:
            filename = request.filename
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cards_export_{timestamp}.xlsx"
        
        output_path = OUTPUT_DIR / filename
        
        # 导出
        export_cards_to_excel(
            cards=request.cards,
            output_path=str(output_path),
            title=request.title
        )
        
        return {
            "status": "success",
            "message": "卡片导出成功",
            "filename": filename,
            "path": str(output_path),
            "download_url": f"/api/excel/download/{filename}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/export-analysis")
async def export_analysis(request: AnalysisExportRequest):
    """
    导出完整分析报告到 Excel
    
    请求体示例：
    ```json
    {
        "analysis_info": {
            "title": "2025年1月销售分析报告",
            "date": "2025-01-26",
            "data_source": "sales_data.csv",
            "card_counts": {
                "fact": 5,
                "interpret": 3,
                "risk": 2,
                "action": 4
            },
            "summary": "本报告分析了1月销售数据..."
        },
        "cards_by_type": {
            "fact": [...],
            "interpret": [...],
            "risk": [...],
            "action": [...]
        },
        "filename": "sales_analysis_report.xlsx"
    }
    ```
    """
    try:
        # 生成文件名
        if request.filename:
            filename = request.filename
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"analysis_report_{timestamp}.xlsx"
        
        output_path = OUTPUT_DIR / filename
        
        # 转换 data_sheets (如果有)
        import pandas as pd
        data_sheets = None
        if request.data_sheets:
            data_sheets = {}
            for sheet_name, sheet_data in request.data_sheets.items():
                data_sheets[sheet_name] = pd.DataFrame(sheet_data)
        
        # 导出
        export_analysis_to_excel(
            output_path=str(output_path),
            analysis_info=request.analysis_info,
            cards_by_type=request.cards_by_type,
            data_sheets=data_sheets,
            charts=request.charts
        )
        
        return {
            "status": "success",
            "message": "分析报告导出成功",
            "filename": filename,
            "path": str(output_path),
            "download_url": f"/api/excel/download/{filename}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/download/{filename}")
async def download_file(filename: str, background_tasks: BackgroundTasks):
    """
    下载导出的 Excel 文件
    
    Args:
        filename: 文件名
    """
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 添加后台任务：下载后删除文件（可选）
    # background_tasks.add_task(os.remove, file_path)
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/list")
async def list_exports():
    """
    列出所有导出的文件
    """
    try:
        files = []
        for file_path in OUTPUT_DIR.glob("*.xlsx"):
            stat = file_path.stat()
            files.append({
                "filename": file_path.name,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "download_url": f"/api/excel/download/{file_path.name}"
            })
        
        return {
            "status": "success",
            "count": len(files),
            "files": sorted(files, key=lambda x: x['created_at'], reverse=True)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")


@router.delete("/delete/{filename}")
async def delete_file(filename: str):
    """
    删除导出的文件
    
    Args:
        filename: 文件名
    """
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    try:
        os.remove(file_path)
        return {
            "status": "success",
            "message": f"文件 {filename} 已删除"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
