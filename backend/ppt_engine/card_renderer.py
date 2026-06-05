"""
Card → SVG → Native PPTX Renderer
Bridges: four-color card data → SVG templates → ppt_engine native shapes PPTX
"""

import os
import re
import json
import logging
import tempfile
from pathlib import Path
from typing import Any, Optional
from datetime import datetime

from design_system import DesignPresets, CardColors as DsCardColors

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "ppt_templates"

CARD_TYPE_MAP = {
    "blue": {"label": "核心事实", "section": "📊 核心事实"},
    "green": {"label": "深度解读", "section": "🔍 深度解读"},
    "yellow": {"label": "风险警示", "section": "⚠️ 风险警示"},
    "red": {"label": "行动方案", "section": "🎯 行动方案"},
}

_INVALID_XML_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFE\uFFFF]")


def _xml_escape(text: str) -> str:
    text = _INVALID_XML_RE.sub("", text)
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    text = text.replace("'", "&apos;")
    return text


def _load_template(name: str) -> str:
    path = TEMPLATES_DIR / "base" / f"{name}.svg"
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    return path.read_text(encoding="utf-8")


def _resolve_theme(theme_name: str) -> dict:
    dt = DesignPresets.get(theme_name)
    cc = DsCardColors()
    return {
        "PRIMARY": dt.colors.primary,
        "SECONDARY": dt.colors.secondary,
        "ACCENT": dt.colors.accent,
        "BG": dt.colors.background,
        "BG_END": _darken(dt.colors.background, 0.08),
        "TEXT": dt.colors.text,
        "TITLE_FONT": dt.fonts.title,
        "BODY_FONT": dt.fonts.body,
        "CARD_BLUE": cc.blue,
        "CARD_GREEN": cc.green,
        "CARD_YELLOW": cc.yellow,
        "CARD_RED": cc.red,
    }


def _darken(hex_color: str, amount: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    r = max(0, int(r * (1 - amount)))
    g = max(0, int(g * (1 - amount)))
    b = max(0, int(b * (1 - amount)))
    return f"#{r:02x}{g:02x}{b:02x}"


def _substitute(template: str, vars: dict[str, str]) -> str:
    def repl(m: re.Match) -> str:
        key = m.group(1)
        return vars.get(key, m.group(0))
    return re.sub(r"{{(\w+)}}", repl, template)


def _wrap_lines(text: str, max_chars: int = 40) -> list[str]:
    lines = []
    for paragraph in text.split("\n"):
        while len(paragraph) > max_chars:
            idx = paragraph.rfind(" ", 0, max_chars)
            if idx == -1:
                idx = max_chars
            lines.append(paragraph[:idx])
            paragraph = paragraph[idx:].strip()
        lines.append(paragraph)
    return [_xml_escape(l) for l in lines if l]


def render_cover_svg(
    title: str,
    subtitle: str = "",
    theme_name: str = "professional",
) -> str:
    template = _load_template("cover")
    colors = _resolve_theme(theme_name)
    colors["TITLE"] = _xml_escape(title)
    colors["SUBTITLE"] = _xml_escape(subtitle or "智能分析报告")
    colors["DATE"] = datetime.now().strftime("%Y-%m-%d")
    return _substitute(template, colors)


def render_content_svg(
    cards: list[dict],
    theme_name: str = "professional",
) -> str:
    template = _load_template("content")
    colors = _resolve_theme(theme_name)

    section_title = "内容摘要"
    section_color = colors["ACCENT"]
    card_color_key = "CARD_BLUE"

    if cards:
        ctype = cards[0].get("type", "blue")
        info = CARD_TYPE_MAP.get(ctype, {})
        section_title = _xml_escape(info.get("section", "内容摘要"))
        card_map = {"blue": "CARD_BLUE", "green": "CARD_GREEN", "yellow": "CARD_YELLOW", "red": "CARD_RED"}
        section_color = colors.get(card_map.get(ctype, "CARD_BLUE"), colors["ACCENT"])

    colors["SECTION_TITLE"] = section_title
    colors["SECTION_COLOR"] = section_color

    card_svgs = []
    positions = [(60, 130, 560, 200), (660, 130, 560, 200), (60, 360, 560, 200), (660, 360, 560, 200)]

    for i, card in enumerate(cards[:4]):
        if i >= len(positions):
            break
        cx, cy, cw, ch = positions[i]
        ctype = card.get("type", "blue")
        card_map = {"blue": "CARD_BLUE", "green": "CARD_GREEN", "yellow": "CARD_YELLOW", "red": "CARD_RED"}
        card_color_key = card_map.get(ctype, "CARD_BLUE")
        card_color = colors[card_color_key]

        title = _xml_escape(card.get("title", "")[:40])
        content = card.get("content", "")
        content_lines = _wrap_lines(content, 36)

        line_svgs = []
        LINE_H = 30
        CONTENT_Y = 85
        for li, line in enumerate(content_lines[:4]):
            ly = CONTENT_Y + li * LINE_H
            line_svgs.append(
                f'    <text x="24" y="{ly}" font-family="{colors["BODY_FONT"]}" '
                f'font-size="14" fill="{colors["TEXT"]}">{line}</text>'
            )
        content_svg = "\n".join(line_svgs)

        card_svg = f"""  <g transform="translate({cx}, {cy})">
    <rect width="{cw}" height="{ch}" rx="12" fill="{card_color}" opacity="0.08"/>
    <rect x="0" y="0" width="6" height="{ch}" rx="3" fill="{card_color}"/>
    <text x="24" y="40" font-family="{colors['TITLE_FONT']}" font-size="18" font-weight="bold" fill="{colors['PRIMARY']}">{title}</text>
    {content_svg}
  </g>"""
        card_svgs.append(card_svg)

    colors["CARDS"] = "\n".join(card_svgs)
    return _substitute(template, colors)


def render_summary_svg(
    title: str,
    points: list[str],
    theme_name: str = "professional",
) -> str:
    template = _load_template("summary")
    colors = _resolve_theme(theme_name)
    colors["TITLE"] = _xml_escape(title)

    point_svgs = []
    y = 0
    for i, point in enumerate(points[:6]):
        point_svgs.append(f"""    <g transform="translate(0, {y})">
      <rect x="0" y="4" width="8" height="8" rx="2" fill="{colors['ACCENT']}"/>
      <text x="24" y="16" font-family="{colors['BODY_FONT']}" font-size="20" fill="{colors['TEXT']}">{_xml_escape(point[:80])}</text>
    </g>""")
        y += 56

    colors["POINTS"] = "\n".join(point_svgs)
    return _substitute(template, colors)


def cards_to_svg_slides(
    topic: str,
    cards: list[dict],
    theme_name: str = "professional",
    include_cover: bool = True,
    include_summary: bool = True,
) -> list[str]:
    slides = []

    if include_cover:
        slides.append(render_cover_svg(topic, theme_name=theme_name))

    by_type = {}
    for c in cards:
        t = c.get("type", "blue")
        by_type.setdefault(t, []).append(c)

    type_order = ["blue", "green", "yellow", "red"]
    for t in type_order:
        if t in by_type:
            group = by_type[t]
            for i in range(0, len(group), 4):
                slides.append(render_content_svg(group[i:i+4], theme_name))

    if include_summary:
        all_titles = [c.get("title", "") for c in cards[:6]]
        slides.append(render_summary_svg("要点总结", all_titles, theme_name))

    return slides


def generate_pptx(
    topic: str,
    cards: list[dict],
    theme_name: str = "professional",
    output_path: Optional[str] = None,
) -> str:
    from ppt_engine.pptx_builder import create_pptx_with_native_svg

    svg_slides = cards_to_svg_slides(topic, cards, theme_name)

    if output_path is None:
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(output_dir / f"{topic}_{ts}.pptx")

    with tempfile.TemporaryDirectory() as tmpdir:
        svg_files = []
        for i, svg_content in enumerate(svg_slides):
            fpath = Path(tmpdir) / f"slide_{i+1:02d}.svg"
            fpath.write_text(svg_content, encoding="utf-8")
            svg_files.append(fpath)

        # Always dump SVGs for debugging
        debug_dir = Path("C:/D/zhiyi/generated/svg_debug")
        debug_dir.mkdir(parents=True, exist_ok=True)
        for fpath in svg_files:
            debug_path = debug_dir / fpath.name
            debug_path.write_text(fpath.read_text(encoding="utf-8"), encoding="utf-8")

        try:
            success = create_pptx_with_native_svg(
                svg_files=svg_files,
                output_path=Path(output_path),
                use_native_shapes=True,
                canvas_format="ppt169",
                verbose=False,
            )
            if not success:
                raise RuntimeError("PPTX generation failed")
        except Exception:
            for fpath in svg_files:
                debug_path = Path("C:/D/zhiyi/generated") / f"debug_{fpath.name}"
                debug_path.write_text(fpath.read_text(encoding="utf-8"), encoding="utf-8")
                logger.error(f"Dumped failing SVG to {debug_path}")
            raise

    logger.info(f"PPTX generated: {output_path} ({len(svg_slides)} slides)")
    return output_path