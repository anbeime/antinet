# -*- coding: utf-8 -*-
"""Quick test: SDK 2.37.1 + qwen2.5vl3b (qnn2.42) - reverse compat"""
import os, sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent

sdk_path = str(PROJECT_ROOT / "QAIRT" / "2.37.1.250807" / "lib" / "aarch64-windows-msvc")
bin_path = str(PROJECT_ROOT / "QAIRT" / "2.37.1.250807" / "bin" / "aarch64-windows-msvc")
qai_libs = str(PROJECT_ROOT / "ai-engine-direct-helper-main" / "samples" / "qai_libs" / "QAIRT_Runtime" / "aarch64-windows-msvc")
model_config = str(PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42" / "config.json")

print(f"SDK: {sdk_path}")
print(f"Model: {model_config}")

orig = os.environ.get('PATH', '')
os.environ['PATH'] = sdk_path + ';' + bin_path + ';' + qai_libs + ';' + orig
os.environ['QAI_LIBS_PATH'] = sdk_path

print("Importing qai_appbuilder...")
from qai_appbuilder import GenieContext
print("[OK] Imported")

print("Loading model (SDK 2.37 + model qnn2.42)...")
try:
    ctx = GenieContext(model_config)
    print("[OK] Model loaded! SDK 2.37 IS forward compatible with 2.42 models")
    parts = []
    def cb(text):
        parts.append(text)
        return len(parts) < 15
    ctx.Query("Hi", cb)
    print(f"[OK] Inference: {''.join(parts)[:100]}")
    try: ctx.Stop()
    except: pass
except Exception as e:
    err = str(e)[:300]
    print(f"[FAIL] Load failed: {err}")
