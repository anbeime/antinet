# -*- coding: utf-8 -*-
"""
Quick NPU Performance Test After Optimization
"""
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

print("="*70)
print("NPU Performance Test - After Optimization")
print("="*70)
print()

# Test 1: Check if BURST mode is enabled
print("[Test 1] Checking BURST mode...")
try:
    from models.model_loader import get_model_loader
    loader = get_model_loader()
    
    # Load model (this should enable BURST mode)
    print("Loading model...")
    model = loader.load()
    print("[OK] Model loaded successfully")
    print()
except Exception as e:
    print(f"[ERROR] Failed to load model: {e}")
    sys.exit(1)

# Test 2: Quick inference test
print("[Test 2] Quick inference test (16 tokens)...")
test_cases = [
    {"prompt": "Hello", "tokens": 16, "name": "Short"},
    {"prompt": "What is AI?", "tokens": 32, "name": "Medium"},
]

results = []

for test in test_cases:
    print(f"\nTest: {test['name']} ({test['tokens']} tokens)")
    print(f"Prompt: {test['prompt']}")
    
    # Run inference
    start = time.time()
    response = loader.infer(
        prompt=test['prompt'],
        max_new_tokens=test['tokens'],
        temperature=0.7
    )
    latency = (time.time() - start) * 1000
    
    print(f"Latency: {latency:.2f}ms")
    print(f"Response: {response[:80]}...")
    
    # Check if passed
    if latency < 500:
        print(f"[PASS] Target achieved! ({latency:.2f}ms < 500ms)")
        status = "PASS"
    elif latency < 1000:
        print(f"[WARN] Close to target ({latency:.2f}ms < 1000ms)")
        status = "WARN"
    else:
        print(f"[FAIL] Exceeded target ({latency:.2f}ms > 1000ms)")
        status = "FAIL"
    
    results.append({
        "name": test['name'],
        "latency": latency,
        "status": status
    })

# Summary
print("\n" + "="*70)
print("Test Summary")
print("="*70)

passed = sum(1 for r in results if r['status'] == 'PASS')
total = len(results)

print(f"\nPassed: {passed}/{total}")
for r in results:
    symbol = "[OK]" if r['status'] == 'PASS' else "[!!]"
    print(f"  {symbol} {r['name']}: {r['latency']:.2f}ms")

print("\n" + "="*70)

if passed == total:
    print("[SUCCESS] All tests passed! Optimization successful!")
    sys.exit(0)
elif passed > 0:
    print("[PARTIAL] Some tests passed. Further optimization needed.")
    sys.exit(0)
else:
    print("[FAILED] No tests passed. Please check:")
    print("  1. Backend service restarted after patch")
    print("  2. NPU driver status")
    print("  3. QNN backend configuration")
    sys.exit(1)
