#!/usr/bin/env python3
import os
import json
import sys

print("检查 tokenizer.json 文件...")
print()

tokenizer_paths = [
    r"C:\model\Qwen2.0-7B-SSD-8380-2.34\tokenizer.json",
    r"C:\model\llama3.2-3b-8380-qnn2.37\tokenizer.json",
]

for path in tokenizer_paths:
    print(f"检查: {path}")
    print(f"  文件存在: {os.path.exists(path)}")
    
    if os.path.exists(path):
        try:
            size = os.path.getsize(path) / 1024  # KB
            print(f"  文件大小: {size:.1f} KB")
            
            # 尝试读取文件
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read(1000)  # 只读取前1000个字符
                print(f"  前1000字符预览: {repr(content[:200])}...")
            
            # 尝试解析为JSON
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                print(f"  ✓ JSON 解析成功")
                
                # 检查关键字段
                if isinstance(data, dict):
                    if 'model' in data:
                        print(f"    包含 'model' 字段")
                    if 'vocab' in data:
                        vocab_size = len(data['vocab']) if isinstance(data['vocab'], dict) else '未知'
                        print(f"    词汇表大小: {vocab_size}")
                    if 'merges' in data:
                        merges_size = len(data['merges']) if isinstance(data['merges'], list) else '未知'
                        print(f"    merges 数量: {merges_size}")
                
            except json.JSONDecodeError as e:
                print(f"  ✗ JSON 解析失败: {e}")
                print(f"    错误位置: 行 {e.lineno}, 列 {e.colno}")
                
        except Exception as e:
            print(f"  读取失败: {e}")
    
    print()

print("检查完成")