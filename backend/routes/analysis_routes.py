"""
Excel数据分析路由
提供Excel文件上传和数据分析功能
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List, Dict, Any
import pandas as pd
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/upload-and-analyze")
async def upload_and_analyze(file: UploadFile = File(...)):
    """
    上传并分析Excel文件
    
    参数:
        file: Excel文件 (.xlsx, .xls)
    
    返回:
        {
            "success": bool,
            "data": List[Dict],  # 数据行
            "columns": List[Dict],  # 列信息
            "stats": Dict  # 统计信息
        }
    """
    logger.info(f"[AnalysisRoutes] 收到文件上传: {file.filename}")
    
    try:
        # 验证文件类型
        if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
            raise HTTPException(
                status_code=400,
                detail="不支持的文件格式，请上传 .xlsx 或 .xls 文件"
            )
        
        # 读取Excel文件
        contents = await file.read()
        
        # 尝试读取Excel
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            logger.error(f"[AnalysisRoutes] Excel读取失败: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Excel文件读取失败: {str(e)}"
            )
        
        logger.info(f"[AnalysisRoutes] 数据形状: {df.shape}")
        
        # 分析列信息
        columns = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            
            # 判断列类型
            col_type = 'string'
            if 'int' in dtype or 'float' in dtype:
                col_type = 'number'
            elif 'datetime' in dtype:
                col_type = 'date'
            elif 'bool' in dtype:
                col_type = 'boolean'
            
            # 获取样本值
            sample = None
            if len(df) > 0:
                sample_val = df[col].iloc[0]
                # 处理NaN和特殊值
                if pd.notna(sample_val):
                    if col_type == 'number':
                        sample = float(sample_val) if isinstance(sample_val, (int, float)) else str(sample_val)
                    else:
                        sample = str(sample_val)
            
            columns.append({
                'key': str(col),
                'name': str(col),
                'type': col_type,
                'sample': sample
            })
        
        # 计算统计信息
        stats = {
            'totalRows': len(df),
            'totalColumns': len(df.columns),
            'numericColumns': len(df.select_dtypes(include=['number']).columns),
            'textColumns': len(df.select_dtypes(include=['object']).columns),
            'dateColumns': len(df.select_dtypes(include=['datetime']).columns),
            'missingValues': int(df.isnull().sum().sum()),
            'duplicates': int(df.duplicated().sum())
        }
        
        logger.info(f"[AnalysisRoutes] 统计信息: {stats}")
        
        # 转换数据为JSON格式 (只返回前1000行避免数据过大)
        max_rows = min(1000, len(df))
        data = df.head(max_rows).fillna('').to_dict('records')
        
        # 处理数据中的特殊值
        for row in data:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None
                elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
                    row[key] = str(value)
        
        logger.info(f"[AnalysisRoutes] 分析完成，返回 {len(data)} 行数据")
        
        return {
            'success': True,
            'data': data,
            'columns': columns,
            'stats': stats,
            'message': f'成功分析 {stats["totalRows"]} 行 x {stats["totalColumns"]} 列数据'
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AnalysisRoutes] 分析失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"数据分析失败: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "analysis",
        "message": "Excel分析服务运行正常"
    }
