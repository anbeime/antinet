#!/usr/bin/env python3
"""Test model loading step by step"""
import sys
import time
from pathlib import Path

# 设置路径
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples/genie/python')
sys.path.insert(0, '.')

print("=" * 70)
print("Step 1: Testing imports...")
print("=" * 70)

try:
    from qai_appbuilder import GenieContext
    print("✓ GenieContext imported")
except Exception as e:
    print(f"✗ GenieContext failed: {e}")
    sys.exit(1)

try:
    from models.model_loader import NPUModelLoader
    print("✓ NPUModelLoader imported")
except Exception as e:
    print(f"✗ NPUModelLoader failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("Step 2: Checking model path...")
print("=" * 70)

model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
print(f"Model path: {model_path}")
print(f"Exists: {model_path.exists()}")
print(f"config.json: {(model_path / 'config.json').exists()}")

if not (model_path / 'config.json').exists():
    print("✗ config.json not found!")
    sys.exit(1)

print("\n" + "=" * 70)
print("Step 3: Creating NPUModelLoader...")
print("=" * 70)

try:
    loader = NPUModelLoader()
    print(f"✓ Loader created")
    print(f"  Model: {loader.model_config['name']}")
    print(f"  Path: {loader.model_config['path']}")
except Exception as e:
    print(f"✗ Loader creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("Step 4: Loading model (this may take 10-30 seconds)...")
print("=" * 70)

try:
    start = time.time()
    model = loader.load()
    load_time = time.time() - start
    print(f"✓ Model loaded successfully!")
    print(f"  Load time: {load_time:.2f}s")
    print(f"  Model type: {type(model).__name__}")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("Step 5: Testing inference...")
print("=" * 70)

try:
    test_prompt = "分析端侧AI的优势"
    start = time.time()
    result = loader.infer(test_prompt, max_new_tokens=64)
    inference_time = (time.time() - start) * 1000
    print(f"✓ Inference successful!")
    print(f"  Inference time: {inference_time:.2f}ms")
    print(f"  Result: {result[:100]}...")
    print(f"  Meets target (<500ms): {'✓' if inference_time < 500 else '✗'}")
except Exception as e:
    print(f"✗ Inference failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("All tests passed! ✓")
print("=" * 70)
