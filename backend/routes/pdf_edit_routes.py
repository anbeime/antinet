"""
PDF 文本编辑路由：接收原PDF每页图片 + 编辑文本位置，生成保留原样式的新PDF
"""
import logging
import json
import base64
from io import BytesIO
from fastapi import APIRouter, Form
from fastapi.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdf", tags=["PDF编辑"])

from routes.card_pdf_routes import _ensure_chinese_font

@router.post("/edit-text")
async def edit_pdf_text(
    images: str = Form(...),
    title: str = Form('文档'),
    author: str = Form('PDFViewer'),
):
    """将原PDF每页渲染为图片背景，在指定位置覆盖白色底块和编辑后文字"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader

    font_name = _ensure_chinese_font()
    pages = json.loads(images)

    buf = BytesIO()
    c = canvas.Canvas(buf)

    for page in pages:
        w, h = page['width'], page['height']
        c.setPageSize((w, h))

        img_data = page['data'].split(',')[1] if ',' in page['data'] else page['data']
        img_bytes = base64.b64decode(img_data)
        c.drawImage(ImageReader(BytesIO(img_bytes)), 0, 0, width=w, height=h)

        for edit in page.get('edits', []):
            text = (edit.get('text') or '').strip()
            if not text:
                continue
            fs = edit.get('fontSize', 12)
            ex = edit['x']
            ey = edit['y']
            ew = edit.get('width', 100)
            eh = edit.get('height', fs)
            c.setFont(font_name, fs)
            c.setFillColorRGB(1, 1, 1)
            c.rect(ex, ey - fs, ew, max(eh, fs) * 1.2, fill=1, stroke=0)
            c.setFillColorRGB(0, 0, 0)
            c.drawString(ex, ey - fs * 0.3, text)

        c.showPage()

    c.save()
    pdf_bytes = buf.getvalue()

    return Response(content=pdf_bytes, media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{title}.pdf"'})
