#!/usr/bin/env python3
"""
检查导入状态
"""
import sys
import os

# 添加 backend 目录到 Python 路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print("检查导入状态...")
print(f"Python 路径: {sys.path}")
print()

# 检查 pdf_processor
print("1. 检查 pdf_processor...")
try:
    from tools.pdf_processor import PDFProcessor, PDF_AVAILABLE
    print(f"   ✓ pdf_processor 导入成功")
    print(f"   PDF_AVAILABLE: {PDF_AVAILABLE}")
except Exception as e:
    print(f"   ✗ pdf_processor 导入失败: {e}")

print()

# 检查 pdf_four_color_processor
print("2. 检查 pdf_four_color_processor...")
try:
    from tools.pdf_four_color_processor import PDFourColorProcessor
    print(f"   ✓ pdf_four_color_processor 导入成功")
    
    # 测试实例化
    processor = PDFourColorProcessor()
    print(f"   ✓ PDFourColorProcessor 实例化成功")
    
    # 测试生成卡片
    test_text = "2024年公司营收达到1000万元，同比增长30%。"
    cards = processor._analyze_content(test_text, 5)
    print(f"   ✓ 测试分析成功，生成 {len(cards)} 张卡片")
    
except Exception as e:
    print(f"   ✗ pdf_four_color_processor 导入失败: {e}")
    import traceback
    traceback.print_exc()

print()

# 检查 openpyxl
print("3. 检查 openpyxl...")
try:
    import openpyxl
    print(f"   ✓ openpyxl 已安装")
except Exception as e:
    print(f"   ✗ openpyxl 未安装: {e}")

print()
print("检查完成！")
