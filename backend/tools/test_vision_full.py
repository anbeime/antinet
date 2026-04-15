#!/usr/bin/env python3
"""模拟后端vision_routes.py调用链路 - 验证修正后的model名"""
import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

def http_post(url, data, timeout=60):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST',
        headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

GENIE_URL = "http://localhost:8910/v1/chat/completions"
BACKEND_URL = "http://localhost:8000/api/vision/chat"

print("=" * 60)
print("测试1: 模拟后端LLM模式请求 (修正后model=qwen2.5vl3b)")
print("=" * 60)

# 这正是vision_routes.py在LLM模式下会发送的请求
llm_request = {
    "model": "qwen2.5vl3b",  # 修正后
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "中国的首都是哪里？"}
    ],
    "extra_body": {
        "size": 4096,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 0.9
    }
}

status, result = http_post(GENIE_URL, llm_request)
if status == 200:
    content = result["choices"][0]["message"]["content"]
    print(f"  状态: {status} OK")
    print(f"  回复: {content}")
else:
    print(f"  状态: {status} FAIL")
    print(f"  错误: {result}")

print()
print("=" * 60)
print("测试2: 模拟后端VL模式请求 (带图片base64)")
print("=" * 60)

# 创建一个简单的1x1红色PNG图片的base64
import base64
# 最小有效PNG (1x1 红色像素)
red_pixel_png = base64.b64encode(
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0'
    b'\x00\x00\x00\x03\x00\x01\x00\x05\xfe\xd4\x00\x00\x00\x00IEND\xaeB`\x82'
).decode('utf-8')

vl_request = {
    "model": "qwen2.5vl3b",  # 修正后
    "messages": [{"role": "user", "content": "placeholder"}],
    "extra_body": {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {
                "role": "user",
                "content": {
                    "question": "What do you see?",
                    "image": red_pixel_png
                }
            }
        ],
        "size": 4096,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 0.9
    }
}

status, result = http_post(GENIE_URL, vl_request)
if status == 200:
    content = result["choices"][0]["message"]["content"]
    print(f"  状态: {status} OK")
    print(f"  回复: {content}")
else:
    print(f"  状态: {status} FAIL")
    print(f"  错误: {result}")

print()
print("=" * 60)
print("测试3: 直接调用后端 /api/vision/chat")
print("=" * 60)

status, result = http_post(BACKEND_URL, {
    "query": "中国的首都是哪里？",
    "conversation_history": []
})
print(f"  状态: {status}")
print(f"  结果: {json.dumps(result, ensure_ascii=False)[:300]}")
