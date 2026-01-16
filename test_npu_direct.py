"""
NPU 直接测试 - 最简单版本
"""
import sys
import os

print("=" * 60)
print("NPU 环境测试")
print("=" * 60)

# 测试1: Python版本
print(f"\n[1] Python版本: {sys.version}")
print(f"Python路径: {sys.executable}")

# 测试2: 检查模型文件
model_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34"
print(f"\n[2] 检查模型路径: {model_path}")
if os.path.exists(model_path):
    print(f"✓ 模型目录存在")
    files = os.listdir(model_path)
    print(f"  文件数量: {len(files)}")
    print(f"  前5个文件: {files[:5]}")
else:
    print(f"✗ 模型目录不存在")
    sys.exit(1)

# 测试3: 检查QAI库
qai_libs = r"C:\ai-engine-direct-helper\samples\qai_libs"
print(f"\n[3] 检查QAI库路径: {qai_libs}")
if os.path.exists(qai_libs):
    print(f"✓ QAI库目录存在")
    files = os.listdir(qai_libs)
    print(f"  库文件: {files}")
else:
    print(f"✗ QAI库目录不存在")
    sys.exit(1)

# 测试4: 尝试导入QAI
print(f"\n[4] 尝试导入 qai_appbuilder...")
try:
    from qai_appbuilder import QNNContext, QNNConfig
    print(f"✓ qai_appbuilder 导入成功")
except ImportError as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试5: 配置QNN
print(f"\n[5] 配置 QNN...")
try:
    QNNConfig.Config(
        qai_libs,
        'Htp',
        0,  # LogLevel.INFO
        0,  # ProfilingLevel.BASIC
        ''
    )
    print(f"✓ QNN 配置成功")
except Exception as e:
    print(f"✗ QNN 配置失败: {e}")
    sys.exit(1)

# 测试6: 加载模型
print(f"\n[6] 加载模型...")
try:
    model = QNNContext('Qwen2.0-7B-SSD', model_path)
    print(f"✓ 模型加载成功")
    print(f"  模型类型: {type(model)}")
    
    # 检查可用方法
    methods = [m for m in dir(model) if not m.startswith('_') and callable(getattr(model, m))]
    print(f"  可用方法数量: {len(methods)}")
    print(f"  前10个方法: {methods[:10]}")
except Exception as e:
    print(f"✗ 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ 所有测试通过！NPU环境正常")
print("=" * 60)
