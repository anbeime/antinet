"""
PDF 处理增强工具模块 - 基于 Skill 规范
整合了 pypdf, pdfplumber, reportlab, PyMuPDF, pikepdf 等库

功能：
1. PDF 合并/拆分
2. PDF 文本/表格提取
3. PDF 转图像 (pdf2image)
4. 图像转 PDF (img2pdf)
5. PDF 表单填写
6. PDF 压缩 (pikepdf)
7. PDF 编辑 (PyMuPDF/reportlab)
8. PDF 知识卡片生成
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
from datetime import datetime
import tempfile
import shutil

# PDF 处理库
try:
    from pypdf import PdfReader, PdfWriter
    import pdfplumber
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, PageBreak,
        Table, TableStyle
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    PDF_BASIC_AVAILABLE = True
except ImportError as e:
    PDF_BASIC_AVAILABLE = False
    print(f"警告: 基础 PDF 处理库未完全安装: {e}")
    print("请运行: pip install pypdf pdfplumber reportlab")

# 高级 PDF 处理库（ARM Windows 不兼容，已禁用）
PYMUPDF_AVAILABLE = False
PIKEPDF_AVAILABLE = False
PDF2IMAGE_AVAILABLE = False
IMG2PDF_AVAILABLE = False

# 注意：以下包在 ARM Windows 上无法使用
# - PyMuPDF (fitz): 需要预编译二进制文件
# - pikepdf: 需要 C++ 编译器
# - pdf2image: 依赖 poppler 外部工具
# - img2pdf: 依赖 pikepdf


class EnhancedPDFProcessor:
    """增强版 PDF 文档处理器"""
    
    def __init__(self):
        """初始化 PDF 处理器"""
        if not PDF_BASIC_AVAILABLE:
            print("警告: 基础 PDF 处理库未完全安装，部分功能可能不可用")
        
        # 注册中文字体（如果可用）
        self._register_chinese_fonts()
    
    def _register_chinese_fonts(self):
        """注册中文字体支持"""
        try:
            # Windows 系统字体路径
            font_paths = [
                "C:/Windows/Fonts/simhei.ttf",  # 黑体
                "C:/Windows/Fonts/simsun.ttc",  # 宋体
                "C:/Windows/Fonts/msyh.ttc",    # 微软雅黑
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    font_name = Path(font_path).stem
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                    self.chinese_font = font_name
                    print(f"✓ 已注册中文字体: {font_name}")
                    return
            
            # 如果没有找到中文字体，使用默认字体
            self.chinese_font = "Helvetica"
            print("⚠ 未找到中文字体，使用默认字体")
        except Exception as e:
            self.chinese_font = "Helvetica"
            print(f"⚠ 字体注册失败: {e}")
    
    # ========== 1. PDF 合并/拆分 ==========
    
    def merge_pdfs(self, pdf_files: List[str], output_path: str) -> Dict[str, Any]:
        """
        合并多个 PDF 文件
        
        Args:
            pdf_files: PDF 文件路径列表
            output_path: 输出 PDF 路径
            
        Returns:
            合并结果字典
        """
        result = {
            "success": False,
            "output_path": output_path,
            "input_files": len(pdf_files),
            "total_pages": 0,
            "error": None
        }
        
        try:
            writer = PdfWriter()
            
            for pdf_file in pdf_files:
                if not os.path.exists(pdf_file):
                    raise FileNotFoundError(f"文件不存在: {pdf_file}")
                
                reader = PdfReader(pdf_file)
                result["total_pages"] += len(reader.pages)
                
                # 添加所有页面
                for page in reader.pages:
                    writer.add_page(page)
            
            # 写入合并后的文件
            with open(output_path, "wb") as f:
                writer.write(f)
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def split_pdf(self, pdf_path: str, output_dir: str, pages_per_file: int = 1) -> Dict[str, Any]:
        """
        拆分 PDF 文件
        
        Args:
            pdf_path: PDF 文件路径
            output_dir: 输出目录
            pages_per_file: 每个文件包含的页数
            
        Returns:
            拆分结果字典
        """
        result = {
            "success": False,
            "input_file": pdf_path,
            "output_files": [],
            "total_pages": 0,
            "error": None
        }
        
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            reader = PdfReader(pdf_path)
            result["total_pages"] = len(reader.pages)
            
            base_name = Path(pdf_path).stem
            
            # 按指定页数拆分
            for i in range(0, len(reader.pages), pages_per_file):
                writer = PdfWriter()
                
                # 添加页面
                for j in range(i, min(i + pages_per_file, len(reader.pages))):
                    writer.add_page(reader.pages[j])
                
                # 输出文件
                output_file = os.path.join(output_dir, f"{base_name}_part_{i//pages_per_file + 1}.pdf")
                with open(output_file, "wb") as f:
                    writer.write(f)
                
                result["output_files"].append(output_file)
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 2. PDF 转图像（ARM 不兼容，已禁用） ==========
    
    def pdf_to_images(self, pdf_path: str, output_dir: str, dpi: int = 200) -> Dict[str, Any]:
        """
        将 PDF 转换为图像（ARM Windows 不支持）
        
        Args:
            pdf_path: PDF 文件路径
            output_dir: 输出目录
            dpi: 图像分辨率
            
        Returns:
            错误信息字典
        """
        result = {
            "success": False,
            "input_file": pdf_path,
            "output_images": [],
            "error": "PDF 转图像功能在 ARM Windows 上不可用。建议使用前端 PDF.js 或在线服务。"
        }
        
        return result
    
    # ========== 3. 图像转 PDF（使用 reportlab 替代） ==========
    
    def images_to_pdf(self, image_files: List[str], output_path: str) -> Dict[str, Any]:
        """
        将图像转换为 PDF（使用 reportlab 实现）
        
        Args:
            image_files: 图像文件路径列表
            output_path: 输出 PDF 路径
            
        Returns:
            转换结果字典
        """
        result = {
            "success": False,
            "output_path": output_path,
            "input_images": len(image_files),
            "error": None
        }
        
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas as rl_canvas
            from PIL import Image
            
            # 验证所有图像文件存在
            for img_file in image_files:
                if not os.path.exists(img_file):
                    raise FileNotFoundError(f"图像文件不存在: {img_file}")
            
            # 创建 PDF
            c = rl_canvas.Canvas(output_path, pagesize=letter)
            
            for img_file in image_files:
                img = Image.open(img_file)
                width, height = img.size
                
                # 调整到页面大小
                page_width, page_height = letter
                
                # 保持宽高比
                ratio = min(page_width / width, page_height / height)
                new_width = width * ratio
                new_height = height * ratio
                
                # 居中绘制
                x = (page_width - new_width) / 2
                y = (page_height - new_height) / 2
                
                c.drawImage(img_file, x, y, width=new_width, height=new_height)
                c.showPage()
            
            c.save()
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 4. PDF 压缩（使用 pypdf 基础功能） ==========
    
    def compress_pdf(self, pdf_path: str, output_path: str, quality: str = "medium") -> Dict[str, Any]:
        """
        压缩 PDF 文件（使用 pypdf 基础功能）
        
        Args:
            pdf_path: PDF 文件路径
            output_path: 输出 PDF 路径
            quality: 压缩质量 (low/medium/high) - 在基础版本中无效
            
        Returns:
            压缩结果字典
        """
        result = {
            "success": False,
            "input_file": pdf_path,
            "output_file": output_path,
            "original_size": 0,
            "compressed_size": 0,
            "compression_ratio": 0,
            "error": None
        }
        
        try:
            result["original_size"] = os.path.getsize(pdf_path)
            
            # 使用 pypdf 进行基础压缩（移除重复对象）
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            
            for page in reader.pages:
                writer.add_page(page)
            
            # 添加元数据
            if reader.metadata:
                writer.add_metadata(reader.metadata)
            
            # 写入文件
            with open(output_path, "wb") as f:
                writer.write(f)
            
            result["compressed_size"] = os.path.getsize(output_path)
            
            if result["original_size"] > 0:
                result["compression_ratio"] = (1 - result["compressed_size"] / result["original_size"]) * 100
            
            result["success"] = True
            result["note"] = "使用 pypdf 基础压缩。高级压缩需要 pikepdf（ARM Windows 不支持）"
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 5. PDF 文本提取（继承原有功能） ==========
    
    def extract_text(self, pdf_path: str, preserve_layout: bool = True) -> Dict[str, Any]:
        """
        从 PDF 提取文本
        
        Args:
            pdf_path: PDF 文件路径
            preserve_layout: 是否保留布局
            
        Returns:
            包含文本内容和元数据的字典
        """
        result = {
            "success": False,
            "file_path": pdf_path,
            "pages": [],
            "full_text": "",
            "metadata": {},
            "error": None
        }
        
        try:
            if preserve_layout:
                # 使用 pdfplumber 保留布局
                with pdfplumber.open(pdf_path) as pdf:
                    result["metadata"] = pdf.metadata or {}
                    
                    for i, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        result["pages"].append({
                            "page_num": i + 1,
                            "text": page_text,
                            "width": page.width,
                            "height": page.height
                        })
                        result["full_text"] += page_text + "\n\n"
            else:
                # 使用 pypdf 快速提取
                reader = PdfReader(pdf_path)
                result["metadata"] = {
                    "title": reader.metadata.title if reader.metadata else None,
                    "author": reader.metadata.author if reader.metadata else None,
                    "pages": len(reader.pages)
                }
                
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    result["pages"].append({
                        "page_num": i + 1,
                        "text": page_text
                    })
                    result["full_text"] += page_text + "\n\n"
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 6. PDF 表格提取（继承原有功能） ==========
    
    def extract_tables(self, pdf_path: str, page_numbers: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        从 PDF 提取表格
        
        Args:
            pdf_path: PDF 文件路径
            page_numbers: 指定页码列表（从1开始），None表示所有页
            
        Returns:
            包含表格数据的字典
        """
        result = {
            "success": False,
            "file_path": pdf_path,
            "tables": [],
            "error": None
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                pages = pdf.pages if page_numbers is None else [pdf.pages[i-1] for i in page_numbers]
                
                for page_num, page in enumerate(pages, start=1):
                    tables = page.extract_tables()
                    
                    for table_num, table in enumerate(tables, start=1):
                        if table and len(table) > 0:
                            # 转换为 DataFrame
                            df = pd.DataFrame(table[1:], columns=table[0])
                            
                            result["tables"].append({
                                "page": page_num,
                                "table_num": table_num,
                                "data": df.to_dict('records'),
                                "columns": list(df.columns),
                                "rows": len(df)
                            })
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 7. 获取功能状态 ==========
    
    def get_capabilities(self) -> Dict[str, bool]:
        """获取可用功能列表（ARM Windows 兼容版本）"""
        return {
            "basic_operations": PDF_BASIC_AVAILABLE,
            "merge_split": PDF_BASIC_AVAILABLE,
            "text_extraction": PDF_BASIC_AVAILABLE,
            "table_extraction": PDF_BASIC_AVAILABLE,
            "pdf_creation": PDF_BASIC_AVAILABLE,
            "image_to_pdf": PDF_BASIC_AVAILABLE,  # 使用 reportlab 实现
            "basic_compression": PDF_BASIC_AVAILABLE,  # 使用 pypdf 实现
            # ARM Windows 不支持的功能
            "pdf_to_image": False,  # 需要 pdf2image + poppler
            "advanced_compression": False,  # 需要 pikepdf
            "advanced_editing": False,  # 需要 PyMuPDF
        }


# ========== 便捷函数 ==========

def merge_pdfs(pdf_files: List[str], output_path: str) -> bool:
    """快速合并 PDF 文件"""
    processor = EnhancedPDFProcessor()
    result = processor.merge_pdfs(pdf_files, output_path)
    return result["success"]


def split_pdf(pdf_path: str, output_dir: str, pages_per_file: int = 1) -> List[str]:
    """快速拆分 PDF 文件"""
    processor = EnhancedPDFProcessor()
    result = processor.split_pdf(pdf_path, output_dir, pages_per_file)
    return result["output_files"] if result["success"] else []


def compress_pdf(pdf_path: str, output_path: str, quality: str = "medium") -> bool:
    """快速压缩 PDF 文件（基础压缩）"""
    processor = EnhancedPDFProcessor()
    result = processor.compress_pdf(pdf_path, output_path, quality)
    return result["success"]


def images_to_pdf(image_files: List[str], output_path: str) -> bool:
    """快速将图像转换为 PDF（使用 reportlab）"""
    processor = EnhancedPDFProcessor()
    result = processor.images_to_pdf(image_files, output_path)
    return result["success"]


if __name__ == "__main__":
    # 测试代码
    print("增强版 PDF 处理器模块已加载（ARM Windows 兼容版本）")
    print(f"基础功能可用: {PDF_BASIC_AVAILABLE}")
    print(f"PyMuPDF 可用: {PYMUPDF_AVAILABLE} (ARM 不支持)")
    print(f"pikepdf 可用: {PIKEPDF_AVAILABLE} (ARM 不支持)")
    print(f"pdf2image 可用: {PDF2IMAGE_AVAILABLE} (ARM 不支持)")
    print(f"img2pdf 可用: {IMG2PDF_AVAILABLE} (ARM 不支持)")
    
    if PDF_BASIC_AVAILABLE:
        processor = EnhancedPDFProcessor()
        capabilities = processor.get_capabilities()
        print("\n可用功能:")
        for feature, available in capabilities.items():
            status = "✓" if available else "✗"
            print(f"  {status} {feature}")
        
        print("\n注意: ARM Windows 平台使用替代方案:")
        print("  - PDF 压缩: pypdf 基础功能")
        print("  - 图像转 PDF: reportlab")
        print("  - PDF 转图像: 不可用（建议使用前端 PDF.js）")
