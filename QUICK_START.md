# Quick Start Guide - Llama3.2-3B Test

## Problem Fixed

The 3B model config.json had Android paths (`/sdcard/GenieModels/...`) instead of Windows paths.

## What Was Changed

**File**: `C:\model\llama3.2-3b-8380-qnn2.37\config.json`

| Change | Old Value | New Value |
|--------|-----------|-----------|
| Model path | `/sdcard/GenieModels/...` | `C:\model\llama3.2-3b-8380-qnn2.37\...` |
| n-threads | 3 | **6** |
| use-mmap | false | **true** |
| mmap-budget | 0 | **8GB** |

## Run Test

### Option 1: Double-click (Easiest)

```
File: c:\test\antinet\run_test_3b.bat
```

### Option 2: Command Line

```bash
cd c:\test\antinet
venv_arm64\Scripts\python test_llama3b_simple.py
```

## Expected Result

```
============================================================
Llama3.2-3B Minimal Model Test
============================================================
Model: C:\model\llama3.2-3b-8380-qnn2.37\config.json
Parameters: 3B

Loading model...
Load time: 3500ms

Running inference...
Hello! I'm Llama 3.2, developed by Meta...

Inference time: 750ms
Output: Hello! I'm Llama 3.2, developed by Meta...

Performance:
OK - Target reached (< 1s)
============================================================
```

## Key Points

- **Model format**: `.bin` (not `.ctx-bin`)
- **3B parameters**: 8-10x faster than 7B
- **Target**: < 1 second inference
- **Config optimized**: 6 threads, mmap enabled

## Troubleshooting

If still fails, check:

1. Model files exist in `C:\model\llama3.2-3b-8380-qnn2.37\`
2. All three `.bin` files present
3. DLL paths are correct in test script
