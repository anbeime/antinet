"""
PDF 处理 API 路由
为 Antinet 提供 PDF 文档处理接口
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import tempfile
import time
from pathlib import Path
import shutil
import zipfile
import json

logger = logging.getLogger(__name__)

# 延迟导入避免pypdf与pydantic冲突
SimplePDFProcessor = None
_lazy_load_pypdf = None
try:
    from tools.pdf_processor import SimplePDFProcessor as SP, _lazy_load_pypdf as lazy_fn
    SimplePDFProcessor = SP
    _lazy_load_pypdf = lazy_fn
    if _lazy_load_pypdf:
        _lazy_load_pypdf()
except Exception as e:
    logger.warning(f"PDF processor 导入失败: {e}")

# 使用稳定的四色卡片处理器来处理所有PDF操作
try:
    from tools.pdf_four_color_processor import PDFourColorProcessor
    FOUR_COLOR_AVAILABLE = True
except ImportError:
    FOUR_COLOR_AVAILABLE = False

router = APIRouter(prefix="/api/pdf", tags=["PDF处理"])

# 初始化 PDF 处理器
pdf_processor = SimplePDFProcessor()


def _sse_event(event_type: str, data: dict) -> str:
    """生成 SSE 事件格式"""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# ========== 状态接口 ==========

@router.get("/status")
async def get_pdf_status():
    """获取 PDF 功能状态（含高级解析能力）"""
    # 每次查询都尝试重新加载（pypdf 可能在运行时安装）
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    pdf_available = pdf_processor.available
    
    # 检查高级功能
    try:
        from tools.pdf_advanced import advanced_processor
        advanced_info = advanced_processor.get_info()
    except Exception:
        advanced_info = {"text": False, "images": False, "tables": False, "ocr": False}
    
    return {
        "available": pdf_available,
        "message": "PDF 功能已启用" if pdf_available else "PDF 功能未安装",
        "four_color_available": FOUR_COLOR_AVAILABLE and pdf_available,
        "advanced": advanced_info,
    }


# ========== 文本提取 ==========

@router.post("/extract/text")
async def extract_text(
    file: UploadFile = File(...),
    preserve_layout: bool = Form(True)
):
    """从 PDF 提取文本"""
    # 每次请求尝试重新加载（pypdf 可能在运行时安装）
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = pdf_processor.extract_text(tmp_path, preserve_layout)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "提取失败"))
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": len(result["pages"]),
            "full_text": result["full_text"],
            "metadata": result["metadata"]
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ========== 高级功能提取 ==========

@router.post("/extract/images")
async def extract_images(file: UploadFile = File(...)):
    """提取PDF中的图片"""
    try:
        from tools.pdf_advanced import advanced_processor
    except ImportError:
        raise HTTPException(status_code=503, detail="高级PDF功能未安装")
    
    if not advanced_processor.has_images:
        raise HTTPException(status_code=503, detail="PyMuPDF未安装")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = advanced_processor.extract_images(tmp_path)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "提取失败"))
        
        return {
            "success": True,
            "filename": file.filename,
            "images": result["images"]
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/extract/tables")
async def extract_tables(file: UploadFile = File(...)):
    """提取PDF中的表格"""
    try:
        from tools.pdf_advanced import advanced_processor
    except ImportError:
        raise HTTPException(status_code=503, detail="高级PDF功能未安装")
    
    if not advanced_processor.has_tables:
        raise HTTPException(status_code=503, detail="camelot未安装")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = advanced_processor.extract_tables(tmp_path)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "提取失败"))
        
        return {
            "success": True,
            "filename": file.filename,
            "tables": result["tables"]
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/extract/ocr")
async def extract_ocr(file: UploadFile = File(...), lang: str = Form("chi_sim+eng")):
    """OCR识别PDF中的文字"""
    try:
        from tools.pdf_advanced import advanced_processor
    except ImportError:
        raise HTTPException(status_code=503, detail="高级PDF功能未安装")
    
    if not advanced_processor.has_ocr:
        raise HTTPException(status_code=503, detail="pytesseract未安装")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = advanced_processor.extract_ocr(tmp_path, lang)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "OCR失败"))
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": result["pages"]
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/extract/full")
async def full_extract(file: UploadFile = File(...)):
    """完整提取PDF所有内容（文本、图片、表格、OCR）"""
    try:
        from tools.pdf_advanced import advanced_processor
    except ImportError:
        raise HTTPException(status_code=503, detail="高级PDF功能未安装")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = advanced_processor.full_extract(tmp_path)
        return {
            "success": True,
            "filename": file.filename,
            "data": result
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/split")
async def split_pdf(file: UploadFile = File(...)):
    """将 PDF 拆分为单页"""
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = pdf_processor.split_pdf(tmp_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "拆分失败"))
        
        return {
            "success": True,
            "files": result["files"],
            "count": len(result["files"])
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ========== PDF 合并 ==========

@router.post("/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    """合并多个 PDF 文件"""
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
    
    temp_files = []
    try:
        for f in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                shutil.copyfileobj(f.file, tmp)
                temp_files.append(tmp.name)
        
        result = pdf_processor.merge_pdfs(temp_files)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "合并失败"))
        
        return {
            "success": True,
            "output_file": result["output_file"]
        }
    finally:
        for fp in temp_files:
            if os.path.exists(fp):
                os.unlink(fp)


# ========== 知识卡片生成 ==========

@router.post("/generate/cards")
async def generate_knowledge_cards(
    file: UploadFile = File(...),
    generate_all: bool = Form(False)
):
    """从 PDF 生成四色知识卡片"""
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
    
    # 检查文件类型
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="只支持 PDF 文件")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        # 传递 generate_all 作为 card_type 参数（用于控制是否生成所有类型的卡片）
        result = pdf_processor.generate_knowledge_cards(tmp_path, "blue")
        
        # 如果 generate_all 为 True，同时生成其他类型的卡片
        all_cards = []
        if result.get("success"):
            all_cards.extend(result.get("cards", []))
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "生成失败"))
        
        return {
            "success": True,
            "cards": all_cards if generate_all else result["cards"],
            "count": len(all_cards if generate_all else result["cards"])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成知识卡片失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass


# ========== 图片提取 ==========

@router.post("/extract/images")
async def extract_images(file: UploadFile = File(...)):
    """从 PDF 提取图片"""
    if not pdf_processor.available and _lazy_load_pypdf:
        _lazy_load_pypdf()
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        result = pdf_processor.extract_images(tmp_path)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "提取失败"))
        
        return {
            "success": True,
            "images": result["images"],
            "count": len(result["images"])
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ========== PDF 工具包 ==========

try:
    from tools.pdf_toolkit import PDFToolkit
    PDF_TOOLKIT_AVAILABLE = True
except ImportError:
    PDF_TOOLKIT_AVAILABLE = False

if PDF_TOOLKIT_AVAILABLE:
    toolkit = PDFToolkit()
    
    @router.post("/toolkit/compress")
    async def compress_pdf(file: UploadFile = File(...)):
        """压缩 PDF"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            shutil.copyfileobj(file.file, tmp_in)
            tmp_path = tmp_in.name
        
        try:
            result = toolkit.compress_pdf(tmp_path)
            if result["success"]:
                return FileResponse(result["output_file"], media_type="application/pdf")
            raise HTTPException(status_code=500, detail=result.get("error"))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    @router.post("/toolkit/extract-images")
    async def toolkit_extract_images(file: UploadFile = File(...)):
        """工具包：提取图片"""
        if not PDF_TOOLKIT_AVAILABLE:
            raise HTTPException(status_code=503, detail="PDF Toolkit 不可用")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            shutil.copyfileobj(file.file, tmp_in)
            tmp_path = tmp_in.name
        
        try:
            result = toolkit.extract_images_to_pdf(tmp_path)
            return FileResponse(result["output_file"], media_type="application/pdf")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    @router.post("/toolkit/split")
    async def toolkit_split(file: UploadFile = File(...)):
        """工具包：拆分 PDF"""
        if not PDF_TOOLKIT_AVAILABLE:
            raise HTTPException(status_code=503, detail="PDF Toolkit 不可用")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_in:
            shutil.copyfileobj(file.file, tmp_in)
            tmp_path = tmp_in.name
        
        try:
            result = toolkit.split_pdf(tmp_path)
            return FileResponse(result["zip_file"], media_type="application/zip")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @router.post("/toolkit/merge")
    async def toolkit_merge(files: List[UploadFile] = File(...)):
        """工具包：合并 PDF（前端兼容别名）"""
        if not pdf_processor.available and _lazy_load_pypdf:
            _lazy_load_pypdf()
        if not pdf_processor.available:
            raise HTTPException(status_code=503, detail="PDF 功能未安装，请运行: pip install pypdf")
        
        temp_files = []
        try:
            for f in files:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    shutil.copyfileobj(f.file, tmp)
                    temp_files.append(tmp.name)
            
            result = pdf_processor.merge_pdfs(temp_files)
            
            if not result["success"]:
                raise HTTPException(status_code=500, detail=result.get("error", "合并失败"))
            
            return {
                "success": True,
                "output_file": result["output_file"]
            }
        finally:
            for fp in temp_files:
                if os.path.exists(fp):
                    os.unlink(fp)


# ========== 前端兼容别名 ==========

@router.post("/generate/four-color-cards")
async def generate_four_color_cards_compat(
    file: UploadFile = File(...),
    generate_all: bool = Form(False)
):
    """前端兼容：/api/pdf/generate/four-color-cards"""
    return await generate_knowledge_cards(file, generate_all)


@router.post("/export/cards-docx")
async def export_cards_to_docx(
    cards: Optional[List[UploadFile]] = File(None),
    cards_data: Optional[str] = Form(None),
    title: str = Form("四色知识卡片报告"),
    author: str = Form("Antinet 智能知识管家")
):
    """导出知识卡片到 Word（支持文件上传或JSON数据，集成 minimax-docx 专业排版）"""
    if not FOUR_COLOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="四色卡片功能未启用")
    
    all_cards = []
    
    # 方式1：从文件提取
    if cards:
        try:
            from pypdf import PdfReader
            import io
            for f in cards:
                content = await f.read()
                reader = PdfReader(io.BytesIO(content))
                text = "\n".join([p.extract_text() for p in reader.pages])
                
                from tools.pdf_four_color_processor import PDFourColorProcessor
                processor = PDFourColorProcessor()
                result = processor._analyze_content(text, 50)
                all_cards.extend(result.get('cards', []))
        except Exception as e:
            logger.error(f"从PDF提取失败: {e}")
    
    # 方式2：从JSON数据
    if cards_data:
        try:
            import json
            cards_list = json.loads(cards_data)
            all_cards.extend(cards_list)
        except Exception as e:
            logger.error(f"解析JSON失败: {e}")
    
    if not all_cards:
        raise HTTPException(status_code=400, detail="没有可导出的卡片数据")
    
    try:
        from tools.pdf_four_color_processor import PDFourColorProcessor
        processor = PDFourColorProcessor()

        output_path = os.path.join(tempfile.gettempdir(), f"cards_export_{int(time.time())}.docx")
        result = processor.export_to_docx(all_cards, output_path, title=title, author=author)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Word 导出失败"))

        return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            filename="四色卡片报告.docx")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出 Word 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/cards-pdf")
async def export_cards_to_pdf(
    cards: Optional[List[UploadFile]] = File(None),
    cards_data: Optional[str] = Form(None),
    title: str = Form("四色知识卡片报告"),
    author: str = Form("Antinet 智能知识管家")
):
    """导出知识卡片到 PDF（支持文件上传或JSON数据）"""
    if not FOUR_COLOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="四色卡片功能未启用")

    all_cards = []

    # 方式1：从文件提取
    if cards:
        try:
            from pypdf import PdfReader
            import io
            for f in cards:
                content = await f.read()
                reader = PdfReader(io.BytesIO(content))
                text = "\n".join([p.extract_text() for p in reader.pages])

                from tools.pdf_four_color_processor import PDFourColorProcessor
                processor = PDFourColorProcessor()
                result = processor._analyze_content(text, 50)
                all_cards.extend(result.get('cards', []))
        except Exception as e:
            logger.error(f"从PDF提取失败: {e}")

    # 方式2：从JSON数据
    if cards_data:
        try:
            import json
            cards_list = json.loads(cards_data)
            all_cards.extend(cards_list)
        except Exception as e:
            logger.error(f"解析JSON失败: {e}")

    if not all_cards:
        raise HTTPException(status_code=400, detail="没有可导出的卡片数据")

    try:
        from tools.pdf_four_color_processor import PDFourColorProcessor
        processor = PDFourColorProcessor()

        output_path = os.path.join(tempfile.gettempdir(), f"cards_export_{int(time.time())}.pdf")
        result = processor.export_to_pdf(all_cards, output_path, title=title, author=author)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "PDF生成失败"))

        from urllib.parse import quote
        filename = f"{title}.pdf"
        encoded_name = quote(filename)

        with open(output_path, 'rb') as f:
            pdf_content = f.read()

        from fastapi.responses import Response
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/four-color-excel")
async def export_four_color_excel(
    files: Optional[List[UploadFile]] = File(None),
    cards_data: Optional[str] = Form(None),
    title: str = Form("四色知识卡片报告")
):
    """导出四色卡片到 Excel（集成 skills/xlsx 专业导出器，多工作表+概览）"""
    if not FOUR_COLOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="四色卡片功能未启用")
    
    all_cards = []
    
    # 方式1：从文件提取
    if files:
        try:
            from pypdf import PdfReader
            import io
            for f in files:
                content = await f.read()
                reader = PdfReader(io.BytesIO(content))
                text = "\n".join([p.extract_text() for p in reader.pages])
                
                from tools.pdf_four_color_processor import PDFourColorProcessor
                processor = PDFourColorProcessor()
                result = processor._analyze_content(text, 50)
                all_cards.extend(result.get('cards', []))
        except Exception as e:
            logger.error(f"从PDF提取失败: {e}")
    
    # 方式2：从JSON数据
    if cards_data:
        try:
            import json
            cards_list = json.loads(cards_data)
            all_cards.extend(cards_list)
        except Exception as e:
            logger.error(f"解析JSON失败: {e}")
    
    if not all_cards:
        raise HTTPException(status_code=400, detail="没有可导出的卡片数据")
    
    try:
        from tools.pdf_four_color_processor import PDFourColorProcessor
        processor = PDFourColorProcessor()

        output_path = os.path.join(tempfile.gettempdir(), f"cards_export_{int(time.time())}.xlsx")
        result = processor.export_to_excel(all_cards, output_path, title=title)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Excel 导出失败"))

        return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            filename="四色卡片报告.xlsx")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出 Excel 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========== 智能 NPU 推理生成卡片 ==========

@router.post("/generate/ai-cards")
async def generate_ai_cards(
    file: UploadFile = File(...),
    max_cards: int = Form(20)
):
    """使用 NPU AI 智能生成四色知识卡片"""
    # 先提取文本
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name
    
    try:
        from pypdf import PdfReader
        reader = PdfReader(tmp_path)
        full_text = "\n".join([p.extract_text() for p in reader.pages])
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="无法从 PDF 提取文本")
        
        # 通过 Genie API（端口 8910）推理，避免 NPU 硬件冲突
        if _GENIE_CALL_AVAILABLE:
            try:
                prompt = f"""请分析以下文档内容，生成结构化的四色知识卡片。

文档内容：
{full_text[:6000]}

请按以下格式生成{ max_cards}张知识卡片，每张卡片一行，用 | 分隔：
类型(小写) | 标题(不超过30字) | 内容(不超过100字)

类型说明：
- fact: 客观事实和数据
- explanation: 原因分析和解释
- risk: 潜在风险和问题
- action: 行动建议

只输出卡片，不要其他内容。"""

                result_text = await call_llm(
                    system_prompt="你是知识管理专家，擅长从文档中提取四色知识卡片。",
                    user_prompt=prompt,
                    max_tokens=1000,
                    agent_id="pdf-ai-cards",
                    temperature=0.4
                )

                if result_text:
                    cards = []
                    for i, line in enumerate(result_text.strip().split('\n')):
                        if '|' not in line:
                            continue
                        parts = line.split('|', 2)
                        if len(parts) >= 3:
                            card_type = parts[0].strip().lower()
                            if card_type not in ['fact', 'explanation', 'risk', 'action']:
                                continue
                            cards.append({
                                "id": f"ai-card-{i+1}",
                                "type": card_type,
                                "title": parts[1].strip()[:30],
                                "content": parts[2].strip()[:100],
                                "source": "AI生成"
                            })
                    if cards:
                        return {
                            "success": True,
                            "cards": cards[:max_cards],
                            "count": len(cards),
                            "mode": "genie",
                            "infer_time_ms": 0
                        }
            except Exception as e:
                logger.warning(f"[PDF] ai-cards Genie 推理失败，回退规则: {e}")
        
        # 回退到规则匹配
            # 回退到规则匹配
            from tools.pdf_four_color_processor import PDFourColorProcessor
            processor = PDFourColorProcessor()
            result = processor._analyze_content(full_text, max_cards)
            
            return {
                "success": True,
                "cards": result[:max_cards],
                "count": len(result),
                "mode": "rule",
                "infer_time_ms": 0
            }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ========== 多智能体四色卡片生成（复用会议模块的通政司→参谋司→驿传司流程） ==========

# 尝试导入 call_llm 用于 Genie API 调用（避免直接 NPU 访问冲突）
try:
    from routes.meeting_routes import call_llm
    _GENIE_CALL_AVAILABLE = True
except ImportError:
    _GENIE_CALL_AVAILABLE = False
    logger.warning("[PDF] 无法导入 meeting_routes.call_llm，Genie/多智能体不可用")


async def _generate_cards_multi_agent(text: str, max_cards: int = 20) -> dict:
    """使用多智能体流程（通政司→参谋司→驿传司）生成四色知识卡片"""
    if not _GENIE_CALL_AVAILABLE:
        return {"cards": [], "mode": "multi-agent-unavailable"}

    truncated = text[:6000]

    # ========== 步骤1: 通政司 - 内容分析与四色分类 ==========
    tongzhengsi_prompt = f"""你作为通政司，职责是分析文档内容并按四色分类法归纳。

文档内容：
{truncated}

请按以下四色分类整理要点：
1. 【事实】(blue) - 客观事实、数据、已有结论
2. 【解释】(green) - 原因、机制、关系分析
3. 【风险】(yellow) - 潜在问题、风险、挑战
4. 【行动】(red) - 建议、行动计划、措施

每个分类列出 2-5 条要点，每条控制在 50 字以内。"""

    tongzhengsi_result = await call_llm(
        system_prompt="你是通政司，擅长文档分析与四色分类。",
        user_prompt=tongzhengsi_prompt,
        max_tokens=500,
        agent_id="pdf-tongzhengsi",
        temperature=0.4
    )

    if not tongzhengsi_result:
        return {"cards": [], "mode": "multi-agent-no-genie"}

    # ========== 步骤2: 参谋司 - 基于通政司分类生成结构化卡片 ==========
    canmousi_prompt = f"""你作为参谋司，请基于通政司的分析结果生成结构化四色知识卡片。

通政司分析：
{tongzhengsi_result}

要求生成最多 {max_cards} 张卡片，每张一行，严格按此格式：
类型(小写) | 标题(5-20字) | 内容(10-80字)

类型必须是：fact / explanation / risk / action
只输出卡片，不要序号和其他内容。"""

    canmousi_result = await call_llm(
        system_prompt="你是参谋司，擅长将分析转化为结构化知识卡片。",
        user_prompt=canmousi_prompt,
        max_tokens=800,
        agent_id="pdf-canmousi",
        temperature=0.5
    )

    if not canmousi_result:
        return {"cards": [], "mode": "multi-agent-no-cards"}

    # ========== 解析参谋司输出为卡片 ==========
    raw_cards = []
    for i, line in enumerate(canmousi_result.strip().split('\n')):
        line = line.strip()
        if '|' not in line:
            continue
        parts = line.split('|', 2)
        if len(parts) >= 3:
            card_type = parts[0].strip().lower()
            if card_type not in ['fact', 'explanation', 'risk', 'action']:
                continue
            raw_cards.append({
                "id": f"agent-card-{i+1}",
                "type": card_type,
                "title": parts[1].strip()[:30],
                "content": parts[2].strip()[:100],
                "source": "多智能体"
            })

    if not raw_cards:
        return {"cards": [], "mode": "multi-agent-parse-failed"}

    # ========== 步骤3: 驿传司 - 格式化与去重 ==========
    seen = set()
    deduped = []
    for card in raw_cards:
        key = (card["title"], card["content"][:30])
        if key not in seen:
            seen.add(key)
            deduped.append(card)

    final_cards = deduped[:max_cards]
    return {"cards": final_cards, "mode": "multi-agent"}


@router.post("/generate/cards-from-text")
async def generate_cards_from_text(data: dict):
    """从前端提取的文本生成四色知识卡片（不需要 pypdf）
    
    可选 mode: "npu" / "rule" / "multi-agent" / "auto"（默认 auto）
    """
    text = data.get("text", "")
    max_cards = data.get("max_cards", 20)
    mode = data.get("mode", "auto")
    if not text.strip():
        raise HTTPException(status_code=400, detail="文本内容为空")

    # mode = multi-agent: 使用通政司→参谋司→驿传司流程
    if mode == "multi-agent":
        result = await _generate_cards_multi_agent(text, max_cards)
        if result["cards"]:
            return {"success": True, **result}
        logger.warning(f"[PDF] 多智能体生成失败 ({result['mode']})，不回退到其他模式")
        return {"success": True, "cards": [], "count": 0, "mode": result["mode"]}

    # mode = npu 或 auto: 通过 Genie API（端口 8910）推理，避免与 GenieAPIService 争抢 NPU
    if mode in ("npu", "auto"):
        if _GENIE_CALL_AVAILABLE:
            try:
                prompt = f"""请分析以下文档内容，生成结构化的四色知识卡片。

文档内容：
{text[:6000]}

请按以下格式生成{max_cards}张知识卡片，每张卡片一行，用 | 分隔：
类型(小写) | 标题(不超过30字) | 内容(不超过100字)

类型说明：
- fact: 客观事实和数据
- explanation: 原因分析和解释
- risk: 潜在风险和问题
- action: 行动建议

只输出卡片，不要其他内容。"""

                result_text = await call_llm(
                    system_prompt="你是知识管理专家，擅长从文档中提取四色知识卡片。",
                    user_prompt=prompt,
                    max_tokens=1000,
                    agent_id="pdf-cards-from-text",
                    temperature=0.4
                )

                if result_text:
                    cards = []
                    for i, line in enumerate(result_text.strip().split('\n')):
                        if '|' not in line:
                            continue
                        parts = line.split('|', 2)
                        if len(parts) >= 3:
                            card_type = parts[0].strip().lower()
                            if card_type not in ['fact', 'explanation', 'risk', 'action']:
                                continue
                            cards.append({
                                "id": f"text-card-{i+1}",
                                "type": card_type,
                                "title": parts[1].strip()[:30],
                                "content": parts[2].strip()[:100],
                                "source": "AI生成"
                            })
                    if cards:
                        return {"success": True, "cards": cards[:max_cards], "count": len(cards), "mode": "genie"}
            except Exception as e:
                logger.warning(f"[PDF] Genie 推理失败: {e}")

        if mode == "npu":
            return {"success": True, "cards": [], "count": 0, "mode": "genie-unavailable"}

    # mode = rule 或 auto（NPU 不可用时的自动回退）
    try:
        from tools.pdf_four_color_processor import PDFourColorProcessor
        processor = PDFourColorProcessor()
        result = processor._analyze_content(text, max_cards)
        return {"success": True, "cards": result[:max_cards], "count": len(result), "mode": "rule"}
    except ImportError:
        # 极简兜底：按段落分割
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        cards = []
        for i, line in enumerate(lines[:max_cards]):
            cards.append({
                "id": f"text-card-{i+1}",
                "type": "fact" if len(line) > 20 else "action",
                "title": line[:30],
                "content": line[:100],
                "source": "text-fallback"
            })
        return {"success": True, "cards": cards, "count": len(cards), "mode": "fallback"}


@router.post("/toolkit/images-to-pdf")
async def images_to_pdf_compat(
    files: List[UploadFile] = File(...),
    ocr: bool = Form(False)
):
    """图片转 PDF（使用 pypdf + img2pdf 或 PIL），可选 OCR 提取图片文字加入 PDF"""
    from fastapi import HTTPException
    from PIL import Image
    import io as python_io
    import base64 as b64_module
    
    temp_files = []
    temp_pdfs = []
    ocr_texts: list[str] = []
    try:
        for f in files:
            ext = os.path.splitext(f.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                shutil.copyfileobj(f.file, tmp)
                temp_files.append(tmp.name)
        
        # === OCR 阶段：提取每张图片的文字 ===
        if ocr:
            for img_path in temp_files:
                try:
                    from routes.ocr_routes import _call_genie_vl
                    img = Image.open(img_path)
                    buf = python_io.BytesIO()
                    img.save(buf, format='PNG')
                    img_b64 = b64_module.b64encode(buf.getvalue()).decode('utf-8')
                    text = await _call_genie_vl(img_b64, "请识别图片中的所有文字内容，按原格式输出", task_id="img2pdf_ocr")
                    if text:
                        ocr_texts.append(text.strip())
                    else:
                        ocr_texts.append("[OCR 未识别到文字]")
                except Exception as e:
                    logger.warning(f"OCR 识别失败 ({img_path}): {e}")
                    ocr_texts.append("[OCR 识别失败]")
        
        output_pdf = tempfile.mktemp(suffix='.pdf')
        
        # 尝试使用 img2pdf
        try:
            from img2pdf import convert
            convert(temp_files, outputfile=output_pdf)
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"img2pdf失败，回退到PIL: {e}")
        
        # 如果 img2pdf 失败或没生成文件，用 PIL + pypdf
        if not os.path.exists(output_pdf) or os.path.getsize(output_pdf) == 0:
            from pypdf import PdfWriter, PdfReader
            writer = PdfWriter()
            for img_path in temp_files:
                img = Image.open(img_path)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                img_pdf = tempfile.mktemp(suffix='.pdf')
                img.save(img_pdf, 'PDF', resolution=100.0)
                temp_pdfs.append(img_pdf)
                reader = PdfReader(img_pdf)
                for page in reader.pages:
                    writer.add_page(page)
            writer.write(output_pdf)
        
        # === 附加 OCR 文本页 ===
        if ocr and ocr_texts:
            from pypdf import PdfWriter, PdfReader
            from reportlab.pdfgen import canvas
            from routes.card_pdf_routes import _ensure_chinese_font
            
            font_name = _ensure_chinese_font()
            text_pdf = tempfile.mktemp(suffix='.pdf')
            c = canvas.Canvas(text_pdf)
            width, height = 595, 842  # A4
            
            for i, text in enumerate(ocr_texts):
                c.setPageSize((width, height))
                c.setFont(font_name, 11)
                c.drawString(50, height - 50, f"--- OCR 识别结果: 图片 {i+1} ---")
                c.setFont(font_name, 10)
                y = height - 80
                for line in text.split('\n'):
                    if y < 50:
                        c.showPage()
                        c.setPageSize((width, height))
                        c.setFont(font_name, 10)
                        y = height - 50
                    c.drawString(50, y, line[:100])  # 截断超长行
                    y -= 16
                c.showPage()
            
            c.save()
            
            # 合并
            reader = PdfReader(output_pdf)
            text_reader = PdfReader(text_pdf)
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            for page in text_reader.pages:
                writer.add_page(page)
            writer.write(output_pdf)
            temp_pdfs.append(text_pdf)
        
        return FileResponse(output_pdf, media_type="application/pdf")
    except Exception as e:
        logger.error(f"图片转PDF失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for fp in temp_files:
            if os.path.exists(fp):
                try: os.unlink(fp)
                except: pass
        for fp in temp_pdfs:
            if os.path.exists(fp):
                try: os.unlink(fp)
                except: pass