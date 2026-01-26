import sys
print("Python version:", sys.version)
print()

try:
    from qai_appbuilder import GenieContext
    print("[OK] qai_appbuilder imported successfully")
    print("[OK] GenieContext available")
except Exception as e:
    print(f"[ERROR] qai_appbuilder import failed: {e}")
    sys.exit(1)

try:
    import fastapi
    import uvicorn
    import pydantic
    import sqlalchemy
    import loguru
    import pandas
    import numpy
    print("[OK] All core dependencies installed")
    print(f"  - fastapi: {fastapi.__version__}")
    print(f"  - uvicorn: {uvicorn.__version__}")
    print(f"  - pydantic: {pydantic.__version__}")
except Exception as e:
    print(f"[ERROR] Dependency check failed: {e}")
    sys.exit(1)

print()
print("=" * 50)
print("Environment verification PASSED!")
print("=" * 50)
