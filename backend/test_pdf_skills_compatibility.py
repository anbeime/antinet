"""
测试 PDF Skills 依赖在 ARM 架构上的兼容性
"""
import sys

def test_dependency(package_name, import_name=None):
    """测试单个依赖包"""
    if import_name is None:
        import_name = package_name.replace('-', '_')
    
    try:
        module = __import__(import_name)
        version = getattr(module, '__version__', 'unknown')
        print(f"[OK] {package_name:20s} 可用 (版本: {version})")
        return True
    except ImportError as e:
        print(f"[FAIL] {package_name:20s} 不可用 ({str(e)[:50]}...)")
        return False
    except Exception as e:
        print(f"[!] {package_name:20s} 导入异常 ({str(e)[:50]}...)")
        return False

def main():
    print("=" * 70)
    print("PDF Skills ARM 架构兼容性测试")
    print("=" * 70)
    print()
    
    # 测试基础依赖
    print("[1/3] 基础 PDF 处理库")
    print("-" * 70)
    basic_deps = [
        ('pypdf', 'pypdf'),
        ('Pillow', 'PIL'),
        ('reportlab', 'reportlab'),
        ('img2pdf', 'img2pdf'),
    ]
    
    basic_results = {}
    for pkg, imp in basic_deps:
        basic_results[pkg] = test_dependency(pkg, imp)
    print()
    
    # 测试高级依赖
    print("[2/3] 高级 PDF 处理库")
    print("-" * 70)
    advanced_deps = [
        ('PyMuPDF', 'fitz'),
        ('pikepdf', 'pikepdf'),
        ('pdf2image', 'pdf2image'),
    ]
    
    advanced_results = {}
    for pkg, imp in advanced_deps:
        advanced_results[pkg] = test_dependency(pkg, imp)
    print()
    
    # 测试 HTML/OCR 依赖
    print("[3/3] HTML 转换和 OCR 库")
    print("-" * 70)
    special_deps = [
        ('weasyprint', 'weasyprint'),
        ('ocrmypdf', 'ocrmypdf'),
    ]
    
    special_results = {}
    for pkg, imp in special_deps:
        special_results[pkg] = test_dependency(pkg, imp)
    print()
    
    # 统计结果
    print("=" * 70)
    print("测试结果汇总")
    print("=" * 70)
    
    total = len(basic_deps) + len(advanced_deps) + len(special_deps)
    available = sum([
        sum(basic_results.values()),
        sum(advanced_results.values()),
        sum(special_results.values())
    ])
    
    print(f"总计: {total} 个依赖")
    print(f"可用: {available} 个")
    print(f"不可用: {total - available} 个")
    print(f"兼容率: {available / total * 100:.1f}%")
    print()
    
    # 功能可用性评估
    print("=" * 70)
    print("功能可用性评估")
    print("=" * 70)
    
    features = {
        'PDF 合并/拆分': basic_results.get('pypdf', False),
        '文本转 PDF': basic_results.get('reportlab', False),
        '图片转 PDF': basic_results.get('img2pdf', False),
        '图片处理': basic_results.get('Pillow', False),
        'PDF 转图片': advanced_results.get('PyMuPDF', False) or advanced_results.get('pdf2image', False),
        '添加水印': advanced_results.get('PyMuPDF', False),
        'PDF 压缩': advanced_results.get('pikepdf', False),
        'HTML 转 PDF': special_results.get('weasyprint', False),
        'OCR 识别': special_results.get('ocrmypdf', False),
    }
    
    for feature, available in features.items():
        status = "[OK] 可用" if available else "[FAIL] 不可用"
        print(f"{feature:20s} {status}")
    print()
    
    # 推荐安装
    print("=" * 70)
    print("推荐安装命令")
    print("=" * 70)
    
    to_install = []
    
    if not advanced_results.get('PyMuPDF', False):
        to_install.append('PyMuPDF')
    if not advanced_results.get('pikepdf', False):
        to_install.append('pikepdf')
    if not advanced_results.get('pdf2image', False):
        to_install.append('pdf2image')
    
    if to_install:
        print("尝试安装以下可选依赖以启用更多功能:")
        print(f"pip install {' '.join(to_install)}")
    else:
        print("所有可安装的依赖都已安装！")
    print()
    
    # 不兼容警告
    if not special_results.get('weasyprint', False):
        print("[!] weasyprint 在 Windows ARM 上不兼容，建议使用前端方案替代")
    if not special_results.get('ocrmypdf', False):
        print("[!] ocrmypdf 需要 tesseract-ocr 系统依赖，需手动安装")

if __name__ == '__main__':
    main()
