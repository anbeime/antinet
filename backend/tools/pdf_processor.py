"""
简化版 PDF 处理器 - 仅使用 pypdf
解决 Windows ARM64 上 pdfplumber 的依赖问题
"""

from typing import List, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# 尝试导入 pypdf (延迟导入避免与pydantic冲突)
PDF_AVAILABLE = False
PdfReader = None

def _lazy_load_pypdf():
    global PDF_AVAILABLE, PdfReader
    try:
        from pypdf import PdfReader as _PdfReader
        PdfReader = _PdfReader
        PDF_AVAILABLE = True
    except ImportError:
        logger.warning("pypdf 未安装，PDF 功能不可用")


class SimplePDFProcessor:
    """简化版 PDF 处理器（仅使用 pypdf）"""
    
    def __init__(self):
        """初始化处理器"""
        self.logger = logging.getLogger(__name__)
        _lazy_load_pypdf()  # 延迟加载pypdf
    
    @property
    def available(self) -> bool:
        """检查 PDF 功能是否可用"""
        return PDF_AVAILABLE
    
    def extract_text(self, pdf_path: str, preserve_layout: bool = False) -> Dict[str, Any]:
        """
        从 PDF 提取文本
        
        Args:
            pdf_path: PDF 文件路径
            preserve_layout: 是否保留布局
            
        Returns:
            提取结果字典
        """
        try:
            reader = PdfReader(pdf_path)
            page_count = len(reader.pages)
            
            pages = []
            full_text_parts = []
            total_chars = 0
            
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                char_count = len(text)
                total_chars += char_count
                
                pages.append({
                    "page_number": page_num,
                    "text": text,
                    "char_count": char_count
                })
                
                full_text_parts.append(f"--- Page {page_num} ---\n{text}\n")
            
            full_text = "\n".join(full_text_parts)
            
            # 检测扫描/图片型 PDF：多页但几乎无文字 → 尝试 pdfplumber 回退
            if page_count >= 1 and total_chars < max(100, page_count * 20):
                try:
                    import pdfplumber
                    logger.info(f"pypdf提取文字过少 ({total_chars}字符/{page_count}页)，尝试 pdfplumber 回退")
                    pages = []
                    full_text_parts = []
                    total_chars = 0
                    with pdfplumber.open(pdf_path) as plumb_pdf:
                        for page_num, page in enumerate(plumb_pdf.pages, 1):
                            text = page.extract_text() or ""
                            char_count = len(text)
                            total_chars += char_count
                            pages.append({
                                "page_number": page_num,
                                "text": text,
                                "char_count": char_count
                            })
                            full_text_parts.append(f"--- Page {page_num} ---\n{text}\n")
                    full_text = "\n".join(full_text_parts)
                    logger.info(f"pdfplumber 回退提取结果: {total_chars} 字符")
                except ImportError:
                    logger.warning("pdfplumber 未安装，无法回退提取文字")
                except Exception as plumb_err:
                    logger.warning(f"pdfplumber 回退提取失败: {plumb_err}")
            
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
                "full_text": full_text,
                "metadata": metadata,
                "page_count": page_count,
                "total_chars": total_chars,
                "is_scanned": (page_count >= 1 and total_chars < max(100, page_count * 20))
            }
            
        except Exception as e:
            self.logger.error(f"PDF 文本提取失败: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "pages": [],
                "full_text": "",
                "metadata": {},
                "is_scanned": False
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
        if not PDF_AVAILABLE:
            return {
                "success": False,
                "error": "PDF 功能不可用，请安装 pypdf",
                "cards": []
            }
        
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
            
            if not full_text or len(full_text.strip()) == 0:
                return {
                    "success": False,
                    "error": "PDF 中未找到可提取的文本内容",
                    "cards": []
                }
            
            # 按段落分割（中英文兼容）
            # 中文：按 。！？ 分割；英文：按 \n\n 或双换行分割
            import re
            # 先尝试按中文句号分割，再按英文双换行
            segments = re.split(r'(?<=[。！？])\s*(?=[A-Za-z\u4e00-\u9fff])|(?<=\n)\n', full_text)
            # 合并太短的段落
            merged = []
            for seg in segments:
                seg = seg.strip()
                if not seg:
                    continue
                if merged and len(merged[-1]) < 50:
                    merged[-1] += ' ' + seg
                else:
                    merged.append(seg)
            paragraphs = [p.strip() for p in merged if len(p.strip()) >= 20]
            
            for idx, para in enumerate(paragraphs[:10], 1):  # 最多生成10张卡片
                # 生成标题（取前30个字符，去除换行）
                clean_para = ' '.join(para.split())  # 合并多空白字符
                title_text = clean_para[:30].strip()
                if len(clean_para) > 30:
                    title_text += '...'
                
                cards.append({
                    "card_id": f"pdf_card_{idx}",
                    "title": title_text,
                    "content": clean_para,  # 直接返回字符串，不再嵌套对象
                    "card_type": card_type,
                    "category": "PDF导入",
                    "source": Path(pdf_path).name
                })
            
            return {
                "success": True,
                "cards": cards,
                "count": len(cards)
            }
        except Exception as e:
            logger.error(f"生成知识卡片失败: {e}")
            return {
                "success": False,
                "error": f"处理失败: {str(e)}",
                "cards": []
            }

    def extract_knowledge(self, pdf_path: str):
        from typing import Dict, Any
        """
        从 PDF 提取知识内容（用于生成四色卡片）
        
        Args:
            pdf_path: PDF 文件路径
            
        Returns:
            提取的知识内容
        """
        result: Dict[str, Any] = {}
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
