"""设计系统路由 — 全链路统一样式配置"""

import logging
from fastapi import APIRouter
from design_system import DesignPresets, BrandStyle, DesignTheme, ThemeColors, ThemeFonts, LayoutStyle, CardColors

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/design-system", tags=["Design System"])


@router.get("/themes")
async def list_themes():
    return DesignPresets.list()


@router.get("/themes/{name}")
async def get_theme(name: str):
    theme = DesignPresets.get(name)
    return {
        "id": theme.name,
        "name": theme.label,
        "description": theme.description,
        "colors": {
            "primary": theme.colors.primary,
            "secondary": theme.colors.secondary,
            "accent": theme.colors.accent,
            "background": theme.colors.background,
            "text": theme.colors.text,
        },
        "fonts": {
            "title": theme.fonts.title,
            "body": theme.fonts.body,
        },
        "layout_style": theme.layout_style.value,
    }


@router.get("/brand/default")
async def get_default_brand():
    style = BrandStyle()
    return style.to_dict()


@router.post("/brand/from-theme")
async def brand_from_theme(data: dict):
    name = data.get("theme", "professional")
    theme = DesignPresets.get(name)
    style = BrandStyle(theme=theme)
    return style.to_dict()
