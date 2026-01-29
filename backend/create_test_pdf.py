"""
创建测试 PDF 文件
"""
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_test_pdf():
    """创建一个简单的测试 PDF"""
    c = canvas.Canvas("test_document.pdf", pagesize=letter)
    
    # 第一页
    c.drawString(100, 750, "Antinet 智能知识管家")
    c.drawString(100, 730, "PDF 功能测试文档")
    c.drawString(100, 700, "")
    c.drawString(100, 680, "这是一个测试 PDF 文档，用于验证 PDF 处理功能。")
    c.drawString(100, 660, "")
    c.drawString(100, 640, "核心功能：")
    c.drawString(120, 620, "1. PDF 文本提取")
    c.drawString(120, 600, "2. PDF 表格提取")
    c.drawString(120, 580, "3. PDF 知识分析")
    c.drawString(120, 560, "4. 四色卡片生成")
    
    c.showPage()
    
    # 第二页
    c.drawString(100, 750, "第二页内容")
    c.drawString(100, 730, "")
    c.drawString(100, 710, "Antinet 基于骁龙 AIPC 平台，提供端侧智能数据处理能力。")
    c.drawString(100, 690, "")
    c.drawString(100, 670, "主要特性：")
    c.drawString(120, 650, "- NPU 加速推理")
    c.drawString(120, 630, "- 数据不出域")
    c.drawString(120, 610, "- 8-Agent 智能协作")
    c.drawString(120, 590, "- 四色卡片知识管理")
    
    c.save()
    print("✓ 测试 PDF 已创建: test_document.pdf")

if __name__ == "__main__":
    create_test_pdf()
