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

【字段类型与取值规范 —— 务必严格遵守】
- invoice_number: 发票号码 (字符串, 例如 "260520")
- invoice_code: 发票代码 (字符串, 例如 "011002000000")
- invoice_date: 开票日期 (字符串, 形如 "2026-05-20", 不要写成"2026年5月20日")
- seller_name: 销售方名称
- seller_tax_id: 销售方纳税人识别号
- buyer_name: 购买方名称
- buyer_tax_id: 购买方纳税人识别号
- total_amount: 价税合计 (纯数字, 必填, 例如 5000.00, 不要写"¥5000", 不要写大写)
- amount: 不含税金额 (纯数字)
- tax_amount: 税额 (纯数字)

【大写金额转换 —— 必须把中文大写数字转换为阿拉伯数字】
  零=0 壹=1 贰=2 叁=3 肆=4 伍=5 陆=6 柒=7 捌=8 玖=9 拾=10 佰=百 仟=千 万=万 亿=亿
  示例: "零佰零拾零万伍仟零佰零拾零元零角零分" -> 5000.00
       "壹万贰仟叁佰肆拾伍元陆角柒分" -> 12345.67
       "¥5000.00" -> 5000.00
       "5000.00元" -> 5000.00

【易错点】
- total_amount 必须是数字,绝对不能放日期/字符串/大写汉字
- 三个金额字段 total_amount / amount / tax_amount 都要纯数字
- 找不到的字段填 null,不要编造

【明细 items —— 数组,每一项必须是数字,不要写"奖金"/"-"】
  - name: 货物或应税劳务名称
  - specification: 规格型号 (没有就 null)
  - unit: 单位
  - quantity: 数量 (数字,例如 1, 没有就 null)
  - unit_price: 单价 (纯数字,例如 5000.00)
  - amount: 金额 (纯数字,例如 5000.00)

只返回合法 JSON,不要任何解释、注释或多余文字。"""


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
        "top_k": 40,
        "top_p": 0.9,
        "max_tokens": 2048
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
            return _sanitize_vision_result(result)
        return {"error": "no JSON found in vision response", "raw": raw_response[:500]}
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": raw_response[:500]}


# ---- Chinese amount conversion & post-processing ----

_CN_DIGITS = {
    "零": 0, "〇": 0, "○": 0,
    "壹": 1, "幺": 1,
    "贰": 2, "貳": 2,
    "叁": 3, "參": 3,
    "肆": 4,
    "伍": 5,
    "陆": 6, "陸": 6,
    "柒": 7,
    "捌": 8,
    "玖": 9,
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9,
    "两": 2,
}
# Map each unit to its absolute multiplier. 拾/十/百/仟/万/亿/角/分/厘 all contribute
# directly via `digit * unit` and the result is summed.
_CN_UNITS = {
    "分": 0.01, "厘": 0.001,
    "角": 0.1,
    "十": 10, "拾": 10,
    "百": 100, "佰": 100,
    "千": 1000, "仟": 1000,
    "万": 10000, "萬": 10000,
    "亿": 100000000, "億": 100000000,
    # "元" / "圆" act as a separator between integer and fractional parts; we
    # just ignore them when summing.
}


def _chinese_amount_to_float(text: Any) -> Optional[float]:
    """
    Convert a Chinese-capitalized amount string to a float.

    Examples:
        "零佰零拾零万伍仟零佰零拾零元零角零分" -> 5000.00
        "壹万贰仟叁佰肆拾伍元陆角柒分"         -> 12345.67
        "伍仟元整"                              -> 5000.0
        None / ""                                -> None
    """
    if text is None:
        return None
    if isinstance(text, (int, float)):
        return float(text)
    s = str(text).strip()
    if not s:
        return None
    s = s.replace("整", "").replace("正", "")
    s = s.replace("圆", "元")

    has_chinese = bool(re.search(r"[\u4e00-\u9fff]", s))
    has_arabic = bool(re.search(r"\d", s))

    # Pure-ASCII (or mixed with Chinese-formatting chars but the number is in
    # arabic digits): strip currency/whitespace, drop commas, parse the first
    # number we find. This is the common "5,000.00 元" case.
    if not has_chinese or has_arabic:
        m = re.search(r"-?\d+(?:\.\d+)?", s.replace(",", ""))
        if m:
            try:
                return float(m.group())
            except ValueError:
                return None
        if not has_chinese:
            return None
        # Mixed: arabic didn't yield a number AND there are still Chinese
        # digits to parse — fall through to the pure-Chinese path.

    # Pure-Chinese amount: walk digit × unit pairs.
    # Section-based: small units (十/百/千) accumulate into `section`; large
    # units (万/亿) flush the pending digit and `section`, then multiply.
    total = 0.0
    section = 0.0
    last_digit = 0
    seen_digit = False

    for ch in s:
        if ch in _CN_DIGITS:
            last_digit = _CN_DIGITS[ch]
            seen_digit = True
        elif ch in _CN_UNITS:
            unit = _CN_UNITS[ch]
            if unit >= 10000:  # 万 / 亿: section boundary
                # Flush any pending digit into `section` first, then multiply.
                if last_digit:
                    section += last_digit
                    last_digit = 0
                total += section * unit
                section = 0.0
            else:
                if last_digit == 0:
                    if ch in ("十", "拾") and not seen_digit:
                        # Leading 拾 is implicit-1: "拾元" = 10元.
                        last_digit = 1
                        seen_digit = True
                    else:
                        continue
                section += last_digit * unit
                last_digit = 0
        else:
            # Non-digit, non-unit Chinese char (元/圆): flush the pending
            # digit as a unit-1 contribution (e.g. "...伍元..." -> section += 5).
            if last_digit:
                section += last_digit
                last_digit = 0
    if last_digit:
        section += last_digit
    total += section

    if not seen_digit:
        return None
    return round(total, 2)


_DATE_RE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?")


def _normalize_date(value: Any) -> Optional[str]:
    """Convert "2026年5月20日" -> "2026-05-20". Returns None if no date-like content."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    m = _DATE_RE.search(s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1900 < y < 3000 and 0 < mo < 13 and 0 < d < 32:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    iso = re.search(r"(\d{4})[-./](\d{1,2})[-./](\d{1,2})", s)
    if iso:
        y, mo, d = int(iso.group(1)), int(iso.group(2)), int(iso.group(3))
        if 1900 < y < 3000 and 0 < mo < 13 and 0 < d < 32:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    return None


def _coerce_amount(value: Any) -> Optional[float]:
    """
    Coerce a model's possibly-messy amount output to a float.

    Accepts numbers, numeric strings, "¥5000.00", "5,000.00 元", Chinese
    capital amounts, etc. Returns None if nothing numeric can be extracted.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        if re.search(r"[\u4e00-\u9fff]", s):
            return _chinese_amount_to_float(s)
        cleaned = s.replace(",", "").replace("¥", "").replace("￥", "").replace("元", "")
        m = re.search(r"-?\d+(?:\.\d+)?", cleaned)
        if m:
            try:
                return float(m.group())
            except ValueError:
                return None
    return None


def _sanitize_vision_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean up the raw JSON returned by the vision model.

    - Amounts (total_amount / amount / tax_amount) are always coerced to floats,
      even if the model wrote Chinese capital amounts or a string.
    - If total_amount is a date, swap it with invoice_date.
    - invoice_date is normalized to ISO format (YYYY-MM-DD).
    - Item amounts/quantities/unit_prices are coerced to floats.
    - String trimming is applied everywhere.
    """
    if not isinstance(result, dict):
        return result

    fields = result.get("fields") if isinstance(result.get("fields"), dict) else result

    # --- 1) Normalize invoice_date to ISO; if total_amount looks like a date, swap.
    raw_date = fields.get("invoice_date")
    raw_total = fields.get("total_amount")
    if isinstance(raw_total, str) and _normalize_date(raw_total) and not _coerce_amount(raw_total):
        # model placed a date string in total_amount
        if not raw_date:
            fields["invoice_date"] = raw_total
        fields["total_amount"] = None
    elif isinstance(raw_total, str) and _DATE_RE.search(raw_total) and _coerce_amount(raw_total) is None:
        fields["total_amount"] = None

    iso_date = _normalize_date(fields.get("invoice_date"))
    if iso_date:
        fields["invoice_date"] = iso_date

    # --- 2) Coerce amount fields to floats.
    for k in ("total_amount", "amount", "tax_amount"):
        v = fields.get(k)
        coerced = _coerce_amount(v)
        fields[k] = coerced

    # --- 3) Sanitize items.
    raw_items = result.get("items") or fields.get("items") or []
    clean_items: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        clean = {}
        for k, v in item.items():
            if v is None:
                clean[k] = None
                continue
            if k in ("quantity", "unit_price", "amount"):
                clean[k] = _coerce_amount(v)
            else:
                clean[k] = str(v).strip() if isinstance(v, str) else v
        # Drop items that have no name AND no numeric content
        if not clean.get("name") and all(clean.get(k) is None for k in ("quantity", "unit_price", "amount")):
            continue
        clean_items.append(clean)
    if "fields" in result and isinstance(result["fields"], dict):
        result["fields"]["items"] = clean_items
    else:
        result["items"] = clean_items

    # --- 4) Trim strings on top-level fields.
    for k in ("invoice_number", "invoice_code", "seller_name", "seller_tax_id",
              "buyer_name", "buyer_tax_id"):
        v = fields.get(k)
        if isinstance(v, str):
            fields[k] = v.strip()

    return result


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
