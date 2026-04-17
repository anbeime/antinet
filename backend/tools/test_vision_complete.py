#!/usr/bin/env python3
"""完整视觉API测试 - 修正后"""
import urllib.request, json, sys, base64, os
sys.stdout.reconfigure(encoding='utf-8')

GENIE_URL = "http://localhost:8910/v1/chat/completions"
BACKEND_URL = "http://localhost:8000/api/vision"

def http_request(url, data=None, method='GET', timeout=120):
    try:
        body = json.dumps(data).encode('utf-8') if data else None
        req = urllib.request.Request(url, data=body, method=method,
            headers={'Content-Type': 'application/json'} if body else {})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            return e.code, json.loads(err_body) if err_body else {"error": f"HTTP {e.code}"}
        except:
            return e.code, {"error": f"HTTP {e.code}"}
    except Exception as e:
        return 0, {"error": str(e)}

# 创建一个小的测试PNG (8x8红色方块)
import struct, zlib
def create_test_png():
    w, h = 8, 8
    raw = b''
    for y in range(h):
        raw += b'\x00'
        for x in range(w):
            raw += b'\xff\x00\x00\xff'
    compressed = zlib.compress(raw)
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

test_png = create_test_png()
b64_small = base64.b64encode(test_png).decode('utf-8')
# 保存为临时文件
temp_img = os.path.join(os.path.dirname(__file__), '_test_img.png')
with open(temp_img, 'wb') as f:
    f.write(test_png)

print("=" * 60)
print("  视觉模型完整测试 (修正model名+VL格式后)")
print("=" * 60)

# 1. GenieAPI 直连 - LLM模式
print("\n[1] GenieAPI 直连 - LLM模式")
status, result = http_request(GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [{"role": "user", "content": "2+3=? Reply in Chinese."}],
    "stream": False
})
if status == 200:
    print(f"    ✅ {result['choices'][0]['message']['content'].strip()}")
else:
    print(f"    ❌ {status}: {result}")

# 2. GenieAPI 直连 - VL模式 (小图片)
print("\n[2] GenieAPI 直连 - VL模式 (OpenAI视觉格式)")
status, result = http_request(GENIE_URL, {
    "model": "qwen2.5vl3b",
    "messages": [{
        "role": "user",
        "content": [
            {"type": "text", "text": "请用中文描述这张图片"},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_small}"}}
        ]
    }],
    "extra_body": {"size": 2048, "seed": 42, "temp": 0.7, "top_k": 1, "top_p": 1.0}
})
if status == 200:
    print(f"    ✅ {result['choices'][0]['message']['content'].strip()[:150]}")
else:
    print(f"    ❌ {status}: {result}")

# 3. 后端 - 健康检查
print("\n[3] 后端 /api/vision/health")
status, result = http_request(f"{BACKEND_URL}/health")
print(f"    {'✅' if result.get('service_available') else '❌'} {result.get('status', 'unknown')}")

# 4. 后端 - 纯文本对话
print("\n[4] 后端 /api/vision/chat - 纯文本")
status, result = http_request(f"{BACKEND_URL}/chat", {
    "query": "中国的首都是哪个城市？",
    "conversation_history": []
}, 'POST')
if status == 200:
    print(f"    ✅ {result.get('response', '').strip()[:100]}")
else:
    print(f"    ❌ {status}: {result}")

# 5. 后端 - 图文对话 (chat端点 + image_path)
print("\n[5] 后端 /api/vision/chat - 图文对话 (小图片)")
status, result = http_request(f"{BACKEND_URL}/chat", {
    "query": "请用中文描述这张图片",
    "image_path": temp_img,
    "conversation_history": []
}, 'POST')
if status == 200:
    print(f"    ✅ {result.get('response', '').strip()[:150]}")
else:
    print(f"    ❌ {status}: {result}")

# 6. 后端 - 图片分析 (multipart上传)
print("\n[6] 后端 /api/vision/analyze - 图片上传分析")
try:
    boundary = '----TestBoundary123456'
    with open(temp_img, 'rb') as f:
        img_bytes = f.read()
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode('utf-8') + img_bytes + (
        f'\r\n--{boundary}\r\n'
        f'Content-Disposition: form-data; name="question"\r\n\r\n'
        f'请描述这张图片\r\n'
        f'--{boundary}--\r\n'
    ).encode('utf-8')
    req = urllib.request.Request(
        f"{BACKEND_URL}/analyze", data=body, method='POST',
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        if result.get('success'):
            print(f"    ✅ {result.get('description', '').strip()[:150]}")
        else:
            print(f"    ❌ {result.get('error', 'unknown')}")
except Exception as e:
    print(f"    ❌ {e}")

# 清理
if os.path.exists(temp_img):
    os.remove(temp_img)

print("\n" + "=" * 60)
print("  测试完成")
print("=" * 60)
