#!/usr/bin/env python3
import sys
print("Python version:", sys.version)
print("Executable:", sys.executable)
print("\nTesting imports...")

packages = ['fastapi', 'numpy', 'pandas', 'duckdb', 'sqlalchemy', 'loguru', 'onnx', 'onnxruntime', 'qai_appbuilder']

for pkg in packages:
    try:
        __import__(pkg)
        print(f"✓ {pkg} - OK")
    except ImportError as e:
        print(f"✗ {pkg} - ImportError: {e}")
    except Exception as e:
        print(f"✗ {pkg} - Other error: {type(e).__name__}: {e}")

print("\nDone.")