#!/usr/bin/env python3
"""
测试PDF API功能
"""

import requests
import os

def test_pdf_extraction():
    """测试PDF文本提取API"""
    print("=== 测试PDF文本提取API ===")
    
    # 检查测试文件是否存在
    if not os.path.exists("test.pdf"):
        print("❌ test.pdf 文件不存在")
        return
    
    try:
        # 准备文件
        with open("test.pdf", "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            
            # 发送请求
            response = requests.post(
                "http://localhost:8000/api/pdf/extract/text",
                files=files
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print("✅ PDF文本提取成功!")
                    print(f"文件名: {result.get('filename')}")
                    print(f"页数: {len(result.get('pages', []))}")
                    print(f"完整文本长度: {len(result.get('full_text', ''))}")
                    print(f"前200字符: {repr(result.get('full_text', '')[:200])}")
                else:
                    print(f"❌ 提取失败: {result.get('error')}")
            else:
                print(f"❌ HTTP错误: {response.status_code}")
                print(f"响应: {response.text}")
                
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    test_pdf_extraction()