"""
PPT 处理器
提供 PowerPoint 文档生成和处理功能
"""
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.enum.text import PP_ALIGN
    from pptx.dml.color import RGBColor
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False
    logging.warning("python-pptx 未安装，PPT 功能不可用")

logger = logging.getLogger(__name__)


class PPTProcessor:
    """PPT 处理器类"""
    
    # 四色卡片颜色映射
    CARD_COLORS = {
        "fact": RGBColor(52, 152, 219),      # 蓝色 - 事实
        "interpret": RGBColor(46, 204, 113),  # 绿色 - 解释
        "risk": RGBColor(241, 196, 15),       # 黄色 - 风险
        "action": RGBColor(231, 76, 60)       # 红色 - 行动
    }
    
    CARD_NAMES = {
        "fact": "事实卡片",
        "interpret": "解释卡片",
        "risk": "风险卡片",
        "action": "行动卡片"
    }
    
    def __init__(self):
        """初始化 PPT 处理器"""
        if not PPTX_AVAILABLE:
            raise ImportError("python-pptx 未安装，请运行: pip install python-pptx")
    
    def create_presentation(self, title: str = "Antinet 智能分析报告") -> Presentation:
        """
        创建新的演示文稿
        
        Args:
            title: 演示文稿标题
            
        Returns:
            Presentation 对象
        """
        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)
        
        # 添加标题页
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        
        title_shape = slide.shapes.title
        subtitle_shape = slide.placeholders[1]
        
        title_shape.text = title
        subtitle_shape.text = f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        return prs
    
    def add_card_slide(self, prs: Presentation, card: Dict[str, Any]) -> None:
        """
        添加卡片幻灯片
        
        Args:
            prs: Presentation 对象
            card: 卡片数据字典
        """
        # 使用空白布局
        blank_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_layout)
        
        card_type = card.get("type", "fact")
        card_color = self.CARD_COLORS.get(card_type, RGBColor(128, 128, 128))
        card_name = self.CARD_NAMES.get(card_type, "卡片")
        
        # 添加卡片类型标题（左上角色块）
        type_box = slide.shapes.add_shape(
            1,  # 矩形
            Inches(0.5), Inches(0.5),
            Inches(2), Inches(0.6)
        )
        type_box.fill.solid()
        type_box.fill.fore_color.rgb = card_color
        type_box.line.color.rgb = card_color
        
        type_text = type_box.text_frame
        type_text.text = card_name
        type_text.paragraphs[0].font.size = Pt(20)
        type_text.paragraphs[0].font.bold = True
        type_text.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)
        type_text.paragraphs[0].alignment = PP_ALIGN.CENTER
        
        # 添加卡片标题
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(1.3),
            Inches(9), Inches(0.8)
        )
        title_frame = title_box.text_frame
        title_frame.text = card.get("title", "无标题")
        title_frame.paragraphs[0].font.size = Pt(28)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].font.color.rgb = RGBColor(44, 62, 80)
        
        # 添加卡片内容
        content_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2.3),
            Inches(9), Inches(4.2)
        )
        content_frame = content_box.text_frame
        content_frame.word_wrap = True
        
        content = card.get("content", "")
        if isinstance(content, list):
            content = "\n".join(f"• {item}" for item in content)
        
        content_frame.text = content
        content_frame.paragraphs[0].font.size = Pt(16)
        content_frame.paragraphs[0].font.color.rgb = RGBColor(52, 73, 94)
        content_frame.paragraphs[0].line_spacing = 1.5
        
        # 添加底部元数据
        if card.get("tags") or card.get("created_at"):
            meta_text = []
            if card.get("tags"):
                tags = card["tags"] if isinstance(card["tags"], list) else [card["tags"]]
                meta_text.append(f"标签: {', '.join(tags)}")
            if card.get("created_at"):
                meta_text.append(f"创建时间: {card['created_at']}")
            
            meta_box = slide.shapes.add_textbox(
                Inches(0.5), Inches(6.8),
                Inches(9), Inches(0.4)
            )
            meta_frame = meta_box.text_frame
            meta_frame.text = " | ".join(meta_text)
            meta_frame.paragraphs[0].font.size = Pt(10)
            meta_frame.paragraphs[0].font.color.rgb = RGBColor(149, 165, 166)
    
    def add_summary_slide(self, prs: Presentation, summary: Dict[str, Any]) -> None:
        """
        添加总结幻灯片
        
        Args:
            prs: Presentation 对象
            summary: 总结数据字典
        """
        title_content_layout = prs.slide_layouts[1]
        slide = prs.slides.add_slide(title_content_layout)
        
        title = slide.shapes.title
        title.text = summary.get("title", "分析总结")
        
        content_box = slide.placeholders[1]
        text_frame = content_box.text_frame
        text_frame.clear()
        
        # 添加总结内容
        for key, value in summary.items():
            if key == "title":
                continue
            
            p = text_frame.add_paragraph()
            p.text = f"{key}: {value}"
            p.level = 0
            p.font.size = Pt(18)
    
    def add_chart_slide(self, prs: Presentation, title: str, chart_data: Dict[str, Any]) -> None:
        """
        添加图表幻灯片
        
        Args:
            prs: Presentation 对象
            title: 幻灯片标题
            chart_data: 图表数据
        """
        # 使用标题+内容布局
        title_content_layout = prs.slide_layouts[5]
        slide = prs.slides.add_slide(title_content_layout)
        
        title_shape = slide.shapes.title
        title_shape.text = title
        
        # 添加图表说明文本
        content_box = slide.shapes.add_textbox(
            Inches(1), Inches(2),
            Inches(8), Inches(4)
        )
        text_frame = content_box.text_frame
        text_frame.text = "图表数据:\n" + str(chart_data)
        text_frame.paragraphs[0].font.size = Pt(14)
    
    def export_cards_to_ppt(
        self,
        cards: List[Dict[str, Any]],
        output_path: str,
        title: str = "Antinet 四色卡片分析报告",
        include_summary: bool = True
    ) -> str:
        """
        将四色卡片导出为 PPT
        
        Args:
            cards: 卡片列表
            output_path: 输出文件路径
            title: 演示文稿标题
            include_summary: 是否包含总结页
            
        Returns:
            输出文件路径
        """
        try:
            # 创建演示文稿
            prs = self.create_presentation(title)
            
            # 按类型分组卡片
            cards_by_type = {
                "fact": [],
                "interpret": [],
                "risk": [],
                "action": []
            }
            
            for card in cards:
                card_type = card.get("type", "fact")
                if card_type in cards_by_type:
                    cards_by_type[card_type].append(card)
            
            # 添加卡片幻灯片（按类型顺序）
            for card_type in ["fact", "interpret", "risk", "action"]:
                type_cards = cards_by_type[card_type]
                if type_cards:
                    for card in type_cards:
                        self.add_card_slide(prs, card)
            
            # 添加总结页
            if include_summary:
                summary = {
                    "title": "分析总结",
                    "总卡片数": len(cards),
                    "事实卡片": len(cards_by_type["fact"]),
                    "解释卡片": len(cards_by_type["interpret"]),
                    "风险卡片": len(cards_by_type["risk"]),
                    "行动卡片": len(cards_by_type["action"])
                }
                self.add_summary_slide(prs, summary)
            
            # 保存文件
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            prs.save(str(output_path))
            
            logger.info(f"PPT 导出成功: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"PPT 导出失败: {e}", exc_info=True)
            raise
    
    def create_analysis_report(
        self,
        analysis_data: Dict[str, Any],
        output_path: str
    ) -> str:
        """
        创建完整的分析报告 PPT
        
        Args:
            analysis_data: 分析数据，包含 cards, charts, summary 等
            output_path: 输出文件路径
            
        Returns:
            输出文件路径
        """
        try:
            title = analysis_data.get("title", "Antinet 智能分析报告")
            prs = self.create_presentation(title)
            
            # 添加卡片
            cards = analysis_data.get("cards", [])
            for card in cards:
                self.add_card_slide(prs, card)
            
            # 添加图表
            charts = analysis_data.get("charts", [])
            for chart in charts:
                self.add_chart_slide(
                    prs,
                    chart.get("title", "数据图表"),
                    chart.get("data", {})
                )
            
            # 添加总结
            summary = analysis_data.get("summary")
            if summary:
                self.add_summary_slide(prs, summary)
            
            # 保存
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            prs.save(str(output_path))
            
            logger.info(f"分析报告 PPT 创建成功: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"创建分析报告失败: {e}", exc_info=True)
            raise


# 便捷函数
def export_cards_to_ppt(
    cards: List[Dict[str, Any]],
    output_path: str,
    title: str = "Antinet 四色卡片分析报告"
) -> str:
    """
    便捷函数：将卡片导出为 PPT
    
    Args:
        cards: 卡片列表
        output_path: 输出路径
        title: 标题
        
    Returns:
        输出文件路径
    """
    processor = PPTProcessor()
    return processor.export_cards_to_ppt(cards, output_path, title)


def create_analysis_ppt(
    analysis_data: Dict[str, Any],
    output_path: str
) -> str:
    """
    便捷函数：创建分析报告 PPT
    
    Args:
        analysis_data: 分析数据
        output_path: 输出路径
        
    Returns:
        输出文件路径
    """
    processor = PPTProcessor()
    return processor.create_analysis_report(analysis_data, output_path)
