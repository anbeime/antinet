#!/usr/bin/env python3
"""NPU核心测试"""
import sys
import os

sys.path.insert(0, 'backend')

try:
    print("Step 1: Import model loader")
    from models.model_loader import get_model_loader
    print("[PASS] Import success")
    
    print("\nStep 2: Load model")
    loader = get_model_loader()
    model = loader.load()
    print("[PASS] Model loaded")
    
    print("\nStep 3: Test inference")
    result = loader.infer("你好", max_new_tokens=50)
    print(f"[PASS] Inference success")
    print(f"Result: {result[:100]}")
    
    print("\n[SUCCESS] All tests passed")
    
except Exception as e:
    print(f"\n[FAIL] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
