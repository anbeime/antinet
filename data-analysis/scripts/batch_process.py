#!/usr/bin/env python3
"""
批量文件处理脚本
支持批量读取文件夹中的CSV/JSON/Excel文件，自动识别文件类型并进行分类。
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict

try:
    import pandas as pd
except ImportError:
    print("错误: 需要安装pandas库")
    sys.exit(1)


def classify_file_by_extension(file_path: Path) -> str:
    """根据文件扩展名分类"""
    ext = file_path.suffix.lower()
    mapping = {
        '.csv': 'csv',
        '.json': 'json',
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.png': 'image',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.pdf': 'image',  # 需要OCR处理
    }
    return mapping.get(ext, 'unknown')


def process_csv(file_path: Path) -> Dict:
    """处理CSV文件"""
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(file_path, encoding='gbk')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='latin-1')
    
    return {
        'file_path': str(file_path),
        'file_type': 'csv',
        'rows': len(df),
        'columns': len(df.columns),
        'column_names': list(df.columns),
        'file_size': file_path.stat().st_size
    }


def process_json(file_path: Path) -> Dict:
    """处理JSON文件"""
    try:
        df = pd.read_json(file_path, encoding='utf-8')
    except ValueError:
        df = pd.read_json(file_path, lines=True, encoding='utf-8')
    
    return {
        'file_path': str(file_path),
        'file_type': 'json',
        'rows': len(df),
        'columns': len(df.columns),
        'column_names': list(df.columns),
        'file_size': file_path.stat().st_size
    }


def process_excel(file_path: Path) -> Dict:
    """处理Excel文件"""
    try:
        df = pd.read_excel(file_path, engine='openpyxl')
    except ImportError:
        print("错误: 需要安装openpyxl库以支持Excel文件读取")
        sys.exit(1)
    
    return {
        'file_path': str(file_path),
        'file_type': 'excel',
        'rows': len(df),
        'columns': len(df.columns),
        'column_names': list(df.columns),
        'file_size': file_path.stat().st_size
    }


def process_image(file_path: Path) -> Dict:
    """处理图像文件（需要OCR）"""
    return {
        'file_path': str(file_path),
        'file_type': 'image',
        'needs_ocr': True,
        'file_size': file_path.stat().st_size
    }


def batch_process(directory: str, output_dir: str = None) -> List[Dict]:
    """批量处理目录中的文件"""
    dir_path = Path(directory)
    
    if not dir_path.exists():
        print(f"错误: 目录不存在 - {directory}")
        sys.exit(1)
    
    if not dir_path.is_dir():
        print(f"错误: 路径不是目录 - {directory}")
        sys.exit(1)
    
    # 支持的文件扩展名
    supported_extensions = {'.csv', '.json', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.pdf'}
    
    # 收集所有支持的文件
    files = [f for f in dir_path.iterdir() 
             if f.is_file() and f.suffix.lower() in supported_extensions]
    
    if not files:
        print(f"警告: 目录中没有找到支持的文件 - {directory}")
        return []
    
    print(f"\n{'='*60}")
    print(f"批量处理 - 目录: {directory}")
    print(f"找到 {len(files)} 个文件")
    print('='*60)
    
    results = []
    for file_path in sorted(files):
        file_type = classify_file_by_extension(file_path)
        
        try:
            if file_type == 'csv':
                result = process_csv(file_path)
            elif file_type == 'json':
                result = process_json(file_path)
            elif file_type == 'excel':
                result = process_excel(file_path)
            elif file_type == 'image':
                result = process_image(file_path)
            else:
                continue
            
            results.append(result)
            print(f"[PASS] {file_path.name} [{file_type}] - {result.get('rows', 'N/A')} 行")
            
        except Exception as e:
            print(f"✗ {file_path.name} - 处理失败: {str(e)}")
            continue
    
    # 输出分类统计
    print(f"\n{'='*60}")
    print("处理统计")
    print('='*60)
    
    type_stats = {}
    for result in results:
        file_type = result['file_type']
        type_stats[file_type] = type_stats.get(file_type, 0) + 1
    
    for file_type, count in sorted(type_stats.items()):
        print(f"{file_type}: {count} 个文件")
    
    # 保存结果
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        output_file = output_path / 'batch_process_result.json'
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")
    
    return results


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='批量处理数据文件',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--dir',
        type=str,
        required=True,
        help='包含数据文件的目录路径'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='输出目录（可选，用于保存处理结果）'
    )
    
    args = parser.parse_args()
    
    # 批量处理
    results = batch_process(args.dir, args.output)
    
    print(f"\n批量处理完成! 共处理 {len(results)} 个文件")


if __name__ == '__main__':
    main()
