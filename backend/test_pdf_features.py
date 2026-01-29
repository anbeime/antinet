"""
PDF 功能测试脚本
测试所有 PDF 处理功能是否正常工作
"""

import sys
import os

# 添加 backend 目录到路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def test_pdf_capabilities():
    """测试 PDF 功能可用性"""
    print("=" * 60)
    print("PDF 功能测试")
    print("=" * 60)
    print()
    
    # 测试基础库
    print("[1/7] 测试基础 PDF 库...")
    try:
        from pypdf import PdfReader, PdfWriter
        import pdfplumber
        from reportlab.pdfgen import canvas
        print("  ✓ pypdf, pdfplumber, reportlab 可用")
    except ImportError as e:
        print(f"  ✗ 基础库缺失: {e}")
        print("  安装命令: pip install pypdf pdfplumber reportlab")
        return False
    
    # 测试 PyMuPDF
    print("[2/7] 测试 PyMuPDF (高级编辑)...")
    try:
        import fitz
        print("  ✓ PyMuPDF 可用")
    except ImportError:
        print("  ⚠ PyMuPDF 未安装 (可选)")
        print("  安装命令: pip install PyMuPDF")
    
    # 测试 pikepdf
    print("[3/7] 测试 pikepdf (压缩)...")
    try:
        import pikepdf
        print("  ✓ pikepdf 可用")
    except ImportError:
        print("  ⚠ pikepdf 未安装 (可选)")
        print("  安装命令: pip install pikepdf")
    
    # 测试 pdf2image
    print("[4/7] 测试 pdf2image (PDF转图像)...")
    try:
        from pdf2image import convert_from_path
        print("  ✓ pdf2image 可用")
    except ImportError:
        print("  ⚠ pdf2image 未安装 (可选)")
        print("  安装命令: pip install pdf2image")
    
    # 测试 img2pdf
    print("[5/7] 测试 img2pdf (图像转PDF)...")
    try:
        import img2pdf
        print("  ✓ img2pdf 可用")
    except ImportError:
        print("  ⚠ img2pdf 未安装 (可选)")
        print("  安装命令: pip install img2pdf")
    
    # 测试增强处理器
    print("[6/7] 测试增强版 PDF 处理器...")
    try:
        from tools.pdf_processor_enhanced import EnhancedPDFProcessor
        processor = EnhancedPDFProcessor()
        capabilities = processor.get_capabilities()
        print("  ✓ 增强版处理器可用")
        print("  可用功能:")
        for feature, available in capabilities.items():
            status = "✓" if available else "✗"
            print(f"    {status} {feature}")
    except Exception as e:
        print(f"  ✗ 增强版处理器加载失败: {e}")
        return False
    
    # 测试原有处理器
    print("[7/7] 测试原有 PDF 处理器...")
    try:
        from tools.pdf_processor import PDFProcessor, PDF_AVAILABLE
        if PDF_AVAILABLE:
            print("  ✓ 原有处理器可用")
        else:
            print("  ✗ 原有处理器不可用")
    except Exception as e:
        print(f"  ⚠ 原有处理器测试失败: {e}")
    
    print()
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    return True


def test_pdf_routes():
    """测试 PDF 路由是否正确注册"""
    print()
    print("=" * 60)
    print("PDF 路由测试")
    print("=" * 60)
    print()
    
    try:
        from routes.pdf_routes import router
        print("✓ PDF 路由模块加载成功")
        print(f"  路由前缀: {router.prefix}")
        print(f"  路由标签: {router.tags}")
        
        # 列出所有端点
        print("  可用端点:")
        for route in router.routes:
            print(f"    {route.methods} {route.path}")
        
        return True
    except Exception as e:
        print(f"✗ PDF 路由加载失败: {e}")
        return False


if __name__ == "__main__":
    print("Antinet PDF 功能测试")
    print()
    
    # 测试功能可用性
    capabilities_ok = test_pdf_capabilities()
    
    # 测试路由
    routes_ok = test_pdf_routes()
    
    print()
    if capabilities_ok and routes_ok:
        print("✓ 所有测试通过！PDF 功能已就绪")
        sys.exit(0)
    else:
        print("✗ 部分测试失败，请检查上述错误信息")
        sys.exit(1)
