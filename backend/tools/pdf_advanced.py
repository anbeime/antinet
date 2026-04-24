# ---------------------------------------------------------------------
# Copyright (c) 2024 Qualcomm Innovation Center, Inc. All rights reserved.
# SPDX-License-Identifier: BSD-3-Clause
# ---------------------------------------------------------------------
"""
高级 PDF 处理器 - 支持文本、图片、表格识别
自动检测系统环境，ARM64下使用纯Python方案
"""

import os
import logging
from typing import List, Dict, Tuple, Any

logger = logging.getLogger(__name__)

# 检测CPU架构
IS_ARM64 = os.environ.get("PROCESSOR_ARCHITECTURE") == "ARM64"

# 可用状态
PYPLUMBER_AVAILABLE = False
MUPDF_AVAILABLE = False
PYTESSERACT_AVAILABLE = False
CAMELOT_AVAILABLE = False

# 延迟加载
def _init():
    global PYPLUMBER_AVAILABLE, MUPDF_AVAILABLE, PYTESSERACT_AVAILABLE, CAMELOT_AVAILABLE
    
    # pdfplumber - 始终可用
    try:
        import pdfplumber
        PYPLUMBER_AVAILABLE = True
        logger.info("[PDF] pdfplumber 可用")
    except ImportError:
        logger.warning("[PDF] pdfplumber 不可用")
    
    # PyMuPDF - 仅x64
    if not IS_ARM64:
        try:
            import fitz
            MUPDF_AVAILABLE = True
            logger.info("[PDF] PyMuPDF 可用")
        except ImportError:
            logger.warning("[PDF] PyMuPDF 不可用")
    else:
        logger.info("[PDF] PyMuPDF 在ARM64上不可用")
    
    # pytesseract - 仅x64
    if not IS_ARM64:
        try:
            import pytesseract
            PYTESSERACT_AVAILABLE = True
            logger.info("[PDF] pytesseract 可用")
        except ImportError:
            logger.warning("[PDF] pytesseract 不可用")
    
    # camelot - 仅x64
    if not IS_ARM64:
        try:
            import camelot
            CAMELOT_AVAILABLE = True
            logger.info("[PDF] camelot 可用")
        except ImportError:
            logger.warning("[PDF] camelot 不可用")

_init()


class AdvancedPDFProcessor:
    """高级PDF处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    @property
    def available(self) -> bool:
        return PYPLUMBER_AVAILABLE
    
    @property
    def has_mupdf(self) -> bool:
        return MUPDF_AVAILABLE
    
    @property
    def has_ocr(self) -> bool:
        return PYTESSERACT_AVAILABLE
    
    @property
    def has_tables(self) -> bool:
        return CAMELOT_AVAILABLE
    
    @property
    def has_plumber(self) -> bool:
        return PYPLUMBER_AVAILABLE
    
    def get_info(self) -> Dict:
        """获取PDF功能信息"""
        return {
            "text_plumber": PYPLUMBER_AVAILABLE,
            "text_mupdf": MUPDF_AVAILABLE,
            "images": MUPDF_AVAILABLE,
            "tables": CAMELOT_AVAILABLE,
            "ocr": PYTESSERACT_AVAILABLE,
            "platform": "arm64" if IS_ARM64 else "x64"
        }
    
    def extract_text(self, pdf_path: str) -> Dict[str, Any]:
        """提取文本"""
        if MUPDF_AVAILABLE:
            return self._extract_text_mupdf(pdf_path)
        elif PYPLUMBER_AVAILABLE:
            return self._extract_text_plumber(pdf_path)
        else:
            return {"success": False, "error": "无可用PDF库"}
    
    def _extract_text_mupdf(self, pdf_path: str) -> Dict[str, Any]:
        """使用PyMuPDF提取文本"""
        try:
            import fitz
            doc = fitz.open(pdf_path)
            pages = []
            full_text = []
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text = page.get_text("text")
                pages.append({
                    "page_number": page_num + 1,
                    "text": text.strip(),
                    "char_count": len(text)
                })
                full_text.append(f"--- Page {page_num + 1} ---\n{text}")
            
            metadata = doc.metadata
            doc.close()
            
            return {
                "success": True,
                "pages": pages,
                "full_text": "\n".join(full_text),
                "metadata": {
                    "title": metadata.get("title", ""),
                    "author": metadata.get("author", ""),
                },
                "page_count": len(pages)
            }
        except Exception as e:
            self.logger.error(f"PyMuPDF文本提取失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _extract_text_plumber(self, pdf_path: str) -> Dict[str, Any]:
        """使用pdfplumber提取文本"""
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                pages = []
                full_text = []
                
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text() or ""
                    pages.append({
                        "page_number": page_num,
                        "text": text.strip(),
                        "char_count": len(text)
                    })
                    full_text.append(f"--- Page {page_num} ---\n{text}")
                
                return {
                    "success": True,
                    "pages": pages,
                    "full_text": "\n".join(full_text),
                    "metadata": {},
                    "page_count": len(pages)
                }
        except Exception as e:
            self.logger.error(f"pdfplumber文本提取失败: {e}")
            return {"success": False, "error": str(e)}
    
    def extract_images(self, pdf_path: str) -> Dict[str, Any]:
        """提取图片"""
        if not MUPDF_AVAILABLE:
            return {"success": False, "error": "PyMuPDF 不可用(仅x64)", "images": []}
        
        try:
            import fitz
            doc = fitz.open(pdf_path)
            images = []
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                image_list = page.get_images(full=True)
                
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    
                    images.append({
                        "page_num": page_num + 1,
                        "xref": xref,
                        "width": base_image["width"],
                        "height": base_image["height"],
                        "colorspace": base_image["colorspace"],
                    })
            
            doc.close()
            return {"success": True, "images": images}
            
        except Exception as e:
            self.logger.error(f"图片提取失败: {e}")
            return {"success": False, "error": str(e), "images": []}
    
    def extract_tables(self, pdf_path: str) -> Dict[str, Any]:
        """提取表格"""
        if CAMELOT_AVAILABLE:
            return self._extract_tables_camelot(pdf_path)
        elif PYPLUMBER_AVAILABLE:
            return self._extract_tables_plumber(pdf_path)
        else:
            return {"success": False, "error": "camelot/pdfplumber 不可用", "tables": {}}
    
    def _extract_tables_camelot(self, pdf_path: str) -> Dict[str, Any]:
        """使用camelot提取表格"""
        try:
            import camelot
            tables_by_page = {}
            
            table_list = camelot.read_pdf(pdf_path, pages="1-end", flavor="lattice")
            
            for table in table_list:
                page_num = table.order
                if page_num not in tables_by_page:
                    tables_by_page[page_num] = []
                tables_by_page[page_num].append({
                    "table_index": len(tables_by_page[page_num]),
                    "rows": table.data,
                })
            
            return {"success": True, "tables": tables_by_page}
            
        except Exception as e:
            self.logger.error(f"camelot表格提取失败: {e}")
            return {"success": False, "error": str(e), "tables": {}}
    
    def _extract_tables_plumber(self, pdf_path: str) -> Dict[str, Any]:
        """使用pdfplumber提取表格"""
        try:
            import pdfplumber
            tables_by_page = {}
            
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    tables = page.extract_tables()
                    if tables:
                        tables_by_page[page_num] = []
                        for i, table in enumerate(tables):
                            if table:
                                tables_by_page[page_num].append({
                                    "table_index": i,
                                    "rows": table,
                                })
            
            return {"success": True, "tables": tables_by_page}
            
        except Exception as e:
            self.logger.error(f"pdfplumber表格提取失败: {e}")
            return {"success": False, "error": str(e), "tables": {}}
    
    def extract_ocr(self, pdf_path: str, lang: str = "chi_sim+eng") -> Dict[str, Any]:
        """OCR识别"""
        if not PYTESSERACT_AVAILABLE:
            return {"success": False, "error": "pytesseract 不可用(仅x64)", "pages": {}}
        
        try:
            import pytesseract
            from pdf2image import convert_from_path
            
            images = convert_from_path(pdf_path, dpi=300)
            pages = {}
            
            for i, img in enumerate(images):
                text = pytesseract.image_to_string(img, lang=lang)
                pages[i + 1] = text.strip()
            
            return {"success": True, "pages": pages}
            
        except Exception as e:
            self.logger.error(f"OCR失败: {e}")
            return {"success": False, "error": str(e), "pages": {}}
    
    def full_extract(self, pdf_path: str) -> Dict[str, Any]:
        """完整提取"""
        result = {
            "text": {},
            "images": [],
            "tables": {},
            "ocr": {},
        }
        
        # 文本
        text_result = self.extract_text(pdf_path)
        if text_result["success"]:
            result["text"] = text_result
        
        # 图片
        if MUPDF_AVAILABLE:
            img_result = self.extract_images(pdf_path)
            if img_result["success"]:
                result["images"] = img_result["images"]
        
        # 表格
        table_result = self.extract_tables(pdf_path)
        if table_result["success"]:
            result["tables"] = table_result["tables"]
        
        # OCR
        if PYTESSERACT_AVAILABLE:
            ocr_result = self.extract_ocr(pdf_path)
            if ocr_result["success"]:
                result["ocr"] = ocr_result["pages"]
        
        return result


# 全局实例
advanced_processor = AdvancedPDFProcessor()


def get_processor():
    """获取高级处理器"""
    return advanced_processor


def check_capabilities():
    """检查可用功能"""
    return advanced_processor.get_info()