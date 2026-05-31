"""
Invoice Skill — 发票处理二级识别链
Level 1: pdfplumber 文本提取（可搜索 PDF）
Level 2: Qwen2.5-VL 视觉模型（扫描件/图片）
"""
import logging
import re
import json
import io
import base64
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)

_GENIE_SERVICE_URL = "http://127.0.0.1:8910"

INVOICE_FIELDS = [
    "invoice_number", "invoice_code", "invoice_date",
    "seller_name", "seller_tax_id",
    "buyer_name", "buyer_tax_id",
    "total_amount", "amount", "tax_amount",
]

INVOICE_EXTRACT_PROMPT = """你是一个发票识别专家。请从图片中提取发票的关键信息，以JSON格式返回。
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
- specification: 规格型号
- unit: 单位
- quantity: 数量
- unit_price: 单价
- amount: 金额

只返回JSON，不要其他文字。如果某个字段找不到，用null代替。"""


def _image_to_base64(image: Image.Image) -> str:
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


async def _call_genie_vl(image_b64: str, prompt: str) -> str:
    import httpx
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
        "top_k": 1,
        "top_p": 1.0
    }
    async with httpx.AsyncClient(timeout=120.0, proxy=None) as client:
        resp = await client.post(
            f"{_GENIE_SERVICE_URL}/v1/chat/completions",
            json=request_data
        )
        resp.raise_for_status()
        result = resp.json()
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        return ""


# ---- Level 1: pdfplumber 文本提取 ----

def _extract_text_pdfplumber(file_path: str) -> str:
    """Extract text from PDF using pdfplumber"""
    import pdfplumber
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _parse_invoice_text(text: str) -> Dict[str, Any]:
    """Parse structured invoice fields from plain text"""
    result = {}
    patterns = {
        "invoice_number": [r"发票号码[：:]\s*(\S+)", r"发票号码\s*(\S+)", r"No\s*[：:]\s*(\S+)", r"(\d{8,12})"],
        "invoice_code": [r"发票代码[：:]\s*(\S+)", r"发票代码\s*(\S+)"],
        "invoice_date": [r"开票日期[：:]\s*(\S+)", r"日期[：:]\s*(\S+)", r"(\d{4}年\d{1,2}月\d{1,2}日)"],
        "seller_name": [r"销售方(?:名称)?[：:]\s*(.+)", r"销货单位(?:名称)?[：:]\s*(.+)", r"销售方[：:]\s*(.+)", r"销货单位[：:]\s*(.+)"],
        "seller_tax_id": [r"销售方纳税人识别号[：:]\s*(\S+)", r"销货单位纳税人识别号[：:]\s*(\S+)", r"纳税人识别号[：:]\s*(\S+)"],
        "buyer_name": [r"购买方(?:名称)?[：:]\s*(.+)", r"购货单位(?:名称)?[：:]\s*(.+)", r"购买方[：:]\s*(.+)", r"购货单位[：:]\s*(.+)"],
        "buyer_tax_id": [r"购买方纳税人识别号[：:]\s*(\S+)", r"购货单位纳税人识别号[：:]\s*(\S+)"],
        "total_amount": [r"价税合计[（(]大写[)）)]?[：:]\s*\S*?[（(]小写[)）)]?[：:]\s*([\d,]+\.?\d*)", r"价税合计[：:]\s*¥?([\d,]+\.?\d*)", r"合计[：:]\s*¥?([\d,]+\.?\d*)", r"价税合计[：:]\s*([\d,]+\.?\d*)"],
        "amount": [r"金额[：:]\s*¥?([\d,]+\.?\d*)", r"金额[（(]不含税[)）]?[：:]\s*¥?([\d,]+\.?\d*)"],
        "tax_amount": [r"税额[：:]\s*¥?([\d,]+\.?\d*)", r"税率[：:]\s*\S+\s*税额[：:]\s*¥?([\d,]+\.?\d*)"],
    }
    for field, pats in patterns.items():
        for p in pats:
            m = re.search(p, text)
            if m:
                val = m.group(1).strip()
                if field in ("total_amount", "amount", "tax_amount"):
                    val = val.replace(",", "")
                    try:
                        val = float(val)
                    except ValueError:
                        pass
                result[field] = val
                break
    items = _parse_invoice_items(text)
    if items:
        result["items"] = items
    return result


def _parse_invoice_items(text: str) -> List[Dict[str, Any]]:
    """Attempt to parse invoice line items from text"""
    items = []
    lines = text.split("\n")
    in_table = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if re.search(r"(货物|应税劳务|服务名称|项目)", line) and re.search(r"(金额|单价|数量)", line):
            in_table = True
            continue
        if in_table and re.search(r"合计|小计", line):
            in_table = False
            continue
        if in_table:
            parts = re.split(r"\s{2,}", line)
            if len(parts) >= 2:
                item = {"name": parts[0].strip()}
                for p in parts[1:]:
                    p = p.strip()
                    if re.match(r"^\d+\.?\d*$", p) and "quantity" not in item:
                        item["quantity"] = float(p)
                    elif re.match(r"^[\d,]+\.?\d*$", p.replace(",", "")) and "amount" not in item:
                        item["amount"] = float(p.replace(",", ""))
                if "quantity" not in item and "amount" not in item:
                    item["name"] = line.strip()
                items.append(item)
    return items


# ---- Level 2: Qwen2.5-VL 视觉识别 ----

async def _ocr_invoice_vl(image_path: str) -> Dict[str, Any]:
    """Use Qwen2.5-VL model to extract invoice info from image"""
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")
    img_b64 = _image_to_base64(image)
    raw_response = await _call_genie_vl(img_b64, INVOICE_EXTRACT_PROMPT)
    if not raw_response:
        return {"error": "vision model returned empty response"}
    try:
        json_match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result
        return {"error": "no JSON found in vision response", "raw": raw_response[:500]}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": raw_response[:500]}


# ---- 二级处理链 ----

async def process_invoice(file_path: str, filename: str = "") -> Dict[str, Any]:
    """
    Two-level invoice processing:
    1. Try pdfplumber text extraction (searchable PDFs)
    2. Fall back to Qwen2.5-VL vision OCR (scanned documents)
    """
    result = {
        "filename": filename or os.path.basename(file_path),
        "file_path": file_path,
        "status": "pending",
        "engine_used": None,
        "fields": {},
        "items": [],
        "raw_text": "",
        "error": None,
    }

    ext = os.path.splitext(file_path)[1].lower()

    # --- Level 1: PDF text extraction ---
    if ext == ".pdf":
        try:
            raw_text = _extract_text_pdfplumber(file_path)
            if raw_text and len(raw_text.strip()) > 50:
                parsed = _parse_invoice_text(raw_text)
                has_fields = any(parsed.get(f) for f in ["invoice_number", "seller_name", "total_amount"])
                if has_fields:
                    result["status"] = "processed"
                    result["engine_used"] = "pdfplumber"
                    result["fields"] = parsed
                    result["items"] = parsed.get("items", [])
                    result["raw_text"] = raw_text[:2000]
                    return result
                else:
                    logger.info(f"[Invoice] Level 1 extracted text but no invoice fields found, falling back to vision: {filename}")
            else:
                logger.info(f"[Invoice] Level 1 insufficient text, falling back to vision: {filename}")
        except Exception as e:
            logger.warning(f"[Invoice] Level 1 failed: {e}, falling back to vision")

    # --- Level 2: Vision OCR ---
    try:
        # Convert PDF to image if needed
        if ext == ".pdf":
            image_path = _pdf_to_image(file_path)
            if not image_path:
                result["status"] = "failed"
                result["error"] = "failed to convert PDF to image"
                return result
        else:
            image_path = file_path

        vision_result = await _ocr_invoice_vl(image_path)

        if "error" in vision_result:
            result["status"] = "failed"
            result["error"] = vision_result["error"]
            result["raw_text"] = vision_result.get("raw", "")
            return result

        result["status"] = "processed"
        result["engine_used"] = "qwen2.5vl"
        for field in INVOICE_FIELDS:
            if field in vision_result and vision_result[field] is not None:
                result["fields"][field] = vision_result[field]
        result["items"] = vision_result.get("items", [])

        # Clean up temp image
        if ext == ".pdf" and image_path != file_path:
            try:
                os.remove(image_path)
            except OSError:
                pass

        return result

    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)
        return result


def _pdf_to_image(pdf_path: str, dpi: int = 200) -> Optional[str]:
    """Convert first page of PDF to image for vision OCR"""
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            if not pdf.pages:
                return None
            page = pdf.pages[0]
            img = page.to_image(dpi=dpi)
            out_path = pdf_path + "_page1.png"
            img.save(out_path)
            return out_path
    except Exception as e:
        logger.error(f"[Invoice] PDF to image conversion failed: {e}")
        return None


# ---- Database helpers ----

def _clean_amount(val) -> Optional[float]:
    """Convert amount value to float, handling currency symbols and string inputs"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip().replace(",", "").replace("¥", "").replace("￥", "").replace("元", "")
        try:
            return float(val)
        except ValueError:
            return None
    return None


def save_invoice_to_db(db_conn, result: Dict[str, Any]) -> int:
    """Save processed invoice result to database, return invoice id"""
    fields = result.get("fields", {})
    cursor = db_conn.cursor()
    cursor.execute("""
        INSERT INTO invoices
            (filename, file_path, file_size, invoice_number, invoice_code,
             invoice_date, seller_name, seller_tax_id, buyer_name, buyer_tax_id,
             total_amount, amount, tax_amount, status, engine_used, raw_text,
             created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        result.get("filename", ""),
        result.get("file_path", ""),
        os.path.getsize(result["file_path"]) if os.path.exists(result.get("file_path", "")) else 0,
        fields.get("invoice_number"),
        fields.get("invoice_code"),
        fields.get("invoice_date"),
        fields.get("seller_name"),
        fields.get("seller_tax_id"),
        fields.get("buyer_name"),
        fields.get("buyer_tax_id"),
        _clean_amount(fields.get("total_amount")),
        _clean_amount(fields.get("amount")),
        _clean_amount(fields.get("tax_amount")),
        result.get("status", "processed"),
        result.get("engine_used"),
        result.get("raw_text", ""),
        datetime.now().isoformat(),
        datetime.now().isoformat(),
    ))
    invoice_id = cursor.lastrowid

    # Save invoice items
    for item in result.get("items", []):
        cursor.execute("""
            INSERT INTO invoice_items
                (invoice_id, name, specification, unit, quantity, unit_price, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            invoice_id,
            item.get("name"),
            item.get("specification"),
            item.get("unit"),
            item.get("quantity"),
            item.get("unit_price"),
            item.get("amount"),
        ))

    db_conn.commit()
    return invoice_id
