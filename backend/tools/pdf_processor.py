"""
简化版 PDF 处理器 - 仅使用 pypdf
解决 Windows ARM64 上 pdfplumber 的依赖问题
"""

from typing import List, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# 尝试导入 pypdf
try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("pypdf 未安装，PDF 功能不可用")
    
    # 创建占位符类
    class PdfReader:
        def __init__(self, *args, **kwargs):
            raise ImportError("pypdf 未安装，请运行: pip install pypdf")


class SimplePDFProcessor:
    """简化版 PDF 处理器（仅使用 pypdf）"""
    
    def __init__(self):
        """初始化处理器"""
        self.logger = logging.getLogger(__name__)
    
    def extract_text(self, pdf_path: str, preserve_layout: bool = False) -> Dict[str, Any]:
        """
        从 PDF 提取文本
        
        Args:
            pdf_path: PDF 文件路径
            preserve_layout: 是否保留布局（pypdf 不完全支持，参数保留兼容性）
            
        Returns:
            提取结果字典
        """
        try:
            reader = PdfReader(pdf_path)
            
            pages = []
            full_text_parts = []
            
            for page_num, page in enumerate(reader.pages, 1):
                # 提取文本
                text = page.extract_text()
                
                pages.append({
                    "page_number": page_num,
                    "text": text,
                    "char_count": len(text)
                })
                
                full_text_parts.append(f"--- Page {page_num} ---\n{text}\n")
            
            # 提取元数据
            metadata = {}
            if reader.metadata:
                metadata = {
                    "title": reader.metadata.get("/Title", ""),
                    "author": reader.metadata.get("/Author", ""),
                    "subject": reader.metadata.get("/Subject", ""),
                    "creator": reader.metadata.get("/Creator", ""),
                    "producer": reader.metadata.get("/Producer", ""),
                    "creation_date": str(reader.metadata.get("/CreationDate", "")),
                }
            
            return {
                "success": True,
                "pages": pages,
                "full_text": "\n".join(full_text_parts),
                "metadata": metadata,
                "page_count": len(reader.pages)
            }
            
        except Exception as e:
            self.logger.error(f"PDF 文本提取失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "pages": [],
                "full_text": "",
                "metadata": {}
            }
    
    def extract_tables(self, pdf_path: str) -> Dict[str, Any]:
        """
        从 PDF 提取表格（简化版）
        
        注意：pypdf 不直接支持表格提取，这里返回空结果
        如需表格提取，建议使用 PyMuPDF 或 camelot
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            提取结果字典
        """
        self.logger.warning("pypdf 不支持表格提取，返回空结果")
        return {
            "success": True,
            "tables": [],
            "message": "pypdf 不支持表格提取，如需此功能请安装 PyMuPDF"
        }
    
    def generate_knowledge_cards(self, pdf_path: str, card_type: str = "blue") -> Dict[str, Any]:
        """
        从 PDF 生成知识卡片
        
        Args:
            pdf_path: PDF 文件路径
            card_type: 卡片类型（blue/green/yellow/red）
            
        Returns:
            生成的卡片列表
        """
        try:
            # 提取文本
            result = self.extract_text(pdf_path)
            
            if not result["success"]:
                return {
                    "success": False,
                    "error": result["error"],
                    "cards": []
                }
            
            # 简单分段生成卡片
            cards = []
            full_text = result["full_text"]
            
            # 按段落分割
            paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip()]
            
            for idx, para in enumerate(paragraphs[:10], 1):  # 最多生成10张卡片
                if len(para) < 20:  # 跳过太短的段落
                    continue
                
                # 生成标题（取前50个字符）
                title = para[:50] + "..." if len(para) > 50 else para
                
                cards.append({
                    "card_id": f"pdf_card_{idx}",
                    "title": title,
                    "content": {
                        "description": para
                    },
                    "card_type": card_type,
                    "category": "PDF导入",
                    "source": Path(pdf_path).name
                })
            
            return {
                "success": True,
                "cards": cards,
                "message": f"成功生成 {len(cards)} 张知识卡片"
            }
            
        except Exception as e:
            self.logger.error(f"生成知识卡片失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "cards": []
            }

    def extract_knowledge(self, pdf_path: str) -> Dict[str, Any]:
        """
        从 PDF 提取知识内容（用于生成四色卡片）
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            提取的知识内容
        """
        try:
            # 提取文本
            text_result = self.extract_text(pdf_path)
            
            if not text_result["success"]:
                return {
                    "success": False,
                    "error": text_result.get("error", "文本提取失败"),
                    "text_content": "",
                    "tables": [],
                    "metadata": {},
                    "suggested_cards": []
                }
            
            # 提取表格（pypdf 不支持，返回空）
            tables_result = self.extract_tables(pdf_path)
            
            # 生成建议的卡片（基于文本内容）
            suggested_cards = []
            full_text = text_result["full_text"]
            
            # 简单分段并分类
            paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip() and len(p.strip()) > 30]
            
            for idx, para in enumerate(paragraphs[:20], 1):  # 最多20张卡片
                # 根据内容长度和特征简单分类
                card_type = "blue"  # 默认为事实卡片
                category = "事实"
                
                # 简单关键词分类
                para_lower = para.lower()
                if any(kw in para_lower for kw in ['原因', '因为', '解释', 'why', 'because', 'reason']):
                    card_type = "green"
                    category = "解释"
                elif any(kw in para_lower for kw in ['风险', '警告', '注意', '问题', 'risk', 'warning', 'issue']):
                    card_type = "yellow"
                    category = "风险"
                elif any(kw in para_lower for kw in ['建议', '行动', '措施', 'recommend', 'action', 'should', '需要']):
                    card_type = "red"
                    category = "行动"
                
                suggested_cards.append({
                    "card_id": f"pdf_card_{idx}",
                    "title": para[:50] + "..." if len(para) > 50 else para,
                    "content": para,
                    "card_type": card_type,
                    "category": category
                })
            
            return {
                "success": True,
                "text_content": full_text,
                "tables": tables_result.get("tables", []),
                "metadata": text_result.get("metadata", {}),
                "suggested_cards": suggested_cards,
                "message": f"成功提取知识，生成 {len(suggested_cards)} 张卡片建议"
            }
            
        except Exception as e:
            self.logger.error(f"知识提取失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "text_content": "",
                "tables": [],
                "metadata": {},
                "suggested_cards": []
            }


# 兼容性：提供与原 PDFProcessor 相同的接口
PDFProcessor = SimplePDFProcessor


# 测试代码
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_processor_simple.py <pdf_file>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    processor = SimplePDFProcessor()
    
    print("=== Testing PDF Text Extraction ===")
    result = processor.extract_text(pdf_file)
    
    if result["success"]:
        print(f"✓ Success")
        print(f"  Pages: {result['page_count']}")
        print(f"  Total text length: {len(result['full_text'])} chars")
        print(f"\nFirst 500 chars:")
        print(result['full_text'][:500])
    else:
        print(f"✗ Failed: {result['error']}")
    
    print("\n=== Testing Knowledge Card Generation ===")
    cards_result = processor.generate_knowledge_cards(pdf_file)
    
    if cards_result["success"]:
        print(f"✓ Generated {len(cards_result['cards'])} cards")
        if cards_result['cards']:
            print(f"\nFirst card:")
            print(f"  Title: {cards_result['cards'][0]['title']}")
            print(f"  Content: {cards_result['cards'][0]['content']['description'][:100]}...")
    else:
        print(f"✗ Failed: {cards_result['error']}")
