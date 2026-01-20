#!/usr/bin/env python3
"""Simple test for model loading"""
import sys
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples/genie/python')

print("Step 1: Testing GenieContext import...")
try:
    from qai_appbuilder import GenieContext
    print("✓ GenieContext imported successfully")
except Exception as e:
    print(f"✗ Failed: {e}")
    sys.exit(1)

print("\nStep 2: Testing model loader...")
sys.path.insert(0, 'c:/test/antinet/backend')
try:
    from models.model_loader import NPUModelLoader, GENIE_CONTEXT_AVAILABLE
    print(f"✓ NPUModelLoader imported")
    print(f"  GENIE_CONTEXT_AVAILABLE: {GENIE_CONTEXT_AVAILABLE}")
except Exception as e:
    print(f"✗ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nStep 3: Creating loader...")
try:
    loader = NPUModelLoader()
    print(f"✓ Loader created")
    print(f"  Model: {loader.model_config['name']}")
except Exception as e:
    print(f"✗ Failed: {e}")
    sys.exit(1)

print("\nStep 4: Loading model (this may take 10-30 seconds)...")
import time
try:
    start = time.time()
    model = loader.load()
    load_time = time.time() - start
    print(f"✓ Model loaded in {load_time:.2f}s")
except Exception as e:
    print(f"✗ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nStep 5: Testing inference...")
try:
    start = time.time()
    result = loader.infer("分析端侧AI的优势", max_new_tokens=64)
    inference_time = (time.time() - start) * 1000
    print(f"✓ Inference completed in {inference_time:.2f}ms")
    print(f"  Result: {result[:100]}...")
    print(f"  Target (<500ms): {'✓ PASS' if inference_time < 500 else '✗ FAIL'}")
except Exception as e:
    print(f"✗ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ All tests passed!")
