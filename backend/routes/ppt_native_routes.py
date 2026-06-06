"""
PPT Native Routes — SVG→Native Shapes PPTX via ppt_engine
Bridges: four-color cards → SVG templates → native editable PPTX
"""

import logging
import json
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ppt-native", tags=["PPT Native (SVG→PPTX)"])


class CardItem(BaseModel):
    id: Optional[str] = None
    type: str = Field(..., pattern="^(blue|green|yellow|red)$")
    title: str = ""
    content: str = ""
    category: Optional[str] = None


class GenerateNativePPTRequest(BaseModel):
    topic: str
    cards: list[CardItem]
    theme: str = "professional"


@router.post("/generate")
async def generate_native_ppt(req: GenerateNativePPTRequest):
    """从四色卡片生成 PPTX（python-pptx 直出，不经过 SVG→DrawingML）"""
    try:
        from ppt_engine.card_renderer import generate_pptx_direct

        cards_dict = [c.model_dump() for c in req.cards]
        output_path = generate_pptx_direct(
            topic=req.topic,
            cards=cards_dict,
            theme_name=req.theme,
        )

        return {
            "status": "success",
            "file_path": output_path,
            "filename": Path(output_path).name,
            "slide_count": len(req.cards) + 2,
            "message": f"PPTX 已生成（原生形状，完全可编辑）",
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"ppt_engine 不可用: {e}")
    except Exception as e:
        logger.error(f"Native PPT 生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-from-text")
async def generate_from_text(
    topic: str = Body(...),
    content: str = Body(...),
    theme: str = Body(default="professional"),
):
    """从 Markdown/文本内容直接生成 PPTX（Markdown 结构化分页 + 一页一张卡片）"""
    try:
        from ppt_engine.card_renderer import generate_pptx_direct
        from ppt_engine.markdown_converter import MarkdownToPPTConverter

        # ── 1. Markdown → 结构化 slides ──────────────────────
        converter = MarkdownToPPTConverter()
        slides = converter.convert(content)
        logger.info(f"Markdown 解析完成：{len(slides)} 个 slide")

        # ── 2. slides → 四色卡片 ─────────────────────────────
        all_cards = converter.slides_to_cards(slides)

        # ── 3. 生成 PPTX ─────────────────────────────────────
        from datetime import datetime
        output_dir = Path("C:/D/zhiyi/generated")
        output_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = str(output_dir / f"{topic}_{ts}.pptx")

        generate_pptx_direct(topic=topic, cards=all_cards, theme_name=theme, output_path=output_path)

        return {
            "status": "success",
            "file_path": output_path,
            "filename": Path(output_path).name,
            "slide_count": len(all_cards) + 2,
            "message": f"Markdown → PPT 已生成（{len(all_cards)} 页内容）",
        }
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"ppt_engine 不可用: {e}")
    except Exception as e:
        logger.error(f"文本→PPTX 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{filename:path}")
async def download_pptx(filename: str):
    """下载生成的 PPTX 文件"""
    file_path = Path("C:/D/zhiyi/generated") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=filename,
    )


@router.get("/themes")
async def list_themes():
    """获取可用主题列表"""
    from design_system import DesignPresets
    return DesignPresets.list()
