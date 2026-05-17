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

# NPU推理核心
_npu_core = None
NPU_AVAILABLE = False

def _get_npu_core():
    """获取或初始化 NPU 推理核心"""
    global _npu_core, NPU_AVAILABLE
    if _npu_core is not None:
        return _npu_core
    
    try:
        from npu_core import NPUInferenceCore
        _npu_core = NPUInferenceCore()
        _npu_core.load_model()
        NPU_AVAILABLE = True
        logger.info("[PDF] NPU 模型加载成功")
        return _npu_core
    except Exception as e:
        logger.warning(f"[PDF] NPU 不可用: {e}")
        return None

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
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
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
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
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
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
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
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
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
    if not pdf_processor.available:
        raise HTTPException(status_code=503, detail="PDF 功能未安装")
    
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
        if not pdf_processor.available:
            raise HTTPException(status_code=503, detail="PDF 功能未安装")
        
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
    cards_data: Optional[str] = Form(None)
):
    """导出知识卡片到 Word（支持文件上传或JSON数据）"""
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
        
        output_path = os.path.join(tempfile.gettempdir(), "cards_export.docx")
        processor.export_to_docx({'cards': all_cards}, output_path)
        
        return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    except Exception as e:
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

        output_path = os.path.join(tempfile.gettempdir(), "cards_export.pdf")
        result = processor.export_to_pdf({'cards': all_cards}, output_path, title=title, author=author)

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
    cards_data: Optional[str] = Form(None)
):
    """导出四色卡片到 Excel（支持文件上传或JSON数据）"""
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
        
        output_path = os.path.join(tempfile.gettempdir(), "cards_export.xlsx")
        processor.export_to_excel({'cards': all_cards}, output_path)
        
        return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as e:
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
        
        # 尝试使用 NPU 模型
        npu = _get_npu_core()
        
        if npu and NPU_AVAILABLE:
            # 使用 NPU 生成智能卡片
            prompt = f"""请分析以下文档内容，生成结构化的四色知识卡片。

文档内容：
{full_text[:8000]}

请按以下格式生成{ max_cards}张知识卡片，每张卡片一行，用 | 分隔：
类型 | 标题(不超过30字) | 内容(不超过100字)

类型说明：
- fact: 客观事实和数据
- explanation: 原因分析和解释
- risk: 潜在风险和问题
- action: 行动建议

只输出卡片内容，不要其他说明。"""

            result_text, infer_time = npu.infer(prompt)
            
            cards = []
            for i, line in enumerate(result_text.strip().split('\n')):
                if '|' in line:
                    parts = line.split('|', 2)
                    if len(parts) >= 3:
                        card_type = parts[0].strip().lower()
                        if card_type not in ['fact', 'explanation', 'risk', 'action']:
                            card_type = 'explanation'
                        cards.append({
                            "id": f"ai-card-{i+1}",
                            "type": card_type,
                            "title": parts[1].strip()[:30],
                            "content": parts[2].strip()[:100],
                            "source": "AI生成"
                        })
            
            return {
                "success": True,
                "cards": cards[:max_cards],
                "count": len(cards),
                "mode": "npu",
                "infer_time_ms": infer_time
            }
        else:
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


@router.post("/toolkit/images-to-pdf")
async def images_to_pdf_compat(files: List[UploadFile] = File(...)):
    """图片转 PDF（使用 pypdf + img2pdf 或 PIL）"""
    from fastapi import HTTPException
    
    temp_files = []
    temp_pdfs = []
    try:
        for f in files:
            ext = os.path.splitext(f.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                shutil.copyfileobj(f.file, tmp)
                temp_files.append(tmp.name)
        
        output_pdf = tempfile.mktemp(suffix='.pdf')
        
        # 尝试使用 PIL + img2pdf
        try:
            from img2pdf import convert
            convert(temp_files, outputfile=output_pdf)
            return FileResponse(output_pdf, media_type="application/pdf")
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"img2pdf失败，回退到PIL: {e}")
        
        # 回退：使用 PIL + pypdf
        from pypdf import PdfWriter, PdfReader
        from PIL import Image
        writer = PdfWriter()
        
        for img_path in temp_files:
            img = Image.open(img_path)
            # 转换为RGB
            if img.mode != 'RGB':
                img = img.convert('RGB')
            # 保存为临时PDF页
            img_pdf = tempfile.mktemp(suffix='.pdf')
            img.save(img_pdf, 'PDF', resolution=100.0)
            temp_pdfs.append(img_pdf)
            # 读取并添加到writer
            reader = PdfReader(img_pdf)
            for page in reader.pages:
                writer.add_page(page)
        
        writer.write(output_pdf)
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