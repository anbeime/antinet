#!/usr/bin/env python3
"""测试视觉API完整链路"""
import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

def test(name, url, data=None, method='GET'):
    try:
        body = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=body, method=method,
            headers={'Content-Type': 'application/json'} if body else {})
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print(f'[{name}] OK: {json.dumps(result, ensure_ascii=False)[:300]}')
            return result
    except Exception as e:
        err = str(e)
        if hasattr(e, 'read'):
            err += ' | ' + e.read().decode('utf-8')
        print(f'[{name}] FAIL: {err}')
        return None

# 1. GenieAPI 直连 - 错误model名
test("GenieAPI-错误model名", "http://localhost:8910/v1/chat/completions",
     {"model": "qwen2.5vl3b-8380-2.42", "messages": [{"role": "user", "content": "1+1="}], "stream": False}, 'POST')

# 2. GenieAPI 直连 - 正确model名
test("GenieAPI-正确model名", "http://localhost:8910/v1/chat/completions",
     {"model": "qwen2.5vl3b", "messages": [{"role": "user", "content": "1+1="}], "stream": False}, 'POST')

# 3. 后端视觉聊天 (LLM模式)
test("后端-vision/chat", "http://localhost:8000/api/vision/chat",
     {"query": "1+1等于几？", "conversation_history": []}, 'POST')

# 4. 后端视觉健康检查
test("后端-vision/health", "http://localhost:8000/api/vision/health")

# 5. 后端NPU状态
test("后端-npu/status", "http://localhost:8000/api/npu/status")
