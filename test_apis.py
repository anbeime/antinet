import urllib.request
import json
import time

def test_api(url, method='GET', data=None, timeout=3):
    try:
        if method == 'GET':
            req = urllib.request.Request(url)
        else:
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'))
            req.add_header('Content-Type', 'application/json')
        
        start = time.time()
        response = urllib.request.urlopen(req, timeout=timeout)
        elapsed = (time.time() - start) * 1000
        
        return {
            'success': True,
            'status': response.status,
            'elapsed': elapsed,
            'data': response.read().decode('utf-8')[:200]
        }
    except urllib.error.HTTPError as e:
        return {
            'success': False,
            'error': f'HTTP {e.code}: {e.reason}'
        }
    except urllib.error.URLError as e:
        return {
            'success': False,
            'error': str(e.reason)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

print('=' * 60)
print('后端API功能测试')
print('=' * 60)

tests = [
    ('聊天机器人', 'http://localhost:8000/api/chat/query', 'POST', {'query': '你好', 'conversation_history': [], 'context': {}}),
    ('知识卡片', 'http://localhost:8000/api/chat/cards', 'GET'),
    ('数据分析', 'http://localhost:8000/api/generate/cards', 'POST', {'query': '分析销售数据'}),
    ('NPU状态', 'http://localhost:8000/api/npu/status', 'GET'),
    ('PDF分析', 'http://localhost:8000/api/pdf/analyze', 'POST', {'file': 'test.pdf'}),
    ('PPT分析', 'http://localhost:8000/api/ppt/analyze', 'POST', {'file': 'test.pptx'}),
    ('Excel分析', 'http://localhost:8000/api/excel/analyze', 'POST', {'file': 'test.xlsx'}),
    ('数据管理', 'http://localhost:8000/api/data/list', 'GET'),
    ('批量处理', 'http://localhost:8000/api/batch/start', 'POST', {'files': ['test.pdf']}),
    ('Agent系统', 'http://localhost:8000/api/agent/list', 'GET'),
    ('技能中心', 'http://localhost:8000/api/skills/list', 'GET'),
]

working_apis = []
failed_apis = []

for name, url, method, *args in tests:
    data = args[0] if args else None
    print(f'\n[{name}] {url}')
    result = test_api(url, method, data)
    
    if result['success']:
        if result['status'] == 200:
            print(f'  [OK] 状态码: {result["status"]}, 响应时间: {result["elapsed"]:.0f}ms')
            print(f'  数据: {result["data"][:100]}...')
            working_apis.append(name)
        else:
            print(f'  [WARN] 状态码: {result["status"]} - {result["data"][:100]}')
            failed_apis.append(name)
    else:
        print(f'  [FAIL] {result["error"]}')
        failed_apis.append(name)

print('\n' + '=' * 60)
print('测试总结')
print('=' * 60)
print(f'\n可用API ({len(working_apis)}):')
for api in working_apis:
    print(f'  [OK] {api}')

print(f'\n不可用API ({len(failed_apis)}):')
for api in failed_apis:
    print(f'  [X] {api}')
