#!/usr/bin/env python3
"""
验证 BURST 模式是否正确启用
"""
import os
import sys

print("=" * 60)
print("BURST Mode Verification")
print("=" * 60)

# 检查环境变量
env_set = os.environ.get('QNN_PERFORMANCE_MODE', '')
print(f"\n[1] Environment Variable:")
print(f"    QNN_PERFORMANCE_MODE = {env_set if env_set else 'NOT SET'}")

# 检查代码修复
print(f"\n[2] Code Fix Check:")
try:
    with open('backend/npu_core.py', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        if 'QNN_PERFORMANCE_MODE' in content and 'os.environ' in content:
            print("    OK - npu_core.py has env var fallback")
        else:
            print("    FAIL - npu_core.py missing env var fallback")
except Exception as e:
    print(f"    SKIP - {e}")

try:
    with open('backend/models/model_loader.py', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        if 'QNN_PERFORMANCE_MODE' in content:
            print("    OK - model_loader.py has env var fallback")
        else:
            print("    FAIL - model_loader.py missing env var fallback")
except Exception as e:
    print(f"    SKIP - {e}")

# 测试导入
print(f"\n[3] Import Test:")
sys.path.insert(0, 'backend')
try:
    from npu_core import NPUInferenceCore
    print("    OK - npu_core imports successfully")
except Exception as e:
    print(f"    FAIL - {e}")

# 结论
print("\n" + "=" * 60)
if env_set.upper() == 'BURST':
    print("RESULT: BURST mode is enabled via environment variable")
    print("You do NOT need to install ai-hub-models")
else:
    print("RESULT: BURST mode NOT enabled")
    print("Run: set QNN_PERFORMANCE_MODE=BURST")
    print("Or install ai-hub-models for programmatic control")
print("=" * 60)
