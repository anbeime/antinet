"""
Pandoc + Mermaid + CSV 完整工作流 API 路由

实现:
- Markdown → PDF/Word/HTML/Excel
- Mermaid 图表自动渲染
- CSV 表格智能提取
"""

import base64
import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Form
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from skills.markdown_converter_skill import (
    PandocConverter,
    MarkdownPreprocessor,
    MermaidRenderer,
    CSVTableExtractor,
    OutputFormat,
    ConversionResult,
    markdown_to_pdf,
    markdown_to_docx,
    markdown_to_html,
    markdown_to_excel,
    pdf_tables_to_csv
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/markdown-converter", tags=["Markdown转换"])


class MarkdownConvertRequest(BaseModel):
    content: str
    output_format: str = "pdf"  # pdf, docx, html, xlsx
    render_mermaid: bool = True
    extract_csv: bool = False


class MermaidRenderRequest(BaseModel):
    code: str
    output_format: str = "svg"  # svg, png


class CSVExtractRequest(BaseModel):
    pass  # 使用文件上传


@router.get("/status")
async def get_converter_status():
    """获取转换器状态"""
    import shutil
    
    # 检查 pandoc
    pandoc_path = shutil.which('pandoc')
    
    # 检查 mmdc
    mmdc_path = shutil.which('mmdc')
    
    # 检查 pdfplumber
    pdfplumber_available = True
    try:
        import pdfplumber
    except ImportError:
        pdfplumber_available = False
    
    # 检查依赖
    dependencies = {}
    for lib, import_name in [
        ('pypandoc', 'pypandoc'),
        ('python-docx', 'docx'),
        ('openpyxl', 'openpyxl'),
        ('pdfplumber', 'pdfplumber'),
        ('markdown', 'markdown'),
    ]:
        try:
            __import__(import_name)
            dependencies[lib] = True
        except ImportError:
            dependencies[lib] = False
    
    return {
        "pandoc": {
            "available": pandoc_path is not None,
            "path": pandoc_path
        },
        "mermaid_cli": {
            "available": mmdc_path is not None,
            "path": mmdc_path
        },
        "pdfplumber": pdfplumber_available,
        "dependencies": dependencies,
        "features": {
            "mermaid_rendering": True,  # 使用在线服务
            "csv_extraction": pdfplumber_available,
            "full_workflow": pandoc_path is not None or dependencies.get('pypandoc', False)
        }
    }


@router.post("/convert")
async def convert_markdown(request: MarkdownConvertRequest):
    """
    转换 Markdown 为指定格式
    
    支持:
    - Mermaid 图表自动渲染为图片
    - CSV 表格提取为 Excel
    """
    try:
        output_format_map = {
            'pdf': OutputFormat.PDF,
            'docx': OutputFormat.DOCX,
            'html': OutputFormat.HTML,
            'xlsx': OutputFormat.EXCEL
        }
        
        output_format = output_format_map.get(request.output_format.lower())
        if not output_format:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {request.output_format}. Supported: pdf, docx, html, xlsx"
            )
        
        converter = PandocConverter()
        result = await converter.convert(
            input_content=request.content,
            input_format='markdown',
            output_format=output_format,
            render_mermaid=request.render_mermaid,
            extract_csv=request.extract_csv
        )
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)
        
        # 确定 content type
        content_types = {
            OutputFormat.PDF: 'application/pdf',
            OutputFormat.DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            OutputFormat.HTML: 'text/html',
            OutputFormat.EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
        
        extensions = {
            OutputFormat.PDF: '.pdf',
            OutputFormat.DOCX: '.docx',
            OutputFormat.HTML: '.html',
            OutputFormat.EXCEL: '.xlsx'
        }
        
        return Response(
            content=result.content,
            media_type=content_types[output_format],
            headers={
                "Content-Disposition": f"attachment; filename=converted{extensions[output_format]}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert/file")
async def convert_markdown_file(
    file: UploadFile = File(...),
    output_format: str = Query("pdf", description="输出格式: pdf, docx, html, xlsx"),
    render_mermaid: bool = Query(True, description="是否渲染 Mermaid 图表")
):
    """通过文件上传转换 Markdown"""
    try:
        content = await file.read()
        text = content.decode('utf-8')
        
        output_format_map = {
            'pdf': OutputFormat.PDF,
            'docx': OutputFormat.DOCX,
            'html': OutputFormat.HTML,
            'xlsx': OutputFormat.EXCEL
        }
        
        output_fmt = output_format_map.get(output_format.lower())
        if not output_fmt:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {output_format}"
            )
        
        converter = PandocConverter()
        result = await converter.convert(
            input_content=text,
            input_format='markdown',
            output_format=output_fmt,
            render_mermaid=render_mermaid
        )
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)
        
        content_types = {
            OutputFormat.PDF: 'application/pdf',
            OutputFormat.DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            OutputFormat.HTML: 'text/html',
            OutputFormat.EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
        
        extensions = {
            OutputFormat.PDF: '.pdf',
            OutputFormat.DOCX: '.docx',
            OutputFormat.HTML: '.html',
            OutputFormat.EXCEL: '.xlsx'
        }
        
        # 获取原始文件名
        original_name = Path(file.filename).stem
        
        return Response(
            content=result.content,
            media_type=content_types[output_fmt],
            headers={
                "Content-Disposition": f"attachment; filename={original_name}{extensions[output_fmt]}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mermaid/render")
async def render_mermaid_diagram(request: MermaidRenderRequest):
    """
    渲染 Mermaid 图表
    
    输入 Mermaid 代码，返回 SVG 或 PNG 图片
    """
    try:
        renderer = MermaidRenderer()
        
        if request.output_format == 'svg':
            svg = await renderer.render_to_svg(request.code)
            if svg:
                return Response(
                    content=svg,
                    media_type='image/svg+xml'
                )
        elif request.output_format == 'png':
            png_base64 = await renderer.render_to_png(request.code)
            if png_base64:
                return Response(
                    content=base64.b64decode(png_base64),
                    media_type='image/png'
                )
        
        raise HTTPException(status_code=500, detail="Mermaid rendering failed")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mermaid render error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/csv/extract")
async def extract_csv_from_pdf(file: UploadFile = File(...)):
    """
    从 PDF 提取 CSV 表格
    
    使用 pdfplumber 智能提取表格数据
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            input_file = tmppath / file.filename
            content = await file.read()
            input_file.write_bytes(content)
            
            csv_content = await pdf_tables_to_csv(str(input_file))
            
            return Response(
                content=csv_content,
                media_type='text/csv',
                headers={
                    "Content-Disposition": f"attachment; filename={Path(file.filename).stem}.csv"
                }
            )
    
    except Exception as e:
        logger.error(f"CSV extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-workflow")
async def full_workflow(
    file: UploadFile = File(...),
    output_format: str = Query("pdf", description="输出格式: pdf, docx, html"),
    render_mermaid: bool = Query(True, description="是否渲染 Mermaid"),
    extract_csv: bool = Query(False, description="是否提取 CSV 表格")
):
    """
    完整工作流: Markdown → PDF/Word/HTML (含 Mermaid + CSV)
    
    1. 解析 Markdown
    2. 渲染 Mermaid 图表
    3. 提取 CSV 表格 (可选)
    4. 转换为目标格式
    """
    try:
        content = await file.read()
        text = content.decode('utf-8')
        
        output_format_map = {
            'pdf': OutputFormat.PDF,
            'docx': OutputFormat.DOCX,
            'html': OutputFormat.HTML
        }
        
        output_fmt = output_format_map.get(output_format.lower())
        if not output_fmt:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format: {output_format}"
            )
        
        converter = PandocConverter()
        result = await converter.convert(
            input_content=text,
            input_format='markdown',
            output_format=output_fmt,
            render_mermaid=render_mermaid,
            extract_csv=extract_csv
        )
        
        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)
        
        content_types = {
            OutputFormat.PDF: 'application/pdf',
            OutputFormat.DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            OutputFormat.HTML: 'text/html'
        }
        
        extensions = {
            OutputFormat.PDF: '.pdf',
            OutputFormat.DOCX: '.docx',
            OutputFormat.HTML: '.html'
        }
        
        original_name = Path(file.filename).stem
        
        return Response(
            content=result.content,
            media_type=content_types[output_fmt],
            headers={
                "Content-Disposition": f"attachment; filename={original_name}{extensions[output_fmt]}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Full workflow error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/formats")
async def get_supported_formats():
    """获取支持的格式列表"""
    return {
        "input": ["markdown", "md"],
        "output": {
            "document": ["pdf", "docx", "html"],
            "spreadsheet": ["xlsx", "csv"],
            "other": ["latex", "rst"]
        },
        "features": {
            "mermaid": {
                "supported": True,
                "output_formats": ["svg", "png"],
                "description": "Mermaid 图表渲染"
            },
            "csv": {
                "supported": True,
                "description": "CSV 表格提取"
            }
        }
    }


# 便捷端点
@router.post("/to-pdf")
async def md_to_pdf(
    file: UploadFile = File(...),
    render_mermaid: bool = Query(True)
):
    """Markdown → PDF (便捷端点)"""
    return await convert_markdown_file(file, "pdf", render_mermaid)


@router.post("/to-docx")
async def md_to_docx(
    file: UploadFile = File(...),
    render_mermaid: bool = Query(True)
):
    """Markdown → Word (便捷端点)"""
    return await convert_markdown_file(file, "docx", render_mermaid)


@router.post("/to-html")
async def md_to_html(
    file: UploadFile = File(...),
    render_mermaid: bool = Query(True)
):
    """Markdown → HTML (便捷端点)"""
    return await convert_markdown_file(file, "html", render_mermaid)


@router.post("/to-xlsx")
async def md_to_xlsx(file: UploadFile = File(...)):
    """Markdown → Excel (便捷端点，提取 CSV)"""
    return await convert_markdown_file(file, "xlsx", False)