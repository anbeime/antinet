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

try:
    from tools.pdf_four_color_processor import PDFourColorProcessor
    FOUR_COLOR_AVAILABLE = True
except ImportError:
    FOUR_COLOR_AVAILABLE = False

router = APIRouter(prefix="/api/pdf", tags=["PDF处理"])

# 初始化 PDF 处理器
if PDF_AVAILABLE:
    pdf_processor = PDFProcessor()
else:
    pdf_processor = None

# 初始化四色卡片处理器
if FOUR_COLOR_AVAILABLE and PDF_AVAILABLE:
    four_color_processor = PDFourColorProcessor()
else:
    four_color_processor = None


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


# ========== 四色卡片生成 ==========

@router.post("/generate/four-color-cards")
async def generate_four_color_cards(
    file: UploadFile = File(...),
    max_cards: int = 50
):
    """
    从 PDF 生成四色卡片（智能分类）
    
    Args:
        file: PDF 文件
        max_cards: 最大卡片数量
        
    Returns:
        四色卡片列表和统计信息
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    if not FOUR_COLOR_AVAILABLE or four_color_processor is None:
        raise HTTPException(status_code=503, detail="四色卡片处理器未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 生成四色卡片
        result = four_color_processor.generate_four_color_cards(tmp_path, max_cards)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "filename": file.filename,
            "cards": result["cards"],
            "stats": result["stats"],
            "metadata": result["metadata"],
            "message": result["message"]
        }
    
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/export/four-color-excel")
async def export_four_color_excel(
    file: UploadFile = File(...),
    max_cards: int = 50
):
    """
    从 PDF 生成四色卡片并导出为 Excel
    
    Args:
        file: PDF 文件
        max_cards: 最大卡片数量
        
    Returns:
        四色卡片 Excel 文件
    """
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
    if not FOUR_COLOR_AVAILABLE or four_color_processor is None:
        raise HTTPException(status_code=503, detail="四色卡片处理器未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    # 创建输出文件路径
    output_path = tmp_path.replace(".pdf", "_four_color_cards.xlsx")
    
    try:
        # 生成四色卡片
        cards_result = four_color_processor.generate_four_color_cards(tmp_path, max_cards)
        
        if not cards_result["success"]:
            raise HTTPException(status_code=500, detail=cards_result["error"])
        
        # 导出到 Excel
        export_result = four_color_processor.export_to_excel(cards_result["cards"], output_path)
        
        if not export_result["success"]:
            raise HTTPException(status_code=500, detail=export_result["error"])
        
        # 返回文件
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"{Path(file.filename).stem}_四色卡片.xlsx",
            background=None  # 确保文件发送后再清理
        )
    
    except Exception as e:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise HTTPException(status_code=500, detail=str(e))


# ========== 健康检查 ==========

@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy" if PDF_AVAILABLE else "unavailable",
        "service": "PDF Processing",
        "version": "1.0.0"
    }


try:
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


from pydantic import BaseModel
from typing import Dict, Any


class CardsExportRequest(BaseModel):
    """卡片导出请求"""
    cards: List[Dict[str, Any]]
    title: str = "Antinet 分析报告"
    author: str = "Antinet 智能知识管家"


@router.post("/export/cards-docx")
async def export_cards_to_docx(request: CardsExportRequest):
    """
    将四色卡片导出为 Word 文档
    
    请求体:
    {
        "cards": [...],
        "title": "报告标题",
        "author": "作者"
    }
    """
    if not DOCX_AVAILABLE:
        raise HTTPException(status_code=503, detail="Word 导出功能未安装，请运行: pip install python-docx")
    
    if not request.cards:
        raise HTTPException(status_code=400, detail="卡片列表不能为空")
    
    try:
        doc = Document()
        
        doc.add_heading(request.title, 0)
        doc.add_paragraph(f"作者: {request.author}")
        doc.add_paragraph(f"生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph()
        
        card_colors = {
            "blue": RGBColor(52, 152, 219),
            "green": RGBColor(46, 204, 113),
            "yellow": RGBColor(241, 196, 15),
            "red": RGBColor(231, 76, 60)
        }
        
        card_names = {
            "blue": "事实卡片",
            "green": "解释卡片",
            "yellow": "风险卡片",
            "red": "行动卡片"
        }
        
        for idx, card in enumerate(request.cards, 1):
            card_type = card.get("card_type", card.get("type", "blue"))
            card_title = card.get("title", f"卡片 {idx}")
            card_content = card.get("content", "")
            
            if isinstance(card_content, dict):
                card_content = card_content.get("description", str(card_content))
            
            heading = doc.add_heading(f"{idx}. {card_title}", level=1)
            
            color = card_colors.get(card_type, RGBColor(128, 128, 128))
            for run in heading.runs:
                run.font.color.rgb = color
            
            type_para = doc.add_paragraph()
            type_run = type_para.add_run(f"[{card_names.get(card_type, '卡片')}]")
            type_run.font.color.rgb = color
            type_run.font.bold = True
            
            doc.add_paragraph(card_content)
            doc.add_paragraph()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
            output_path = tmp_file.name
        
        doc.save(output_path)
        
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"{request.title}.docx"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


# ==================== PDF 工具集路由 ====================

try:
    from tools.pdf_toolkit import PDFToolkit
    PDF_TOOLKIT_AVAILABLE = True
except ImportError:
    PDF_TOOLKIT_AVAILABLE = False


@router.post("/toolkit/merge")
async def merge_pdfs(
    files: List[UploadFile] = File(..., description="要合并的 PDF 文件列表")
):
    """
    合并多个 PDF 文件
    
    Args:
        files: PDF 文件列表（至少2个）
        
    Returns:
        合并后的 PDF 文件
    """
    if not PDF_TOOLKIT_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 工具集未安装")
    
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="至少需要2个 PDF 文件")
    
    # 保存上传的文件
    input_files = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            input_files.append(tmp_file.name)
    
    # 创建输出文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        output_path = tmp_file.name
    
    try:
        # 合并 PDF
        result = PDFToolkit.merge_pdfs(input_files, output_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="merged.pdf"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"合并失败: {str(e)}")
    
    finally:
        # 清理临时文件
        for f in input_files:
            try:
                os.unlink(f)
            except:
                pass


@router.post("/toolkit/split")
async def split_pdf(
    file: UploadFile = File(..., description="要拆分的 PDF 文件"),
    page_range: Optional[str] = Form(None, description="页码范围（如 '1,3,5-7'），为空则拆分为单页")
):
    """
    拆分 PDF 文件
    
    Args:
        file: PDF 文件
        page_range: 页码范围（如 "1,3,5-7"），为空则拆分为单页
        
    Returns:
        拆分后的 PDF 文件（ZIP 压缩包）
    """
    if not PDF_TOOLKIT_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 工具集未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        input_path = tmp_file.name
    
    # 创建输出目录
    output_dir = tempfile.mkdtemp()
    
    try:
        # 拆分 PDF
        result = PDFToolkit.split_pdf(input_path, output_dir, page_range)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 创建 ZIP 文件
        zip_path = os.path.join(tempfile.gettempdir(), "split_pdfs.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for output_file in result["output_files"]:
                zipf.write(output_file, os.path.basename(output_file))
        
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="split_pdfs.zip"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"拆分失败: {str(e)}")
    
    finally:
        # 清理临时文件
        try:
            os.unlink(input_path)
            shutil.rmtree(output_dir)
        except:
            pass


@router.post("/toolkit/pdf-to-images")
async def pdf_to_images(
    file: UploadFile = File(..., description="PDF 文件"),
    format: str = Form("jpg", description="输出格式（jpg/png）"),
    dpi: int = Form(150, description="图片分辨率"),
    pages: Optional[str] = Form(None, description="页码范围（如 '1-3'），为空则转换所有页")
):
    """
    将 PDF 转换为图片
    
    Args:
        file: PDF 文件
        format: 输出格式（jpg/png）
        dpi: 图片分辨率
        pages: 页码范围（如 "1-3"），为空则转换所有页
        
    Returns:
        图片文件（ZIP 压缩包）
    """
    if not PDF_TOOLKIT_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 工具集未安装")
    
    # 保存上传的文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        input_path = tmp_file.name
    
    # 创建输出目录
    output_dir = tempfile.mkdtemp()
    
    try:
        # 转换 PDF 为图片
        result = PDFToolkit.pdf_to_images(input_path, output_dir, format, dpi, pages)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 创建 ZIP 文件
        zip_path = os.path.join(tempfile.gettempdir(), "pdf_images.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for output_file in result["output_files"]:
                zipf.write(output_file, os.path.basename(output_file))
        
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="pdf_images.zip"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"转换失败: {str(e)}")
    
    finally:
        # 清理临时文件
        try:
            os.unlink(input_path)
            shutil.rmtree(output_dir)
        except:
            pass


@router.post("/toolkit/images-to-pdf")
async def images_to_pdf(
    files: List[UploadFile] = File(..., description="图片文件列表（jpg/png/bmp/tiff）")
):
    """
    将多张图片合并为 PDF
    
    Args:
        files: 图片文件列表
        
    Returns:
        合并后的 PDF 文件
    """
    if not PDF_TOOLKIT_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF 工具集未安装")
    
    if len(files) < 1:
        raise HTTPException(status_code=400, detail="至少需要1个图片文件")
    
    # 保存上传的文件
    input_files = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            input_files.append(tmp_file.name)
    
    # 创建输出文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        output_path = tmp_file.name
    
    try:
        # 合并图片为 PDF
        result = PDFToolkit.images_to_pdf(input_files, output_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="images.pdf"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"合并失败: {str(e)}")
    
    finally:
        # 清理临时文件
        for f in input_files:
            try:
                os.unlink(f)
            except:
                pass
