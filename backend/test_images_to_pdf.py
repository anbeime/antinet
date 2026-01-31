"""
测试图像转 PDF 功能（使用 reportlab）
"""
from PIL import Image
import os

# 创建测试图像
def create_test_images():
    """创建测试图像"""
    colors = [
        ((255, 0, 0), "red"),
        ((0, 255, 0), "green"),
        ((0, 0, 255), "blue"),
    ]
    
    image_files = []
    for color, name in colors:
        img = Image.new('RGB', (400, 300), color)
        filename = f"test_{name}.png"
        img.save(filename)
        image_files.append(filename)
        print(f"[OK] 创建测试图像: {filename}")
    
    return image_files

# 测试图像转 PDF
def test_images_to_pdf():
    """测试图像转 PDF"""
    from tools.pdf_processor_enhanced import EnhancedPDFProcessor
    
    print("=" * 60)
    print("测试图像转 PDF 功能（reportlab 实现）")
    print("=" * 60)
    print()
    
    # 创建测试图像
    print("[1/3] 创建测试图像...")
    image_files = create_test_images()
    print()
    
    # 转换为 PDF
    print("[2/3] 转换为 PDF...")
    processor = EnhancedPDFProcessor()
    result = processor.images_to_pdf(image_files, "test_images.pdf")
    
    if result["success"]:
        print(f"[OK] 转换成功")
        print(f"  输入图像: {result['input_images']} 个")
        print(f"  输出文件: {result['output_path']}")
        
        if os.path.exists(result['output_path']):
            size = os.path.getsize(result['output_path'])
            print(f"  文件大小: {size:,} 字节")
    else:
        print(f"[FAIL] 转换失败: {result['error']}")
    
    print()
    
    # 清理测试文件
    print("[3/3] 清理测试文件...")
    for img_file in image_files:
        if os.path.exists(img_file):
            os.remove(img_file)
            print(f"[OK] 删除: {img_file}")
    
    print()
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    
    return result["success"]

if __name__ == "__main__":
    test_images_to_pdf()
