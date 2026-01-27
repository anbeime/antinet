# -*- coding: utf-8 -*-
"""
NPU BURST Mode Test - Simple Version
Test if BURST mode improves performance
"""
import sys
import time
sys.path.insert(0, 'C:/test/antinet/backend')

print("="*70)
print("NPU BURST Mode Performance Test")
print("="*70)
print()

print("[INFO] BURST mode is already enabled in model_loader.py")
print("[INFO] Testing NPU performance with BURST mode...")
print()

try:
    from models.model_loader import get_model_loader
    
    print("[1/3] Getting model loader...")
    loader = get_model_loader()
    
    print("[2/3] Loading model to NPU...")
    start_load = time.time()
    model = loader.load()
    load_time = time.time() - start_load
    print(f"[OK] Model loaded in {load_time:.2f}s")
    print()
    
    print("[3/3] Running inference tests...")
    print("-"*70)
    
    # Test cases with different token counts
    tests = [
        {"prompt": "Hello", "tokens": 16, "name": "Quick (16 tokens)"},
        {"prompt": "What is AI?", "tokens": 32, "name": "Medium (32 tokens)"},
        {"prompt": "Explain AI", "tokens": 64, "name": "Long (64 tokens)"},
    ]
    
    results = []
    
    for i, test in enumerate(tests, 1):
        print(f"\nTest {i}/{len(tests)}: {test['name']}")
        print(f"Prompt: '{test['prompt']}'")
        
        # First inference (may include initialization)
        start = time.time()
        response1 = loader.infer(test['prompt'], max_new_tokens=test['tokens'])
        time1 = (time.time() - start) * 1000
        
        # Second inference (should be faster)
        start = time.time()
        response2 = loader.infer(test['prompt'], max_new_tokens=test['tokens'])
        time2 = (time.time() - start) * 1000
        
        avg_time = (time1 + time2) / 2
        
        print(f"  1st inference: {time1:.0f}ms")
        print(f"  2nd inference: {time2:.0f}ms")
        print(f"  Average: {avg_time:.0f}ms")
        
        # Evaluate performance
        if avg_time < 500:
            status = "EXCELLENT"
            symbol = "[OK]"
        elif avg_time < 800:
            status = "GOOD"
            symbol = "[+]"
        elif avg_time < 1000:
            status = "ACCEPTABLE"
            symbol = "[~]"
        else:
            status = "NEEDS_IMPROVEMENT"
            symbol = "[!]"
        
        print(f"  Status: {symbol} {status}")
        
        results.append({
            "name": test['name'],
            "time1": time1,
            "time2": time2,
            "avg": avg_time,
            "status": status
        })
    
    # Summary
    print("\n" + "="*70)
    print("Performance Summary")
    print("="*70)
    
    print(f"\n{'Test':<25} {'1st':<10} {'2nd':<10} {'Avg':<10} {'Status'}")
    print("-"*70)
    
    for r in results:
        print(f"{r['name']:<25} {r['time1']:>6.0f}ms  {r['time2']:>6.0f}ms  {r['avg']:>6.0f}ms  {r['status']}")
    
    # Overall evaluation
    avg_all = sum(r['avg'] for r in results) / len(results)
    print(f"\nOverall average: {avg_all:.0f}ms")
    
    print("\n" + "="*70)
    print("Performance Evaluation")
    print("="*70)
    
    if avg_all < 500:
        print("[EXCELLENT] Target achieved! NPU + BURST mode working perfectly!")
        print("  - Average latency < 500ms")
        print("  - Ready for production use")
    elif avg_all < 800:
        print("[GOOD] BURST mode is working! Performance improved significantly.")
        print("  - Average latency < 800ms")
        print("  - Acceptable for most use cases")
        print("  - Consider using lighter model for < 500ms target")
    elif avg_all < 1000:
        print("[ACCEPTABLE] BURST mode may be partially working.")
        print("  - Average latency < 1000ms")
        print("  - Passes circuit breaker check")
        print("  - Recommend: Check NPU driver and QNN configuration")
    else:
        print("[NEEDS IMPROVEMENT] Performance below expectations.")
        print("  - Average latency > 1000ms")
        print("  - BURST mode may not be active")
        print("  - Action needed:")
        print("    1. Restart backend service")
        print("    2. Check backend logs for BURST mode activation")
        print("    3. Verify NPU driver status")
    
    print("\n" + "="*70)
    
    # Compare with previous results
    print("\nComparison with Previous Test:")
    print("  Previous (without BURST): ~1200-1300ms")
    print(f"  Current (with BURST):     ~{avg_all:.0f}ms")
    
    if avg_all < 1200:
        improvement = ((1200 - avg_all) / 1200) * 100
        print(f"  Improvement: {improvement:.1f}% faster!")
    else:
        print("  No improvement detected - backend may need restart")
    
    print("\n" + "="*70)
    
except Exception as e:
    print(f"\n[ERROR] Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nTest complete!")
