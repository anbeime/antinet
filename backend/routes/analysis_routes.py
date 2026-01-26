"""
完整数据分析与导出 API 路由
整合真实数据、8-Agent 分析和 Excel 导出
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from datetime import datetime
from pathlib import Path
import pandas as pd
import shutil

from skills.xlsx.data_analysis_integration import DataAnalysisExporter
from agents import OrchestratorAgent, MemoryAgent
from database import DatabaseManager

router = APIRouter(prefix="/api/analysis", tags=["智能分析"])

# 数据目录
DATA_DIR = Path("./data/uploads")
EXPORT_DIR = Path("./data/exports")
DATA_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)


class AnalysisRequest(BaseModel):
    """分析请求"""
    data_source: str  # 文件路径或数据库表名
    query: str  # 分析需求
    include_charts: bool = True
    export_filename: Optional[str] = None


class QuickAnalysisRequest(BaseModel):
    """快速分析请求（使用上传的文件）"""
    query: str
    include_charts: bool = True


@router.post("/upload-and-analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    query: str = "请分析这份数据",
    include_charts: bool = True
):
    """
    上传数据文件并进行智能分析
    
    完整流程：
    1. 上传 CSV/Excel 文件
    2. 8-Agent 系统智能分析
    3. 生成四色卡片
    4. 导出 Excel 报告
    5. 返回下载链接
    
    示例：
    ```bash
    curl -X POST "http://localhost:8000/api/analysis/upload-and-analyze" \
      -F "file=@sales_data.csv" \
      -F "query=分析销售趋势和风险" \
      -F "include_charts=true"
    ```
    """
    try:
        # 保存上传的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext = Path(file.filename).suffix
        saved_filename = f"upload_{timestamp}{file_ext}"
        saved_path = DATA_DIR / saved_filename
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 生成输出文件名
        output_filename = f"analysis_{timestamp}.xlsx"
        output_path = EXPORT_DIR / output_filename
        
        # 创建分析导出器（使用全局实例或创建新实例）
        exporter = DataAnalysisExporter(
            db_manager=None,  # 将在内部创建
            orchestrator=None,
            memory=None
        )
        
        # 执行分析和导出
        result = await exporter.analyze_and_export(
            data_source=str(saved_path),
            query=query,
            output_path=str(output_path),
            include_charts=include_charts
        )
        
        return {
            "status": "success",
            "message": "分析完成并已导出",
            "uploaded_file": saved_filename,
            "output_file": output_filename,
            "download_url": f"/api/analysis/download/{output_filename}",
            "cards_count": result['cards_count'],
            "data_rows": result['data_rows'],
            "analysis_summary": {
                "task_id": result['analysis_result'].get('task_id'),
                "agents_used": ["锦衣卫", "密卷房", "通政司", "监察院", "刑狱司", "参谋司", "太史阁", "驿传司"],
                "cards_by_type": {
                    "事实": len(result['excel_data']['cards_by_type']['fact']),
                    "解释": len(result['excel_data']['cards_by_type']['interpret']),
                    "风险": len(result['excel_data']['cards_by_type']['risk']),
                    "行动": len(result['excel_data']['cards_by_type']['action'])
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/analyze-existing")
async def analyze_existing(
    request: AnalysisRequest
):
    """
    分析已存在的数据源
    
    支持：
    - 本地文件: "./data/sales_data.csv"
    - 数据库表: "db:sales_table"
    
    示例：
    ```json
    {
        "data_source": "./data/demo/sales_data.csv",
        "query": "分析上个月的销售趋势，识别风险并提出建议",
        "include_charts": true,
        "export_filename": "sales_analysis.xlsx"
    }
    ```
    """
    try:
        # 验证数据源
        if request.data_source.startswith('db:'):
            # 数据库表
            pass
        else:
            # 文件路径
            if not Path(request.data_source).exists():
                raise HTTPException(status_code=404, detail=f"数据源不存在: {request.data_source}")
        
        # 生成输出文件名
        if request.export_filename:
            output_filename = request.export_filename
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"analysis_{timestamp}.xlsx"
        
        output_path = EXPORT_DIR / output_filename
        
        # 创建分析导出器（使用全局实例或创建新实例）
        exporter = DataAnalysisExporter(
            db_manager=None,
            orchestrator=None,
            memory=None
        )
        
        # 执行分析和导出
        result = await exporter.analyze_and_export(
            data_source=request.data_source,
            query=request.query,
            output_path=str(output_path),
            include_charts=request.include_charts
        )
        
        return {
            "status": "success",
            "message": "分析完成并已导出",
            "data_source": request.data_source,
            "output_file": output_filename,
            "download_url": f"/api/analysis/download/{output_filename}",
            "cards_count": result['cards_count'],
            "data_rows": result['data_rows'],
            "analysis_summary": {
                "task_id": result['analysis_result'].get('task_id'),
                "summary": result['excel_data']['analysis_info']['summary']
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/batch-analyze")
async def batch_analyze(
    files: List[UploadFile] = File(...),
    query: str = "请分析这些数据"
):
    """
    批量分析多个文件
    
    将多个文件合并分析，生成综合报告
    """
    try:
        all_data = []
        uploaded_files = []
        
        # 保存并加载所有文件
        for file in files:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = Path(file.filename).suffix
            saved_filename = f"batch_{timestamp}_{file.filename}"
            saved_path = DATA_DIR / saved_filename
            
            with open(saved_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append(saved_filename)
            
            # 读取数据
            if file_ext == '.csv':
                df = pd.read_csv(saved_path)
            elif file_ext in ['.xlsx', '.xls']:
                df = pd.read_excel(saved_path)
            else:
                continue
            
            df['_source_file'] = file.filename
            all_data.append(df)
        
        # 合并所有数据
        if not all_data:
            raise HTTPException(status_code=400, detail="没有有效的数据文件")
        
        combined_data = pd.concat(all_data, ignore_index=True)
        
        # 保存合并后的数据
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        combined_filename = f"combined_{timestamp}.csv"
        combined_path = DATA_DIR / combined_filename
        combined_data.to_csv(combined_path, index=False)
        
        # 执行分析
        output_filename = f"batch_analysis_{timestamp}.xlsx"
        output_path = EXPORT_DIR / output_filename
        
        exporter = DataAnalysisExporter(
            db_manager=None,
            orchestrator=None,
            memory=None
        )
        
        result = await exporter.analyze_and_export(
            data_source=str(combined_path),
            query=query,
            output_path=str(output_path),
            include_charts=True
        )
        
        return {
            "status": "success",
            "message": "批量分析完成",
            "uploaded_files": uploaded_files,
            "combined_file": combined_filename,
            "total_rows": len(combined_data),
            "output_file": output_filename,
            "download_url": f"/api/analysis/download/{output_filename}",
            "cards_count": result['cards_count']
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量分析失败: {str(e)}")


@router.get("/download/{filename}")
async def download_analysis(filename: str):
    """
    下载分析报告
    """
    file_path = EXPORT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/list-analyses")
async def list_analyses():
    """
    列出所有分析报告
    """
    try:
        files = []
        for file_path in EXPORT_DIR.glob("analysis_*.xlsx"):
            stat = file_path.stat()
            files.append({
                "filename": file_path.name,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "download_url": f"/api/analysis/download/{file_path.name}"
            })
        
        return {
            "status": "success",
            "count": len(files),
            "files": sorted(files, key=lambda x: x['created_at'], reverse=True)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")


@router.get("/demo-data")
async def get_demo_data():
    """
    获取演示数据列表
    
    返回项目中可用的演示数据文件
    """
    demo_dir = Path("./data/demo")
    if not demo_dir.exists():
        return {
            "status": "success",
            "demo_files": []
        }
    
    demo_files = []
    for file_path in demo_dir.glob("*.csv"):
        demo_files.append({
            "filename": file_path.name,
            "path": str(file_path),
            "size": file_path.stat().st_size
        })
    
    return {
        "status": "success",
        "demo_files": demo_files,
        "usage": "使用 /api/analysis/analyze-existing 端点分析这些文件"
    }
