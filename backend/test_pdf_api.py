"""
测试 PDF API 功能
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_pdf_extract_text():
    """测试文本提取"""
    print("=" * 60)
    print("测试 PDF 文本提取")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/pdf/extract/text"
    
    with open("test_document.pdf", "rb") as f:
        files = {"file": ("test_document.pdf", f, "application/pdf")}
        data = {"preserve_layout": "true"}
        
        response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"[OK] 文件名: {result['filename']}")
        print(f"[OK] 页数: {len(result['pages'])}")
        print(f"[OK] 全文长度: {len(result['full_text'])} 字符")
        print()
        print("提取的文本（前 200 字符）:")
        print("-" * 60)
        print(result['full_text'][:200])
        print("-" * 60)
        return True
    else:
        print(f"[FAIL] 请求失败: {response.status_code}")
        print(f"  错误: {response.text}")
        return False

def test_pdf_status():
    """测试 PDF 状态"""
    print()
    print("=" * 60)
    print("测试 PDF 功能状态")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/pdf/status"
    response = requests.get(url)
    
    if response.status_code == 200:
        result = response.json()
        print(f"[OK] PDF 功能可用: {result['available']}")
        print(f"[OK] 消息: {result['message']}")
        return True
    else:
        print(f"[FAIL] 请求失败: {response.status_code}")
        return False

def test_pdf_health():
    """测试健康检查"""
    print()
    print("=" * 60)
    print("测试 PDF 健康检查")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/pdf/health"
    response = requests.get(url)
    
    if response.status_code == 200:
        result = response.json()
        print(f"[OK] 状态: {result['status']}")
        print(f"[OK] PDF 可用: {result['pdf_available']}")
        return True
    else:
        print(f"[FAIL] 请求失败: {response.status_code}")
        return False

if __name__ == "__main__":
    print("Antinet PDF API 功能测试")
    print()
    
    # 测试状态
    status_ok = test_pdf_status()
    
    # 测试健康检查
    health_ok = test_pdf_health()
    
    # 测试文本提取
    extract_ok = test_pdf_extract_text()
    
    print()
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"PDF 状态: {'[OK]' if status_ok else '[FAIL]'}")
    print(f"健康检查: {'[OK]' if health_ok else '[FAIL]'}")
    print(f"文本提取: {'[OK]' if extract_ok else '[FAIL]'}")
    print()
    
    if all([status_ok, health_ok, extract_ok]):
        print("[OK] 所有测试通过！PDF 功能正常工作")
    else:
        print("[FAIL] 部分测试失败，请检查错误信息")
