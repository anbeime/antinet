"""
快速NPU测试 - AIPC环境验证
"""
import sys
import time
sys.path.insert(0, r'C:\test\antinet\backend')

print("=" * 60)
print("NPU 快速测试")
print("=" * 60)

# 1. 测试导入
print("\n[1] 测试导入...")
try:
    from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel, PerfProfile
    print("✓ QAI AppBuilder 导入成功")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 2. 配置QNN
print("\n[2] 配置 QNN...")
try:
    QNNConfig.Config(
        r'C:\ai-engine-direct-helper\samples\qai_libs',
        'Htp',
        LogLevel.INFO,
        ProfilingLevel.BASIC,
        ''
    )
    print("✓ QNN 配置成功")
except Exception as e:
    print(f"✗ QNN 配置失败: {e}")
    sys.exit(1)

# 3. 加载模型
print("\n[3] 加载模型...")
try:
    model = QNNContext(
        "Qwen2.0-7B-SSD",
        r"C:\model\Qwen2.0-7B-SSD-8380-2.34"
    )
    print("✓ 模型加载成功")
    print(f"  - 模型类型: {type(model)}")
    print(f"  - 可用方法: {[m for m in dir(model) if not m.startswith('_')]}")
except Exception as e:
    print(f"✗ 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 4. 测试推理
print("\n[4] 测试推理...")
try:
    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
    start = time.time()
    
    # 尝试不同的方法
    if hasattr(model, 'Inference'):
        print("  尝试 Inference() 方法...")
        result = model.Inference()
    elif hasattr(model, 'generate'):
        print("  尝试 generate() 方法...")
        result = model.generate("测试")
    elif hasattr(model, 'forward'):
        print("  尝试 forward() 方法...")
        result = model.forward()
    else:
        print(f"  可用方法: {[m for m in dir(model) if not m.startswith('_')]}")
        result = "模型加载成功，但推理方法未找到"
    
    latency = (time.time() - start) * 1000
    PerfProfile.RelPerfProfileGlobal()
    
    print(f"✓ 推理完成")
    print(f"  - 延迟: {latency:.2f}ms")
    print(f"  - 结果: {str(result)[:100]}...")
except Exception as e:
    print(f"✗ 推理失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
