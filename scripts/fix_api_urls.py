#!/usr/bin/env python3
"""批量替换硬编码的 API 地址为动态获取"""

import os
import re
from pathlib import Path

# API 配置导入语句
IMPORT_STATEMENT = "import { getApiBaseUrl } from '@/lib/apiConfig';"

# 需要替换的模式
# 1. const API_BASE = 'http://localhost:8000';
# 2. const API_BASE_URL = 'http://localhost:8000';
# 3. 直接使用 http://localhost:8000 的地方

def should_add_import(content):
    """检查是否需要添加 import 语句"""
    return "from '@/lib/apiConfig'" not in content

def replace_api_urls(content):
    """替换所有硬编码的 API 地址"""
    
    # 替换 const API_BASE = 'http://localhost:8000' 等
    patterns = [
        (r"const API_BASE\s*=\s*['\"]http://localhost:8000(['\"]?);?", 
         lambda m: f"const API_BASE = getApiBaseUrl() + '{m.group(1) if m.group(1) else ''}'"),
        (r"const API_BASE_URL\s*=\s*['\"]http://localhost:8000(['\"]?);?", 
         lambda m: f"const API_BASE_URL = getApiBaseUrl() + '{m.group(1) if m.group(1) else ''}'"),
        (r"const API_PATHS\s*=\s*['\"]http://localhost:8000(['\"]?);?", 
         lambda m: f"const API_PATHS = getApiBaseUrl() + '{m.group(1) if m.group(1) else ''}'"),
        (r"const RESEARCH_API_BASE\s*=\s*['\"]http://localhost:8000(['\"]?);?", 
         lambda m: f"const RESEARCH_API_BASE = getApiBaseUrl() + '{m.group(1) if m.group(1) else ''}'"),
        (r"const VISION_API_BASE\s*=\s*['\"]http://localhost:8000(['\"]?);?", 
         lambda m: f"const VISION_API_BASE = getApiBaseUrl() + '{m.group(1) if m.group(1) else ''}'"),
    ]
    
    new_content = content
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, new_content)
    
    # 替换 fetch('http://localhost:8000 为 fetch(getApiBaseUrl() + '
    new_content = re.sub(
        r"fetch\(['\"]http://localhost:8000",
        "fetch(getApiBaseUrl() + '",
        new_content
    )
    
    # 替换 `http://localhost:8000${ 为 `getApiBaseUrl() + `
    new_content = re.sub(
        r"`http://localhost:8000\$\{",
        "`getApiBaseUrl() + ${",
        new_content
    )
    
    # 替换 link.href = `http://localhost:8000${ 为 link.href = `getApiBaseUrl() + $
    new_content = re.sub(
        r"href\s*=\s*`http://localhost:8000\$\{",
        "href = `getApiBaseUrl() + ${",
        new_content
    )
    
    return new_content

def process_file(filepath):
    """处理单个文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'http://localhost:8000' not in content:
            return False
        
        new_content = replace_api_urls(content)
        
        # 添加 import 语句（如果需要且文件中有 getApiBaseUrl 的使用）
        if 'getApiBaseUrl()' in new_content and should_add_import(new_content):
            # 在最后一个 import 语句之后添加
            lines = new_content.split('\n')
            import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') and not line.strip().endswith("';"):
                    import_idx = i
            
            if import_idx >= 0:
                lines.insert(import_idx + 1, IMPORT_STATEMENT)
                new_content = '\n'.join(lines)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    src_dir = Path('src')
    count = 0
    
    for filepath in src_dir.rglob('*.ts'):
        if process_file(filepath):
            print(f"Updated: {filepath}")
            count += 1
    
    for filepath in src_dir.rglob('*.tsx'):
        if process_file(filepath):
            print(f"Updated: {filepath}")
            count += 1
    
    print(f"\nTotal files updated: {count}")

if __name__ == '__main__':
    main()