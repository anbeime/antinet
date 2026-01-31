#!/usr/bin/env python3
"""
修复后端代码中的 Unicode 符号，避免 Windows 控制台乱码
将 Unicode 符号替换为 ASCII 或标准中文字符
"""

import os
import re
from pathlib import Path

# 替换映射表
REPLACEMENTS = {
    '[OK]': '[OK]',
    '[FAIL]': '[FAIL]',
    '[WARN]': '[WARN]',
    '->': '->',
    '<-': '<-',
    '^': '^',
    'v': 'v',
    '*': '*',
    'o': 'o',
    '#': '#',
}

def fix_file(filepath):
    """修复单个文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 应用所有替换
        for old, new in REPLACEMENTS.items():
            content = content.replace(old, new)

        # 如果内容有变化，写回文件
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] 已修复: {filepath}")
            return True
        else:
            print(f"[SKIP] 无需修复: {filepath}")
            return False
    except Exception as e:
        print(f"[ERROR] 修复失败 {filepath}: {e}")
        return False

def fix_directory(directory):
    """修复目录中的所有 Python 文件"""
    print(f"开始扫描目录: {directory}")
    print("-" * 60)

    fixed_count = 0
    skipped_count = 0
    error_count = 0

    # 递归查找所有 .py 文件
    for py_file in Path(directory).rglob('*.py'):
        if fix_file(py_file):
            fixed_count += 1
        else:
            skipped_count += 1

    print("-" * 60)
    print(f"修复完成:")
    print(f"  已修复: {fixed_count} 个文件")
    print(f"  跳过: {skipped_count} 个文件")
    print(f"  错误: {error_count} 个文件")

if __name__ == "__main__":
    backend_dir = Path(__file__).parent

    print("=" * 60)
    print("修复后端代码中的 Unicode 符号")
    print("=" * 60)
    print()

    # 修复 backend 目录中的所有 Python 文件
    fix_directory(backend_dir)

    print()
    print("=" * 60)
    print("修复完成！")
    print("现在所有 Unicode 符号都已被替换为安全字符")
    print("=" * 60)
