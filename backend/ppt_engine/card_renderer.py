"""
Card → Direct PPTX Renderer using python-pptx (bypasses buggy SVG→DrawingML pipeline)
"""

import re
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from pptx import Presentation
from pptx.util import Inches, Pt, Emu, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

from design_system import DesignPresets, CardColors as DsCardColors

logger = logging.getLogger(__name__)

CARD_TYPE_MAP = {
    "blue": {"label": "核心事实", "section": "核心事实"},
    "green": {"label": "深度解读", "section": "深度解读"},
    "yellow": {"label": "风险警示", "section": "风险警示"},
    "red": {"label": "行动方案", "section": "行动方案"},
}


def _clr(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _theme_colors(name: str = "professional") -> dict:
    dt = DesignPresets.get(name)
    cc = DsCardColors()
    return {
        "primary": _clr(dt.colors.primary),
        "accent": _clr(dt.colors.accent),
        "bg": _clr(dt.colors.background),
        "text": _clr(dt.colors.text),
        "title_font": dt.fonts.title,
        "body_font": dt.fonts.body,
        "card_blue": _clr(cc.blue),
        "card_green": _clr(cc.green),
        "card_yellow": _clr(cc.yellow),
        "card_red": _clr(cc.red),
    }


def _card_color(card_type: str, colors: dict) -> RGBColor:
    m = {"blue": "card_blue", "green": "card_green", "yellow": "card_yellow", "red": "card_red"}
    return colors.get(m.get(card_type, "card_blue"), colors["card_blue"])


def _add_textbox(slide, left, top, width, height, text, font_name, font_size, color, bold=False, alignment=PP_ALIGN.LEFT):
    txbox = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txbox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    p = tf.paragraphs[0]
    p.text = text
    p.font.name = font_name
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.alignment = alignment
    p.space_after = Pt(0)
    p.space_before = Pt(0)
    return txbox


def _add_card(slide, left, top, w, h, card_type, title, content, colors):
    card_clr = _card_color(card_type, colors)
    body_font = colors["body_font"]
    text_clr = colors["text"]

    # Card background (rounded rect)
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = card_clr
    shape.fill.fore_color.brightness = 0.85
    shape.line.fill.background()

    # Left accent bar
    bar = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(0.08), Inches(h),
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = card_clr
    bar.line.fill.background()

    # Single text frame: title (bold) + content (normal) in same frame
    txbox = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.15), Inches(w - 0.4), Inches(h - 0.3))
    tf = txbox.text_frame
    tf.word_wrap = True
    tf.auto_size = None

    p = tf.paragraphs[0]
    p.text = title[:50]
    p.font.name = colors["title_font"]
    p.font.size = Pt(14)
    p.font.color.rgb = card_clr
    p.font.bold = True
    p.space_after = Pt(6)

    p2 = tf.add_paragraph()
    p2.text = content
    p2.font.name = body_font
    p2.font.size = Pt(11)
    p2.font.color.rgb = text_clr
    p2.font.bold = False
    p2.space_before = Pt(0)


def _add_section_header(slide, section_title, color, colors):
    # Accent line at top
    top_line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0), Inches(0), Inches(13.33), Inches(0.05),
    )
    top_line.fill.solid()
    top_line.fill.fore_color.rgb = colors["accent"]
    top_line.line.fill.background()

    _add_textbox(slide, 0.55, 0.35, 8, 0.5, section_title,
                 colors["title_font"], 22, colors["primary"], bold=True)

    # Underline
    ul = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0.55), Inches(0.85), Inches(1.2), Inches(0.04),
    )
    ul.fill.solid()
    ul.fill.fore_color.rgb = color
    ul.line.fill.background()


def generate_pptx_direct(
    topic: str,
    cards: list[dict],
    theme_name: str = "professional",
    output_path: Optional[str] = None,
) -> str:
    """Generate PPTX directly using python-pptx (NO SVG pipeline)."""
    colors = _theme_colors(theme_name)
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    SLIDE_W = 13.33
    SLIDE_H = 7.5

    # ── Cover slide ──
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = colors["bg"]

    # Accent bar at top
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_W), Inches(0.06))
    bar.fill.solid(); bar.fill.fore_color.rgb = colors["accent"]; bar.line.fill.background()

    _add_textbox(slide, 1.5, 2.5, 10, 1.2, topic, colors["title_font"], 40, colors["primary"], bold=True, alignment=PP_ALIGN.CENTER)
    _add_textbox(slide, 1.5, 3.8, 10, 0.6, "智能分析报告", colors["body_font"], 18, colors["text"], alignment=PP_ALIGN.CENTER)
    _add_textbox(slide, 1.5, 5.0, 10, 0.4, datetime.now().strftime("%Y-%m-%d"), colors["body_font"], 14, colors["text"], alignment=PP_ALIGN.CENTER)

    # ── Content slides ──
    by_type = {}
    for c in cards:
        t = c.get("type", "blue")
        by_type.setdefault(t, []).append(c)

    type_order = ["blue", "green", "yellow", "red"]
    all_groups = []
    for t in type_order:
        if t in by_type:
            for i in range(0, len(by_type[t]), 4):
                all_groups.append(by_type[t][i:i+4])

    CARD_W = 5.8
    CARD_H = 2.6
    GAP_X = 0.45
    GAP_Y = 0.35
    START_X = 0.55
    START_Y = 1.5
    COL2_X = START_X + CARD_W + GAP_X

    def add_content_slide(card_group):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        bg = slide.background; bg.fill.solid(); bg.fill.fore_color.rgb = colors["bg"]

        # Section header
        ctype = card_group[0].get("type", "blue")
        info = CARD_TYPE_MAP.get(ctype, {})
        section_title = info.get("section", "内容摘要")
        section_color = _card_color(ctype, colors)
        _add_section_header(slide, section_title, section_color, colors)

        # Cards in 2x2 grid
        positions = [
            (START_X, START_Y),
            (COL2_X, START_Y),
            (START_X, START_Y + CARD_H + GAP_Y),
            (COL2_X, START_Y + CARD_H + GAP_Y),
        ]
        for i, card in enumerate(card_group[:4]):
            if i >= len(positions):
                break
            cx, cy = positions[i]
            _add_card(slide, cx, cy, CARD_W, CARD_H,
                      card.get("type", "blue"),
                      card.get("title", ""),
                      card.get("content", ""),
                      colors)

    for group in all_groups:
        add_content_slide(group)

    # ── Summary slide ──
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background; bg.fill.solid(); bg.fill.fore_color.rgb = colors["bg"]

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_W), Inches(0.06))
    bar.fill.solid(); bar.fill.fore_color.rgb = colors["accent"]; bar.line.fill.background()

    _add_textbox(slide, 0.6, 0.6, 10, 0.6, "要点总结", colors["title_font"], 28, colors["primary"], bold=True)

    y = 1.3
    for i, c in enumerate(cards[:8]):
        title = c.get("title", "")[:60]
        _add_textbox(slide, 0.9, y, 10, 0.55,
                     f"{i+1}. {title}", colors["body_font"], 15, colors["text"])
        y += 0.6

    # Save
    if output_path is None:
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(output_dir / f"{topic}_{ts}.pptx")

    prs.save(output_path)
    logger.info(f"PPTX generated directly: {output_path} ({len(prs.slides)} slides)")
    return output_path
