# -*- coding: utf-8 -*-
"""QAIRT SDK compatibility test"""
import os, sys, json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent

SDK_PATHS = {
    "2.37.1": PROJECT_ROOT / "QAIRT" / "2.37.1.250807" / "lib" / "aarch64-windows-msvc",
    "2.42.0": PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "lib" / "aarch64-windows-msvc",
}
BIN_PATHS = {
    "2.37.1": PROJECT_ROOT / "QAIRT" / "2.37.1.250807" / "bin" / "aarch64-windows-msvc",
    "2.42.0": PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "bin" / "aarch64-windows-msvc",
}
QAI_LIBS = PROJECT_ROOT / "ai-engine-direct-helper-main" / "samples" / "qai_libs" / "QAIRT_Runtime" / "aarch64-windows-msvc"
MODELS = {
    "llama3.2-3b(qnn2.37)": PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37" / "config.json",
    "qwen2.5vl3b(qnn2.42)": PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42" / "config.json",
}


def test_load(sdk_name, sdk_path, model_name, config_path):
    """Test loading a model with a specific SDK path"""
    print(f"\n{'='*60}")
    print(f"Test: SDK {sdk_name} + Model {model_name}")
    print(f"{'='*60}")

    if not sdk_path.exists():
        print("  SKIP: SDK path not found")
        return "SKIP"
    if not config_path.exists():
        print("  SKIP: Model config not found")
        return "SKIP"

    # Save and modify PATH
    orig_path = os.environ.get('PATH', '')
    paths_to_add = [str(sdk_path)]
    bp = BIN_PATHS.get(sdk_name)
    if bp and bp.exists():
        paths_to_add.append(str(bp))
    if QAI_LIBS.exists():
        paths_to_add.append(str(QAI_LIBS))
    os.environ['PATH'] = os.pathsep.join(paths_to_add) + os.pathsep + orig_path
    os.environ['QAI_LIBS_PATH'] = str(sdk_path)
    print(f"  PATH added: {paths_to_add}")

    try:
        from qai_appbuilder import GenieContext
        print("  [OK] qai_appbuilder imported")
    except ImportError as e:
        print(f"  [FAIL] qai_appbuilder import: {e}")
        os.environ['PATH'] = orig_path
        return "IMPORT_FAIL"

    try:
        print(f"  Loading model: {config_path}")
        ctx = GenieContext(str(config_path))
        print(f"  [OK] Model loaded!")

        try:
            parts = []
            def cb(text):
                parts.append(text)
                return len(parts) < 20
            ctx.Query("Hello", cb)
            result = ''.join(parts)
            print(f"  [OK] Inference OK, output: {result[:100]}...")
        except Exception as e:
            print(f"  [WARN] Load OK but inference failed: {e}")

        try:
            ctx.Stop()
        except:
            pass
        os.environ['PATH'] = orig_path
        return "OK"
    except Exception as e:
        err = str(e)
        print(f"  [FAIL] Model load failed: {err[:200]}")
        if "14001" in err or "DLL" in err.lower():
            print(f"  TIP: DLL missing or version mismatch")
        elif "device" in err.lower():
            print(f"  TIP: NPU device creation failed")
        elif "backend" in err.lower():
            print(f"  TIP: QNN backend init failed")
        os.environ['PATH'] = orig_path
        return "FAIL"


def main():
    print("=" * 60)
    print("QAIRT SDK Compatibility Test")
    print("=" * 60)

    # Check SDK dirs
    print("\n[1] SDK Directory Check")
    for name, path in SDK_PATHS.items():
        exists = path.exists()
        print(f"  SDK {name}: {path} -> {'EXISTS' if exists else 'MISSING'}")
        if exists:
            dlls = [f.name for f in path.iterdir() if f.suffix == '.dll']
            print(f"    DLLs: {len(dlls)} files -> {dlls[:5]}...")
    print(f"  qai_libs: {QAI_LIBS} -> {'EXISTS' if QAI_LIBS.exists() else 'MISSING'}")
    if QAI_LIBS.exists():
        dlls = [f.name for f in QAI_LIBS.iterdir() if f.suffix == '.dll']
        print(f"    DLLs: {len(dlls)} files")

    # Check models
    print("\n[2] Model Check")
    for name, path in MODELS.items():
        print(f"  {name}: {'EXISTS' if path.exists() else 'MISSING'} ({path})")

    # Compatibility tests
    print("\n[3] Compatibility Tests")
    test_cases = [
        ("2.37.1", "llama3.2-3b(qnn2.37)"),   # exact match
        ("2.42.0", "llama3.2-3b(qnn2.37)"),   # backward compat
        ("2.42.0", "qwen2.5vl3b(qnn2.42)"),   # exact match
        ("2.37.1", "qwen2.5vl3b(qnn2.42)"),   # reverse test (expect fail)
    ]

    results = {}
    for sdk, model in test_cases:
        result = test_load(sdk, SDK_PATHS[sdk], model, MODELS[model])
        results[f"{sdk}+{model}"] = result

    # Summary
    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print("=" * 60)
    for key, result in results.items():
        s = {"OK": "PASS", "FAIL": "FAIL", "SKIP": "SKIP", "IMPORT_FAIL": "IMPORT_FAIL"}.get(result, result)
        print(f"  {key}: {s}")

    print("\nConclusion:")
    if results.get("2.42.0+llama3.2-3b(qnn2.37)") == "OK":
        print("  SDK 2.42 IS backward compatible with 2.37 models -> new SDK can replace old")
    elif results.get("2.42.0+llama3.2-3b(qnn2.37)") == "FAIL":
        print("  SDK 2.42 is NOT backward compatible with 2.37 models -> must keep old SDK")
    else:
        print("  Cannot determine compatibility from this test")


if __name__ == "__main__":
    main()
