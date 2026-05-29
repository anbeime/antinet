"""
Remotion 动态演示路由
将知识卡片转换为动画视频
"""
import logging
import json
import os
import uuid
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from datetime import datetime

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/remotion", tags=["Remotion动态演示"])

db_manager = None


def set_db_manager(manager):
    """设置数据库管理器"""
    global db_manager
    db_manager = manager


# ==================== API 模型 ====================

class CardData(BaseModel):
    """卡片数据"""
    id: str
    type: str = Field(..., description="卡片类型: blue/green/yellow/red")
    title: str
    content: str
    category: Optional[str] = None


class SlideData(BaseModel):
    """幻灯片数据"""
    id: str
    type: str = Field(..., description="幻灯片类型: cover/content/chart/mindmap/summary")
    title: str
    content: Optional[List[str]] = None
    cards: Optional[List[Dict[str, Any]]] = None
    color: Optional[str] = None


class RemotionGenerateRequest(BaseModel):
    """Remotion 生成请求"""
    topic: str
    cards: Optional[List[CardData]] = None
    slides: Optional[List[SlideData]] = None
    format: str = Field(default="mp4", description="输出格式: mp4/webm/gif")
    quality: str = Field(default="medium", description="质量: low/medium/high")
    config: Optional[Dict[str, Any]] = None


# ==================== 幻灯片生成逻辑 ====================

def generate_slides_from_cards(topic: str, cards: List[CardData]) -> List[SlideData]:
    """从卡片生成幻灯片序列"""
    slides = []
    
    # 1. 封面页
    slides.append(SlideData(
        id="cover-1",
        type="cover",
        title=topic,
        content=["智能分析报告"]
    ))
    
    # 2. 按类型分组卡片
    blue_cards = [c for c in cards if c.type == "blue"]
    green_cards = [c for c in cards if c.type == "green"]
    yellow_cards = [c for c in cards if c.type == "yellow"]
    red_cards = [c for c in cards if c.type == "red"]
    
    # 3. 内容页（按颜色分类）
    if blue_cards:
        slides.append(SlideData(
            id="content-blue",
            type="content",
            title="核心事实",
            cards=[{"title": c.title, "content": c.content, "type": c.type} for c in blue_cards]
        ))
    
    if green_cards:
        slides.append(SlideData(
            id="content-green",
            type="content",
            title="深度解读",
            cards=[{"title": c.title, "content": c.content, "type": c.type} for c in green_cards]
        ))
    
    if yellow_cards:
        slides.append(SlideData(
            id="content-yellow",
            type="content",
            title="风险警示",
            cards=[{"title": c.title, "content": c.content, "type": c.type} for c in yellow_cards]
        ))
    
    if red_cards:
        slides.append(SlideData(
            id="content-red",
            type="content",
            title="行动方案",
            cards=[{"title": c.title, "content": c.content, "type": c.type} for c in red_cards]
        ))
    
    # 4. 总结页
    summary_points = [f"{i+1}. {c.title}" for i, c in enumerate(cards[:4])]
    slides.append(SlideData(
        id="summary-1",
        type="summary",
        title="总结",
        content=summary_points
    ))
    
    return slides


# ==================== Remotion 源码生成 ====================

def _make_slide_template(template: str, **kwargs):
    """Helper: replace placeholders like {idx}, {title}, {bg} with values.
    Avoids f-string escaping nightmares for JSX/Remotion code."""
    result = template
    for key, val in kwargs.items():
        result = result.replace("{" + key + "}", str(val))
    return result


COVER_TEMPLATE = """// Slide {idx}: Cover
const CoverSlide{idx} = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '{bg}' }}>
      <div style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
        fontSize: 72, color: '{primary}', textAlign: 'center', padding: '40vh 0'
      }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};
"""

CONTENT_HEAD_TEMPLATE = """// Slide {idx}: Content - {title}
const ContentSlide{idx} = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '{bg}', padding: 40 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: '{accent}', marginBottom: 20 }}>
        {title}
      </div>
      {cards_html}
    </AbsoluteFill>
  );
};
"""

CONTENT_CARD_TEMPLATE = """      <div style={{
        backgroundColor: '{color}',
        borderRadius: 12, padding: 20, marginBottom: 16,
        opacity: interpolate(progress, [{t_start}, {t_end_opacity}], [0, 1]),
        transform: `translateX(${interpolate(progress, [{t_start}, {t_end_translate}], [-50, 0])}px)`
      }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{card_title}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>{card_content}</div>
      </div>"""

SUMMARY_HEAD_TEMPLATE = """// Slide {idx}: Summary
const SummarySlide{idx} = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 200 }
  });
  return (
    <AbsoluteFill style={{ background: '{bg}', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 48, color: '{accent}', marginBottom: 40 }}>总结</div>
      {points_html}
    </AbsoluteFill>
  );
};
"""

SUMMARY_POINT_TEMPLATE = """        <div style={{
          fontSize: 24, color: '{primary}', marginBottom: 16,
          opacity: interpolate(progress, [{t_start}, {t_end}], [0, 1])
        }}>
          {point}
        </div>"""


def generate_remotion_source(slides: List[SlideData], topic: str, config: Dict[str, Any]) -> str:
    """生成 Remotion React 组件源码（正确的 JSX 语法）"""

    card_colors = {
        "blue": "#3b82f6",
        "green": "#22c55e",
        "yellow": "#eab308",
        "red": "#ef4444",
    }

    theme = config.get("style", "modern")
    theme_colors = {
        "modern": {"bg": "#0f172a", "primary": "#ffffff", "accent": "#8b5cf6"},
        "corporate": {"bg": "#1e293b", "primary": "#f8fafc", "accent": "#3b82f6"},
        "creative": {"bg": "#1a1a2e", "primary": "#ffffff", "accent": "#ec4899"},
        "minimal": {"bg": "#f8fafc", "primary": "#0f172a", "accent": "#3b82f6"},
    }
    colors = theme_colors.get(theme, theme_colors["modern"])

    component_names = []
    slide_components = []

    for i, slide in enumerate(slides):
        name = None
        if slide.type == "cover":
            name = f"CoverSlide{i}"
            code = _make_slide_template(
                COVER_TEMPLATE,
                idx=i,
                title=slide.title,
                bg=colors["bg"],
                primary=colors["primary"],
            )
            slide_components.append(code)

        elif slide.type == "content":
            name = f"ContentSlide{i}"
            cards_html = ""
            for j, card in enumerate((slide.cards or [])[:4]):
                color = card_colors.get(card.get("type", "blue"), "#3b82f6")
                cards_html += _make_slide_template(
                    CONTENT_CARD_TEMPLATE,
                    color=color,
                    t_start=round((j + 1) * 0.15, 2),
                    t_end_opacity=round((j + 1) * 0.15 + 0.3, 2),
                    t_end_translate=round((j + 1) * 0.15 + 0.5, 2),
                    card_title=card.get("title", ""),
                    card_content=card.get("content", ""),
                )
            code = _make_slide_template(
                CONTENT_HEAD_TEMPLATE,
                idx=i,
                title=slide.title,
                bg=colors["bg"],
                accent=colors["accent"],
                cards_html=cards_html,
            )
            slide_components.append(code)

        elif slide.type == "summary":
            name = f"SummarySlide{i}"
            points_html = ""
            for j, point in enumerate((slide.content or [])[:4]):
                points_html += _make_slide_template(
                    SUMMARY_POINT_TEMPLATE,
                    t_start=round(j * 0.2, 2),
                    t_end=round(j * 0.2 + 0.3, 2),
                    primary=colors["primary"],
                    point=point,
                )
            code = _make_slide_template(
                SUMMARY_HEAD_TEMPLATE,
                idx=i,
                bg=colors["bg"],
                accent=colors["accent"],
                points_html=points_html,
            )
            slide_components.append(code)

        if name:
            component_names.append(name)

    components_str = "\n".join(slide_components)

    sequence_parts = "\n".join(
        f'      <Sequence from={{{idx * 180}}} durationInFrames={{180}}>\n        <{name} />\n      </Sequence>'
        for idx, name in enumerate(component_names)
    )

    slide_count = len(component_names)
    total_frames = slide_count * 180

    source = f'''import {{ AbsoluteFill, interpolate, useVideoConfig, spring, useCurrentFrame, Sequence, Composition, registerRoot }} from 'remotion';
import React from 'react';

{components_str}

const TOTAL_FRAMES = {total_frames};

const SlideSequence = () => (
  <>
{sequence_parts}
  </>
);

const RemotionRoot = () => {{
  return (
    <Composition
      id="SlideSequence"
      component={{SlideSequence}}
      durationInFrames={{TOTAL_FRAMES}}
      fps={{30}}
      width={{1920}}
      height={{1080}}
    />
  );
}};

registerRoot(RemotionRoot);
'''

    return source


# ==================== 端点 ====================

@router.post("/generate")
async def generate_remotion_video(request: RemotionGenerateRequest):
    """
    生成 Remotion 动态演示视频
    
    流程：
    1. 从卡片生成幻灯片序列
    2. 生成 Remotion React 源码
    (注：由于系统限制，需要在支持Chrome的环境中渲染)
    """
    try:
        if request.slides:
            slides = request.slides
        elif request.cards:
            slides = generate_slides_from_cards(request.topic, request.cards)
        else:
            raise HTTPException(status_code=400, detail="需要提供 cards 或 slides 数据")
        
        config = request.config or {}
        source = generate_remotion_source(slides, request.topic, config)
        
        output_dir = Path("C:/D/zhiyi/remotion-output")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        job_id = str(uuid.uuid4())[:8]
        source_path = output_dir / f"slide_{job_id}.tsx"
        source_path.write_text(source, encoding="utf-8")
        
        slides_data = {
            "topic": request.topic,
            "slides": [
                {
                    "id": s.id,
                    "type": s.type,
                    "title": s.title,
                    "cards": s.cards,
                    "content": s.content,
                }
                for s in slides
            ],
        }
        
        data_path = output_dir / f"data_{job_id}.json"
        data_path.write_text(json.dumps(slides_data, ensure_ascii=False), encoding="utf-8")
        
        metadata = {
            "job_id": job_id,
            "topic": request.topic,
            "slides_count": len(slides),
            "format": request.format,
            "quality": request.quality,
            "created_at": datetime.now().isoformat(),
            "status": "generated",
            "source_path": str(source_path),
            "data_path": str(data_path),
            "composition_id": "SlideSequence",
            "render_command": f"cd C:\\D\\zhiyi && npx remotion render remotion-output/slide_{job_id}.tsx SlideSequence remotion-output/video_{job_id}.mp4",
        }
        metadata_path = output_dir / f"meta_{job_id}.json"
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
        
        logger.info(f"[Remotion] 生成任务 {job_id}: {len(slides)} 张幻灯片")
        
        return {
            "status": "generated",
            "job_id": job_id,
            "source_path": str(source_path),
            "data_path": str(data_path),
            "composition_id": "SlideSequence",
            "render_command": f"npx remotion render C:/D/zhiyi/remotion-output/slide_{job_id}.tsx SlideSequence C:/D/zhiyi/remotion-output/video_{job_id}.mp4",
            "slides_count": len(slides),
            "slides": [s.dict() for s in slides],
            "message": "Remotion 源码已生成，可运行渲染命令生成视频文件"
        }
        
    except Exception as e:
        logger.error(f"[Remotion] 生成失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}")
async def get_render_status(job_id: str):
    """获取渲染状态"""
    output_dir = Path("C:/D/zhiyi/remotion-output")
    metadata_path = output_dir / f"meta_{job_id}.json"
    
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="任务不存在")
    
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    
    video_path = output_dir / f"video_{job_id}.mp4"
    metadata["video_exists"] = video_path.exists()
    if video_path.exists():
        metadata["video_url"] = f"/api/remotion/download/video/{job_id}"
        metadata["status"] = "completed"
    
    return metadata


@router.post("/render/{job_id}")
async def render_video(job_id: str):
    """触发 Remotion 视频渲染（需要 Chrome）"""
    output_dir = Path("C:/D/zhiyi/remotion-output")
    metadata_path = output_dir / f"meta_{job_id}.json"
    
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="任务不存在")
    
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    
    source_path = metadata.get("source_path", "")
    if not source_path or not Path(source_path).exists():
        raise HTTPException(status_code=400, detail="源文件不存在，请先执行生成")
    
    output_video = output_dir / f"video_{job_id}.mp4"
    
    try:
        cmd = [
            "npx", "remotion", "render",
            source_path,
            "SlideSequence",
            str(output_video),
            "--log=warning",
        ]
        
        metadata["status"] = "rendering"
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd="C:/D/zhiyi",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
            if process.returncode == 0 and output_video.exists():
                metadata["status"] = "completed"
                metadata["video_url"] = f"/api/remotion/download/video/{job_id}"
                metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
                return {
                    "status": "completed",
                    "video_url": f"/api/remotion/download/video/{job_id}",
                    "output_path": str(output_video),
                }
            else:
                error_text = stderr.decode("utf-8", errors="replace")[:500]
                metadata["status"] = "failed"
                metadata["error"] = error_text
                metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
                return {
                    "status": "failed",
                    "error": error_text,
                    "hint": "确保系统已安装 Chrome/Chromium 浏览器",
                }
        except asyncio.TimeoutError:
            process.kill()
            metadata["status"] = "timeout"
            metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
            return {"status": "timeout", "message": "渲染超时（超过5分钟）"}
            
    except FileNotFoundError:
        return {
            "status": "no_chrome",
            "error": "未找到 Chrome 浏览器",
            "hint": "渲染需要 Chrome/Chromium，请在本机安装后重试，或下载源码后在支持环境中渲染",
            "source_path": source_path,
            "render_command": f"npx remotion render {source_path} SlideSequence {output_video}",
        }
    except Exception as e:
        metadata["status"] = "failed"
        metadata["error"] = str(e)
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
        return {"status": "failed", "error": str(e)}


@router.get("/download/video/{job_id}")
async def download_video(job_id: str):
    """下载已渲染的视频文件"""
    output_dir = Path("C:/D/zhiyi/remotion-output")
    video_path = output_dir / f"video_{job_id}.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="视频文件不存在")
    return FileResponse(str(video_path), media_type="video/mp4", filename=f"remotion_{job_id}.mp4")


@router.get("/download/source/{job_id}")
async def download_source(job_id: str):
    """下载生成的 Remotion 源码文件"""
    output_dir = Path("C:/D/zhiyi/remotion-output")
    source_path = output_dir / f"slide_{job_id}.tsx"
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="源文件不存在")
    return FileResponse(str(source_path), media_type="text/plain", filename=f"remotion_slide_{job_id}.tsx")


@router.post("/preview")
async def preview_slides(slides: List[SlideData], topic: str):
    """预览幻灯片序列（不生成视频）"""
    return {
        "topic": topic,
        "slides": [s.dict() for s in slides],
        "count": len(slides),
        "total_duration": f"{len(slides) * 5}s",
    }