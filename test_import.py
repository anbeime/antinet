#!/usr/bin/env python3
"""最简单的测试 - 只测试导入"""
import sys
import os

print("Python path:", sys.path[:3])
print("Current directory:", os.getcwd())
print("QNN_LOG_LEVEL:", os.environ.get('QNN_LOG_LEVEL', 'NOT SET'))

try:
    sys.path.insert(0, 'backend')
    print("Added backend to path")
    
    print("Importing models.model_loader...")
    from models.model_loader import ModelConfig
    print("SUCCESS: ModelConfig imported")
    print("Available models:", list(ModelConfig.MODELS.keys()))
    
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
