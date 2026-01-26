#!/usr/bin/env python3
import os
import sys
from pathlib import Path

print("=" * 60)
print("NPU DIAGNOSTIC TOOL")
print("=" * 60)

# 1. Check model files
print("\n[1/5] Checking model files...")
model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
if not model_path.exists():
    print("ERROR: Model path not found:", model_path)
    sys.exit(1)

print(f"OK: Model path exists: {model_path}")

required_files = [
    "config.json",
    "tokenizer.json",
    "model-1.bin",
    "model-2.bin",
    "model-3.bin",
    "model-4.bin",
    "model-5.bin",
]

missing_files = []
for file in required_files:
    file_path = model_path / file
    if file_path.exists():
        size = file_path.stat().st_size / (1024 * 1024)  # MB
        print(f"  OK: {file} ({size:.2f} MB)")
    else:
        print(f"  MISSING: {file}")
        missing_files.append(file)

if missing_files:
    print(f"\nERROR: {len(missing_files)} files missing")
    sys.exit(1)

# 2. Check QNN libraries
print("\n[2/5] Checking QNN libraries...")
qnn_paths = [
    "C:/ai-engine-direct-helper/samples/qai_libs",
    "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc",
]

for qnn_path in qnn_paths:
    path = Path(qnn_path)
    if path.exists():
        files = list(path.glob("*.dll"))
        print(f"OK: {qnn_path}")
        print(f"     DLL files: {len(files)}")
    else:
        print(f"MISSING: {qnn_path}")

# 3. Check config.json
print("\n[3/5] Checking config.json...")
config_file = model_path / "config.json"
if config_file.exists():
    import json
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)

    backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'N/A')
    print(f"Backend type: {backend_type}")

    if backend_type == 'QnnHtp':
        print("OK: Using NPU backend (QnnHtp)")
    else:
        print(f"ERROR: Wrong backend type: {backend_type}")
        sys.exit(1)

# 4. Check GenieContext
print("\n[4/5] Checking GenieContext...")
try:
    sys.path.insert(0, "C:/ai-engine-direct-helper/samples/genie/python")
    from qai_appbuilder import GenieContext
    print("OK: GenieContext imported successfully")
except Exception as e:
    print(f"ERROR: Failed to import GenieContext: {e}")
    sys.exit(1)

# 5. Try to create context (without model)
print("\n[5/5] Testing GenieContext initialization...")
print("Note: This will try to initialize NPU context")
print("If this fails with error 14001, NPU may be busy or unavailable")

try:
    test_config = str(model_path / "config.json")
    print(f"Attempting to create GenieContext...")
    print(f"Config: {test_config}")

    # This is the actual test
    context = GenieContext(test_config)
    print("OK: GenieContext created successfully!")
    print("SUCCESS: NPU is available and working!")

except Exception as e:
    print(f"\nERROR: Failed to create GenieContext")
    print(f"Error: {e}")
    print(f"\nPossible causes:")
    print("  1. NPU device is busy (another process using NPU)")
    print("  2. QNN driver version mismatch")
    print("  3. Model files corrupted")
    print("  4. NPU hardware not available")
    print("\nRecommendations:")
    print("  1. Check if other AI applications are running")
    print("  2. Reboot the system to release NPU")
    print("  3. Check QNN driver installation")
    print("  4. Use QNN Profile to verify NPU status")
    sys.exit(1)

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
