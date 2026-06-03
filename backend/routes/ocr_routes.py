# ---------------------------------------------------------------------
# OCR API 路由 - 使用 Genie HTTP 服务 (qwen2.5vl3b)
# ---------------------------------------------------------------------
"""
PDF/图片 OCR识别 - 通过 8910 Genie 服务调用 qwen2.5vl3b 模型
支持预设提示词模板（出租车发票、通用文字、表格等）
"""
import httpx

import logging
import base64
import io
import os
import tempfile
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query
from typing import Optional, Dict, List
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)

# Genie VL 服务地址
_GENIE_SERVICE_URL = "http://127.0.0.1:8910"

router = APIRouter(prefix="/api/ocr", tags=["OCR识别"])

# ==================== 预设提示词模板 ====================

OCR_PRESETS: Dict[str, Dict] = {
    "general": {
        "name": "通用文字识别",
        "description": "识别图片中的所有文字，按原格式输出",
        "prompt": "请识别图片中的所有文字内容，按原格式输出",
    },
    "taxi_invoice": {
        "name": "出租车发票提取",
        "description": "从出租车发票图片中提取结构化信息（发票抬头、代码、号码、日期、里程、金额等）",
        "prompt": """#角色设定
作为一个出租车发票信息提取员，你的任务是从阅读、理解、分析图片，从中提取关键信息，并将其按照要求调整为标准的输出形式，最终以json格式进行输出。

#组件能力
你可以应用OCR识别能力，提取图片信息。

#要求与限制
1.你需要分析图片内容，从中提取出「发票抬头、发票代码、发票号码、出租车单位、电话、车牌号、日期、时间、单价、里程、实收金额」的信息
2.你需要参照输出示例将其按照json格式进行输出
3.根据发票抬头所属省份完善车牌号，输出车牌号需完整，如：京PA8888
4.出租车单位如没有，则输出为空即可。

#输出示例
json
{
  "发票抬头": "北京市出租汽车专用发票",
  "发票代码": "111000000000",
  "发票号码": "00000000",
  "出租车单位": "1015",
  "电话": "",
  "车牌号": "京BM6666",
  "日期": "2024-07-16",
  "时间": "23:04-23:26",
  "单价": "2.76",
  "里程": "8.6",
  "实收金额": "34.00"
}""",
    },
    "table": {
        "name": "表格识别",
        "description": "识别图片中的表格内容，以Markdown表格格式输出",
        "prompt": "请识别图片中的表格内容，以Markdown表格格式输出",
    },
    "invoice_general": {
        "name": "通用发票提取",
        "description": "提取增值税发票的字段（发票号码、日期、金额、买卖方信息等）",
        "prompt": """你是一个发票识别专家。请从图片中提取发票的关键信息，以JSON格式返回。
必须包含以下字段：
- invoice_number: 发票号码
- invoice_code: 发票代码
- invoice_date: 开票日期
- seller_name: 销售方名称
- seller_tax_id: 销售方纳税人识别号
- buyer_name: 购买方名称
- buyer_tax_id: 购买方纳税人识别号
- total_amount: 价税合计（数字）
- amount: 金额（数字，不含税）
- tax_amount: 税额（数字）

同时提取发票明细items（数组），每项包含：
- name: 货物或应税劳务名称
- quantity: 数量
- amount: 金额

只返回JSON，不要其他文字。如果某个字段找不到，用null代替。""",
    },
}


@router.get("/presets")
async def get_ocr_presets():
    """获取所有 OCR 预设提示词模板"""
    presets = []
    for key, val in OCR_PRESETS.items():
        presets.append({
            "id": key,
            "name": val["name"],
            "description": val["description"],
        })
    return {"presets": presets}


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
        "temp": 0.1,
        "top_k": 40,
        "top_p": 0.9,
        "max_tokens": 2048
    }
    async with httpx.AsyncClient(timeout=120.0, proxy=None) as client:
        response = await client.post(
            f"{_GENIE_SERVICE_URL}/v1/chat/completions",
            json=request_data
        )
        response.raise_for_status()
        result = response.json()
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        return ""


def _resolve_prompt(prompt: Optional[str], preset: Optional[str]) -> str:
    """解析最终提示词：preset 优先，其次 prompt，最后默认通用"""
    if preset and preset in OCR_PRESETS:
        return OCR_PRESETS[preset]["prompt"]
    if prompt:
        return prompt
    return OCR_PRESETS["general"]["prompt"]


@router.post("/extract/text")
async def extract_text(
    file: UploadFile = File(...),
    prompt: str = Form(None),
    preset: str = Form(None),
):
    """使用 qwen2.5vl3b 识别图片中的文字
    
    - preset: 预设模板ID（taxi_invoice / table / invoice_general / general）
    - prompt: 自定义提示词（preset为空时使用）
    - 两者都为空时使用通用识别
    """
    final_prompt = _resolve_prompt(prompt, preset)
    content = await file.read()
    
    try:
        image = Image.open(io.BytesIO(content))
        if image.mode != "RGB":
            image = image.convert("RGB")
        img_b64 = _image_to_base64(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片格式错误: {e}")
    
    try:
        text = await _call_genie_vl(img_b64, final_prompt)
        
        return {
            "success": True,
            "filename": file.filename,
            "preset": preset,
            "preset_name": OCR_PRESETS[preset]["name"] if preset and preset in OCR_PRESETS else None,
            "text": text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"OCR失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/tables")
async def extract_tables(
    file: UploadFile = File(...),
    preset: str = Form("table"),
):
    """识别图片中的表格"""
    return await extract_text(file, preset=preset)


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Form(None),
    preset: str = Form(None),
):
    """分析图片内容（支持预设模板）"""
    final_prompt = _resolve_prompt(prompt or "请详细描述这张图片的内容", preset)
    content = await file.read()
    
    try:
        image = Image.open(io.BytesIO(content))
        if image.mode != "RGB":
            image = image.convert("RGB")
        img_b64 = _image_to_base64(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图片格式错误: {e}")
    
    try:
        text = await _call_genie_vl(img_b64, final_prompt)
        
        return {
            "success": True,
            "filename": file.filename,
            "preset": preset,
            "description": text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"图片分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    dpi: int = Form(150),
    preset: str = Form(None),
):
    """OCR识别PDF文件（先转图片再识别，支持预设模板）"""
    final_prompt = _resolve_prompt(None, preset)
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持PDF文件")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        import pdfplumber
        with pdfplumber.open(tmp_path) as pdf:
            all_text = {}
            for page_num, page in enumerate(pdf.pages, 1):
                page_image = page.to_image(dpi=dpi)
                img_b64 = _image_to_base64(page_image.original)
                text = await _call_genie_vl(img_b64, final_prompt)
                all_text[page_num] = text
        
        return {
            "success": True,
            "filename": file.filename,
            "preset": preset,
            "pages": all_text,
            "model": "qwen2.5vl3b-8380-2.42"
        }
        
    except Exception as e:
        logger.error(f"PDF OCR失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


_OUTPUT_DIR = Path("./data/exports")
_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# OCR导出字段映射：OCR JSON key → Excel列名
OCR_EXPORT_FIELDS = {
    "taxi_invoice": [
        ("发票抬头", "发票抬头"),
        ("发票代码", "发票代码"),
        ("发票号码", "发票号码"),
        ("出租车单位", "出租车单位"),
        ("电话", "电话"),
        ("车牌号", "车牌号"),
        ("日期", "日期"),
        ("时间", "时间"),
        ("单价", "单价"),
        ("里程", "里程"),
        ("实收金额", "实收金额"),
    ],
    "invoice_general": [
        ("invoice_number", "发票号码"),
        ("invoice_code", "发票代码"),
        ("invoice_date", "开票日期"),
        ("seller_name", "销售方"),
        ("seller_tax_id", "销售方税号"),
        ("buyer_name", "购买方"),
        ("buyer_tax_id", "购买方税号"),
        ("total_amount", "价税合计"),
        ("amount", "金额"),
        ("tax_amount", "税额"),
    ],
}


@router.post("/export")
async def export_ocr_result(
    json_text: str = Form(...),
    preset: str = Form("taxi_invoice"),
    format: str = Form("xlsx"),
):
    """将OCR结构化结果导出为Excel/CSV

    - json_text: OCR返回的JSON文本（支持中文key或英文key）
    - preset: 预设模板ID，决定导出字段映射
    - format: xlsx 或 csv
    """
    import json
    from datetime import datetime
    from pathlib import Path

    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON解析失败: {e}")

    fields = OCR_EXPORT_FIELDS.get(preset, [])
    if not fields:
        # 兜底：提取JSON的所有key
        fields = [(k, k) for k in data.keys()]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    preset_name = OCR_PRESETS.get(preset, {}).get("name", "ocr")
    safe_name = preset_name.replace(" ", "_")

    if format == "csv":
        import csv
        filename = f"ocr_{safe_name}_{timestamp}.csv"
        output_path = _OUTPUT_DIR / filename
        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow([label for _, label in fields])
            row = []
            for key, _ in fields:
                val = data.get(key)
                row.append(str(val) if val is not None else "")
            writer.writerow(row)
    else:
        import pandas as pd
        filename = f"ocr_{safe_name}_{timestamp}.xlsx"
        output_path = _OUTPUT_DIR / filename
        row_data = {}
        for key, label in fields:
            val = data.get(key)
            row_data[label] = val if val is not None else ""
        df = pd.DataFrame([row_data])
        df.to_excel(output_path, index=False, engine="openpyxl")

    return {
        "status": "ok",
        "filename": filename,
        "path": str(output_path),
        "download_url": f"/api/excel/download/{filename}",
    }