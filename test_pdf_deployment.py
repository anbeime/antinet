"""
PDF 功能快速测试脚本
用于验证 PDF 技能是否正确部署
"""

import sys
import os

# 设置 UTF-8 编码输出
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# 添加 backend 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """测试 PDF 库导入"""
    print("=" * 60)
    print("测试 1: PDF 库导入")
    print("=" * 60)
    
    try:
        import pypdf
        print("✓ pypdf 导入成功")
    except ImportError as e:
        print(f"✗ pypdf 导入失败: {e}")
        return False
    
    try:
        import pdfplumber
        print("✓ pdfplumber 导入成功")
    except ImportError as e:
        print(f"✗ pdfplumber 导入失败: {e}")
        return False
    
    try:
        import reportlab
        print("✓ reportlab 导入成功")
    except ImportError as e:
        print(f"✗ reportlab 导入失败: {e}")
        return False
    
    print("\n所有 PDF 库导入成功\n")
    return True


def test_processor():
    """测试 PDF 处理器"""
    print("=" * 60)
    print("测试 2: PDF 处理器初始化")
    print("=" * 60)
    
    try:
        from tools.pdf_processor import PDFProcessor, PDF_AVAILABLE
        
        if not PDF_AVAILABLE:
            print("✗ PDF 功能不可用")
            return False
        
        print("✓ PDF 功能可用")
        
        processor = PDFProcessor()
        print(f"✓ PDF 处理器初始化成功")
        print(f"  中文字体: {processor.chinese_font}")
        
        print("\nPDF 处理器测试通过\n")
        return True
        
    except Exception as e:
        print(f"✗ PDF 处理器测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_card_export():
    """测试四色卡片导出"""
    print("=" * 60)
    print("测试 3: 四色卡片导出")
    print("=" * 60)
    
    try:
        from tools.pdf_processor import PDFProcessor
        
        processor = PDFProcessor()
        
        # 测试卡片数据
        test_cards = [
            {
                "type": "fact",
                "content": "这是一张测试事实卡片，包含客观数据和信息。"
            },
            {
                "type": "interpret",
                "content": "这是一张测试解释卡片，提供原因分析和解释。"
            },
            {
                "type": "risk",
                "content": "这是一张测试风险卡片，标识潜在风险和问题。"
            },
            {
                "type": "action",
                "content": "这是一张测试行动卡片，提供具体的行动建议。"
            }
        ]
        
        # 导出 PDF
        output_path = "test_report.pdf"
        result = processor.export_cards_to_pdf(
            cards=test_cards,
            output_path=output_path,
            title="PDF 功能测试报告",
            author="Antinet 测试系统"
        )
        
        if result["success"]:
            print(f"✓ PDF 导出成功")
            print(f"  输出路径: {output_path}")
            print(f"  卡片数量: {result['cards_count']}")
            
            # 检查文件是否存在
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                print(f"  文件大小: {file_size} 字节")
                print(f"\n四色卡片导出测试通过")
                print(f"📄 请打开 {output_path} 查看生成的 PDF 报告\n")
                return True
            else:
                print(f"✗ 文件未生成: {output_path}")
                return False
        else:
            print(f"✗ PDF 导出失败: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"✗ 四色卡片导出测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_routes():
    """测试 API 路由"""
    print("=" * 60)
    print("测试 4: API 路由注册")
    print("=" * 60)
    
    try:
        from routes.pdf_routes import router
        
        print(f"✓ PDF 路由导入成功")
        print(f"  路由前缀: {router.prefix}")
        print(f"  路由标签: {router.tags}")
        
        # 列出所有路由
        print(f"\n  已注册的 API 端点:")
        for route in router.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                methods = ', '.join(route.methods)
                print(f"    {methods:8} {router.prefix}{route.path}")
        
        print("\nAPI 路由测试通过\n")
        return True
        
    except Exception as e:
        print(f"✗ API 路由测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "PDF 功能部署测试" + " " * 25 + "║")
    print("╚" + "=" * 58 + "╝")
    print("\n")
    
    results = []
    
    # 运行测试
    results.append(("PDF 库导入", test_imports()))
    results.append(("PDF 处理器", test_processor()))
    results.append(("四色卡片导出", test_card_export()))
    results.append(("API 路由", test_api_routes()))
    
    # 汇总结果
    print("=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "通过" if result else "❌ 失败"
        print(f"{name:20} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"总计: {len(results)} 个测试")
    print(f"通过: {passed} 个")
    print(f"失败: {failed} 个")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 所有测试通过！PDF 功能已成功部署！")
        print("\n下一步:")
        print("  1. 启动后端服务: start_backend.bat")
        print("  2. 访问 API 文档: http://localhost:8000/docs")
        print("  3. 测试 PDF 接口: http://localhost:8000/api/pdf/status")
    else:
        print(f"\n  有 {failed} 个测试失败，请检查错误信息并修复")
        print("\n故障排查:")
        print("  1. 确认已安装依赖: pip install pypdf pdfplumber reportlab")
        print("  2. 检查 Python 版本: python --version (需要 3.8+)")
        print("  3. 查看详细错误信息并根据提示修复")
    
    print("\n")
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
