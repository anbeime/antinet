"""Quick test for wiki API - run from Windows cmd"""
import urllib.request, urllib.error, json, sys

BASE = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(BASE + path)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as ex:
        return None, str(ex)

print("=== Testing /api/wiki/pages ===")
status, data = get("/api/wiki/pages")
print(f"Status: {status}")
if status == 200:
    print(f"Total pages: {data.get('total', 'N/A')}")
    for p in data.get('pages', [])[:3]:
        print(f"  - {p}")
else:
    print(f"Error: {data}")

print("\n=== Testing /api/wiki/pages/articles/Hermes与知易集成实践 ===")
# URL-encode the Chinese chars
from urllib.parse import quote
page_id = "articles/Hermes与知易集成实践"
encoded = quote(page_id, safe='')
print(f"Encoded: {encoded}")
status2, data2 = get(f"/api/wiki/pages/{encoded}")
print(f"Status: {status2}")
if status2 == 200:
    print(f"Page title: {data2.get('page', {}).get('title', 'N/A')}")
else:
    print(f"Error: {data2}")

print("\n=== Testing /api/wiki/stats ===")
status3, data3 = get("/api/wiki/stats")
print(f"Status: {status3}")
if status3 == 200:
    print(f"Stats: {data3}")
else:
    print(f"Error: {data3}")