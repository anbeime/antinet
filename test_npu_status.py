# -*- coding: utf-8 -*-
"""
快速测试NPU状态
"""
import sys
import os

# 添加后端路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("=" * 60)
print("NPU Status Quick Test")
print("=" * 60)

try:
    print("\n[1/4] Importing model loader...")
    from models.model_loader import get_model_loader
    print("[OK] Model loader imported")
    
    print("\n[2/4] Getting model loader instance...")
    loader = get_model_loader()
    print(f"[OK] Loader instance: {loader.model_config['name']}")
    
    print("\n[3/4] Loading NPU model...")
    model = loader.load()
    print("[OK] NPU model loaded successfully")
    
    print("\n[4/4] Running simple inference test...")
    result = loader.infer("Hello", max_new_tokens=20)
    print(f"[OK] Inference success: {result[:50]}...")
    
    print("\n" + "=" * 60)
    print("[SUCCESS] NPU Status Test PASSED!")
    print("=" * 60)
    print("\nPerformance Stats:")
    stats = loader.get_performance_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
except Exception as e:
    print(f"\n[ERROR] Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
