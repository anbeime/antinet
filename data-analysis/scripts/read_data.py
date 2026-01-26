#!/usr/bin/env python3
"""
数据文件读取脚本
支持CSV/JSON/Excel三种格式的数据文件读取，并输出数据摘要信息。
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("错误: 需要安装pandas库")
    sys.exit(1)


def read_csv(file_path):
    """读取CSV格式文件"""
    try:
        # 尝试自动检测编码
        df = pd.read_csv(file_path, encoding='utf-8')
    except UnicodeDecodeError:
        # 尝试其他常见编码
        try:
            df = pd.read_csv(file_path, encoding='gbk')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding='latin-1')
    return df


def read_json(file_path):
    """读取JSON格式文件"""
    try:
        df = pd.read_json(file_path, encoding='utf-8')
    except ValueError as e:
        # 尝试读取为JSON行格式
        try:
            df = pd.read_json(file_path, lines=True, encoding='utf-8')
        except Exception:
            raise ValueError(f"JSON格式解析失败: {e}")
    return df


def read_excel(file_path):
    """读取Excel格式文件"""
    try:
        # 读取第一个工作表
        df = pd.read_excel(file_path, engine='openpyxl')
    except ImportError:
        print("错误: 需要安装openpyxl库以支持Excel文件读取")
        sys.exit(1)
    except Exception as e:
        raise ValueError(f"Excel文件读取失败: {e}")
    return df


def print_data_summary(df, file_format):
    """输出数据摘要信息"""
    print("\n" + "="*60)
    print(f"数据摘要 - 格式: {file_format.upper()}")
    print("="*60)
    print(f"行数: {len(df)}")
    print(f"列数: {len(df.columns)}")
    print("\n列名:")
    for i, col in enumerate(df.columns, 1):
        print(f"  {i}. {col}")

    print("\n数据类型:")
    for col, dtype in df.dtypes.items():
        print(f"  {col}: {dtype}")

    print("\n缺失值统计:")
    missing = df.isnull().sum()
    for col, count in missing.items():
        if count > 0:
            percentage = (count / len(df)) * 100
            print(f"  {col}: {count} ({percentage:.2f}%)")
        else:
            print(f"  {col}: 0 (0.00%)")

    print("\n前5行数据预览:")
    print(df.head().to_string())

    print("\n数值型列统计:")
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        print(df[numeric_cols].describe().to_string())
    else:
        print("  无数值型列")

    print("\n" + "="*60)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='读取数据文件并输出摘要信息',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--file',
        type=str,
        required=True,
        help='数据文件路径'
    )
    parser.add_argument(
        '--format',
        type=str,
        required=True,
        choices=['csv', 'json', 'excel'],
        help='文件格式: csv/json/excel'
    )

    args = parser.parse_args()

    # 检查文件是否存在
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"错误: 文件不存在 - {args.file}")
        sys.exit(1)

    # 根据格式读取文件
    try:
        if args.format == 'csv':
            df = read_csv(args.file)
        elif args.format == 'json':
            df = read_json(args.file)
        elif args.format == 'excel':
            df = read_excel(args.file)
        else:
            print(f"错误: 不支持的格式 - {args.format}")
            sys.exit(1)

        # 输出数据摘要
        print_data_summary(df, args.format)

        print(f"\n数据读取成功! 共 {len(df)} 行, {len(df.columns)} 列")

    except Exception as e:
        print(f"错误: 数据读取失败 - {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
