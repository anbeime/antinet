"""
Card → Direct PPTX Renderer using python-pptx (bypasses buggy SVG→DrawingML pipeline)
Dark-tech theme with gold accents, matching the Qualcomm Snapdragon competition style.
"""

import re, json, logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from pptx import Presentation
from pptx.util import Inches, Pt, Emu, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

logger = logging.getLogger(__name__)

SLIDE_W = 13.333
SLIDE_H = 7.5

# ── Color Palette (Dark Tech + Gold) ──
BG_DARK = RGBColor(0x0A, 0x0E, 0x1A)
BG_CARD = RGBColor(0x12, 0x1A, 0x2E)
GOLD = RGBColor(0xD4, 0xA5, 0x37)
GOLD_BRIGHT = RGBColor(0xF5, 0xC8, 0x42)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xB0, 0xB8, 0xC8)
MED_GRAY = RGBColor(0x7A, 0x84, 0x9A)
BLUE = RGBColor(0x4A, 0x9E, 0xF5)
GREEN = RGBColor(0x4E, 0xC9, 0x8B)
CARD_BLUE = RGBColor(0x3B, 0x82, 0xF6)
CARD_GREEN = RGBColor(0x22, 0xC5, 0x5E)
CARD_YELLOW = RGBColor(0xF5, 0x9E, 0x0B)
CARD_RED = RGBColor(0xEF, 0x44, 0x44)

_INVALID_XML_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uD800-\uDFFF\uFDD0-\uFDEF\uFFFE\uFFFF]")

def _sanitize(text: str) -> str:
    if not text:
        return ""
    return _INVALID_XML_RE.sub("", text)

# ── Theme System ──

_THEMES = {
    "dark-tech-gold": {
        "bg": BG_DARK,
        "bg_card": BG_CARD,
        "text": WHITE,
        "text_light": LIGHT_GRAY,
        "text_muted": MED_GRAY,
        "accent": GOLD,
        "accent_bright": GOLD_BRIGHT,
        "title_font": "Microsoft YaHei",
        "body_font": "Microsoft YaHei",
        "card_blue": CARD_BLUE,
        "card_green": CARD_GREEN,
        "card_yellow": CARD_YELLOW,
        "card_red": CARD_RED,
    },
    "professional": {
        "bg": RGBColor(0xF8, 0xFA, 0xFC),
        "bg_card": RGBColor(0xEE, 0xF1, 0xF8),
        "text": RGBColor(0x1F, 0x29, 0x37),
        "text_light": RGBColor(0x4B, 0x55, 0x6B),
        "text_muted": RGBColor(0x6B, 0x7A, 0x99),
        "accent": RGBColor(0x1E, 0x3A, 0x8A),
        "accent_bright": RGBColor(0x3B, 0x82, 0xF6),
        "title_font": "Microsoft YaHei",
        "body_font": "Microsoft YaHei",
        "card_blue": CARD_BLUE,
        "card_green": CARD_GREEN,
        "card_yellow": CARD_YELLOW,
        "card_red": CARD_RED,
    },
}

CARD_LABELS = {
    "blue": "核心事实",
    "green": "深度解读",
    "yellow": "风险警示",
    "red": "行动方案",
}


def _resolve_theme(name: str) -> dict:
    raw = _THEMES.get(name, _THEMES["dark-tech-gold"])
    t = dict(raw)
    t["card_map"] = {
        "blue": t["card_blue"],
        "green": t["card_green"],
        "yellow": t["card_yellow"],
        "red": t["card_red"],
    }
    return t


def _card_type(card_type: str, colors: dict) -> RGBColor:
    return colors["card_map"].get(card_type, colors["card_blue"])


# ── Design Helpers ──

def _add_shape(slide, left, top, w, h, fill=None, line=None, line_w=None, shape_type=MSO_SHAPE.RECTANGLE):
    s = slide.shapes.add_shape(shape_type, Inches(left), Inches(top), Inches(w), Inches(h))
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = fill
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = line
        s.line.width = Pt(line_w or 1)
    else:
        s.line.fill.background()
    return s


def _add_rounded_rect(slide, left, top, w, h, fill, line=None, line_w=1):
    return _add_shape(slide, left, top, w, h, fill, line, line_w, MSO_SHAPE.ROUNDED_RECTANGLE)


def _add_accent_line(slide, left, top, w, color):
    _add_shape(slide, left, top, w, 0.04, fill=color)


def _add_textbox(slide, left, top, width, height, text, font_name, font_size, color,
                 bold=False, alignment=PP_ALIGN.LEFT):
    txbox = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txbox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    p = tf.paragraphs[0]
    p.text = _sanitize(text)
    p.font.name = font_name
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.alignment = alignment
    p.space_after = Pt(0)
    p.space_before = Pt(0)
    return txbox


def _add_footer_bar(slide, colors, text="知易智能知识管家"):
    _add_shape(slide, 0, SLIDE_H - 0.35, SLIDE_W, 0.35, fill=RGBColor(0x08, 0x0C, 0x16))
    _add_textbox(slide, 0.4, SLIDE_H - 0.32, 8, 0.3, text, colors["body_font"], 9, colors["text_muted"])


def _add_page_number(slide, num, total, colors):
    _add_textbox(slide, SLIDE_W - 1.2, SLIDE_H - 0.32, 0.9, 0.3,
                 f"{num}/{total}", colors["body_font"], 9, colors["text_muted"], alignment=PP_ALIGN.RIGHT)


def _gradient_bg(slide):
    bg = slide.background
    fill = bg.fill
    fill.gradient()
    fill.gradient_stops[0].color.rgb = RGBColor(0x0A, 0x0E, 0x1A)
    fill.gradient_stops[0].position = 0.0
    fill.gradient_stops[1].color.rgb = RGBColor(0x0D, 0x15, 0x28)
    fill.gradient_stops[1].position = 1.0


def _solid_bg(slide, color=BG_DARK):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


# ── Slide Builders ──

def _build_cover_slide(prs, topic, colors):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _solid_bg(slide, colors["bg"])

    top_line = _add_shape(slide, 2, 1.2, 9.333, Pt(4), colors["accent"])
    _add_textbox(slide, 2, 1.6, 9.333, 1.2, topic, colors["title_font"], 40, colors["accent_bright"],
                 bold=True, alignment=PP_ALIGN.LEFT)
    _add_textbox(slide, 2, 2.9, 9.333, 0.6, "智能分析报告 · 锦衣卫多智能体生成",
                 colors["body_font"], 18, colors["text_light"], alignment=PP_ALIGN.LEFT)
    _add_textbox(slide, 2, 3.7, 9.333, 0.5,
                 "四色卡片 · Agent 协同 · NPU 加速",
                 colors["body_font"], 14, colors["accent"], alignment=PP_ALIGN.LEFT)
    _add_shape(slide, 2, 4.5, 9.333, Pt(2), colors["accent"])

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    _add_textbox(slide, 2, 5.0, 9.333, 0.4, f"生成时间: {now_str}",
                 colors["body_font"], 14, colors["text_muted"], alignment=PP_ALIGN.LEFT)

    _add_footer_bar(slide, colors)


def _build_section_slide(slide, card_type, title, content, colors, slide_num, total_slides):
    """一页一张卡片，深色背景 + 白色/金色文字（高对比度）"""
    clr = _card_type(card_type, colors)
    body_font = colors["body_font"]
    title_font = colors["title_font"]
    content_len = len(content)

    _solid_bg(slide, colors["bg"])

    _add_accent_line(slide, 0, 0, SLIDE_W, colors["accent"])
    _add_shape(slide, 0, 0, 0.10, SLIDE_H, fill=clr)

    if content_len < 300:
        icons = {"blue": "📘", "green": "📗", "yellow": "📙", "red": "📕"}
        icon_char = icons.get(card_type, "📄")

        _add_textbox(slide, 0.5, 0.25, 10, 0.5, _sanitize(title[:60]),
                     title_font, 24, clr, bold=True)
        _add_accent_line(slide, 0.5, 0.75, 1.2, clr)
        _add_textbox(slide, 0.5, 1.0, SLIDE_W - 1.2, 1.2, icon_char,
                     body_font, 72, colors["text"], alignment=PP_ALIGN.CENTER)
        _add_textbox(slide, 0.5, 2.3, SLIDE_W - 1.2, 0.7, _sanitize(title[:80]),
                     title_font, 28, clr, bold=True, alignment=PP_ALIGN.CENTER)
        fs = 16 if content_len < 100 else 14
        _add_textbox(slide, 1.0, 3.2, SLIDE_W - 2.4, SLIDE_H - 4.0,
                     _sanitize(content), body_font, fs, colors["text"], alignment=PP_ALIGN.CENTER)
    else:
        title_fs = 22 if len(title) < 20 else 18
        _add_textbox(slide, 0.5, 0.25, 10, 0.5, _sanitize(title[:60]),
                     title_font, title_fs, clr, bold=True)
        _add_accent_line(slide, 0.5, 0.75, 1.2, clr)

        labels = {"blue": "📘 核心事实", "green": "📗 深度解读",
                  "yellow": "📙 风险警示", "red": "📕 行动方案"}
        _add_textbox(slide, 0.5, 0.9, 3, 0.35, labels.get(card_type, "📄 笔记"),
                     body_font, 11, clr)

        if content_len < 600:
            fs = 15
            as_code = False
        else:
            fs = 13
            content = content[:800] + "\n\n[内容摘要]"
            as_code = True

        if as_code:
            _add_rounded_rect(slide, 0.5, 1.4, SLIDE_W - 1.2, SLIDE_H - 2.3,
                              fill=RGBColor(0x0D, 0x11, 0x1A), line=clr, line_w=0.5)
            _add_textbox(slide, 0.7, 1.5, SLIDE_W - 1.6, SLIDE_H - 2.6,
                         _sanitize(content), body_font, fs, WHITE)
        else:
            _add_textbox(slide, 0.5, 1.4, SLIDE_W - 1.2, SLIDE_H - 2.3,
                         _sanitize(content), body_font, fs, colors["text"])

    _add_footer_bar(slide, colors)
    _add_page_number(slide, slide_num, total_slides, colors)


def _build_summary_slide(prs, cards, colors):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _solid_bg(slide, colors["bg"])

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_W), Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = colors["accent"]
    bar.line.fill.background()

    _add_textbox(slide, 0.6, 0.6, 10, 0.6, "要点总结", colors["title_font"], 28,
                 colors["accent_bright"], bold=True)

    y = 1.4
    for i, c in enumerate(cards[:12]):
        card_title = c.get("title", "")[:60]
        _add_textbox(slide, 0.9, y, 10, 0.5, f"{i+1}. {card_title}",
                     colors["body_font"], 15, colors["text"])
        y += 0.55

    _add_footer_bar(slide, colors)


# ── Public API ──

def generate_pptx_direct(
    topic: str,
    cards: list[dict],
    theme_name: str = "dark-tech-gold",
    output_path: Optional[str] = None,
) -> str:
    """
    Generate PPTX directly using python-pptx.
    All text on dark backgrounds uses WHITE or GOLD for readability.
    """
    colors = _resolve_theme(theme_name)
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)

    _build_cover_slide(prs, topic, colors)

    total_cards = len(cards)
    for idx, card in enumerate(cards):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        _build_section_slide(
            slide,
            card.get("type", "blue"),
            card.get("title", ""),
            card.get("content", ""),
            colors,
            idx + 1,
            total_cards + 2,
        )

    _build_summary_slide(prs, cards, colors)

    if output_path is None:
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(output_dir / f"{topic}_{ts}.pptx")

    prs.save(output_path)
    logger.info(f"PPTX generated: {output_path} ({len(prs.slides)} slides)")
    return output_path
