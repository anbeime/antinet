"""
统一设计系统 — 全链路样式契约
桥接：四色卡片 → PPT 生成 → PPT 预览 → Remotion 视频
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
from enum import Enum

try:
    from pptx.dml.color import RGBColor
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

    class RGBColor:
        def __init__(self, r, g, b):
            self.r, self.g, self.b = r, g, b


class LayoutStyle(str, Enum):
    PROFESSIONAL = "professional"
    CREATIVE = "creative"
    MINIMAL = "minimal"
    TECH = "tech"
    BUSINESS = "business"


class SlideType(str, Enum):
    COVER = "cover"
    TOC = "toc"
    SECTION = "section"
    CONTENT = "content"
    SUMMARY = "summary"


@dataclass
class ThemeColors:
    primary: str = "#1C2833"
    secondary: str = "#3498DB"
    accent: str = "#F1C40F"
    background: str = "#ECF0F1"
    text: str = "#2C3E50"

    def to_rgb(self, key: str) -> "RGBColor":
        h = self.__dict__[key].lstrip("#")
        return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

    def to_pptx_theme(self) -> dict:
        if not PPTX_AVAILABLE:
            return {}
        return {k: self.to_rgb(k) for k in self.__dict__}


@dataclass
class ThemeFonts:
    title: str = "Arial"
    body: str = "Arial"


@dataclass
class DesignTheme:
    name: str = "professional"
    label: str = "Professional"
    description: str = "专业商务风格，适合正式场合"
    colors: ThemeColors = field(default_factory=ThemeColors)
    fonts: ThemeFonts = field(default_factory=ThemeFonts)
    layout_style: LayoutStyle = LayoutStyle.PROFESSIONAL


@dataclass
class CardColors:
    blue: str = "#3b82f6"
    green: str = "#22c55e"
    yellow: str = "#eab308"
    red: str = "#ef4444"


@dataclass
class BrandStyle:
    theme: DesignTheme = field(default_factory=DesignTheme)
    card_colors: CardColors = field(default_factory=CardColors)
    logo_url: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["theme"]["layout_style"] = self.theme.layout_style.value
        return d


class DesignPresets:
    THEMES: dict[str, DesignTheme] = {}

    @staticmethod
    def get(name: str) -> DesignTheme:
        if not DesignPresets.THEMES:
            DesignPresets._init()
        return DesignPresets.THEMES.get(name, DesignPresets.THEMES["professional"])

    @staticmethod
    def list() -> list[dict]:
        if not DesignPresets.THEMES:
            DesignPresets._init()
        return [
            {
                "id": t.name,
                "name": t.label,
                "description": t.description,
                "colors": asdict(t.colors),
                "fonts": asdict(t.fonts),
            }
            for t in DesignPresets.THEMES.values()
        ]

    @staticmethod
    def _init():
        DesignPresets.THEMES = {
            "professional": DesignTheme(
                name="professional",
                label="Professional",
                description="专业商务风格，适合正式场合",
                colors=ThemeColors(
                    primary="#1C2833", secondary="#3498DB",
                    accent="#F1C40F", background="#ECF0F1", text="#2C3E50",
                ),
                fonts=ThemeFonts(title="Arial", body="Arial"),
                layout_style=LayoutStyle.PROFESSIONAL,
            ),
            "creative": DesignTheme(
                name="creative",
                label="Creative",
                description="创意活泼风格，适合创意展示",
                colors=ThemeColors(
                    primary="#9B59B6", secondary="#3498DB",
                    accent="#E67E22", background="#F8F9FA", text="#2C3E50",
                ),
                fonts=ThemeFonts(title="Arial", body="Arial"),
                layout_style=LayoutStyle.CREATIVE,
            ),
            "minimal": DesignTheme(
                name="minimal",
                label="Minimal",
                description="简约现代风格，适合简洁演示",
                colors=ThemeColors(
                    primary="#2C3E50", secondary="#95A5A6",
                    accent="#3498DB", background="#FFFFFF", text="#2C3E50",
                ),
                fonts=ThemeFonts(title="Arial", body="Arial"),
                layout_style=LayoutStyle.MINIMAL,
            ),
            "tech": DesignTheme(
                name="tech",
                label="Tech Innovation",
                description="科技创新风格，适合技术路演",
                colors=ThemeColors(
                    primary="#1E3A8A", secondary="#3B82F6",
                    accent="#10B981", background="#F8FAFC", text="#1F2937",
                ),
                fonts=ThemeFonts(title="Microsoft YaHei", body="Microsoft YaHei"),
                layout_style=LayoutStyle.TECH,
            ),
            "business": DesignTheme(
                name="business",
                label="Business",
                description="高端商务风格，适合路演汇报",
                colors=ThemeColors(
                    primary="#DC2626", secondary="#F59E0B",
                    accent="#1F2937", background="#FFFFFF", text="#111827",
                ),
                fonts=ThemeFonts(title="Microsoft YaHei", body="Microsoft YaHei"),
                layout_style=LayoutStyle.BUSINESS,
            ),
        }


@dataclass
class SlideShape:
    type: str
    left: float
    top: float
    width: float
    height: float
    name: Optional[str] = None
    text: Optional[str] = None
    font_size: Optional[float] = None
    font_bold: Optional[bool] = None
    font_color: Optional[str] = None
    fill_color: Optional[str] = None
    table: Optional[list[list[str]]] = None
    image_url: Optional[str] = None
    paragraphs: Optional[list] = None
    default_font_size: Optional[float] = None
    default_font_color: Optional[str] = None
    default_font_name: Optional[str] = None


@dataclass
class SlideData:
    index: int
    shapes: list[SlideShape] = field(default_factory=list)
    background: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class PPTPreviewData:
    filename: str
    total_slides: int
    slide_width: float
    slide_height: float
    slides: list[SlideData]
    design_system: Optional[BrandStyle] = None


def rgb_to_hex(r, g, b) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
