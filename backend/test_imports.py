#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

print("Testing backend imports...")

try:
    from config import settings
    print("✓ config imported")
except Exception as e:
    print(f"✗ config failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    from fastapi import FastAPI
    print("✓ fastapi imported")
except Exception as e:
    print(f"✗ fastapi failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    from routes.npu_routes import router as npu_router
    print("✓ npu_routes imported")
except Exception as e:
    print(f"✗ npu_routes failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✓ All imports successful!")
