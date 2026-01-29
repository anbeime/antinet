#!/usr/bin/env python3
"""
NPU性能诊断脚本 - 检查为什么NPU速度慢
"""
import sys
import os
import time

# 添加backend到路径
sys.path.insert(0, 'backend')

print("=" * 70)
print("NPU Performance Diagnosis")
print("=" * 70)

# 1. 检查环境变量
print("\n[1] Checking Environment Variables...")
perf_mode = os.environ.get('QNN_PERFORMANCE_MODE', 'NOT SET')
print(f"  QNN_PERFORMANCE_MODE: {perf_mode}")

# 2. 检查配置
print("\n[2] Checking Config...")
try:
    from backend.config import settings
    print(f"  QNN_PERFORMANCE_MODE: {settings.QNN_PERFORMANCE_MODE}")
    print(f"  QNN_BACKEND: {settings.QNN_BACKEND}")
    print(f"  QNN_DEVICE: {settings.QNN_DEVICE}")
    print(f"  MODEL_NAME: {settings.MODEL_NAME}")
except Exception as e:
    print(f"  Error loading config: {e}")

# 3. 检查qai_hub_models是否可用（影响BURST模式设置方式）
print("\n[3] Checking qai_hub_models Availability...")
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
    print("  qai_hub_models: INSTALLED")
    print("  BURST mode method: PerfProfile.SetPerfProfileGlobal()")
except ImportError:
    print("  qai_hub_models: NOT INSTALLED")
    print("  BURST mode method: Environment variable QNN_PERFORMANCE_MODE")
    print("  Note: Both methods work, but code must check this correctly")

# 4. 检查NPU核心导入和初始化
print("\n[4] Testing NPU Core Initialization...")
try:
    from npu_core import NPUInferenceCore
    npu = NPUInferenceCore()
    print("  NPUInferenceCore: Created successfully")
    
    # 检查性能模式是否会在加载时应用
    print("\n[5] Checking Performance Mode Application...")
    print("  Looking at npu_core.py logic...")
    
    # 读取npu_core.py中关于性能模式的部分
    with open('backend/npu_core.py', 'r') as f:
        content = f.read()
        if 'PerfProfile' in content and 'try:' in content:
            print("  Code structure: Has try-except for PerfProfile")
            if 'SetPerfProfileGlobal' in content:
                print("  BURST mode setting: Found SetPerfProfileGlobal call")
            if 'QNN_PERFORMANCE_MODE' in content:
                print("  Fallback: Found QNN_PERFORMANCE_MODE env var usage")
    
except Exception as e:
    print(f"  Error: {e}")

# 5. 检查model_loader.py中的性能模式设置
print("\n[6] Checking model_loader.py Performance Settings...")
try:
    with open('backend/models/model_loader.py', 'r') as f:
        content = f.read()
        if 'HAS_QAI_HUB' in content:
            print("  HAS_QAI_HUB flag: Found")
        if 'PerfProfile' in content:
            print("  PerfProfile import: Found")
        if 'SetPerfProfileGlobal' in content:
            print("  SetPerfProfileGlobal: Found")
        if 'QNN_PERFORMANCE_MODE' in content:
            print("  QNN_PERFORMANCE_MODE env: Found")
except Exception as e:
    print(f"  Error: {e}")

# 6. 潜在问题分析
print("\n" + "=" * 70)
print("POTENTIAL ISSUES:")
print("=" * 70)

issues = []

# 检查配置和代码的一致性
if perf_mode == 'NOT SET' and 'qai_hub_models' not in sys.modules:
    issues.append("1. QNN_PERFORMANCE_MODE env var not set AND qai_hub_models not installed")
    issues.append("   -> BURST mode may not be active!")
    issues.append("   -> Fix: Set QNN_PERFORMANCE_MODE=BURST before running")

# 检查代码中是否有问题
try:
    with open('backend/npu_core.py', 'r') as f:
        content = f.read()
        # 检查是否在导入失败时正确跳过
        if 'except ImportError:' in content and 'pass' in content:
            issues.append("2. qai_hub_models import has bare 'pass' - may silently fail")
            issues.append("   -> This is OK, but BURST mode won't be set via PerfProfile")
except:
    pass

if not issues:
    print("  No obvious issues found in configuration")
else:
    for issue in issues:
        print(f"  {issue}")

# 7. 建议
print("\n" + "=" * 70)
print("RECOMMENDATIONS:")
print("=" * 70)
print("1. Set environment variable explicitly:")
print("   set QNN_PERFORMANCE_MODE=BURST")
print("")
print("2. Or install qai_hub_models for programmatic BURST control:")
print("   pip install git+https://github.com/quic/ai-ai-hub-models.git")
print("")
print("3. Verify BURST is active by checking logs for:")
print("   '[OK] 已启用BURST性能模式' (if qai_hub_models installed)")
print("   OR")
print("   '[INFO] 使用默认性能配置' (fallback mode)")
print("")
print("4. Current NPU slow reasons could be:")
print("   - First inference warmup (normal, ~10-30s)")
print("   - Model not using BURST mode (check logs)")
print("   - Input token length too long")
print("   - Model size (7B params is large for NPU)")
print("=" * 70)
