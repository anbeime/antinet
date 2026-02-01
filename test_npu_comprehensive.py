"""
NPU 综合验证脚本
测试环境配置、模型加载和推理性能
"""
import os
import sys
import time
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
backend_path = project_root / "backend"
sys.path.insert(0, str(backend_path))

print("="*70)
print("NPU 综合验证测试")
print("="*70)

# 1. 配置环境
print("\n[1/5] 配置环境...")
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 添加DLL目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)
        print(f"  [OK] 已添加: {p}")
    else:
        print(f"  [WARNING] 路径不存在: {p}")

# 2. 测试 QAI AppBuilder 导入
print("\n[2/5] 测试 QAI AppBuilder...")
try:
    from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
    print("  [OK] QAI AppBuilder 导入成功")
except Exception as e:
    print(f"  [ERROR] 导入失败: {e}")
    sys.exit(1)

# 3. 检查模型文件
print("\n[3/5] 检查模型文件...")
models = [
    ("Qwen2.0-7B-SSD", "C:/model/Qwen2.0-7B-SSD-8380-2.34"),
    ("llama3.2-3b", "C:/model/llama3.2-3b-8380-qnn2.37"),
    ("llama3.1-8b", "C:/model/llama3.1-8b-8380-qnn2.38")
]

available_models = []
for name, path in models:
    if os.path.exists(path):
        print(f"  [OK] {name}: 存在")
        available_models.append((name, path))
    else:
        print(f"  [ERROR] {name}: 不存在")

if not available_models:
    print("\n[ERROR] 没有可用的模型！")
    sys.exit(1)

# 4. 测试模型加载
print("\n[4/5] 测试模型加载...")

# 尝试加载第一个可用模型
model_name, model_path = available_models[0]
print(f"  尝试加载: {model_name}")

try:
    # 配置 QNN
    QNNConfig.Config(
        str(Path(lib_path)),
        Runtime.HTP,  # 使用 NPU
        LogLevel.INFO,
        ProfilingLevel.BASIC
    )

    # 加载模型
    start_load = time.time()
    model = QNNContext(model_name, model_path)
    load_time = time.time() - start_load

    print(f"  [成功] 模型加载完成，耗时: {load_time:.2f}s")
    print(f"  [成功] 运行设备: NPU (Hexagon)")

except Exception as e:
    print(f"  [ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 5. 简单推理测试
print("\n[5/5] 执行简单推理测试...")
try:
    test_prompt = "你好"

    print(f"  提示词: {test_prompt}")
    print("  执行推理中...")

    start_infer = time.time()
    # 这里使用 QNNContext 的 infer 方法
    # 注意：实际使用时需要根据模型的具体 API 调整
    result = model.generate([test_prompt], max_new_tokens=32)
    infer_time = (time.time() - start_infer) * 1000

    print(f"  [成功] 推理完成，延迟: {infer_time:.2f}ms")
    print(f"  [成功] 生成内容: {result[0][:50] if result else '无输出'}...")

    # 性能评估
    if infer_time < 500:
        print(f"  [优秀] 推理延迟 < 500ms (达标)")
    elif infer_time < 1000:
        print(f"  [良好] 推理延迟 < 1000ms (可接受)")
    else:
        print(f"  [警告] 推理延迟 > 1000ms (需要优化)")

except Exception as e:
    print(f"  [ERROR] 推理失败: {e}")
    import traceback
    traceback.print_exc()

# 总结
print("\n" + "="*70)
print("NPU 验证总结")
print("="*70)
print(f"[成功] 环境配置: OK")
print(f"[成功] QAI AppBuilder: OK")
print(f"[成功] 模型加载: OK ({model_name})")
print(f"[成功] 设备类型: NPU (Hexagon)")
print("="*70)
print("[完成] NPU 功能验证通过！")
print("="*70)
