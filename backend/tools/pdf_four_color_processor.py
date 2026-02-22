"""
PDF 四色卡片处理器
用于从 PDF 提取内容并生成四色知识卡片
"""

import os
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

# 如果 pypdf 和 pdfplumber 都不可用，标记为不可用
if not PYPDF_AVAILABLE and not PDFPLUMBER_AVAILABLE:
    PDF_AVAILABLE = False
else:
    PDF_AVAILABLE = True

logger = logging.getLogger(__name__)


class PDFourColorProcessor:
    """PDF 四色卡片处理器"""
    
    # 四色卡片类型定义
    CARD_TYPES = {
        "fact": {
            "name": "事实",
            "color": "blue",
            "keywords": ["数据", "统计", "数量", "金额", "比例", "增长", "下降", "达到", "超过", "约", "共"],
            "description": "客观事实和数据"
        },
        "explanation": {
            "name": "解释",
            "color": "green",
            "keywords": ["因为", "所以", "原因", "由于", "导致", "说明", "解释", "原理", "机制", "逻辑"],
            "description": "原因分析和解释"
        },
        "risk": {
            "name": "风险",
            "color": "yellow",
            "keywords": ["风险", "问题", "挑战", "困难", "障碍", "限制", "不足", "缺陷", "隐患", "警告"],
            "description": "潜在风险和问题"
        },
        "action": {
            "name": "行动",
            "color": "red",
            "keywords": ["建议", "措施", "方案", "计划", "行动", "实施", "执行", "推进", "落实", "需要"],
            "description": "行动建议和对策"
        }
    }
    
    def __init__(self):
        """初始化处理器"""
        if not PDF_AVAILABLE:
            logger.warning("PDF 库未安装，PDF 功能不可用")
        elif not PYPDF_AVAILABLE:
            logger.warning("pypdf 未安装，PDF 功能受限")
        if not PDFPLUMBER_AVAILABLE:
            logger.warning("pdfplumber 未安装，表格提取功能受限")
    
    def generate_four_color_cards(self, pdf_path: str, max_cards: int = 50) -> Dict[str, Any]:
        """
        从 PDF 生成四色卡片
        
        Args:
            pdf_path: PDF 文件路径
            max_cards: 最大卡片数量
            
        Returns:
            包含卡片列表和统计信息的字典
        """
        result = {
            "success": False,
            "cards": [],
            "stats": {},
            "metadata": {},
            "error": None,
            "message": ""
        }
        
        try:
            # 提取 PDF 文本
            text_content = self._extract_text(pdf_path)
            
            if not text_content:
                result["error"] = "无法从 PDF 提取文本"
                return result
            
            # 分析内容并生成卡片
            cards = self._analyze_content(text_content, max_cards)
            
            # 统计信息
            stats = {
                "total_cards": len(cards),
                "fact_cards": len([c for c in cards if c["type"] == "fact"]),
                "explanation_cards": len([c for c in cards if c["type"] == "explanation"]),
                "risk_cards": len([c for c in cards if c["type"] == "risk"]),
                "action_cards": len([c for c in cards if c["type"] == "action"])
            }
            
            # 元数据
            metadata = {
                "source_file": os.path.basename(pdf_path),
                "total_length": len(text_content),
                "extraction_method": "pypdf" if PYPDF_AVAILABLE else "fallback"
            }
            
            result["success"] = True
            result["cards"] = cards
            result["stats"] = stats
            result["metadata"] = metadata
            result["message"] = f"成功生成 {len(cards)} 张四色卡片"
            
            logger.info(f"PDF 四色卡片生成完成: {len(cards)} 张卡片")
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"PDF 四色卡片生成失败: {e}", exc_info=True)
        
        return result
    
    def _extract_text(self, pdf_path: str) -> str:
        """
        从 PDF 提取文本
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            提取的文本内容
        """
        text_content = []
        
        try:
            if PYPDF_AVAILABLE:
                reader = PdfReader(pdf_path)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
            elif PDFPLUMBER_AVAILABLE:
                # 降级方案：尝试使用 pdfplumber
                with pdfplumber.open(pdf_path) as pdf:
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            text_content.append(text)
            else:
                logger.error("没有可用的 PDF 库，无法提取文本")
                return ""
        except Exception as e:
            logger.error(f"PDF 文本提取失败: {e}")
        
        return "\n".join(text_content)
    
    def _analyze_content(self, text: str, max_cards: int) -> List[Dict[str, Any]]:
        """
        分析内容并生成四色卡片
        
        Args:
            text: 文本内容
            max_cards: 最大卡片数量
            
        Returns:
            卡片列表
        """
        cards = []
        
        # 按段落分割文本
        paragraphs = self._split_into_paragraphs(text)
        
        # 分析每个段落
        for i, paragraph in enumerate(paragraphs):
            if len(cards) >= max_cards:
                break
            
            if len(paragraph) < 20:  # 跳过太短的段落
                continue
            
            # 判断段落类型
            card_type = self._classify_paragraph(paragraph)
            
            # 生成标题
            title = self._generate_title(paragraph, card_type)
            
            # 创建卡片
            card = {
                "id": f"card-{i+1}",
                "type": card_type,
                "title": title,
                "content": paragraph[:500] + "..." if len(paragraph) > 500 else paragraph,
                "tags": self._extract_tags(paragraph),
                "source": "PDF分析",
                "confidence": 0.8
            }
            
            cards.append(card)
        
        return cards
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        将文本分割成段落
        
        Args:
            text: 文本内容
            
        Returns:
            段落列表
        """
        # 按换行符分割
        paragraphs = re.split(r'\n\s*\n', text)
        
        # 清理每个段落
        cleaned_paragraphs = []
        for p in paragraphs:
            p = p.strip()
            if len(p) > 30:  # 只保留有意义的段落
                cleaned_paragraphs.append(p)
        
        return cleaned_paragraphs
    
    def _classify_paragraph(self, paragraph: str) -> str:
        """
        分类段落类型
        
        Args:
            paragraph: 段落文本
            
        Returns:
            卡片类型
        """
        scores = {card_type: 0 for card_type in self.CARD_TYPES.keys()}
        
        for card_type, config in self.CARD_TYPES.items():
            for keyword in config["keywords"]:
                if keyword in paragraph:
                    scores[card_type] += 1
        
        # 返回得分最高的类型
        max_type = max(scores, key=scores.get)
        
        # 如果没有明显特征，默认为 fact
        if scores[max_type] == 0:
            # 检查是否包含数字
            if re.search(r'\d+', paragraph):
                return "fact"
            return "explanation"
        
        return max_type
    
    def _generate_title(self, paragraph: str, card_type: str) -> str:
        """
        生成卡片标题
        
        Args:
            paragraph: 段落文本
            card_type: 卡片类型
            
        Returns:
            标题
        """
        # 取前30个字符作为标题
        title = paragraph[:30].strip()
        
        # 如果标题以标点符号结尾，去掉它
        title = re.sub(r'[，。！？；：""''（）【】]$', '', title)
        
        # 添加类型前缀
        type_name = self.CARD_TYPES[card_type]["name"]
        
        if len(title) < 10:
            return f"{type_name}: {title}"
        
        return title
    
    def _extract_tags(self, paragraph: str) -> List[str]:
        """
        提取标签
        
        Args:
            paragraph: 段落文本
            
        Returns:
            标签列表
        """
        tags = []
        
        # 简单的关键词提取
        common_tags = ["重要", "关键", "核心", "主要", "基础", "高级", "初级"]
        for tag in common_tags:
            if tag in paragraph:
                tags.append(tag)
        
        return tags[:3]  # 最多3个标签
    
    def export_to_excel(self, cards: List[Dict[str, Any]], output_path: str) -> Dict[str, Any]:
        """
        将卡片导出为 Excel
        
        Args:
            cards: 卡片列表
            output_path: 输出文件路径
            
        Returns:
            导出结果
        """
        result = {
            "success": False,
            "output_path": output_path,
            "error": None
        }
        
        if not EXCEL_AVAILABLE:
            result["error"] = "openpyxl 未安装，请运行: pip install openpyxl"
            return result
        
        try:
            # 创建工作簿
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "四色卡片"
            
            # 定义颜色
            colors = {
                "fact": "DDEBF7",      # 蓝色
                "explanation": "E2EFDA", # 绿色
                "risk": "FFF2CC",      # 黄色
                "action": "FCE4D6"     # 红色
            }
            
            # 设置表头
            headers = ["ID", "类型", "标题", "内容", "标签", "来源"]
            ws.append(headers)
            
            # 设置表头样式
            header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF")
            
            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center")
            
            # 添加数据
            for card in cards:
                row = [
                    card.get("id", ""),
                    self.CARD_TYPES.get(card.get("type", ""), {}).get("name", card.get("type", "")),
                    card.get("title", ""),
                    card.get("content", ""),
                    ", ".join(card.get("tags", [])),
                    card.get("source", "")
                ]
                ws.append(row)
                
                # 设置行颜色
                row_num = ws.max_row
                card_type = card.get("type", "")
                fill_color = colors.get(card_type, "FFFFFF")
                
                for cell in ws[row_num]:
                    cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
                    cell.alignment = Alignment(vertical="top", wrap_text=True)
            
            # 调整列宽
            ws.column_dimensions['A'].width = 10
            ws.column_dimensions['B'].width = 12
            ws.column_dimensions['C'].width = 30
            ws.column_dimensions['D'].width = 50
            ws.column_dimensions['E'].width = 20
            ws.column_dimensions['F'].width = 15
            
            # 保存文件
            wb.save(output_path)
            
            result["success"] = True
            logger.info(f"Excel 导出成功: {output_path}")
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Excel 导出失败: {e}", exc_info=True)
        
        return result


# 便捷函数
def generate_four_color_cards(pdf_path: str, max_cards: int = 50) -> Dict[str, Any]:
    """
    便捷函数：从 PDF 生成四色卡片
    
    Args:
        pdf_path: PDF 文件路径
        max_cards: 最大卡片数量
        
    Returns:
        包含卡片列表和统计信息的字典
    """
    processor = PDFourColorProcessor()
    return processor.generate_four_color_cards(pdf_path, max_cards)


def export_cards_to_excel(cards: List[Dict[str, Any]], output_path: str) -> Dict[str, Any]:
    """
    便捷函数：将卡片导出为 Excel
    
    Args:
        cards: 卡片列表
        output_path: 输出文件路径
        
    Returns:
        导出结果
    """
    processor = PDFourColorProcessor()
    return processor.export_to_excel(cards, output_path)


# 测试代码
if __name__ == "__main__":
    # 测试处理器
    processor = PDFourColorProcessor()
    
    # 测试文本分析
    test_text = """
    2024年公司营收达到1000万元，同比增长30%。
    
    这一增长主要得益于新产品的推出和市场扩张策略的实施。
    
    需要注意的是，市场竞争加剧可能带来一定的风险。
    
    建议加大研发投入，提升产品竞争力。
    """
    
    cards = processor._analyze_content(test_text, 10)
    
    print(f"生成 {len(cards)} 张卡片:")
    for card in cards:
        print(f"\n[{card['type']}] {card['title']}")
        print(f"  {card['content'][:100]}...")
