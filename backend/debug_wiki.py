"""Debug script for Wiki API issues"""
import sys
sys.path.insert(0, 'C:/D/zhiyi/backend')

from pathlib import Path
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(path):
    """Test an endpoint and print result"""
    url = BASE_URL + path
    print(f"\nGET {url}")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = resp.read().decode('utf-8')
            print(f"  Status: {resp.status}")
            print(f"  Body: {data[:300]}...")
    except Exception as e:
        print(f"  ERROR: {e}")

def test_wiki():
    print("=== Testing Wiki API ===")
    
    # Test 1: list pages
    test_endpoint("/api/wiki/pages")
    
    # Test 2: try to read a specific page (URL-encoded)
    page_id = "articles/Hermes与知易集成实践"
    encoded = urllib.parse.quote(page_id, safe='')
    print(f"\n  page_id: {page_id}")
    print(f"  encoded: {encoded}")
    test_endpoint(f"/api/wiki/pages/{encoded}")
    
    # Test 3: try direct (unencoded) - but this might fail in URL parsing
    test_endpoint(f"/api/wiki/pages/articles/Hermes%E4%B8%8E%E7%9F%A5%E6%98%93%E9%9B%86%E6%88%90%E5%AE%9E%E8%B7%B5")
    
    # Test 4: check what pages exist
    test_endpoint("/api/wiki/stats")

if __name__ == "__main__":
    test_wiki()