# -*- coding: utf-8 -*-
"""Quick single test: SDK 2.42 + llama3.2-3b (qnn2.37) backward compat"""
import os, sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent

sdk_path = str(PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "lib" / "aarch64-windows-msvc")
bin_path = str(PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "bin" / "aarch64-windows-msvc")
qai_libs = str(PROJECT_ROOT / "ai-engine-direct-helper-main" / "samples" / "qai_libs" / "QAIRT_Runtime" / "aarch64-windows-msvc")
model_config = str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37" / "config.json")

print(f"SDK: {sdk_path}")
print(f"Model: {model_config}")

# Set PATH
orig = os.environ.get('PATH', '')
os.environ['PATH'] = sdk_path + ';' + bin_path + ';' + qai_libs + ';' + orig
os.environ['QAI_LIBS_PATH'] = sdk_path

print("Importing qai_appbuilder...")
from qai_appbuilder import GenieContext
print("[OK] Imported")

print("Loading model (SDK 2.42 + model qnn2.37)...")
try:
    ctx = GenieContext(model_config)
    print("[OK] Model loaded! SDK 2.42 IS backward compatible with 2.37 models")
    
    # Quick inference
    parts = []
    def cb(text):
        parts.append(text)
        return len(parts) < 15
    ctx.Query("Hi", cb)
    print(f"[OK] Inference: {''.join(parts)[:100]}")
    try: ctx.Stop()
    except: pass
except Exception as e:
    print(f"[FAIL] Load failed: {e}")
    if "14001" in str(e):
        print("TIP: DLL not found")
    elif "backend" in str(e).lower():
        print("TIP: Backend init failed - possible version mismatch")
