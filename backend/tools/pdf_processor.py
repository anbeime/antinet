"""
PDF 处理工具模块
用于 Antinet 智能知识管家的 PDF 文档处理功能

功能：
1. PDF 文本提取（支持布局保留）
2. PDF 表格提取与转换
3. PDF 知识卡片生成
4. 四色卡片分析报告导出为 PDF
5. 批量 PDF 文档处理
"""

import os
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
from datetime import datetime

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
        Table, TableStyle, Image as RLImage
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("警告: PDF 处理库未安装，请运行: pip install pypdf pdfplumber reportlab")


class PDFProcessor:
    """PDF 文档处理器"""
    
    def __init__(self):
        """初始化 PDF 处理器"""
        if not PDF_AVAILABLE:
            raise ImportError("PDF 处理库未安装，请运行: pip install pypdf pdfplumber reportlab")
        
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
    
    # ========== 1. PDF 文本提取 ==========
    
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
    
    # ========== 2. PDF 表格提取 ==========
    
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
    
    # ========== 3. PDF 知识提取 ==========
    
    def extract_knowledge(self, pdf_path: str) -> Dict[str, Any]:
        """
        从 PDF 提取知识并准备生成四色卡片
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            包含提取知识的字典，可用于生成四色卡片
        """
        result = {
            "success": False,
            "file_path": pdf_path,
            "text_content": "",
            "tables": [],
            "metadata": {},
            "suggested_cards": [],
            "error": None
        }
        
        try:
            # 1. 提取文本
            text_result = self.extract_text(pdf_path, preserve_layout=True)
            if text_result["success"]:
                result["text_content"] = text_result["full_text"]
                result["metadata"] = text_result["metadata"]
            
            # 2. 提取表格
            table_result = self.extract_tables(pdf_path)
            if table_result["success"]:
                result["tables"] = table_result["tables"]
            
            # 3. 分析内容并建议卡片类型
            result["suggested_cards"] = self._analyze_content_for_cards(
                result["text_content"],
                result["tables"]
            )
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def _analyze_content_for_cards(self, text: str, tables: List[Dict]) -> List[str]:
        """分析内容并建议生成哪些类型的卡片"""
        suggested = []
        
        # 如果有数据/数字，建议生成事实卡片
        if any(char.isdigit() for char in text) or len(tables) > 0:
            suggested.append("fact")
        
        # 如果有分析性词汇，建议生成解释卡片
        analysis_keywords = ["因为", "由于", "原因", "导致", "影响", "分析", "说明"]
        if any(keyword in text for keyword in analysis_keywords):
            suggested.append("interpret")
        
        # 如果有风险性词汇，建议生成风险卡片
        risk_keywords = ["风险", "问题", "挑战", "威胁", "隐患", "警告", "注意"]
        if any(keyword in text for keyword in risk_keywords):
            suggested.append("risk")
        
        # 如果有行动性词汇，建议生成行动卡片
        action_keywords = ["建议", "应该", "需要", "措施", "方案", "计划", "行动"]
        if any(keyword in text for keyword in action_keywords):
            suggested.append("action")
        
        return suggested if suggested else ["fact"]  # 至少返回事实卡片
    
    # ========== 4. 四色卡片报告导出 ==========
    
    def export_cards_to_pdf(
        self,
        cards: List[Dict[str, Any]],
        output_path: str,
        title: str = "Antinet 分析报告",
        author: str = "Antinet 智能知识管家"
    ) -> Dict[str, Any]:
        """
        将四色卡片导出为 PDF 报告
        
        Args:
            cards: 四色卡片列表
            output_path: 输出 PDF 路径
            title: 报告标题
            author: 报告作者
            
        Returns:
            导出结果字典
        """
        result = {
            "success": False,
            "output_path": output_path,
            "cards_count": len(cards),
            "error": None
        }
        
        try:
            # 创建 PDF 文档
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # 准备内容
            story = []
            styles = getSampleStyleSheet()
            
            # 自定义样式
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=HexColor('#1a1a1a'),
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName=self.chinese_font
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=HexColor('#333333'),
                spaceAfter=12,
                fontName=self.chinese_font
            )
            
            body_style = ParagraphStyle(
                'CustomBody',
                parent=styles['Normal'],
                fontSize=11,
                textColor=HexColor('#666666'),
                spaceAfter=12,
                alignment=TA_JUSTIFY,
                fontName=self.chinese_font
            )
            
            # 添加标题
            story.append(Paragraph(title, title_style))
            story.append(Spacer(1, 12))
            
            # 添加元信息
            meta_text = f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>作者: {author}<br/>卡片数量: {len(cards)}"
            story.append(Paragraph(meta_text, body_style))
            story.append(Spacer(1, 20))
            
            # 卡片颜色映射
            card_colors = {
                "fact": ("#E3F2FD", "#1976D2", "🔵 事实卡片"),
                "interpret": ("#E8F5E9", "#388E3C", "🟢 解释卡片"),
                "risk": ("#FFF9C4", "#F57C00", "🟡 风险卡片"),
                "action": ("#FFEBEE", "#D32F2F", "🔴 行动卡片")
            }
            
            # 添加每张卡片
            for i, card in enumerate(cards, start=1):
                card_type = card.get("type", "fact")
                bg_color, border_color, type_name = card_colors.get(card_type, card_colors["fact"])
                
                # 卡片标题
                card_title = f"{type_name} #{i}"
                story.append(Paragraph(card_title, heading_style))
                
                # 卡片内容
                content = card.get("content", "")
                story.append(Paragraph(content, body_style))
                
                # 如果有数据，添加表格
                if "data" in card and card["data"]:
                    table_data = [list(card["data"].keys())] + [list(card["data"].values())]
                    t = Table(table_data)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), HexColor(border_color)),
                        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#FFFFFF')),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), self.chinese_font),
                        ('FONTSIZE', (0, 0), (-1, 0), 12),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F5F5F5')),
                        ('GRID', (0, 0), (-1, -1), 1, HexColor('#CCCCCC'))
                    ]))
                    story.append(Spacer(1, 12))
                    story.append(t)
                
                story.append(Spacer(1, 20))
            
            # 生成 PDF
            doc.build(story)
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    # ========== 5. 批量处理 ==========
    
    def batch_process(
        self,
        pdf_dir: str,
        output_dir: str,
        extract_text: bool = True,
        extract_tables: bool = True
    ) -> Dict[str, Any]:
        """
        批量处理 PDF 文档
        
        Args:
            pdf_dir: PDF 文件目录
            output_dir: 输出目录
            extract_text: 是否提取文本
            extract_tables: 是否提取表格
            
        Returns:
            批量处理结果
        """
        result = {
            "success": False,
            "processed": [],
            "failed": [],
            "total": 0,
            "error": None
        }
        
        try:
            # 创建输出目录
            os.makedirs(output_dir, exist_ok=True)
            
            # 查找所有 PDF 文件
            pdf_files = list(Path(pdf_dir).glob("*.pdf"))
            result["total"] = len(pdf_files)
            
            for pdf_file in pdf_files:
                file_result = {
                    "file": str(pdf_file),
                    "success": False,
                    "outputs": []
                }
                
                try:
                    base_name = pdf_file.stem
                    
                    # 提取文本
                    if extract_text:
                        text_result = self.extract_text(str(pdf_file))
                        if text_result["success"]:
                            text_output = os.path.join(output_dir, f"{base_name}_text.txt")
                            with open(text_output, "w", encoding="utf-8") as f:
                                f.write(text_result["full_text"])
                            file_result["outputs"].append(text_output)
                    
                    # 提取表格
                    if extract_tables:
                        table_result = self.extract_tables(str(pdf_file))
                        if table_result["success"] and table_result["tables"]:
                            for i, table in enumerate(table_result["tables"]):
                                df = pd.DataFrame(table["data"])
                                excel_output = os.path.join(output_dir, f"{base_name}_table_{i+1}.xlsx")
                                df.to_excel(excel_output, index=False)
                                file_result["outputs"].append(excel_output)
                    
                    file_result["success"] = True
                    result["processed"].append(file_result)
                    
                except Exception as e:
                    file_result["error"] = str(e)
                    result["failed"].append(file_result)
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result


# ========== 便捷函数 ==========

def extract_pdf_text(pdf_path: str) -> str:
    """快速提取 PDF 文本"""
    processor = PDFProcessor()
    result = processor.extract_text(pdf_path)
    return result["full_text"] if result["success"] else ""


def extract_pdf_tables(pdf_path: str) -> List[pd.DataFrame]:
    """快速提取 PDF 表格为 DataFrame 列表"""
    processor = PDFProcessor()
    result = processor.extract_tables(pdf_path)
    
    if result["success"]:
        return [pd.DataFrame(table["data"]) for table in result["tables"]]
    return []


def export_cards_to_pdf(cards: List[Dict], output_path: str, title: str = "分析报告") -> bool:
    """快速导出四色卡片为 PDF"""
    processor = PDFProcessor()
    result = processor.export_cards_to_pdf(cards, output_path, title)
    return result["success"]


if __name__ == "__main__":
    # 测试代码
    print("PDF 处理器模块已加载")
    print(f"PDF 库可用: {PDF_AVAILABLE}")
    
    if PDF_AVAILABLE:
        processor = PDFProcessor()
        print("✓ PDF 处理器初始化成功")
