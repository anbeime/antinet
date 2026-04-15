#!/usr/bin/env python3
"""测试官方视觉格式 (GenieAPIClientVision.py 的格式)"""
import urllib.request, json, sys, base64, os
sys.stdout.reconfigure(encoding='utf-8')

GENIE_URL = "http://localhost:8910/v1/chat/completions"

# 找一张测试图片
test_images = [
    r"c:\D\zhiyi\315.gif",
]
image_path = None
for p in test_images:
    if os.path.exists(p):
        image_path = p
        break

if not image_path:
    # 创建一个简单的测试PNG
    import struct, zlib
    # 8x8 red PNG
    def create_test_png():
        width, height = 8, 8
        raw = b''
        for y in range(height):
            raw += b'\x00'  # filter byte
            for x in range(width):
                raw += b'\xff\x00\x00\xff'  # RGBA red
        compressed = zlib.compress(raw)
        
        def chunk(ctype, data):
            c = ctype + data
            return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        
        png = b'\x89PNG\r\n\x1a\n'
        png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
        png += chunk(b'IDAT', compressed)
        png += chunk(b'IEND', b'')
        return png
    
    png_data = create_test_png()
    base64_image = base64.b64encode(png_data).decode('utf-8')
    print(f"[INFO] 使用生成的测试PNG (8x8红色)")
else:
    with open(image_path, 'rb') as f:
        image_data = f.read()
    base64_image = base64.b64encode(image_data).decode('utf-8')
    print(f"[INFO] 使用图片: {image_path} ({len(image_data)} bytes)")

# 官方格式: OpenAI vision format
official_request = {
    "model": "qwen2.5vl3b",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请用中文描述这张图片"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64_image}"
                    }
                }
            ]
        }
    ],
    "extra_body": {
        "size": 2048,
        "seed": 42,
        "temp": 0.7,
        "top_k": 1,
        "top_p": 1.0
    }
}

print(f"\n{'='*60}")
print("测试: 官方OpenAI视觉格式")
print(f"{'='*60}")

try:
    body = json.dumps(official_request).encode('utf-8')
    req = urllib.request.Request(GENIE_URL, data=body, method='POST',
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        content = result["choices"][0]["message"]["content"]
        print(f"状态: {resp.status} OK")
        print(f"回复: {content}")
except urllib.error.HTTPError as e:
    err = e.read().decode('utf-8')
    print(f"状态: {e.code} FAIL")
    print(f"错误: {err}")
except Exception as e:
    print(f"异常: {e}")
