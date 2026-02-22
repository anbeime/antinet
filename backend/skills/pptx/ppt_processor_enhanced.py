"""
PPT 处理器（增强版）
提供专业的 PowerPoint 文档生成，包含精美模板
"""
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from enum import Enum

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.dml.color import RGBColor
    from pptx.enum.dml import MSO_THEME_COLOR
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False
    logging.warning("python-pptx 未安装，PPT 功能不可用")
    # 提供占位符类
    class RGBColor:
        def __init__(self, *args, **kwargs):
            pass
    class Presentation:
        pass
    class Inches:
        def __init__(self, *args, **kwargs):
            pass
        def __float__(self):
            return 0.0
    class Pt:
        def __init__(self, *args, **kwargs):
            pass
    class PP_ALIGN:
        CENTER = LEFT = RIGHT = None
    class MSO_ANCHOR:
        MIDDLE = None
    class MSO_SHAPE:
        RECTANGLE = None
    class MSO_THEME_COLOR:
        pass

logger = logging.getLogger(__name__)


class CardType(Enum):
    """卡片类型"""
    FACT = "fact"           # 事实 - 蓝色
    INTERPRET = "interpret" # 解读 - 绿色
    RISK = "risk"          # 风险 - 红色
    ACTION = "action"      # 行动 - 橙色


# 配色方案
COLORS = {
    CardType.FACT: {
        "primary": RGBColor(59, 130, 246),
        "light": RGBColor(219, 234, 254),
        "dark": RGBColor(30, 58, 138),
        "gradient_start": RGBColor(59, 130, 246),
        "gradient_end": RGBColor(37, 99, 235),
    },
    CardType.INTERPRET: {
        "primary": RGBColor(34, 197, 94),
        "light": RGBColor(220, 252, 231),
        "dark": RGBColor(20, 83, 45),
        "gradient_start": RGBColor(34, 197, 94),
        "gradient_end": RGBColor(22, 163, 74),
    },
    CardType.RISK: {
        "primary": RGBColor(239, 68, 68),
        "light": RGBColor(254, 226, 226),
        "dark": RGBColor(127, 29, 29),
        "gradient_start": RGBColor(239, 68, 68),
        "gradient_end": RGBColor(220, 38, 38),
    },
    CardType.ACTION: {
        "primary": RGBColor(249, 115, 22),
        "light": RGBColor(254, 215, 170),
        "dark": RGBColor(154, 52, 18),
        "gradient_start": RGBColor(249, 115, 22),
        "gradient_end": RGBColor(234, 88, 12),
    },
}

# 通用颜色
COMMON_COLORS = {
    "white": RGBColor(255, 255, 255),
    "black": RGBColor(0, 0, 0),
    "gray": RGBColor(107, 114, 128),
    "light_gray": RGBColor(243, 244, 246),
    "dark_gray": RGBColor(55, 65, 81),
    "bg_gradient_start": RGBColor(15, 23, 42),
    "bg_gradient_end": RGBColor(30, 41, 59),
}


class EnhancedPPTProcessor:
    """增强版PPT处理器"""
    
    def __init__(self):
        if not PPTX_AVAILABLE:
            raise ImportError("python-pptx 未安装，无法使用PPT功能")
    
    def create_presentation(self, title: str = "演示文稿") -> Presentation:
        """创建一个新的演示文稿"""
        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)
        return prs
    
    def add_title_slide(self, prs: Presentation, title: str, subtitle: str = ""):
        """添加精美的标题页"""
        slide_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(slide_layout)
        
        # 添加渐变背景
        background = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0),
            prs.slide_width, prs.slide_height
        )
        background.fill.solid()
        background.fill.fore_color.rgb = COMMON_COLORS["bg_gradient_start"]
        background.line.fill.background()
        
        # 添加装饰圆形
        circle1 = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(-2), Inches(-2), Inches(6), Inches(6)
        )
        circle1.fill.solid()
        circle1.fill.fore_color.rgb = RGBColor(59, 130, 246)
        circle1.line.fill.background()
        
        circle2 = slide.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(10), Inches(4), Inches(5), Inches(5)
        )
        circle2.fill.solid()
        circle2.fill.fore_color.rgb = RGBColor(139, 92, 246)
        circle2.line.fill.background()
        
        # 主标题
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(2.5), Inches(12.333), Inches(1.5)
        )
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(54)
        p.font.bold = True
        p.font.color.rgb = COMMON_COLORS["white"]
        p.alignment = PP_ALIGN.CENTER
        
        # 副标题
        if subtitle:
            sub_box = slide.shapes.add_textbox(
                Inches(0.5), Inches(4.2), Inches(12.333), Inches(1)
            )
            tf = sub_box.text_frame
            p = tf.paragraphs[0]
            p.text = subtitle
            p.font.size = Pt(24)
            p.font.color.rgb = RGBColor(156, 163, 175)
            p.alignment = PP_ALIGN.CENTER
        
        # 底部信息
        info_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(6.5), Inches(12.333), Inches(0.5)
        )
        tf = info_box.text_frame
        p = tf.paragraphs[0]
        p.text = f"生成时间: {datetime.now().strftime('%Y年%m月%d日')}"
        p.font.size = Pt(12)
        p.font.color.rgb = RGBColor(107, 114, 128)
        p.alignment = PP_ALIGN.CENTER
    
    def add_card_slide(self, prs: Presentation, card_type: CardType, 
                       title: str, content: str, tags: List[str] = None):
        """添加精美的卡片幻灯片"""
        slide_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(slide_layout)
        
        colors = COLORS[card_type]
        
        # 白色背景
        background = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0),
            prs.slide_width, prs.slide_height
        )
        background.fill.solid()
        background.fill.fore_color.rgb = COMMON_COLORS["white"]
        background.line.fill.background()
        
        # 左侧色条
        left_bar = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0),
            Inches(0.15), prs.slide_height
        )
        left_bar.fill.solid()
        left_bar.fill.fore_color.rgb = colors["primary"]
        left_bar.line.fill.background()
        
        # 顶部装饰线
        top_line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(0.8),
            Inches(2), Inches(0.06)
        )
        top_line.fill.solid()
        top_line.fill.fore_color.rgb = colors["primary"]
        top_line.line.fill.background()
        
        # 卡片类型标签
        type_label = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.3), Inches(3), Inches(0.4)
        )
        tf = type_label.text_frame
        p = tf.paragraphs[0]
        type_names = {
            CardType.FACT: "事实",
            CardType.INTERPRET: "解读",
            CardType.RISK: "风险",
            CardType.ACTION: "行动"
        }
        p.text = type_names.get(card_type, "卡片")
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = colors["primary"]
        
        # 标题
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(1.2), Inches(12.333), Inches(0.8)
        )
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = COMMON_COLORS["dark_gray"]
        
        # 内容区域（带背景）
        content_bg = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(2.2),
            Inches(12.333), Inches(4.5)
        )
        content_bg.fill.solid()
        content_bg.fill.fore_color.rgb = colors["light"]
        content_bg.line.fill.background()
        
        # 内容文本
        content_box = slide.shapes.add_textbox(
            Inches(0.8), Inches(2.5), Inches(11.8), Inches(4)
        )
        tf = content_box.text_frame
        tf.word_wrap = True
        
        content_lines = content.split('\n') if isinstance(content, str) else [str(content)]
        for i, line in enumerate(content_lines):
            if i == 0:
                p = tf.paragraphs[0]
            else:
                p = tf.add_paragraph()
            p.text = line
            p.font.size = Pt(18)
            p.font.color.rgb = COMMON_COLORS["dark_gray"]
            p.space_after = Pt(12)
        
        # 标签
        if tags:
            tag_y = 6.8
            tag_x = 0.5
            for tag in tags[:5]:
                tag_width = min(len(tag) * 0.12 + 0.3, 2)
                
                tag_bg = slide.shapes.add_shape(
                    MSO_SHAPE.ROUNDED_RECTANGLE, Inches(tag_x), Inches(tag_y),
                    Inches(tag_width), Inches(0.4)
                )
                tag_bg.fill.solid()
                tag_bg.fill.fore_color.rgb = colors["primary"]
                tag_bg.line.fill.background()
                
                tag_text = slide.shapes.add_textbox(
                    Inches(tag_x), Inches(tag_y + 0.05), Inches(tag_width), Inches(0.3)
                )
                tf = tag_text.text_frame
                p = tf.paragraphs[0]
                p.text = f"#{tag}"
                p.font.size = Pt(11)
                p.font.color.rgb = COMMON_COLORS["white"]
                p.alignment = PP_ALIGN.CENTER
                
                tag_x += tag_width + 0.15
    
    def add_summary_slide(self, prs: Presentation, stats: Dict[str, int]):
        """添加总结页"""
        slide_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(slide_layout)
        
        # 深色背景
        background = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0),
            prs.slide_width, prs.slide_height
        )
        background.fill.solid()
        background.fill.fore_color.rgb = COMMON_COLORS["bg_gradient_start"]
        background.line.fill.background()
        
        # 标题
        title_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(0.5), Inches(12.333), Inches(0.8)
        )
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = "分析报告总结"
        p.font.size = Pt(40)
        p.font.bold = True
        p.font.color.rgb = COMMON_COLORS["white"]
        
        # 统计数据卡片
        card_data = [
            ("事实卡片", stats.get('fact', 0), COLORS[CardType.FACT]["primary"]),
            ("解读卡片", stats.get('interpret', 0), COLORS[CardType.INTERPRET]["primary"]),
            ("风险卡片", stats.get('risk', 0), COLORS[CardType.RISK]["primary"]),
            ("行动卡片", stats.get('action', 0), COLORS[CardType.ACTION]["primary"]),
        ]
        
        start_x = 0.8
        card_width = 2.8
        card_height = 3
        gap = 0.4
        
        for i, (name, count, color) in enumerate(card_data):
            x = start_x + i * (card_width + gap)
            
            # 卡片背景
            card_bg = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(2),
                Inches(card_width), Inches(card_height)
            )
            card_bg.fill.solid()
            card_bg.fill.fore_color.rgb = RGBColor(30, 41, 59)
            card_bg.line.color.rgb = color
            card_bg.line.width = Pt(2)
            
            # 数量
            count_box = slide.shapes.add_textbox(
                Inches(x), Inches(3.3), Inches(card_width), Inches(1)
            )
            tf = count_box.text_frame
            p = tf.paragraphs[0]
            p.text = str(count)
            p.font.size = Pt(56)
            p.font.bold = True
            p.font.color.rgb = color
            p.alignment = PP_ALIGN.CENTER
            
            # 名称
            name_box = slide.shapes.add_textbox(
                Inches(x), Inches(4.5), Inches(card_width), Inches(0.6)
            )
            tf = name_box.text_frame
            p = tf.paragraphs[0]
            p.text = name
            p.font.size = Pt(18)
            p.font.color.rgb = COMMON_COLORS["white"]
            p.alignment = PP_ALIGN.CENTER
        
        # 底部信息
        total = sum(stats.values())
        info_box = slide.shapes.add_textbox(
            Inches(0.5), Inches(6.5), Inches(12.333), Inches(0.5)
        )
        tf = info_box.text_frame
        p = tf.paragraphs[0]
        p.text = f"共计 {total} 张分析卡片 | 生成于 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        p.font.size = Pt(14)
        p.font.color.rgb = RGBColor(107, 114, 128)
        p.alignment = PP_ALIGN.CENTER

    # ========== 兼容旧版接口 ==========
    
    def create_presentation_from_cards(self, cards: List[Dict], title: str, 
                                       output_path: str, include_summary: bool = True):
        """
        从卡片创建演示文稿（兼容旧版接口）
        
        Args:
            cards: 卡片数据列表
            title: 演示文稿标题
            output_path: 输出文件路径
            include_summary: 是否包含总结页
        """
        prs = self.create_cards_presentation(cards, title)
        prs.save(output_path)
    
    def create_presentation_from_slides(self, slides_data: List[Dict], title: str,
                                        output_path: str, theme: str = "default"):
        """
        从幻灯片数据创建演示文稿（兼容旧版接口）
        
        Args:
            slides_data: 幻灯片数据列表
            title: 演示文稿标题
            output_path: 输出文件路径
            theme: 主题名称（保留参数，实际使用统一模板）
        """
        prs = self.create_presentation()
        
        # 添加标题页
        self.add_title_slide(prs, title)
        
        # 添加内容页
        for slide_data in slides_data:
            slide_title = slide_data.get('title', '')
            slide_content = slide_data.get('content', [])
            
            # 处理内容：将字典列表转换为字符串
            content_lines = []
            if isinstance(slide_content, list):
                for item in slide_content:
                    if isinstance(item, dict):
                        # 处理 parse_markdown_content 返回的字典格式
                        item_type = item.get('type', 'text')
                        item_text = item.get('text', '')
                        if item_type == 'heading':
                            content_lines.append(f"【{item_text}】")
                        elif item_type == 'bullet':
                            content_lines.append(f"• {item_text}")
                        else:
                            content_lines.append(item_text)
                    elif isinstance(item, str):
                        content_lines.append(item)
            elif isinstance(slide_content, str):
                content_lines.append(slide_content)
            
            content_str = '\n'.join(content_lines)
            
            # 使用事实卡片样式作为默认
            self.add_card_slide(prs, CardType.FACT, slide_title, content_str)
        
        prs.save(output_path)
    
    def create_cards_presentation(self, cards: List[Dict], title: str = "分析报告") -> Presentation:
        """从卡片数据创建完整的演示文稿"""
        prs = self.create_presentation()
        
        # 统计
        stats = {"fact": 0, "interpret": 0, "risk": 0, "action": 0}
        
        # 添加标题页
        self.add_title_slide(prs, title, f"共 {len(cards)} 张分析卡片")
        
        # 添加卡片页
        for card in cards:
            card_type_str = card.get('type', 'fact').lower()
            card_type_map = {
                'fact': CardType.FACT,
                'interpret': CardType.INTERPRET,
                'interpretation': CardType.INTERPRET,
                'risk': CardType.RISK,
                'action': CardType.ACTION,
            }
            card_type = card_type_map.get(card_type_str, CardType.FACT)
            
            # 更新统计
            if card_type_str in stats:
                stats[card_type_str] += 1
            
            # 处理内容
            content = card.get('content', '')
            if isinstance(content, list):
                content = '\n'.join(content)
            
            self.add_card_slide(
                prs,
                card_type,
                card.get('title', '无标题'),
                content,
                card.get('tags', [])
            )
        
        # 添加总结页
        self.add_summary_slide(prs, stats)
        
        return prs


# 兼容旧版接口
class PPTProcessor(EnhancedPPTProcessor):
    """兼容旧版PPTProcessor"""
    pass
