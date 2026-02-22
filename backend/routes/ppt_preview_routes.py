"""
PPT 预览路由 - 使用python-pptx直接读取并生成HTML预览
"""
import logging
import io
import base64
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.enum.text import PP_ALIGN
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx.dml.color import RGBColor
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False
    logging.warning("python-pptx 未安装")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ppt", tags=["PPT Preview"])


@router.get("/preview/status")
async def get_preview_status():
    """检查 PPT 预览功能状态"""
    return {
        "available": PPTX_AVAILABLE,
        "message": "PPT预览功能已启用" if PPTX_AVAILABLE else "PPT预览功能不可用，请安装: pip install python-pptx"
    }


@router.post("/preview/extract")
async def extract_ppt_content(file: UploadFile = File(...)):
    """
    提取 PPT 内容用于预览
    
    Args:
        file: PPT 文件
        
    Returns:
        PPT 结构和内容数据
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 预览功能不可用，请安装依赖: pip install python-pptx"
        )
    
    if not file.filename.endswith(('.pptx', '.ppt')):
        raise HTTPException(
            status_code=400,
            detail="只支持 .pptx 或 .ppt 文件"
        )
    
    try:
        content = await file.read()
        
        # 加载PPT
        prs = Presentation(io.BytesIO(content))
        
        slides_data = []
        
        for slide_idx, slide in enumerate(prs.slides):
            slide_data = {
                "index": slide_idx + 1,
                "shapes": [],
                "background": None
            }
            
            # 提取背景色
            try:
                if slide.background.fill.type is not None:
                    fill = slide.background.fill
                    if fill.type == 1:  # SOLID
                        color = fill.fore_color.rgb
                        slide_data["background"] = f"#{color}"
            except:
                pass
            
            # 提取形状
            for shape in slide.shapes:
                shape_data = extract_shape_data(shape)
                if shape_data:
                    slide_data["shapes"].append(shape_data)
            
            slides_data.append(slide_data)
        
        return {
            "filename": file.filename,
            "total_slides": len(prs.slides),
            "slide_width": prs.slide_width.emu if hasattr(prs, 'slide_width') else 9144000,
            "slide_height": prs.slide_height.emu if hasattr(prs, 'slide_height') else 6858000,
            "slides": slides_data
        }
        
    except Exception as e:
        logger.error(f"PPT 内容提取失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"提取失败: {str(e)}")


def extract_shape_data(shape) -> Optional[Dict[str, Any]]:
    """提取形状数据"""
    try:
        data = {
            "type": str(shape.shape_type),
            "name": shape.name,
            "left": shape.left.emu if hasattr(shape, 'left') else 0,
            "top": shape.top.emu if hasattr(shape, 'top') else 0,
            "width": shape.width.emu if hasattr(shape, 'width') else 0,
            "height": shape.height.emu if hasattr(shape, 'height') else 0,
        }
        
        # 提取文本
        if shape.has_text_frame:
            paragraphs = []
            for para in shape.text_frame.paragraphs:
                para_data = {
                    "text": para.text,
                    "runs": []
                }
                for run in para.runs:
                    run_data = {"text": run.text}
                    try:
                        if run.font.size:
                            run_data["font_size"] = run.font.size.pt
                        if run.font.bold:
                            run_data["bold"] = True
                        if run.font.italic:
                            run_data["italic"] = True
                        if run.font.color and run.font.color.rgb:
                            run_data["color"] = f"#{run.font.color.rgb}"
                    except:
                        pass
                    para_data["runs"].append(run_data)
                paragraphs.append(para_data)
            data["paragraphs"] = paragraphs
        
        # 提取表格
        if shape.has_table:
            table_data = []
            for row in shape.table.rows:
                row_data = []
                for cell in row.cells:
                    row_data.append(cell.text)
                table_data.append(row_data)
            data["table"] = table_data
        
        # 提取填充颜色
        try:
            if hasattr(shape, 'fill') and shape.fill.type is not None:
                if shape.fill.type == 1:  # SOLID
                    color = shape.fill.fore_color.rgb
                    data["fill_color"] = f"#{color}"
        except:
            pass
        
        return data
        
    except Exception as e:
        logger.warning(f"提取形状数据失败: {e}")
        return None


@router.post("/preview/html")
async def generate_ppt_html_preview(file: UploadFile = File(...)):
    """
    生成 PPT 的 HTML 预览
    
    Args:
        file: PPT 文件
        
    Returns:
        HTML 字符串
    """
    if not PPTX_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PPT 预览功能不可用"
        )
    
    try:
        content = await file.read()
        prs = Presentation(io.BytesIO(content))
        
        # PPT尺寸 (EMU to pixels, 914400 EMU = 1 inch = 96px)
        slide_width_px = int(prs.slide_width.emu / 914400 * 96) if hasattr(prs, 'slide_width') else 960
        slide_height_px = int(prs.slide_height.emu / 914400 * 96) if hasattr(prs, 'slide_height') else 540
        
        # 缩放比例
        scale = min(800 / slide_width_px, 600 / slide_height_px)
        display_width = int(slide_width_px * scale)
        display_height = int(slide_height_px * scale)
        
        slides_html = []
        
        for slide_idx, slide in enumerate(prs.slides):
            slide_html = generate_slide_html(slide, slide_idx, display_width, display_height, scale)
            slides_html.append(slide_html)
        
        # 构建完整HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: #1a1a2e;
            padding: 20px;
        }}
        .ppt-container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        .slide {{
            background: white;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            position: relative;
        }}
        .slide-number {{
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.5);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            z-index: 10;
        }}
        .slide-content {{
            position: relative;
            overflow: hidden;
        }}
        .shape {{
            position: absolute;
        }}
        .shape-text {{
            word-wrap: break-word;
            line-height: 1.4;
        }}
        .shape-table {{
            border-collapse: collapse;
            width: 100%;
            height: 100%;
        }}
        .shape-table td {{
            border: 1px solid #ccc;
            padding: 4px;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="ppt-container">
        {''.join(slides_html)}
    </div>
</body>
</html>
        """
        
        return {"html": html, "total_slides": len(prs.slides)}
        
    except Exception as e:
        logger.error(f"生成HTML预览失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def generate_slide_html(slide, slide_idx: int, display_width: int, display_height: int, scale: float) -> str:
    """生成单个幻灯片的HTML"""
    
    # 背景色
    bg_color = "#ffffff"
    try:
        if slide.background.fill.type is not None:
            if slide.background.fill.type == 1:  # SOLID
                bg_color = f"#{slide.background.fill.fore_color.rgb}"
    except:
        pass
    
    shapes_html = []
    
    for shape in slide.shapes:
        shape_html = generate_shape_html(shape, scale)
        if shape_html:
            shapes_html.append(shape_html)
    
    return f"""
    <div class="slide" style="width: {display_width}px; height: {display_height}px;">
        <div class="slide-number">{slide_idx + 1}</div>
        <div class="slide-content" style="width: 100%; height: 100%; background: {bg_color};">
            {''.join(shapes_html)}
        </div>
    </div>
    """


def generate_shape_html(shape, scale: float) -> Optional[str]:
    """生成单个形状的HTML"""
    try:
        # 位置和大小
        left = int(shape.left.emu / 914400 * 96 * scale) if hasattr(shape, 'left') else 0
        top = int(shape.top.emu / 914400 * 96 * scale) if hasattr(shape, 'top') else 0
        width = int(shape.width.emu / 914400 * 96 * scale) if hasattr(shape, 'width') else 100
        height = int(shape.height.emu / 914400 * 96 * scale) if hasattr(shape, 'height') else 50
        
        # 填充颜色
        fill_style = ""
        try:
            if hasattr(shape, 'fill') and shape.fill.type is not None:
                if shape.fill.type == 1:  # SOLID
                    color = shape.fill.fore_color.rgb
                    fill_style = f"background: #{color};"
        except:
            pass
        
        # 文本内容
        content = ""
        text_style = ""
        
        if shape.has_text_frame:
            texts = []
            for para in shape.text_frame.paragraphs:
                para_text = para.text
                if para_text:
                    texts.append(para_text)
            
            if texts:
                content = "<br>".join(texts)
                
                # 尝试获取字体样式
                try:
                    for para in shape.text_frame.paragraphs:
                        for run in para.runs:
                            if run.font.size:
                                font_size = int(run.font.size.pt * scale)
                                text_style += f"font-size: {font_size}px;"
                            if run.font.bold:
                                text_style += "font-weight: bold;"
                            if run.font.color and run.font.color.rgb:
                                text_style += f"color: #{run.font.color.rgb};"
                            break
                        break
                except:
                    text_style += f"font-size: {int(18 * scale)}px; color: #333;"
        
        # 表格
        if shape.has_table:
            rows_html = []
            for row in shape.table.rows:
                cells_html = []
                for cell in row.cells:
                    cells_html.append(f"<td>{cell.text}</td>")
                rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
            content = f"<table class='shape-table'>{''.join(rows_html)}</table>"
        
        if content:
            return f"""
            <div class="shape" style="left: {left}px; top: {top}px; width: {width}px; height: {height}px; {fill_style}">
                <div class="shape-text" style="{text_style} width: 100%; height: 100%; overflow: hidden;">
                    {content}
                </div>
            </div>
            """
        
        return None
        
    except Exception as e:
        logger.warning(f"生成形状HTML失败: {e}")
        return None
