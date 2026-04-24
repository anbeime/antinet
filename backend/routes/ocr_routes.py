# ---------------------------------------------------------------------
# OCR API 路由 - 使用 NPU qwen2.5vl3b 模型
# ---------------------------------------------------------------------
"""
PDF/图片 OCR识别 - 使用 qwen2.5vl3b NPU模型
"""

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

router = APIRouter(prefix="/api/ocr", tags=["OCR识别"])

# NPU模型加载器
_npu_core = None
_model_loaded = False

def _get_npu_core():
    """获取或初始化 NPU 推理核心"""
    global _npu_core, _model_loaded
    if _npu_core is not None and _model_loaded:
        return _npu_core
    
    try:
        from npu_core import NPUInferenceCore
        _npu_core = NPUInferenceCore(
            model_config_path=os.path.join(
                NPUInferenceCore.MODELS_BASE_DIR,
                "qwen2.5vl3b-8380-2.42",
                "config.json"
            )
        )
        _npu_core.load_model()
        _model_loaded = True
        logger.info("[OCR] qwen2.5vl3b 模型加载成功")
        return _npu_core
    except Exception as e:
        logger.error(f"[OCR] NPU模型加载失败: {e}")
        return None


@router.get("/status")
async def get_ocr_status():
    """获取 OCR 功能状态"""
    npu = _get_npu_core()
    return {
        "available": npu is not None,
        "model": "qwen2.5vl3b-8380-2.42",
        "type": "NPU (QnnHtp)",
        "platform": "ARM64"
    }


def _image_to_base64(image: Image.Image) -> str:
    """图片转base64"""
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


@router.post("/extract/text")
async def extract_text(
    file: UploadFile = File(...),
    prompt: str = Form("请识别图片中的所有文字内容，按原格式输出")
):
    """使用 qwen2.5vl3b 识别图片中的文字"""
    npu = _get_npu_core()
    if npu is None:
        raise HTTPException(status_code=503, detail="NPU模型不可用")
    
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
        # 调用NPU推理
        response = npu.model.chat(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": {"b64": img_b64}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        )
        
        text = response.get("content", [{}])[0].get("text", "") if response else ""
        
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
    npu = _get_npu_core()
    if npu is None:
        raise HTTPException(status_code=503, detail="NPU模型不可用")
    
    content = await file.read()
    
    try:
        image = Image.open(io.BytesIO(content))
        if image.mode != "RGB":
            image = image.convert("RGB")
        img_b64 = _image_to_base64(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片格式错误: {e}")
    
    try:
        response = npu.model.chat(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": {"b64": img_b64}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        )
        
        text = response.get("content", [{}])[0].get("text", "") if response else ""
        
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
    npu = _get_npu_core()
    if npu is None:
        raise HTTPException(status_code=503, detail="NPU模型不可用")
    
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
                response = npu.model.chat(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "image", "image": {"b64": img_b64}},
                                {"type": "text", "text": "请识别图片中的所有文字内容"}
                            ]
                        }
                    ]
                )
                
                text = response.get("content", [{}])[0].get("text", "") if response else ""
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