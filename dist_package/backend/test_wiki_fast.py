"""Test wiki API from Windows - use with venv_x64 python.exe"""
import urllib.request, urllib.parse, urllib.error, json, sys

BASE = "http://127.0.0.1:8000"

def get(path):
    req = urllib.request.Request(BASE + path)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]
    except Exception as ex:
        return None, str(ex)

print("=== /api/wiki/pages ===")
s, d = get("/api/wiki/pages")
print(f"Status: {s}")
if s == 200:
    print(f"Total: {d.get('total', 'N/A')}")
    for p in (d.get('pages', []) or [])[:5]:
        print(f"  {p.get('id', 'N/A')}: {p.get('title', 'N/A')}")

print("\n=== /api/wiki/pages/articles/Hermes与知易集成实践 (raw path) ===")
# This tests with a literal path (no URL encoding of slashes)
s2, d2 = get("/api/wiki/pages/articles/Hermes%E4%B8%8E%E7%9F%A5%E6%98%93%E9%9B%86%E6%88%90%E5%AE%9E%E8%B7%B5")
print(f"Status: {s2}")
if s2 == 200:
    print(f"Title: {d2.get('page', {}).get('title', 'N/A')}")
else:
    print(f"Response: {d2}")

print("\n=== /api/wiki/stats ===")
s3, d3 = get("/api/wiki/stats")
print(f"Status: {s3}")
if s3 == 200:
    print(f"Total pages: {d3.get('total_pages', 'N/A')}, wiki_count: {d3.get('wiki_count', 'N/A')}")

print("\nDone.")