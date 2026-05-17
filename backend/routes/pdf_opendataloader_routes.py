"""
长 PDF 处理路由 - OpenDataLoader 版
专门处理复杂长文档：复杂表格、扫描件、多栏布局

依赖: pip install opendataloader-pdf
需要: Java 11+ (Java Runtime Environment)
"""

import logging
import os
import tempfile
import shutil
import json
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdf/opendataloader", tags=["长PDF处理"])


class ExtractionResult(BaseModel):
    """提取结果模型"""
    total_pages: int
    extracted_pages: int
    tables: int
    has_ocr: bool
    content: str
    tables_md: list[str]
    errors: list[str]


def _check_java():
    """检查 Java 是否可用"""
    try:
        result = subprocess.run(
            ["java", "-version"],
            capture_output=True, text=True, timeout=5
        )
        # Java 7+ 输出到 stderr
        version_line = result.stderr.split("\n")[0] if result.stderr else ""
        return True, version_line
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False, None


def _convert_pdf(pdf_path: str, output_dir: str, page_start: Optional[int] = None, page_end: Optional[int] = None):
    """
    调用 opendataloader_pdf.convert() 转换 PDF
    返回: (success, content_text, tables_list, error_msg)
    """
    try:
        from opendataloader_pdf import convert

        args = {
            "input_path": pdf_path,
            "output_folder": output_dir,
            "formats": ["json", "markdown"],
        }
        if page_start is not None:
            args["page_start"] = page_start
        if page_end is not None:
            args["page_end"] = page_end

        convert(**args)

        # 读取 JSON 结果
        json_path = os.path.join(output_dir, "output.json")
        content = ""
        tables = []
        total_pages = 0

        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    pages = data.get("pages", data.get("content", []))
                    if isinstance(pages, list):
                        total_pages = len(pages)
                        for page in pages:
                            text_parts = []
                            for block in page.get("blocks", []):
                                if block.get("type") == "table":
                                    table_md = block.get("markdown", "")
                                    if table_md:
                                        tables.append(table_md)
                                    text_parts.append(table_md)
                                else:
                                    text_parts.append(block.get("text", ""))
                            content += "\n\n".join(text_parts) + "\n\n--- Page Break ---\n\n"
                    elif isinstance(pages, str):
                        content = pages

        # 读取 Markdown 补充内容
        md_path = os.path.join(output_dir, "output.md")
        if os.path.exists(md_path) and not content.strip():
            with open(md_path, "r", encoding="utf-8") as f:
                content = f.read()

        return True, content, tables, total_pages, None

    except ImportError:
        return False, "", [], 0, "opendataloader-pdf 未安装"
    except Exception as e:
        return False, "", [], 0, str(e)


@router.post("/extract", response_model=ExtractionResult)
async def extract_long_pdf(
    file: UploadFile = File(...),
    mode: str = Form("hybrid"),
    start_page: Optional[int] = Form(None),
    end_page: Optional[int] = Form(None),
    ocr_enabled: bool = Form(True),
):
    """
    使用 OpenDataLoader 提取长 PDF 内容（需要 Java 11+）

    - **file**: PDF 文件
    - **mode**: `local`（纯 CPU）或 `hybrid`（AI 增强）
    - **start_page / end_page**: 页码范围
    - **ocr_enabled**: 启用 OCR

    返回提取的文本、表格（Markdown 格式）、页数等信息
    """
    # 先检查 Java
    java_ok, java_version = _check_java()
    if not java_ok:
        raise HTTPException(
            status_code=503,
            detail="Java 未安装。OpenDataLoader 需要 Java 11+ 环境。请从 https://adoptium.net/ 安装 Java。"
        )

    # 检查库
    try:
        from opendataloader_pdf import convert as _check
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="opendataloader-pdf 未安装。运行: pip install opendataloader-pdf"
        )

    # 保存上传文件
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".PDF"]:
        raise HTTPException(status_code=400, detail="只支持 PDF 文件")

    tmp_dir = tempfile.mkdtemp(prefix="odl_")
    tmp_pdf = os.path.join(tmp_dir, "input.pdf")

    try:
        # 保存上传文件
        with open(tmp_pdf, "wb") as f:
            shutil.copyfileobj(file.file, f)

        logger.info(f"[ODL] 开始处理: {file.filename}, Java: {java_version}")

        success, content, tables_md, total_pages, error = _convert_pdf(
            tmp_pdf, tmp_dir,
            page_start=start_page,
            page_end=end_page
        )

        if not success:
            raise HTTPException(status_code=500, detail=f"OpenDataLoader 处理失败: {error}")

        logger.info(f"[ODL] 完成: {total_pages} 页, {len(tables_md)} 个表格")

        return ExtractionResult(
            total_pages=total_pages or 1,
            extracted_pages=total_pages or 1,
            tables=len(tables_md),
            has_ocr=ocr_enabled,
            content=content,
            tables_md=tables_md,
            errors=[],
        )

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/status")
async def odl_status():
    """检查 OpenDataLoader 环境状态"""
    java_ok, java_version = _check_java()

    lib_ok = False
    lib_error = None
    try:
        from opendataloader_pdf import convert
        lib_ok = True
    except ImportError as e:
        lib_error = str(e)

    return {
        "available": java_ok and lib_ok,
        "java_installed": java_ok,
        "java_version": java_version,
        "library_installed": lib_ok,
        "library_error": lib_error,
        "endpoints": {
            "POST /api/pdf/opendataloader/extract": "提取 PDF 文本和表格",
            "GET  /api/pdf/opendataloader/status": "检查环境状态",
        },
        "install_hint": "pip install opendataloader-pdf && 安装 Java 11+ (https://adoptium.net)" if not (java_ok and lib_ok) else None,
    }


@router.post("/extract/text-only")
async def extract_text_only(
    file: UploadFile = File(...),
    start_page: Optional[int] = Form(None),
    end_page: Optional[int] = Form(None),
):
    """只提取纯文本（跳过表格解析，更快）"""
    java_ok, _ = _check_java()
    if not java_ok:
        raise HTTPException(status_code=503, detail="Java 未安装")

    try:
        from opendataloader_pdf import convert
    except ImportError:
        raise HTTPException(status_code=503, detail="opendataloader-pdf 未安装")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".PDF"]:
        raise HTTPException(status_code=400, detail="只支持 PDF 文件")

    tmp_dir = tempfile.mkdtemp(prefix="odl_text_")
    tmp_pdf = os.path.join(tmp_dir, "input.pdf")

    try:
        with open(tmp_pdf, "wb") as f:
            shutil.copyfileobj(file.file, f)

        convert(
            input_path=tmp_pdf,
            output_folder=tmp_dir,
            formats=["markdown"],
            page_start=start_page,
            page_end=end_page,
        )

        md_path = os.path.join(tmp_dir, "output.md")
        content = ""
        if os.path.exists(md_path):
            with open(md_path, "r", encoding="utf-8") as f:
                content = f.read()

        return {"content": content, "filename": file.filename}

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)