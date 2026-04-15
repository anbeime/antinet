#!/usr/bin/env python3
"""测试后端实际发送给GenieAPI的请求格式"""
import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

def test(name, url, data):
    try:
        body = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=body, method='POST',
            headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print(f'[{name}] OK: {json.dumps(result, ensure_ascii=False)[:500]}')
            return result
    except Exception as e:
        err = str(e)
        if hasattr(e, 'read'):
            err += ' | ' + e.read().decode('utf-8')
        print(f'[{name}] FAIL: {err}')
        return None

GENIE_URL = "http://localhost:8910/v1/chat/completions"

# Test 1: 简单格式 (已确认可行)
test("简单格式", GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [{"role": "user", "content": "1+1="}],
    "stream": False
})

# Test 2: 后端LLM模式的格式 (带extra_body)
test("后端LLM格式", GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "1+1等于几？"}
    ],
    "extra_body": {
        "size": 4096,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 0.9
    }
})

# Test 3: 去掉extra_body, 用标准OpenAI格式参数
test("标准OpenAI格式", GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "1+1等于几？"}
    ],
    "max_tokens": 256,
    "temperature": 0.7,
    "stream": False
})

# Test 4: 只保留model+messages
test("最简格式+system", GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "1+1等于几？"}
    ]
})
