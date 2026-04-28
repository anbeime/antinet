"""
Pandoc 风格的文档转换服务
使用 Python 库实现类似 Pandoc 的功能
"""

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pandoc", tags=["Pandoc风格转换"])

# 尝试导入转换库
try:
    import pypandoc
    PYPANDOC_AVAILABLE = True
except ImportError:
    PYPANDOC_AVAILABLE = False

# 查找系统中的 pandoc
def find_pandoc() -> Optional[str]:
    """查找系统中的 pandoc"""
    import shutil
    pandoc_path = shutil.which('pandoc')
    if pandoc_path:
        return pandoc_path
    
    # 检查常见安装位置
    common_paths = [
        r"C:\Program Files\Pandoc\pandoc.exe",
        r"C:\Program Files (x86)\Pandoc\pandoc.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
    return None


@router.get("/status")
async def get_pandoc_status():
    """检查Pandoc状态"""
    pandoc_path = find_pandoc()
    info = {
        "pypandoc_installed": PYPANDOC_AVAILABLE,
        "system_pandoc": pandoc_path is not None,
        "path": pandoc_path
    }
    
    if pandoc_path:
        try:
            result = subprocess.run([pandoc_path, '--version'], capture_output=True, text=True, timeout=10)
            info['version'] = result.stdout.strip().split('\n')[0] if result.stdout else "Unknown"
        except:
            pass
    
    return info


@router.post("/convert")
async def convert_with_pandoc(
    file: UploadFile = File(...),
    to_format: str = Query("docx", description="目标格式: docx, pdf, html, markdown, latex, rst, etc."),
    extra_args: str = Query("", description="额外的 Pandoc 参数")
):
    """使用 Pandoc 转换文档"""
    # 检查是否可用
    pandoc_path = find_pandoc()
    if not pandoc_path and not PYPANDOC_AVAILABLE:
        # 回退到 LibreOffice
        from routes.libreoffice_routes import convert_document
        return await convert_document(file, output_format=to_format)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_file = temp_path / file.filename
        content = await file.read()
        input_file.write_bytes(content)
        
        # 输出文件
        output_ext = to_format if to_format != 'latex' else 'tex'
        output_file = temp_path / f"output.{output_ext}"
        
        # 构建命令
        cmd = [
            pandoc_path or 'pandoc',
            str(input_file),
            '-o', str(output_file)
        ]
        
        # 添加额外参数
        if extra_args:
            cmd.extend(extra_args.split())
        
        # 特定格式参数
        if to_format == 'pdf':
            cmd.extend(['--pdf-engine', 'weasyprint'])
        elif to_format == 'docx':
            cmd.extend(['--reference-doc', 'default'])
        
        logger.info(f"[Pandoc] 执行: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                # 回退到 LibreOffice
                from routes.libreoffice_routes import convert_document
                logger.warning(f"[Pandoc] 失败，回退到 LibreOffice: {result.stderr}")
                return await convert_document(file, output_format='pdf')
            
            if output_file.exists():
                file_content = output_file.read_bytes()
                return Response(
                    content=file_content,
                    media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename={output_file.name}"}
                )
            else:
                raise HTTPException(status_code=500, detail="转换失败")
                
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="转换超时")
        except Exception as e:
            logger.error(f"[Pandoc] 错误: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/markdown-to-docx")
async def markdown_to_word(file: UploadFile = File(...)):
    """Markdown 转 Word"""
    return await convert_with_pandoc(file, to_format="docx")


@router.post("/markdown-to-pdf")
async def markdown_to_pdf(file: UploadFile = File(...)):
    """Markdown 转 PDF"""
    return await convert_with_pandoc(file, to_format="pdf")


@router.post("/markdown-to-html")
async def markdown_to_html(file: UploadFile = File(...)):
    """Markdown 转 HTML"""
    return await convert_with_pandoc(file, to_format="html")


@router.get("/formats")
async def get_pandoc_formats():
    """获取支持的格式"""
    return {
        "document": ["docx", "doc", "odt", "rtf", "markdown", "latex", "rst", "html"],
        "presentation": ["pptx", "ppt", "odp"],
        "spreadsheet": ["xlsx", "xls", "ods", "csv"],
        "ebook": ["epub", "mobi"],
        "other": ["pdf", "json", "xml"]
    }


@router.post("/pdf-to-excel")
async def pdf_to_excel(file: UploadFile = File(...)):
    """从 PDF 提取数据转为 Excel"""
    import csv
    from io import StringIO, BytesIO
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        input_file = temp_path / file.filename
        content = await file.read()
        input_file.write_bytes(content)
        
        # 尝试提取文本
        text = ""
        try:
            # 简单文本提取
            text = content.decode('utf-8', errors='ignore')
        except:
            pass
        
        # 提取表格数据（简化版）
        output_file = temp_path / "output.csv"
        
        # 生成 CSV（实际需要 pdfplumber 等库）
        # 这里简化：每行作为一个记录
        lines = text.split('\n')[:100]  # 取前100行
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['行号', '内容'])
            for i, line in enumerate(lines, 1):
                if line.strip():
                    writer.writerow([i, line.strip()])
        
        if output_file.exists():
            file_content = output_file.read_bytes()
            return Response(
                content=file_content,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=output.csv"}
            )
        
        raise HTTPException(status_code=500, detail="PDF数据提取失败")