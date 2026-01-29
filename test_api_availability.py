import requests
import json
import sys

# 设置输出编码为UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

apis = [
    ('聊天机器人', 'http://localhost:8000/api/chat/analyze'),
    ('知识卡片', 'http://localhost:8000/api/knowledge/cards'),
    ('数据分析', 'http://localhost:8000/api/npu/analyze'),
    ('NPU状态', 'http://localhost:8000/api/npu/status'),
    ('PDF分析', 'http://localhost:8000/api/pdf/upload'),
    ('PPT分析', 'http://localhost:8000/api/ppt/status'),
    ('Excel分析', 'http://localhost:8000/api/excel/export-cards'),
    ('数据管理', 'http://localhost:8000/api/data/activities'),
    ('批量处理', 'http://localhost:8000/api/pdf/batch/process'),
    ('Agent系统', 'http://localhost:8000/api/agent/status'),
    ('技能中心', 'http://localhost:8000/api/skills/available')
]

print("后端API可用性测试:")
print("=" * 60)

results = []
for name, url in apis:
    try:
        # 使用HEAD请求快速测试
        response = requests.head(url, timeout=3)
        status = '✅ 可用' if response.status_code < 500 else f'❌ 错误 {response.status_code}'
        print(f"{name:15} | {status}")
        results.append((name, response.status_code < 500))
    except Exception as e:
        print(f"{name:15} | ❌ 不可用 ({type(e).__name__})")
        results.append((name, False))

print("\n" + "=" * 60)
print(f"可用API数量: {sum(1 for _, available in results if available)} / {len(results)}")
