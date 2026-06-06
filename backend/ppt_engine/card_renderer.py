"""
Card → Direct PPTX Renderer using python-pptx (bypasses buggy SVG→DrawingML pipeline)
"""

import re, json, logging, httpx
from pathlib import Path
from typing import Optional
from datetime import datetime

from pptx import Presentation
from pptx.util import Inches, Pt, Emu, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

logger = logging.getLogger(__name__)

SLIDE_W = 13.33
SLIDE_H = 7.5

# ── Markdown → PPT 结构转换器 ─────────────────────────────
HEADING_STYLES = {
    1: {"size": 32, "bold": True, "spacing_before": 24},
    2: {"size": 24, "bold": True, "spacing_before": 18},
    3: {"size": 18, "bold": True, "spacing_before": 12},
    4: {"size": 16, "bold": True, "spacing_before": 8},
}


class MarkdownToPPTConverter:
    """将 Markdown 文本解析为 PPT 结构化数据。"""

    def convert(self, markdown_content: str) -> list[dict]:
        sections = []
        for line in markdown_content.split("\n"):
            if line.startswith("#"):
                level = len(line.split(" ")[0])
                title = line.lstrip("#").strip()
                sections.append({"type": "heading", "level": level, "content": title})
            elif line.startswith("- ") or line.startswith("* "):
                sections.append({"type": "bullet", "content": line[2:].strip()})
            elif "|" in line and "-" in line and line.strip().startswith("|"):
                continue
            elif "|" in line and line.strip().startswith("|"):
                cells = [c.strip() for c in line.split("|")[1:-1]]
                sections.append({"type": "table_row", "cells": cells})
            elif line.strip():
                sections.append({"type": "paragraph", "content": line.strip()})
        return self._group_into_slides(sections)

    def _group_into_slides(self, sections: list[dict]) -> list[dict]:
        slides = []
        current = {"title": "", "content": []}
        for sec in sections:
            if sec["type"] == "heading" and sec["level"] <= 2:
                if current["title"] or current["content"]:
                    slides.append(current)
                current = {"title": sec["content"], "content": []}
            else:
                current["content"].append(sec)
        if current["title"] or current["content"]:
            slides.append(current)
        return slides

    def slides_to_text(self, slides: list[dict]) -> str:
        parts = []
        for s in slides:
            if s["title"]:
                parts.append(s["title"])
            for item in s["content"]:
                if item["type"] == "bullet":
                    parts.append(f"• {item['content']}")
                elif item["type"] == "paragraph":
                    parts.append(item["content"])
                elif item["type"] == "table_row":
                    parts.append(" | ".join(item["cells"]))
            parts.append("")
        return "\n".join(parts)

    def slides_to_cards(self, slides: list[dict], type_cycle: list[str] | None = None) -> list[dict]:
        if type_cycle is None:
            type_cycle = ["blue", "green", "yellow", "red"]
        cards = []
        for i, s in enumerate(slides):
            content_text = self.slides_to_text([s]).strip()
            if content_text:
                cards.append({
                    "type": type_cycle[i % len(type_cycle)],
                    "title": s["title"] or f"第{i+1}部分",
                    "content": content_text,
                })
        return cards

# ── Color & Theme System ──────────────────────────────────
_INVALID_XML_RE = re.compile(
    r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uD800-\uDFFF\uFDD0-\uFDEF\uFFFE\uFFFF]"
)


def _sanitize(text: str) -> str:
    if not text:
        return ""
    return _INVALID_XML_RE.sub("", text)


CARD_TYPE_MAP = {
    "blue": {"label": "核心事实", "section": "核心事实"},
    "green": {"label": "深度解读", "section": "深度解读"},
    "yellow": {"label": "风险警示", "section": "风险警示"},
    "red": {"label": "行动方案", "section": "行动方案"},
}


_THEMES = {
    "professional": {
        "primary":       (0x1E, 0x3A, 0x8A),
        "secondary":     (0x3B, 0x82, 0xF6),
        "accent":        (0x63, 0x66, 0xF1),
        "bg":            (0xF8, 0xFA, 0xFC),
        "bg_dark":       (0x0A, 0x0E, 0x1A),
        "bg_card":       (0x12, 0x1A, 0x2E),
        "text":          (0x1F, 0x29, 0x37),
        "text_light":    (0x6B, 0x7A, 0x99),
        "gold":          (0xD4, 0xA5, 0x37),
        "gold_bright":   (0xF5, 0xC8, 0x42),
        "title_font":    "Microsoft YaHei",
        "body_font":     "Microsoft YaHei",
        "card_blue":     (0x3B, 0x82, 0xF6),
        "card_green":    (0x22, 0xC5, 0x5E),
        "card_yellow":   (0xF5, 0x9E, 0x0B),
        "card_red":      (0xEF, 0x44, 0x44),
    },
    "dark-tech-gold": {
        "primary":       (0xD4, 0xA5, 0x37),
        "secondary":     (0x3B, 0x82, 0xF6),
        "accent":        (0xF5, 0xC8, 0x42),
        "bg":            (0x0A, 0x0E, 0x1A),
        "bg_dark":       (0x08, 0x0C, 0x16),
        "bg_card":       (0x12, 0x1A, 0x2E),
        "text":          (0xB0, 0xB8, 0xC8),
        "text_light":    (0x7A, 0x84, 0x9A),
        "gold":          (0xD4, 0xA5, 0x37),
        "gold_bright":   (0xF5, 0xC8, 0x42),
        "title_font":    "Microsoft YaHei",
        "body_font":     "Microsoft YaHei",
        "card_blue":     (0x3B, 0x82, 0xF6),
        "card_green":    (0x22, 0xC5, 0x5E),
        "card_yellow":   (0xF5, 0x9E, 0x0B),
        "card_red":      (0xEF, 0x44, 0x44),
    },
}


def _resolve_theme(name: str = "professional") -> dict:
    raw = _THEMES.get(name, _THEMES["professional"])
    t = {}
    for k, v in raw.items():
        if isinstance(v, tuple) and len(v) == 3:
            t[k] = RGBColor(*v)
        else:
            t[k] = v
    t["card_map"] = {
        "blue": t["card_blue"], "green": t["card_green"],
        "yellow": t["card_yellow"], "red": t["card_red"],
    }
    return t


def _card_color(card_type: str, colors: dict) -> RGBColor:
    return colors["card_map"].get(card_type, colors["card_blue"])


# ── Design Helpers ─────────────────────────────────────────
def _add_shape(slide, left, top, w, h, fill=None, line=None, line_w=None, shape_type=MSO_SHAPE.RECTANGLE):
    s = slide.shapes.add_shape(shape_type, Inches(left), Inches(top), Inches(w), Inches(h))
    if fill:
        s.fill.solid(); s.fill.fore_color.rgb = fill
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = line; s.line.width = Pt(line_w or 1) if line_w else Pt(1)
    else:
        s.line.fill.background()
    return s


def _add_accent_line(slide, left, top, w, color):
    _add_shape(slide, left, top, w, 0.04, fill=color)


def _add_footer_bar(slide, colors, text="知易智能知识管家"):
    _add_shape(slide, 0, SLIDE_H - 0.35, SLIDE_W, 0.35, fill=colors.get("bg_dark", colors["bg"]))
    _add_textbox(slide, 0.4, SLIDE_H - 0.32, 8, 0.3, text, colors["body_font"], 9, colors["text_light"])


def _add_page_number(slide, num, total, colors):
    _add_textbox(slide, SLIDE_W - 1.2, SLIDE_H - 0.32, 0.9, 0.3,
                 f"{num}/{total}", colors["body_font"], 9, colors["text_light"], alignment=PP_ALIGN.RIGHT)


def _add_textbox(slide, left, top, width, height, text, font_name, font_size, color, bold=False, alignment=PP_ALIGN.LEFT):
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


def _add_card(slide, left, top, w, h, card_type, title, content, colors):
    card_clr = _card_color(card_type, colors)
    body_font = colors["body_font"]
    text_clr = colors["text"]

    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = card_clr
    shape.fill.fore_color.brightness = 0.85
    shape.line.fill.background()

    tf = shape.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Inches(0.3)
    tf.margin_top = Inches(0.15)
    tf.margin_right = Inches(0.1)
    tf.margin_bottom = Inches(0.1)

    p = tf.paragraphs[0]
    p.text = _sanitize(title[:50])
    p.font.name = colors["title_font"]
    p.font.size = Pt(14)
    p.font.color.rgb = card_clr
    p.font.bold = True
    p.space_after = Pt(4)

    p2 = tf.add_paragraph()
    p2.text = _sanitize(content[:600])
    p2.font.name = body_font
    p2.font.size = Pt(11)
    p2.font.color.rgb = text_clr
    p2.font.bold = False
    p2.space_before = Pt(0)

    bar = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(0.08), Inches(h),
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = card_clr
    bar.line.fill.background()


def _add_section_slide(slide, card_type, title, content, colors, slide_num, total_slides):
    """一页一张卡片，两种布局：长内容→Slide9风格，短内容→Slide3风格"""
    card_clr = _card_color(card_type, colors)
    body_font = colors["body_font"]
    text_clr = colors["text"]
    title_font = colors["title_font"]
    content_len = len(content)

    # ── 顶部装饰线 + 左侧色条（通用） ──
    _add_accent_line(slide, 0, 0, SLIDE_W, colors["accent"])
    _add_shape(slide, 0, 0, 0.10, SLIDE_H, fill=card_clr)

    # ── 根据内容密度选择布局 ──
    if content_len < 300:
        # == Slide 3 风格：图标 + 标题 + 说明 ==
        icons = {"blue": "📘", "green": "📗", "yellow": "📙", "red": "📕"}
        icon = icons.get(card_type, "📄")
        _add_textbox(slide, 0.5, 0.25, 10, 0.5, _sanitize(title[:60]),
                     title_font, 24, card_clr, bold=True)
        _add_accent_line(slide, 0.5, 0.75, 1.2, card_clr)

        # 大图标
        _add_textbox(slide, 0.5, 1.0, SLIDE_W - 1.2, 1.2, icon,
                     body_font, 72, text_clr, alignment=PP_ALIGN.CENTER)
        # 标题（大号居中）
        _add_textbox(slide, 0.5, 2.3, SLIDE_W - 1.2, 0.7, _sanitize(title[:80]),
                     title_font, 28, card_clr, bold=True, alignment=PP_ALIGN.CENTER)
        # 内容（适中字号）
        fs = 16 if content_len < 100 else 14
        _add_textbox(slide, 1.0, 3.2, SLIDE_W - 2.4, SLIDE_H - 4.0,
                     _sanitize(content), body_font, fs, text_clr, alignment=PP_ALIGN.CENTER)
    else:
        # == Slide 9 风格：彩色顶部横条 + 标题 + 说明 + 代码块 ==
        title_fs = 22 if len(title) < 20 else 18
        _add_textbox(slide, 0.5, 0.25, 10, 0.5, _sanitize(title[:60]),
                     title_font, title_fs, card_clr, bold=True)
        _add_accent_line(slide, 0.5, 0.75, 1.2, card_clr)

        # 卡片类型标签
        labels = {"blue": "📘 核心事实", "green": "📗 深度解读",
                  "yellow": "📙 风险警示", "red": "📕 行动方案"}
        label = labels.get(card_type, "📄 笔记")
        _add_textbox(slide, 0.5, 0.9, 3, 0.35, label, body_font, 11, card_clr)

        # 正文区
        if content_len < 600:
            fs = 15
            code_block = False
        else:
            fs = 13
            content = content[:800] + "\n\n[内容摘要]"
            code_block = True

        if code_block:
            # 深色代码块背景
            _add_shape(slide, 0.5, 1.4, SLIDE_W - 1.2, SLIDE_H - 2.3,
                       fill=colors.get("bg_dark", colors["bg"]),
                       line=card_clr, line_w=0.5,
                       shape_type=MSO_SHAPE.ROUNDED_RECTANGLE)
            _add_textbox(slide, 0.7, 1.5, SLIDE_W - 1.6, SLIDE_H - 2.6,
                         _sanitize(content), body_font, fs, text_clr)
        else:
            _add_textbox(slide, 0.5, 1.4, SLIDE_W - 1.2, SLIDE_H - 2.3,
                         _sanitize(content), body_font, fs, text_clr)

    # ── 页脚 + 页码 ──
    _add_footer_bar(slide, colors)
    _add_page_number(slide, slide_num, total_slides, colors)


def generate_pptx_direct(
    topic: str,
    cards: list[dict],
    theme_name: str = "professional",
    output_path: Optional[str] = None,
) -> str:
    """Generate PPTX directly using python-pptx (NO SVG pipeline)."""
    colors = _resolve_theme(theme_name)
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)

    # ── Cover slide ──
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid(); slide.background.fill.fore_color.rgb = colors["bg"]

    _add_accent_line(slide, 0, 0, SLIDE_W, colors["accent"])
    _add_textbox(slide, 1.5, 2.5, 10, 1.2, topic, colors["title_font"], 40, colors["primary"], bold=True, alignment=PP_ALIGN.CENTER)
    _add_textbox(slide, 1.5, 3.8, 10, 0.6, "智能分析报告", colors["body_font"], 18, colors["text"], alignment=PP_ALIGN.CENTER)
    _add_textbox(slide, 1.5, 5.0, 10, 0.4, datetime.now().strftime("%Y-%m-%d"), colors["body_font"], 14, colors["text_light"], alignment=PP_ALIGN.CENTER)
    _add_footer_bar(slide, colors)

    # ── Content slides: each card = one full slide ──
    total_cards = len(cards)
    for idx, card in enumerate(cards):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.background.fill.solid(); slide.background.fill.fore_color.rgb = colors["bg"]
        _add_section_slide(slide, card.get("type", "blue"), card.get("title", ""),
                           card.get("content", ""), colors, idx + 1, total_cards + 2)

    # ── Summary slide ──
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid(); slide.background.fill.fore_color.rgb = colors["bg"]

    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(SLIDE_W), Inches(0.06))
    bar.fill.solid(); bar.fill.fore_color.rgb = colors["accent"]; bar.line.fill.background()

    _add_textbox(slide, 0.6, 0.6, 10, 0.6, "要点总结", colors["title_font"], 28, colors["primary"], bold=True)

    y = 1.4
    for i, c in enumerate(cards[:12]):
        title = c.get("title", "")[:60]
        _add_textbox(slide, 0.9, y, 10, 0.5,
                     f"{i+1}. {title}", colors["body_font"], 15, colors["text"])
        y += 0.55

    # Save
    if output_path is None:
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(output_dir / f"{topic}_{ts}.pptx")

    prs.save(output_path)
    logger.info(f"PPTX generated directly: {output_path} ({len(prs.slides)} slides)")
    return output_path
