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
    """从四色卡片生成原生可编辑 PPTX（SVG→DrawingML 模式）"""
    try:
        from ppt_engine.card_renderer import generate_pptx

        cards_dict = [c.model_dump() for c in req.cards]
        output_path = generate_pptx(
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
    """从文本内容直接生成原生 PPTX"""
    try:
        from ppt_engine.card_renderer import render_cover_svg, render_content_svg, render_summary_svg
        from ppt_engine.pptx_builder import create_pptx_with_native_svg

        lines = [l.strip() for l in content.split("\n") if l.strip()]
        sections = []
        current_section = {"title": "", "lines": []}
        for line in lines:
            if line.startswith("#") or line.startswith("##"):
                if current_section["lines"]:
                    sections.append(current_section)
                current_section = {"title": line.lstrip("#").strip(), "lines": []}
            else:
                current_section["lines"].append(line)
        if current_section["lines"]:
            sections.append(current_section)

        with tempfile.TemporaryDirectory() as tmpdir:
            svg_files = []

            cover = render_cover_svg(topic, theme_name=theme)
            fp = Path(tmpdir) / "slide_01.svg"
            fp.write_text(cover, encoding="utf-8")
            svg_files.append(fp)

            for i, sec in enumerate(sections[:6]):
                cards_data = [{"type": "blue", "title": sec["title"], "content": "\n".join(sec["lines"][:3])}]
                from ppt_engine.card_renderer import render_content_svg as rcs
                svg = rcs(cards_data, theme)
                fp = Path(tmpdir) / f"slide_{i+2:02d}.svg"
                fp.write_text(svg, encoding="utf-8")
                svg_files.append(fp)

            summary = render_summary_svg("要点总结", [s["title"] for s in sections[:6]], theme)
            fp = Path(tmpdir) / f"slide_{len(sections)+2:02d}.svg"
            fp.write_text(summary, encoding="utf-8")
            svg_files.append(fp)

            output_dir = Path("C:/D/zhiyi/generated")
            output_dir.mkdir(parents=True, exist_ok=True)
            from datetime import datetime
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = output_dir / f"{topic}_{ts}.pptx"

            success = create_pptx_with_native_svg(
                svg_files=svg_files,
                output_path=output_path,
                use_native_shapes=True,
                canvas_format="ppt169",
                verbose=False,
            )
            if not success:
                raise RuntimeError("PPTX generation failed")

        return {
            "status": "success",
            "file_path": str(output_path),
            "filename": output_path.name,
            "slide_count": len(svg_files),
            "message": "文本→PPTX 已生成（原生形状）",
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
