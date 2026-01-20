#!/usr/bin/env python3
"""Test pydantic import"""

print("=" * 60)
print("Testing pydantic import...")
print("=" * 60)

try:
    import pydantic_core
    print(f"✓ pydantic_core imported: {pydantic_core.__version__}")
except Exception as e:
    print(f"✗ pydantic_core failed: {e}")

try:
    from pydantic_core import core_schema
    print("✓ pydantic_core.core_schema imported")
except Exception as e:
    print(f"✗ pydantic_core.core_schema failed: {e}")

try:
    import pydantic
    print(f"✓ pydantic imported: {pydantic.__version__}")
except Exception as e:
    print(f"✗ pydantic failed: {e}")
    import traceback
    traceback.print_exc()

try:
    from pydantic import BaseModel
    print("✓ pydantic.BaseModel imported")
except Exception as e:
    print(f"✗ pydantic.BaseModel failed: {e}")
    import traceback
    traceback.print_exc()

try:
    from fastapi import FastAPI
    print(f"✓ fastapi imported")
except Exception as e:
    print(f"✗ fastapi failed: {e}")
    import traceback
    traceback.print_exc()

print("=" * 60)
print("Test completed")
print("=" * 60)
