#!/usr/bin/env python3
"""
OCR图像文本提取脚本
使用Tesseract OCR引擎提取图像中的文本内容。
"""

import argparse
import sys
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("错误: 需要安装pytesseract和Pillow库")
    print("安装命令: pip install pytesseract Pillow")
    sys.exit(1)


def extract_text_from_image(image_path: Path, language: str = 'chi_sim+eng') -> dict:
    """从图像中提取文本"""
    
    # 检查文件是否存在
    if not image_path.exists():
        return {
            'success': False,
            'error': f'文件不存在: {image_path}'
        }
    
    try:
        # 打开图像
        image = Image.open(image_path)
        
        # 执行OCR
        text = pytesseract.image_to_string(image, lang=language)
        
        # 获取详细信息
        data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)
        
        # 统计置信度
        confidences = [int(conf) for conf in data['conf'] if conf != '-1']
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # 计算字符数
        char_count = len(text.strip())
        word_count = len(text.split())
        
        return {
            'success': True,
            'file_path': str(image_path),
            'file_name': image_path.name,
            'file_size': image_path.stat().st_size,
            'language': language,
            'text': text,
            'statistics': {
                'char_count': char_count,
                'word_count': word_count,
                'avg_confidence': avg_confidence,
                'blocks': len(data['block_num'])
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'OCR处理失败: {str(e)}'
        }


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='OCR图像文本提取',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--file',
        type=str,
        required=True,
        help='图像文件路径'
    )
    parser.add_argument(
        '--language',
        type=str,
        default='chi_sim+eng',
        help='OCR语言设置（默认: chi_sim+eng，支持: chi_sim, eng, chi_tra等）'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='输出文件路径（可选，JSON格式）'
    )
    
    args = parser.parse_args()
    
    # 检查Tesseract是否可用
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        print("错误: Tesseract OCR引擎未安装或不在PATH中")
        print("安装命令（Ubuntu）: apt-get install tesseract-ocr tesseract-ocr-chi-sim")
        print("安装命令（macOS）: brew install tesseract")
        print("安装命令（Windows）: 从https://github.com/tesseract-ocr/tesseract下载")
        sys.exit(1)
    
    # 提取文本
    result = extract_text_from_image(Path(args.file), args.language)
    
    if result['success']:
        print(f"\n{'='*60}")
        print(f"OCR提取结果 - {result['file_name']}")
        print('='*60)
        print(f"文件大小: {result['file_size']} 字节")
        print(f"语言设置: {result['language']}")
        print(f"字符数: {result['statistics']['char_count']}")
        print(f"单词数: {result['statistics']['word_count']}")
        print(f"平均置信度: {result['statistics']['avg_confidence']:.2f}%")
        print(f"文本块数: {result['statistics']['blocks']}")
        print('='*60)
        print("\n提取的文本:")
        print("-"*60)
        print(result['text'])
        print("-"*60)
        
        # 保存结果
        if args.output:
            output_path = Path(args.output)
            import json
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n结果已保存到: {args.output}")
    else:
        print(f"错误: {result['error']}")
        sys.exit(1)


if __name__ == '__main__':
    main()
