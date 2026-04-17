#!/usr/bin/env python3
"""快速测试 NPU 推理"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_npu_analyze():
    """测试 NPU 分析接口"""
    
    # 测试 llama3.2-3b
    print("=" * 50)
    print("测试 llama3.2-3b (NPU)")
    print("=" * 50)
    
    payload = {
        "query": "你好，请用一句话介绍自己",
        "max_tokens": 64,
        "temperature": 0.7,
        "model": "llama3.2-3b"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/npu/analyze", json=payload, timeout=120)
        print(f"状态码: {resp.status_code}")
        result = resp.json()
        print(f"成功: {result.get('success')}")
        print(f"输出: {result.get('raw_output', '')[:200]}")
        print(f"性能: {result.get('performance', {})}")
    except Exception as e:
        print(f"错误: {e}")

def test_gemma4():
    """测试 gemma4 API"""
    
    print("\n" + "=" * 50)
    print("测试 gemma4 (Ollama API)")
    print("=" * 50)
    
    payload = {
        "query": "你好，请用一句话介绍自己",
        "max_tokens": 64,
        "temperature": 0.7,
        "model": "gemma4"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/npu/analyze", json=payload, timeout=120)
        print(f"状态码: {resp.status_code}")
        result = resp.json()
        print(f"成功: {result.get('success')}")
        print(f"输出: {result.get('raw_output', '')[:200]}")
        print(f"性能: {result.get('performance', {})}")
    except Exception as e:
        print(f"错误: {e}")

def test_qwen2():
    """测试 qwen2.0-7b"""
    
    print("\n" + "=" * 50)
    print("测试 qwen2.0-7b (NPU)")
    print("=" * 50)
    
    payload = {
        "query": "你好，请用一句话介绍自己",
        "max_tokens": 64,
        "temperature": 0.7,
        "model": "qwen2.0-7b"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/npu/analyze", json=payload, timeout=120)
        print(f"状态码: {resp.status_code}")
        result = resp.json()
        print(f"成功: {result.get('success')}")
        print(f"输出: {result.get('raw_output', '')[:200]}")
        print(f"性能: {result.get('performance', {})}")
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    test_npu_analyze()
    test_gemma4()
    test_qwen2()