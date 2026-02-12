#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NPU and Vision Service Diagnostic
"""
import subprocess
import requests
import json
from datetime import datetime
import os
import sys

print("=" * 70)
print("NPU and Vision Service Diagnostic")
print("=" * 70)
print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# 1. Check backend service
print("[1] Check Backend Service (Port 8000)")
try:
    response = requests.get("http://127.0.0.1:8000/health", timeout=2)
    print(f"  [OK] Backend is running")
    print(f"  Status Code: {response.status_code}")
except Exception as e:
    print(f"  [FAIL] Backend not accessible: {e}")

# 2. Check Qwen VL service
print("\n[2] Check Qwen2.5-VL-3B Vision Service (Port 8910)")
vl_service_running = False
try:
    response = requests.get("http://127.0.0.1:8910/health", timeout=2)
    print(f"  [OK] Qwen VL service is running")
    print(f"  Status Code: {response.status_code}")
    vl_service_running = True
except Exception as e:
    print(f"  [FAIL] Qwen VL service not running: {e}")
    print(f"  [NOTE] This is why image upload is stuck!")

# 3. Check processes
print("\n[3] Check Python Processes")
try:
    result = subprocess.run(["tasklist", "/FI", "IMAGENAME eq python.exe", "/FO", "CSV"],
                         capture_output=True, text=True, encoding='gbk', errors='ignore')
    lines = result.stdout.strip().split('\n')[1:]  # Skip header
    python_processes = [line for line in lines if line and 'python.exe' in line.lower()]
    print(f"  Found {len(python_processes)} Python processes")
    for i, proc in enumerate(python_processes[:5], 1):  # Show first 5
        parts = [p.strip('"').strip() for p in proc.split(',')]
        if len(parts) >= 5:
            mem_str = parts[4] if len(parts) > 4 else "N/A"
            print(f"  {i}. PID: {parts[1]}, Memory: {mem_str}")
except Exception as e:
    print(f"  [FAIL] Failed to check processes: {e}")

# 4. Check NPU usage
print("\n[4] Check NPU Status")
try:
    # Check if qai_appbuilder is available
    import importlib.util
    spec = importlib.util.find_spec("qai_appbuilder")
    if spec:
        print(f"  [OK] qai_appbuilder is installed")
        print(f"  Location: {spec.origin if spec.origin else 'unknown'}")
    else:
        print(f"  [WARN] qai_appbuilder not found in current Python environment")
except Exception as e:
    print(f"  [FAIL] Failed to check qai_appbuilder: {e}")

# 5. Check model files
print("\n[5] Check Model Files")
model_paths = [
    ("Qwen VL Model", "C:/ai-engine-direct-helper/samples/genie/python/models/qwen2.5vl3b"),
    ("Qwen2.0-7B Model", "C:/model/Qwen2.0-7B-SSD-8380-2.34"),
]
for name, path in model_paths:
    if os.path.exists(path):
        print(f"  [OK] {name}: Exists")
    else:
        print(f"  [FAIL] {name}: Not found - {path}")

# 6. Summary
print("\n" + "=" * 70)
print("DIAGNOSIS SUMMARY")
print("=" * 70)

issues = []
solutions = []

if not vl_service_running:
    issues.append("Qwen2.5-VL-3B vision service is NOT running")
    solutions.append("Run: c:\\test\\antinet\\start_qwen_vl_python_service.bat")

if issues:
    print("\n[ISSUES FOUND]")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
    
    print("\n[SOLUTIONS]")
    for i, solution in enumerate(solutions, 1):
        print(f"  {i}. {solution}")
else:
    print("\n[OK] All services are running!")

print("\n" + "=" * 70)
