#!/usr/bin/env python3
import os
import json
import sys

print("=" * 80)
print("Tokenizer 文件读取测试")
print("=" * 80)
print()

# 测试读取 tokenizer.json 文件
tokenizer_paths = [
    ("Qwen2.0-7B-SSD", r"C:\model\Qwen2.0-7B-SSD-8380-2.34\tokenizer.json"),
    ("Llama3.2-3B", r"C:\model\llama3.2-3b-8380-qnn2.37\tokenizer.json"),
]

for name, path in tokenizer_paths:
    print(f"[{name}] 测试文件: {path}")
    print(f"  文件存在: {os.path.exists(path)}")
    
    if not os.path.exists(path):
        print("  ✗ 文件不存在!")
        continue
        
    # 检查文件大小
    size_bytes = os.path.getsize(path)
    size_kb = size_bytes / 1024
    size_mb = size_kb / 1024
    print(f"  文件大小: {size_bytes:,} 字节 ({size_kb:.1f} KB, {size_mb:.2f} MB)")
    
    # 检查文件权限
    try:
        # 尝试读取文件
        print("  尝试读取文件...")
        
        # 方法1: 直接读取二进制
        try:
            with open(path, 'rb') as f:
                binary_data = f.read(1000)  # 只读前1000字节
            print(f"  ✓ 二进制读取成功，前1000字节长度: {len(binary_data)}")
        except Exception as e:
            print(f"  ✗ 二进制读取失败: {e}")
        
        # 方法2: 尝试作为文本读取（UTF-8）
        try:
            with open(path, 'r', encoding='utf-8') as f:
                text_data = f.read(2000)  # 只读前2000字符
            print(f"  ✓ UTF-8 文本读取成功，前2000字符长度: {len(text_data)}")
            
            # 检查文件头
            if text_data.startswith('{'):
                print(f"    ✓ 文件以 '{{' 开头，可能是有效的JSON")
            else:
                print(f"    ✗ 文件不以 '{{' 开头，可能不是有效的JSON")
                
            # 检查是否有明显的格式问题
            if '\\u' in text_data:
                print(f"      文件包含Unicode转义序列")
                
        except UnicodeDecodeError as e:
            print(f"  ✗ UTF-8 解码失败: {e}")
            # 尝试其他编码
            try:
                with open(path, 'r', encoding='utf-16') as f:
                    text_data = f.read(1000)
                print(f"  ✓ UTF-16 读取成功")
            except:
                print(f"  ✗ UTF-16 也失败")
        except Exception as e:
            print(f"  ✗ 文本读取失败: {e}")
        
        # 方法3: 尝试解析为JSON
        print("  尝试解析为JSON...")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            print(f"  ✓ JSON 解析成功")
            
            # 检查JSON结构
            if isinstance(json_data, dict):
                print(f"    ✓ 顶级是字典")
                keys = list(json_data.keys())
                print(f"    ✓ 顶级键: {keys[:10]}{'...' if len(keys) > 10 else ''}")
                
                # 检查关键字段
                for key in ['vocab', 'merges', 'model']:
                    if key in json_data:
                        value = json_data[key]
                        if isinstance(value, dict):
                            size = len(value)
                            print(f"    ✓ 包含 '{key}' (字典，大小: {size})")
                        elif isinstance(value, list):
                            size = len(value)
                            print(f"    ✓ 包含 '{key}' (列表，大小: {size})")
                        else:
                            print(f"    ✓ 包含 '{key}' (类型: {type(value).__name__})")
                    else:
                        print(f"      不包含 '{key}'")
            else:
                print(f"    ✗ 顶级不是字典，是 {type(json_data).__name__}")
                
        except json.JSONDecodeError as e:
            print(f"  ✗ JSON 解析失败: {e}")
            print(f"    错误位置: 行 {e.lineno}, 列 {e.colno}")
            
            # 读取错误行附近的内容
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                if e.lineno <= len(lines):
                    start = max(0, e.lineno - 3)
                    end = min(len(lines), e.lineno + 2)
                    print(f"    错误附近内容:")
                    for i in range(start, end):
                        prefix = ">>> " if i == e.lineno - 1 else "    "
                        print(f"    {prefix}行 {i+1}: {repr(lines[i].rstrip())[:100]}")
            except:
                pass
                
        except Exception as e:
            print(f"  ✗ JSON 解析其他错误: {e}")
            
    except Exception as e:
        print(f"  ✗ 文件检查失败: {e}")
    
    print()

print("=" * 80)
print("测试完成")
print("=" * 80)