"""
PDF 处理 API 路由
为 Antinet 提供 PDF 文档处理接口
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import tempfile
from pathlib import Path
import shutil

from tools.pdf_processor import PDFProcessor, PDF_AVAILABLE

router = APIRouter(prefix="/api/pdf", tags=["PDF处理"])

# 初始化 PDF 处理器
if PDF_AVAILABLE:
    pdf_processor = PDFProcessor()
else:
    pdf_processor = None


@router.get("/status")
async def get_pdf_status():
    """获取 PDF 功能状态"""
    return {
        "available": PDF_AVAILABLE,
        "message": "PDF 功能已启用" if PDF_AVAILABLE else "PDF 功能未安装，请运行: pip install pypdf pdfplumber reportlab"
    }


@router.post("/extract/text")
async def extract_text(
    file: UploadFile = File(...),
    preserve_layout: bool = True
):
    """
    从 PDF 提取文本
    
    Args:
        file: PDF 文件
        preserve_layout: 是否保留布局
        
    Returns:
        提取的文本内容和元数据
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 提取文本
        result = pdf_processor.extract_text(tmp_path, preserve_layout)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": result["pages"],
            "full_text": result["full_text"],
            "metadata": result["metadata"]
        }
    
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/extract/tables")
async def extract_tables(
    file: UploadFile = File(...),
    page_numbers: Optional[str] = Form(None)
):
    """
    从 PDF 提取表格
    
    Args:
        file: PDF 文件
        page_numbers: 页码列表（逗号分隔，如 "1,2,3"）
        
    Returns:
        提取的表格数据
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 解析页码
        pages = None
        if page_numbers:
            try:
                pages = [int(p.strip()) for p in page_numbers.split(",")]
            except ValueError:
                raise HTTPException(status_code=400, detail="页码格式错误")
        
        # 提取表格
        result = pdf_processor.extract_tables(tmp_path, pages)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "tables": result["tables"]
        }
    
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/extract/knowledge")
async def extract_knowledge(file: UploadFile = File(...)):
    """
    从 PDF 提取知识并准备生成四色卡片
    
    Args:
        file: PDF 文件
        
    Returns:
        提取的知识内容和建议的卡片类型
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 提取知识
        result = pdf_processor.extract_knowledge(tmp_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "text_content": result["text_content"],
            "tables": result["tables"],
            "metadata": result["metadata"],
            "suggested_cards": result["suggested_cards"]
        }
    
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/export/cards")
async def export_cards(
    cards: List[dict],
    title: str = "Antinet 分析报告",
    author: str = "Antinet 智能知识管家"
):
    """
    将四色卡片导出为 PDF 报告
    
    Args:
        cards: 四色卡片列表
        title: 报告标题
        author: 报告作者
        
    Returns:
        生成的 PDF 文件
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    if not cards:
        raise HTTPException(status_code=400, detail="卡片列表不能为空")
    
    # 创建临时输出文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        output_path = tmp_file.name
    
    try:
        # 导出 PDF
        result = pdf_processor.export_cards_to_pdf(cards, output_path, title, author)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 返回文件
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename=f"{title}_{result['cards_count']}cards.pdf"
        )
    
    except Exception as e:
        # 清理临时文件
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch/process")
async def batch_process(
    files: List[UploadFile] = File(...),
    extract_text: bool = True,
    extract_tables: bool = True
):
    """
    批量处理 PDF 文档
    
    Args:
        files: PDF 文件列表
        extract_text: 是否提取文本
        extract_tables: 是否提取表格
        
    Returns:
        批量处理结果
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    if not files:
        raise HTTPException(status_code=400, detail="文件列表不能为空")
    
    # 创建临时目录
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_dir = os.path.join(tmp_dir, "input")
        output_dir = os.path.join(tmp_dir, "output")
        os.makedirs(input_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存上传的文件
        for file in files:
            file_path = os.path.join(input_dir, file.filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # 批量处理
        result = pdf_processor.batch_process(
            input_dir,
            output_dir,
            extract_text,
            extract_tables
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "total": result["total"],
            "processed": len(result["processed"]),
            "failed": len(result["failed"]),
            "results": result["processed"] + result["failed"]
        }


# ========== 健康检查 ==========

@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy" if PDF_AVAILABLE else "unavailable",
        "service": "PDF Processing",
        "version": "1.0.0"
    }
