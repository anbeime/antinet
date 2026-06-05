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
    """从文本内容直接生成原生 PPTX（AI 结构化分页 + 多Slide）"""
    try:
        import asyncio
        from ppt_engine.card_renderer import render_cover_svg, render_summary_svg
        from ppt_engine.card_renderer import render_content_svg
        from ppt_engine.pptx_builder import create_pptx_with_native_svg

        # ── 1. AI 结构化：Sensenova 7B 将文本拆为多页 slide（异步 + 长文本并行）─
        from services.ppt_structure_generator import async_generate_structure
        slides = await async_generate_structure(topic, content)
        logger.info(f"AI 结构化完成：{len(slides)} 个 slide")

        # ── 2. 每页 slide → 一张卡片，类型循环 ──────────────
        type_cycle = ["blue", "green", "yellow", "red"]
        all_cards: list[dict] = []
        for idx, s in enumerate(slides):
            card_content = "\n".join(s.get("content", []))
            all_cards.append({
                "type": type_cycle[idx % 4],
                "title": s.get("title", "") or f"第{idx+1}部分",
                "content": card_content,
            })

        # ── 3. 每 4 张卡片一页 ───────────────────────────────
        slide_groups: list[list[dict]] = []
        for i in range(0, len(all_cards), 4):
            slide_groups.append(all_cards[i:i+4])

        with tempfile.TemporaryDirectory() as tmpdir:
            svg_files = []

            cover = render_cover_svg(topic, theme_name=theme)
            fp = Path(tmpdir) / "slide_01.svg"
            fp.write_text(cover, encoding="utf-8")
            svg_files.append(fp)

            for group_idx, group in enumerate(slide_groups):
                svg = render_content_svg(group, theme)
                fp = Path(tmpdir) / f"slide_{group_idx+2:02d}.svg"
                fp.write_text(svg, encoding="utf-8")
                svg_files.append(fp)

            summary_titles = [c["title"] for c in all_cards[:6]]
            summary = render_summary_svg("要点总结", summary_titles, theme)
            fp = Path(tmpdir) / f"slide_{len(svg_files)+1:02d}.svg"
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
            "llm_slides": len(slides),
            "message": f"AI 结构化 PPT 已生成（{len(slides)} 页内容，{len(slide_groups)} 张幻灯片）",
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
