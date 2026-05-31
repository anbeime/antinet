"""
Invoice API Routes — 发票处理与查询

命令适配（意图识别）：
  - 扫描发票 -> scan
  - 列出发票 -> list
  - 查询商家 -> query --seller XX
  - 导出报销 -> export --from ... --to ...
  - 排除发票 -> exclude <id>
  - 恢复发票 -> include <id>
  - 查看问题 -> problems
"""
import logging
import os
import sys
import json
import shutil
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invoice", tags=["发票管理"])

INVOICE_DIR = Path("./data/invoices")
INVOICE_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = Path("./data/exports")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

db_manager = None
_migrated = False


def set_db_manager(dbm):
    global db_manager, _migrated
    db_manager = dbm
    if not _migrated:
        _migrated = True
        _migrate_existing_data()


def _migrate_existing_data():
    """Fix existing records where amounts are stored as strings with currency symbols"""
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        for col in ("total_amount", "amount", "tax_amount"):
            cursor.execute(f"SELECT id, {col} FROM invoices WHERE {col} IS NOT NULL")
            for row in cursor.fetchall():
                val = row[col]
                if isinstance(val, str):
                    cleaned = _clean_amount(val)
                    if cleaned is not None:
                        cursor.execute(f"UPDATE invoices SET {col}=?, updated_at=? WHERE id=?",
                                       (cleaned, datetime.now().isoformat(), row["id"]))
        conn.commit()
        conn.close()
        logger.info(f"[Invoice] Data migration completed")
    except Exception as e:
        logger.warning(f"[Invoice] Data migration skipped: {e}")


# ---- Models ----

class InvoiceInfo(BaseModel):
    id: int
    filename: str
    invoice_number: Optional[str] = None
    invoice_code: Optional[str] = None
    invoice_date: Optional[str] = None
    seller_name: Optional[str] = None
    seller_tax_id: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_tax_id: Optional[str] = None
    total_amount: Optional[float] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    is_excluded: bool = False
    status: str = "pending"
    engine_used: Optional[str] = None
    created_at: str


class InvoiceListResponse(BaseModel):
    status: str
    count: int
    invoices: List[InvoiceInfo]


class InvoiceQueryParams(BaseModel):
    seller: Optional[str] = None
    buyer: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    status: Optional[str] = None


# ---- Helpers ----

def _clean_amount(v) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        v = v.strip().replace(",", "").replace("¥", "").replace("￥", "").replace("元", "")
        try:
            return float(v)
        except ValueError:
            return None
    return None


def _row_to_invoice(row) -> InvoiceInfo:
    return InvoiceInfo(
        id=row["id"],
        filename=row["filename"],
        invoice_number=row["invoice_number"],
        invoice_code=row["invoice_code"],
        invoice_date=row["invoice_date"],
        seller_name=row["seller_name"],
        seller_tax_id=row["seller_tax_id"],
        buyer_name=row["buyer_name"],
        buyer_tax_id=row["buyer_tax_id"],
        total_amount=_clean_amount(row["total_amount"]),
        amount=_clean_amount(row["amount"]),
        tax_amount=_clean_amount(row["tax_amount"]),
        is_excluded=bool(row["is_excluded"]),
        status=row["status"],
        engine_used=row["engine_used"],
        created_at=row["created_at"],
    )


def _get_conn():
    if db_manager is None:
        raise HTTPException(status_code=503, detail="database not initialized")
    return db_manager.get_connection()


# ---- Routes ----

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "invoice"}


@router.post("/scan", response_model=Dict[str, Any])
async def scan_invoices(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Upload invoice PDF/image files and process them.

    Level 1: pdfplumber text extraction (searchable PDF)
    Level 2: Qwen2.5-VL vision OCR (scanned documents)
    """
    if not files:
        raise HTTPException(status_code=400, detail="no files provided")

    results = []
    processed_ids = []

    for file in files:
        # Save uploaded file
        safe_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = INVOICE_DIR / safe_name
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Process invoice
        from skills.invoice_skill import process_invoice, save_invoice_to_db
        try:
            result = await process_invoice(str(file_path), file.filename)
            conn = _get_conn()
            invoice_id = save_invoice_to_db(conn, result)
            processed_ids.append(invoice_id)
            results.append({
                "filename": file.filename,
                "status": result.get("status"),
                "engine_used": result.get("engine_used"),
                "invoice_id": invoice_id,
            })
        except Exception as e:
            logger.error(f"[Invoice] Processing failed for {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e),
            })

    return {
        "status": "ok",
        "processed": len(processed_ids),
        "total": len(files),
        "results": results,
    }


@router.get("/list", response_model=InvoiceListResponse)
async def list_invoices(
    seller: Optional[str] = Query(None, description="Filter by seller name"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    excluded: Optional[bool] = Query(None, description="Filter by excluded status"),
    limit: int = Query(100, description="Max results"),
    offset: int = Query(0, description="Offset for pagination"),
):
    """List invoices with optional filters"""
    conn = _get_conn()
    cursor = conn.cursor()

    where = []
    params = []

    if seller:
        where.append("invoices.seller_name LIKE ?")
        params.append(f"%{seller}%")
    if from_date:
        where.append("invoices.invoice_date >= ?")
        params.append(from_date)
    if to_date:
        where.append("invoices.invoice_date <= ?")
        params.append(to_date)
    if status:
        where.append("invoices.status = ?")
        params.append(status)
    if excluded is not None:
        where.append("invoices.is_excluded = ?")
        params.append(1 if excluded else 0)

    where_clause = " AND ".join(where) if where else "1=1"

    cursor.execute(f"SELECT COUNT(*) FROM invoices WHERE {where_clause}", params)
    total = cursor.fetchone()[0]

    cursor.execute(
        f"SELECT * FROM invoices WHERE {where_clause} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    )
    invoices = [_row_to_invoice(row) for row in cursor.fetchall()]

    return InvoiceListResponse(status="ok", count=total, invoices=invoices)


@router.get("/query", response_model=InvoiceListResponse)
async def query_invoices(
    seller: Optional[str] = Query(None),
    buyer: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    invoice_number: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    limit: int = Query(100),
):
    """Query invoices by various criteria"""
    conn = _get_conn()
    cursor = conn.cursor()
    where = []
    params = []

    if seller:
        where.append("invoices.seller_name LIKE ?")
        params.append(f"%{seller}%")
    if buyer:
        where.append("invoices.buyer_name LIKE ?")
        params.append(f"%{buyer}%")
    if from_date:
        where.append("invoices.invoice_date >= ?")
        params.append(from_date)
    if to_date:
        where.append("invoices.invoice_date <= ?")
        params.append(to_date)
    if invoice_number:
        where.append("invoices.invoice_number = ?")
        params.append(invoice_number)
    if keyword:
        where.append("(invoices.seller_name LIKE ? OR invoices.buyer_name LIKE ? OR invoices.invoice_number LIKE ?)")
        kw = f"%{keyword}%"
        params.extend([kw, kw, kw])

    where_clause = " AND ".join(where) if where else "1=1"
    cursor.execute(f"SELECT COUNT(*) FROM invoices WHERE {where_clause}", params)
    total = cursor.fetchone()[0]
    cursor.execute(
        f"SELECT * FROM invoices WHERE {where_clause} ORDER BY invoice_date DESC LIMIT ?",
        params + [limit],
    )
    invoices = [_row_to_invoice(row) for row in cursor.fetchall()]
    return InvoiceListResponse(status="ok", count=total, invoices=invoices)


@router.get("/detail/{invoice_id}")
async def get_invoice_detail(invoice_id: int):
    """Get detailed invoice info including line items"""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="invoice not found")

    invoice = _row_to_invoice(row)
    cursor.execute("SELECT * FROM invoice_items WHERE invoice_id = ?", (invoice_id,))
    items = [dict(item) for item in cursor.fetchall()]

    return {
        "status": "ok",
        "invoice": invoice.model_dump(),
        "items": items,
    }


@router.post("/exclude/{invoice_id}")
async def exclude_invoice(invoice_id: int):
    """Mark invoice as excluded from reimbursement"""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET is_excluded = 1, updated_at = ? WHERE id = ?",
                   (datetime.now().isoformat(), invoice_id))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="invoice not found")
    return {"status": "ok", "message": f"Invoice #{invoice_id} excluded"}


@router.post("/include/{invoice_id}")
async def include_invoice(invoice_id: int):
    """Restore invoice for reimbursement"""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET is_excluded = 0, updated_at = ? WHERE id = ?",
                   (datetime.now().isoformat(), invoice_id))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="invoice not found")
    return {"status": "ok", "message": f"Invoice #{invoice_id} included"}


@router.get("/export")
async def export_invoices(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    format: str = Query("xlsx", description="xlsx or csv"),
):
    """Export invoices to Excel or CSV"""
    conn = _get_conn()
    cursor = conn.cursor()
    where = ["invoices.is_excluded = 0"]
    params = []
    if from_date:
        where.append("invoices.invoice_date >= ?")
        params.append(from_date)
    if to_date:
        where.append("invoices.invoice_date <= ?")
        params.append(to_date)
    where_clause = " AND ".join(where)
    cursor.execute(f"SELECT * FROM invoices WHERE {where_clause} ORDER BY invoice_date DESC", params)
    rows = cursor.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="no invoices found for export")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if format == "csv":
        filename = f"invoices_export_{timestamp}.csv"
        output_path = OUTPUT_DIR / filename
        import csv
        with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["ID", "发票号码", "发票代码", "开票日期", "销售方", "销售方税号",
                             "购买方", "购买方税号", "金额", "税额", "价税合计", "状态", "识别引擎"])
            for r in rows:
                writer.writerow([
                    r["id"], r["invoice_number"], r["invoice_code"], r["invoice_date"],
                    r["seller_name"], r["seller_tax_id"], r["buyer_name"], r["buyer_tax_id"],
                    r["amount"], r["tax_amount"], r["total_amount"],
                    r["status"], r["engine_used"],
                ])
    else:
        filename = f"invoices_export_{timestamp}.xlsx"
        output_path = OUTPUT_DIR / filename
        import pandas as pd
        data = []
        for r in rows:
            data.append({
                "ID": r["id"],
                "发票号码": r["invoice_number"],
                "发票代码": r["invoice_code"],
                "开票日期": r["invoice_date"],
                "销售方": r["seller_name"],
                "销售方税号": r["seller_tax_id"],
                "购买方": r["buyer_name"],
                "购买方税号": r["buyer_tax_id"],
                "金额": r["amount"],
                "税额": r["tax_amount"],
                "价税合计": r["total_amount"],
                "状态": r["status"],
                "识别引擎": r["engine_used"],
            })
        df = pd.DataFrame(data)
        df.to_excel(output_path, index=False, engine="openpyxl")

    return {
        "status": "ok",
        "filename": filename,
        "path": str(output_path),
        "download_url": f"/api/excel/download/{filename}",
        "count": len(rows),
    }


@router.get("/export-advanced")
async def export_invoices_advanced(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    add_formulas: bool = Query(True, description="Add formula columns via minimax-xlsx"),
    run_validation: bool = Query(True, description="Run formula_check.py after export"),
):
    """
    Advanced Excel export using minimax-xlsx scripts (subprocess calls).

    Pipeline:
      1. openpyxl → base xlsx
      2. xlsx_unpack.py → unpack to temp dir
      3. xlsx_add_column.py → add formula column (校验: 金额+税额)
      4. formula_check.py → validate formulas
      5. xlsx_pack.py → repack final xlsx

    The 7B Agent only calls this one API; all complex CLI work is backend-managed.
    """
    SKILL_DIR = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "skills", "minimax-xlsx", "scripts")))

    conn = _get_conn()
    cursor = conn.cursor()
    where = ["invoices.is_excluded = 0"]
    params = []
    if from_date:
        where.append("invoices.invoice_date >= ?")
        params.append(from_date)
    if to_date:
        where.append("invoices.invoice_date <= ?")
        params.append(to_date)
    where_clause = " AND ".join(where)
    cursor.execute(f"SELECT * FROM invoices WHERE {where_clause} ORDER BY invoice_date DESC", params)
    rows = cursor.fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="no invoices found for export")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"invoices_advanced_{timestamp}"
    xlsx_path = OUTPUT_DIR / f"{base_name}.xlsx"

    # Step 1: Create base xlsx with openpyxl
    import pandas as pd
    data = []
    for r in rows:
        data.append({
            "ID": r["id"],
            "发票号码": r["invoice_number"],
            "发票代码": r["invoice_code"],
            "开票日期": r["invoice_date"],
            "销售方": r["seller_name"],
            "销售方税号": r["seller_tax_id"],
            "购买方": r["buyer_name"],
            "购买方税号": r["buyer_tax_id"],
            "金额": r["amount"],
            "税额": r["tax_amount"],
            "价税合计": r["total_amount"],
            "状态": r["status"],
            "识别引擎": r["engine_used"],
        })
    df = pd.DataFrame(data)
    df.to_excel(xlsx_path, index=False, engine="openpyxl")

    result = {
        "status": "ok",
        "filename": xlsx_path.name,
        "path": str(xlsx_path),
        "download_url": f"/api/excel/download/{xlsx_path.name}",
        "count": len(rows),
        "pipeline": [],
        "pipeline_ok": False,
    }

    if not add_formulas:
        return result

    # Step 2: Unpack with xlsx_unpack.py
    import tempfile, subprocess
    work_dir = Path(tempfile.mkdtemp(prefix="invoice_xlsx_"))
    try:
        unpack_script = SKILL_DIR / "xlsx_unpack.py"
        if unpack_script.exists():
            r1 = subprocess.run(
                [sys.executable, str(unpack_script), str(xlsx_path), str(work_dir)],
                capture_output=True, text=True, timeout=30
            )
            result["pipeline"].append({
                "step": "unpack",
                "exit_code": r1.returncode,
                "stderr": r1.stderr[:200] if r1.returncode != 0 else "",
            })

            # Step 3: Add formula column using xlsx_add_column.py
            add_col_script = SKILL_DIR / "xlsx_add_column.py"
            if add_col_script.exists() and r1.returncode == 0:
                data_rows = len(rows)
                r2 = subprocess.run(
                    [sys.executable, str(add_col_script), str(work_dir),
                     "--col", "N",
                     "--sheet", "Sheet1",
                     "--header", "校验(金额+税额)",
                     "--formula", "=I{row}+J{row}",
                     "--formula-rows", f"2:{data_rows+1}",
                     "--numfmt", "#,##0.00",
                     "--border-row", str(data_rows + 1),
                     "--border-style", "medium"],
                    capture_output=True, text=True, timeout=30
                )
                result["pipeline"].append({
                    "step": "add_formula_column",
                    "exit_code": r2.returncode,
                    "stderr": r2.stderr[:200] if r2.returncode != 0 else "",
                })

                # Step 4: Run formula_check.py for validation
                if run_validation:
                    check_script = SKILL_DIR / "formula_check.py"
                    if check_script.exists():
                        r3 = subprocess.run(
                            [sys.executable, str(check_script), str(xlsx_path), "--summary"],
                            capture_output=True, text=True, timeout=30
                        )
                        result["pipeline"].append({
                            "step": "formula_validation",
                            "exit_code": r3.returncode,
                            "stdout": r3.stdout[:300],
                            "stderr": r3.stderr[:200] if r3.returncode != 0 else "",
                        })

            # Step 5: Pack with xlsx_pack.py
            pack_script = SKILL_DIR / "xlsx_pack.py"
            if pack_script.exists():
                r4 = subprocess.run(
                    [sys.executable, str(pack_script), str(work_dir), str(xlsx_path)],
                    capture_output=True, text=True, timeout=30
                )
                result["pipeline"].append({
                    "step": "pack",
                    "exit_code": r4.returncode,
                    "stderr": r4.stderr[:200] if r4.returncode != 0 else "",
                })
        else:
            result["pipeline"].append({"step": "unpack", "warning": "xlsx_unpack.py not found"})
    except subprocess.TimeoutExpired:
        result["pipeline"].append({"step": "error", "message": "minimax-xlsx subprocess timed out"})
    except Exception as e:
        result["pipeline"].append({"step": "error", "message": str(e)})
    finally:
        import shutil
        try:
            shutil.rmtree(str(work_dir), ignore_errors=True)
        except Exception:
            pass

    result["pipeline_ok"] = all(
        p.get("exit_code", -1) == 0 for p in result["pipeline"]
    )
    return result


@router.get("/problems")
async def get_problem_invoices():
    """List invoices with processing issues"""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM invoices WHERE status = 'failed' OR (status = 'processed' AND "
        "(invoice_number IS NULL OR seller_name IS NULL OR total_amount IS NULL)) "
        "ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    invoices = [_row_to_invoice(row) for row in rows]
    return InvoiceListResponse(status="ok", count=len(invoices), invoices=invoices)


@router.get("/stats")
async def get_invoice_stats():
    """Get invoice statistics"""
    conn = _get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM invoices")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM invoices WHERE is_excluded = 0")
    active = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM invoices WHERE is_excluded = 1")
    excluded = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM invoices WHERE status = 'failed'")
    failed = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM invoices WHERE status = 'processed' AND engine_used = 'pdfplumber'")
    pdf_extracted = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM invoices WHERE status = 'processed' AND engine_used = 'qwen2.5vl'")
    vision_ocr = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) FROM invoices
        WHERE is_excluded = 0 AND total_amount IS NOT NULL
    """)
    total_amount = cursor.fetchone()[0]

    cursor.execute("""
        SELECT invoice_date, COUNT(*) as cnt FROM invoices
        WHERE invoice_date IS NOT NULL
        GROUP BY invoice_date ORDER BY invoice_date DESC LIMIT 10
    """)
    by_date = [{"date": r["invoice_date"], "count": r["cnt"]} for r in cursor.fetchall()]

    cursor.execute("""
        SELECT seller_name, COUNT(*) as cnt FROM invoices
        WHERE seller_name IS NOT NULL
        GROUP BY seller_name ORDER BY cnt DESC LIMIT 10
    """)
    top_sellers = [{"seller": r["seller_name"], "count": r["cnt"]} for r in cursor.fetchall()]

    return {
        "status": "ok",
        "stats": {
            "total": total,
            "active": active,
            "excluded": excluded,
            "failed": failed,
            "pdf_extracted": pdf_extracted,
            "vision_ocr": vision_ocr,
            "total_amount": total_amount,
        },
        "by_date": by_date,
        "top_sellers": top_sellers,
    }


@router.delete("/delete/{invoice_id}")
async def delete_invoice(invoice_id: int):
    """Delete an invoice record"""
    conn = _get_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="invoice not found")
    return {"status": "ok", "message": f"Invoice #{invoice_id} deleted"}
