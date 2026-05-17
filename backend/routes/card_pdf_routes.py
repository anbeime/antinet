"""
知识卡片导出 PDF 路由
使用 reportlab 直接生成 PDF，支持中文字体
"""

import logging
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/knowledge_export", tags=["知识卡片PDF"])

# ============ 中文字体注册（单例）============
_FONT_REGISTERED = False
_CHINESE_FONT_NAME = 'Helvetica'

def _get_chinese_font_path():
    """查找中文字体"""
    base_dirs = [
        Path(__file__).parent.parent.parent,  # 项目根目录
    ]
    font_names = ["NotoSansSC-Regular.ttf", "SimHei.ttf"]
    for base in base_dirs:
        for subdir in ["public/fonts", "fonts"]:
            for fname in font_names:
                path = base / subdir / fname
                if path.exists():
                    return str(path)
    return None

def _ensure_chinese_font():
    """确保中文字体已注册"""
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
            logger.info(f"[CardsPDF] 中文字体注册成功: {font_path}")
            return 'ChineseFont'
        except Exception as e:
            logger.warning(f"[CardsPDF] 中文字体注册失败: {e}")

    logger.warning("[CardsPDF] 未找到中文字体")
    return 'Helvetica'


def _build_pdf_from_cards(cards_data, title, author) -> bytes:
    """使用 reportlab 将卡片数据构建为 PDF，返回字节内容"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors
    from io import BytesIO

    font_name = _ensure_chinese_font()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72, leftMargin=72,
        topMargin=72, bottomMargin=18
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'],
        fontName=font_name, fontSize=20, spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'],
        fontName=font_name, fontSize=14, spaceAfter=12)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'],
        fontName=font_name, fontSize=10, spaceAfter=6)

    story = []

    # 标题
    story.append(Paragraph(title, title_style))
    if author:
        story.append(Paragraph(f"作者: {author}", normal_style))
    story.append(Paragraph(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 0.3*inch))

    # 卡片颜色映射
    color_map = {
        'blue': ('5B9BD5', '核心概念'),
        'green': ('70AD47', '关联链接'),
        'yellow': ('FFC000', '参考来源'),
        'red': ('ED7D31', '索引关键词'),
    }

    for card in cards_data:
        card_title = card.get('title', '')
        card_content = card.get('content', '')
        card_type = card.get('card_type', card.get('category', 'blue'))
        color_hex, type_name = color_map.get(card_type, ('5B9BD5', '其他'))

        # 类型标签
        story.append(Paragraph(f"<b>{card_title}</b> <font color='{color_hex}'>[{type_name}]</font>", heading_style))
        story.append(Paragraph(card_content.replace('\n', '<br/>'), normal_style))
        story.append(Spacer(1, 0.15*inch))

    doc.build(story)
    return buffer.getvalue()


@router.get("/cards/export-pdf")
async def export_cards_to_pdf(
    card_ids: str = Query(..., description="逗号分隔的卡片ID"),
    title: str = Query("知识卡片报告", description="文档标题"),
    author: str = Query("", description="作者"),
    theme: str = Query("warm-academic", description="主题"),
    watermark: str = Query("", description="水印")
):
    """将选定的知识卡片导出为 PDF"""
    import re

    # 解析卡片ID
    card_id_list = []
    for x in card_ids.split(','):
        x = x.strip()
        if x.isdigit():
            card_id_list.append(int(x))
        elif x:
            nums = re.findall(r'\d+', x)
            if nums:
                card_id_list.append(int(nums[0]))

    if not card_id_list:
        raise HTTPException(status_code=400, detail="无效的卡片ID")

    logger.info(f"[CardsPDF] 导出请求: card_ids={card_id_list}, title={title}")

    # 从数据库获取卡片
    cards_data = []
    try:
        from database import DatabaseManager
        from config import settings
        db = DatabaseManager(settings.DB_PATH)
        conn = db.get_connection()
        cursor = conn.cursor()
        ids_str = ','.join(map(str, card_id_list))
        cursor.execute(f"SELECT title, content, card_type, category FROM knowledge_cards WHERE id IN ({ids_str})")
        rows = cursor.fetchall()
        conn.close()

        for row in rows:
            cards_data.append({
                'title': row[0] or '',
                'content': row[1] or '',
                'card_type': row[2] or row[3] or 'blue'
            })
        logger.info(f"[CardsPDF] 数据库获取到 {len(cards_data)} 张卡片")
    except Exception as e:
        logger.error(f"[CardsPDF] 数据库错误: {e}")
        # 降级：使用占位卡片
        cards_data = [{'title': title, 'content': f'卡片ID: {card_ids}', 'card_type': 'blue'}]

    # 生成 PDF
    try:
        pdf_bytes = _build_pdf_from_cards(cards_data, title, author)
    except Exception as e:
        logger.error(f"[CardsPDF] PDF生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")

    from urllib.parse import quote
    safe_title = ''.join(c if ord(c) < 128 else '_' for c in title)
    filename = f"{safe_title}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"}
    )