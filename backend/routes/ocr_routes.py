# ---------------------------------------------------------------------
# OCR API 路由 - 使用 Genie HTTP 服务 (qwen2.5vl3b)
# ---------------------------------------------------------------------
"""
PDF/图片 OCR识别 - 通过 8910 Genie 服务调用 qwen2.5vl3b 模型
"""
import httpx

import logging
import base64
import io
import os
import tempfile
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

# Genie VL 服务地址
_GENIE_SERVICE_URL = "http://127.0.0.1:8910"

router = APIRouter(prefix="/api/ocr", tags=["OCR识别"])


@router.get("/status")
async def get_ocr_status():
    """获取 OCR 功能状态 - 通过 ping Genie 服务检测"""
    available = False
    try:
        async with httpx.AsyncClient(timeout=5.0, proxy=None) as client:
            resp = await client.post(
                f"{_GENIE_SERVICE_URL}/v1/chat/completions",
                json={"model": "qwen2.5vl3b-8380-2.42", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1}
            )
            available = resp.status_code == 200
    except Exception:
        pass
    return {
        "available": available,
        "model": "qwen2.5vl3b-8380-2.42",
        "type": "Genie HTTP (qwen2.5vl3b)",
        "platform": "8910"
    }


def _image_to_base64(image: Image.Image) -> str:
    """图片转base64"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


async def _call_genie_vl(image_b64: str, prompt: str, task_id: str = None) -> str:
    """通过 Genie HTTP 服务调用 qwen2.5vl3b 进行视觉理解"""
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
                {"type": "text", "text": prompt}
            ]
        }
    ]
    request_data = {
        "model": "qwen2.5vl3b-8380-2.42",
        "messages": messages,
        "size": 2048,
        "seed": 42,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 1.0
    }
    async with httpx.AsyncClient(timeout=60.0, proxy=None) as client:
        response = await client.post(
            f"{_GENIE_SERVICE_URL}/v1/chat/completions",
            json=request_data
        )
        response.raise_for_status()
        result = response.json()
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        return ""


@router.post("/extract/text")
async def extract_text(
    file: UploadFile = File(...),
    prompt: str = Form("请识别图片中的所有文字内容，按原格式输出")
):
    """使用 qwen2.5vl3b 识别图片中的文字"""
    # 读取图片
    content = await file.read()
    
    # 尝试作为图片打开
    try:
        image = Image.open(io.BytesIO(content))
        # 转为RGB（如果需要）
        if image.mode != "RGB":
            image = image.convert("RGB")
        img_b64 = _image_to_base64(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片格式错误: {e}")
    
    try:
        text = await _call_genie_vl(img_b64, prompt)
        
        return {
            "success": True,
            "filename": file.filename,
            "text": text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"OCR失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/tables")
async def extract_tables(
    file: UploadFile = File(...)
):
    """识别图片中的表格"""
    return await extract_text(
        file,
        prompt="请识别图片中的表格内容，以Markdown表格格式输出"
    )


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Form("请详细描述这张图片的内容")
):
    """分析图片内容"""
    content = await file.read()
    
    try:
        image = Image.open(io.BytesIO(content))
        if image.mode != "RGB":
            image = image.convert("RGB")
        img_b64 = _image_to_base64(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片格式错误: {e}")
    
    try:
        text = await _call_genie_vl(img_b64, prompt)
        
        return {
            "success": True,
            "filename": file.filename,
            "description": text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    dpi: int = Form(150)
):
    """OCR识别PDF文件（先转图片再识别）"""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持PDF文件")
    
    # 保存PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        # 使用pdfplumber转图片
        import pdfplumber
        with pdfplumber.open(tmp_path) as pdf:
            all_text = {}
            
            for page_num, page in enumerate(pdf.pages, 1):
                # 获取页面图片
                page_image = page.to_image(dpi=dpi)
                img_b64 = _image_to_base64(page_image.original)
                
                # OCR识别
                text = await _call_genie_vl(img_b64, "请识别图片中的所有文字内容")
                all_text[page_num] = text
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": all_text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"PDF OCR失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)