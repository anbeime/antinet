"""测试会议流式API"""
import httpx
import sys
import time

print("Testing meeting stream API...", flush=True)
start = time.time()

try:
    with httpx.stream(
        'POST', 
        'http://127.0.0.1:8000/api/meeting/discuss/stream',
        json={'topic': '如何提高团队协作效率', 'rounds': 1},
        timeout=120.0
    ) as r:
        print(f"Status: {r.status_code}", flush=True)
        line_count = 0
        for line in r.iter_lines():
            if line:
                line_count += 1
                elapsed = time.time() - start
                print(f"[{elapsed:.1f}s] {line[:150]}", flush=True)
                if line_count > 30:
                    print("... (truncated)", flush=True)
                    break
        print(f"\nTotal lines: {line_count}, Time: {time.time()-start:.1f}s", flush=True)
except Exception as e:
    print(f"Error after {time.time()-start:.1f}s: {type(e).__name__}: {e}", flush=True)
