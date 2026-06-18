"""
Markdown 转 PDF API 路由
使用 reportlab 直接生成 PDF，支持中文字体
"""

import logging
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from typing import Optional
import markdown

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/md2pdf", tags=["Markdown转PDF"])

# ============ 中文字体注册（单例）============
_FONT_REGISTERED = False
_CHINESE_FONT_NAME = 'Helvetica'

def _get_chinese_font_path():
    """查找中文字体"""
    base_dirs = [Path(__file__).parent.parent.parent]
    font_names = ["NotoSansSC-Regular.ttf", "SimHei.ttf"]
    for base in base_dirs:
        for subdir in ["public/fonts", "fonts"]:
            for fname in font_names:
                path = base / subdir / fname
                if path.exists():
                    return str(path)
    return None

def _ensure_chinese_font():
    global _FONT_REGISTERED, _CHINESE_FONT_NAME
    if _FONT_REGISTERED:
        return _CHINESE_FONT_NAME
    _FONT_REGISTERED = True

    font_path = _get_chinese_font_path()
    if font_path:
        try:
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            pdfmetrics.registerFont(TTFont('ChineseFont', font_path, 'Identity-H'))
            _CHINESE_FONT_NAME = 'ChineseFont'
            logger.info(f"[MD2PDF] 中文字体注册成功: {font_path}")
            return 'ChineseFont'
        except Exception as e:
            logger.warning(f"[MD2PDF] 中文字体注册失败: {e}")

    logger.warning("[MD2PDF] 未找到中文字体，使用Helvetica（可能显示乱码）")
    return 'Helvetica'

# 检查依赖
try:
    import reportlab
    import markdown
    MD2PDF_AVAILABLE = True
except ImportError:
    MD2PDF_AVAILABLE = False


def _escape_xml(text: str) -> str:
    """转义 XML 特殊字符，避免 reportlab Paragraph 解析错误"""
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&apos;')
    return text

_THEMES = {
    'warm-academic': {'primary':'#C17B4B', 'secondary':'#8B5E3C', 'accent':'#E8D5C4', 'page':None},
    'classic-thesis': {'primary':'#8B4513', 'secondary':'#6B3410', 'accent':'#F5E6D3', 'page':None},
    'tufte': {'primary':'#8B0000', 'secondary':'#4A4A4A', 'accent':'#F0F0F0', 'page':None},
    'ieee-journal': {'primary':'#1B3A5C', 'secondary':'#2F5496', 'accent':'#E8EEF4', 'page':None},
    'elegant-book': {'primary':'#6B4226', 'secondary':'#8B6914', 'accent':'#FAF0E6', 'page':None},
    'chinese-red': {'primary':'#CC2936', 'secondary':'#8B1A1A', 'accent':'#FFF8F0', 'page':None},
    'ink-wash': {'primary':'#2D2D2D', 'secondary':'#595959', 'accent':'#F8F8F8', 'page':None},
    'github-light': {'primary':'#0366D6', 'secondary':'#586069', 'accent':'#F6F8FA', 'page':None},
    'nord-frost': {'primary':'#5E81AC', 'secondary':'#81A1C1', 'accent':'#ECEFF4', 'page':None},
    'ocean-breeze': {'primary':'#00897B', 'secondary':'#00695C', 'accent':'#E0F2F1', 'page':None},
}

def _md_to_pdf_bytes(md_content: str, title: str, theme: str) -> bytes:
    """将 Markdown 内容转换为 PDF 字节"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib import colors
    from io import BytesIO

    font_name = _ensure_chinese_font()
    tc = _THEMES.get(theme, _THEMES['warm-academic'])
    primary_c = colors.HexColor(tc['primary'])
    secondary_c = colors.HexColor(tc['secondary'])

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'],
        fontName=font_name, fontSize=20, spaceAfter=20, textColor=primary_c)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'],
        fontName=font_name, fontSize=14, spaceAfter=10, textColor=secondary_c)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'],
        fontName=font_name, fontSize=10, spaceAfter=6, leading=16)
    code_style = ParagraphStyle('Code', parent=styles['Normal'],
        fontName='Courier', fontSize=8, spaceAfter=6, leftIndent=20,
        backColor=colors.HexColor(tc['accent']))

    story = []
    story.append(Paragraph(_escape_xml(title), title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_c))
    story.append(Spacer(1, 0.2*inch))

    import re
    lines = md_content.split('\n')
    in_code = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            story.append(Paragraph(_escape_xml(line or ' '), code_style))
            continue
        if not stripped:
            story.append(Spacer(1, 0.1*inch))
            continue
        if stripped.startswith('# '):
            story.append(Paragraph(_escape_xml(stripped[2:]), title_style))
        elif stripped.startswith('## '):
            story.append(Paragraph(_escape_xml(stripped[3:]), heading_style))
        elif stripped.startswith('### '):
            story.append(Paragraph(_escape_xml(stripped[4:]), ParagraphStyle('H3', parent=heading_style, fontSize=12)))
        elif stripped.startswith('- ') or stripped.startswith('* '):
            story.append(Paragraph(f"• {_escape_xml(stripped[2:])}", normal_style))
        elif stripped.startswith('|'):
            continue
        elif re.match(r'^\d+\. ', stripped):
            story.append(Paragraph(_escape_xml(stripped), normal_style))
        else:
            text = _escape_xml(stripped)
            text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'<b>\*', '<b>', text)
            text = re.sub(r'\*</b>', '</b>', text)
            text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
            story.append(Paragraph(text, normal_style))

    doc.build(story)
    return buffer.getvalue()


@router.get("/status")
async def get_md2pdf_status():
    """获取 MD2PDF 功能状态"""
    return {
        "available": MD2PDF_AVAILABLE,
        "message": "MD转PDF功能可用" if MD2PDF_AVAILABLE else "依赖未安装",
        "dependencies": {
            "reportlab": MD2PDF_AVAILABLE,
            "markdown": MD2PDF_AVAILABLE
        }
    }


@router.post("/convert")
async def convert_md_to_pdf(
    file: UploadFile = File(...),
    title: str = Form(""),
    author: str = Form(""),
    theme: str = Form("warm-academic"),
    watermark: str = Form("")
):
    """将 Markdown 文件转换为 PDF"""
    if not MD2PDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="reportlab 或 markdown 未安装")

    if not file.filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="只支持 .md 文件")

    content = await file.read()
    try:
        md_content = content.decode('utf-8')
    except UnicodeDecodeError:
        md_content = content.decode('gbk', errors='replace')

    if not title:
        title = file.filename.replace('.md', '')

    try:
        pdf_bytes = _md_to_pdf_bytes(md_content, title, theme)
    except Exception as e:
        logger.error(f"[MD2PDF] 转换失败: {e}")
        raise HTTPException(status_code=500, detail=f"转换失败: {e}")

    from urllib.parse import quote
    output_name = f"{title}.pdf"
    ascii_name = ''.join(c if ord(c) < 128 else '_' for c in output_name)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(ascii_name)}"}
    )


@router.get("/themes")
async def get_available_themes():
    """获取可用的主题列表"""
    return {
        "themes": [
            {"id": "warm-academic", "name": "暖学术", "description": "陶土色调，温润典雅"},
            {"id": "classic-thesis", "name": "经典论文", "description": "棕色调，LaTeX风格"},
            {"id": "tufte", "name": "Tufte", "description": "极简留白，深红点缀"},
            {"id": "ieee-journal", "name": "期刊蓝", "description": "藏蓝严谨，IEEE风格"},
            {"id": "elegant-book", "name": "精装书", "description": "咖啡色调，书卷气"},
            {"id": "chinese-red", "name": "中国红", "description": "朱红配暖纸"},
            {"id": "ink-wash", "name": "水墨", "description": "纯灰黑，素雅克制"},
            {"id": "github-light", "name": "GitHub", "description": "蓝白极简"},
            {"id": "nord-frost", "name": "Nord冰霜", "description": "蓝灰北欧风"},
            {"id": "ocean-breeze", "name": "海洋", "description": "青绿色调，清新自然"}
        ]
    }