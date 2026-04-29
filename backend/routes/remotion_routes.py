"""
Remotion 动态演示路由
将知识卡片转换为动画视频
"""
import logging
import json
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
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

def generate_remotion_source(slides: List[SlideData], topic: str, config: Dict[str, Any]) -> str:
    """生成 Remotion React 组件源码"""
    
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
    
    slide_components = []
    for i, slide in enumerate(slides):
        if slide.type == "cover":
            slide_components.append(f'''
// Slide {i+1}: Cover
const CoverSlide{i} = () => {{
  const frame = useCurrentFrame();
  const {{ fps }} = useVideoConfig();
  const progress = spring({{
    frame,
    fps,
    config: {{ damping: 200 }}
  }});
  return (
    <AbsoluteFill style={{{{ background: '{colors["bg"]}' }}>
      <div style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${{interpolate(progress, [0, 1], [30, 0])}}px)`,
        fontSize: 72, color: '{colors["primary"]}', textAlign: 'center', padding: '40vh 0'
      }}>
        {slide.title}
      </div>
    </AbsoluteFill>
  );
}};
''')
        elif slide.type == "content":
            cards_html = ""
            for j, card in enumerate((slide.cards or [])[:4]):
                color = card_colors.get(card.get("type", "blue"), "#3b82f6")
                card_title = card.get("title", "")
                card_content = card.get("content", "")
                cards_html += f'''
      <div style={{
        backgroundColor: '{color}',
        borderRadius: 12, padding: 20, marginBottom: 16,
        opacity: interpolate(progress, [{(j+1)*0.15}, {(j+1)*0.15+0.3}], [0, 1]),
        transform: `translateX(${{interpolate(progress, [{(j+1)*0.15}, {(j+1)*0.15+0.5}], [-50, 0])}}px)`
      }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{card_title}</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>{card_content}</div>
      </div>'''
            
            slide_components.append(f'''
// Slide {i+1}: Content - {slide.title}
const ContentSlide{i} = () => {{
  const frame = useCurrentFrame();
  const {{ fps }} = useVideoConfig();
  const progress = spring({{
    frame,
    fps,
    config: {{ damping: 200 }}
  }});
  return (
    <AbsoluteFill style={{{{ background: '{colors["bg"]}', padding: 40 }}}}>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: '{colors["accent"]}', marginBottom: 20 }}>
        {slide.title}
      </div>
      {cards_html}
    </AbsoluteFill>
  );
}};
''')
        elif slide.type == "summary":
            points_html = ""
            for j, point in enumerate((slide.content or [])[:4]):
                points_html += f'''
        <div style={{
          fontSize: 24, color: '{colors["primary"]}', marginBottom: 16,
          opacity: interpolate(progress, [{j*0.2}, {j*0.2+0.3}], [0, 1])
        }}>
          {point}
        </div>'''
            
            slide_components.append(f'''
// Slide {i+1}: Summary
const SummarySlide{i} = () => {{
  const frame = useCurrentFrame();
  const {{ fps }} = useVideoConfig();
  const progress = spring({{
    frame,
    fps,
    config: {{ damping: 200 }}
  }});
  return (
    <AbsoluteFill style={{{{ background: '{colors["bg"]}', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 48, color: '{colors["accent"]}', marginBottom: 40 }}>总结</div>
      {points_html}
    </AbsoluteFill>
  );
}};
''')
    
    components_str = "\n".join(slide_components)
    
    source = f'''import {{ AbsoluteFill, interpolate, useVideoConfig, spring, useCurrentFrame }} from 'remotion';

const theme = {json.dumps(colors)};

{components_str}

export const SlideSequence = [
''' + ",\n".join([f"CoverSlide{i}" if slides[i].type == "cover" else f"ContentSlide{i}" if slides[i].type == "content" else f"SummarySlide{i}" for i in range(len(slides))]) + '''
];
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
            "render_command": f"cd C:\\D\\zhiyi && npx remotion render remotion-output/slide_{job_id}.tsx <composition-id> output.mp4",
        }
        metadata_path = output_dir / f"meta_{job_id}.json"
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
        
        logger.info(f"[Remotion] 生成任务 {job_id}: {len(slides)} 张幻灯片")
        
        return {
            "status": "generated",
            "job_id": job_id,
            "source_path": str(source_path),
            "data_path": str(data_path),
            "render_command": f"npx remotion render C:/D/zhiyi/remotion-output/slide_{job_id}.tsx <composition-id> C:/D/zhiyi/remotion-output/video_{job_id}.mp4",
            "slides_count": len(slides),
            "slides": [s.dict() for s in slides],
            "message": "Remotion 源码已生成，请在支持Chrome的环境下运行渲染命令"
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
    return metadata


@router.post("/preview")
async def preview_slides(slides: List[SlideData], topic: str):
    """预览幻灯片序列（不生成视频）"""
    return {
        "topic": topic,
        "slides": [s.dict() for s in slides],
        "count": len(slides),
        "total_duration": f"{len(slides) * 5}s",  # 估算每页5秒
    }