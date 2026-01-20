"""
NPU 真实推理测试
使用 QAI AppBuilder 直接调用 NPU
"""
import sys
import time
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

print("=" * 70)
print("NPU 真实推理测试 - QAI AppBuilder")
print("=" * 70)

# 1. 导入 QAI AppBuilder
print("\n[步骤 1] 导入 QAI AppBuilder...")
try:
    from qai_appbuilder import (
        QNNContext,
        QNNConfig,
        Runtime,
        LogLevel,
        ProfilingLevel,
        PerfProfile
    )
    print("[OK] QAI AppBuilder 导入成功")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    print("\n请先安装 QAI AppBuilder:")
    print("pip install C:/ai-engine-direct-helper/samples/qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl")
    sys.exit(1)

# 2. 验证模型文件
print("\n[步骤 2] 验证模型文件...")
model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")

if not model_path.exists():
    print(f"[ERROR] 模型路径不存在: {model_path}")
    print("\n请确认:")
    print("1. 模型已从 .zip 解压到 C:/model/")
    print("2. 目录名称正确: Qwen2.0-7B-SSD-8380-2.34")
    sys.exit(1)

print(f"[OK] 模型路径存在: {model_path}")

# 3. 配置 QNN 环境
print("\n[步骤 3] 配置 QNN 环境...")
qnn_libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")

if not qnn_libs_path.exists():
    print(f"[WARNING] QNN 库路径不存在: {qnn_libs_path}")
    print("尝试使用默认路径...")
    QNNConfig.Config('', Runtime.HTP, LogLevel.INFO, ProfilingLevel.BASIC)
else:
    print(f"[OK] QNN 库路径: {qnn_libs_path}")
    QNNConfig.Config(
        str(qnn_libs_path),
        Runtime.HTP,
        LogLevel.INFO,
        ProfilingLevel.BASIC
    )

print("[OK] QNN 环境配置完成")

# 4. 加载模型
print("\n[步骤 4] 加载 NPU 模型...")
try:
    start_time = time.time()

    # 定义自定义 LLM 模型类
    class LLMModel(QNNContext):
        def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7):
            """
            执行文本生成推理

            注意: 此方法需要根据具体 QNN 模型格式实现
            当前返回模拟输出用于测试
            """
            print(f"[INFO] 推理输入: {prompt[:50]}...")
            print(f"[INFO] 参数: max_tokens={max_tokens}, temperature={temperature}")

            # TODO: 实现真实的 NPU 推理
            # 需要分析 QNN 模型的输入输出格式
            # 并正确构造输入数据
            raise NotImplementedError("真实NPU推理未实现。请使用NPUModelLoader进行真实推理。")

    model = LLMModel("Qwen2.0-7B-SSD", str(model_path))

    load_time = time.time() - start_time
    print(f"[OK] 模型加载成功")
    print(f"  - 模型名称: Qwen2.0-7B-SSD")
    print(f"  - 加载时间: {load_time:.2f}s")
    print(f"  - 运行设备: NPU (Hexagon)")

except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 5. 执行推理测试
print("\n[步骤 5] 执行推理测试...")
test_prompts = [
    "分析一下端侧AI的优势",
    "总结数据的主要趋势",
    "这个问题的解决方案是什么"
]

latencies = []

for i, prompt in enumerate(test_prompts, 1):
    print(f"\n测试 {i}/{len(test_prompts)}: {prompt}")

    try:
        # 设置性能模式为 BURST（高性能）
        PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)

        start_time = time.time()

        # 执行推理
        result = model.generate_text(
            prompt=prompt,
            max_tokens=128,
            temperature=0.7
        )

        inference_time = (time.time() - start_time) * 1000
        latencies.append(inference_time)

        # 重置性能模式
        PerfProfile.RelPerfProfileGlobal()

        print(f"  - 延迟: {inference_time:.2f}ms {'[OK]' if inference_time < 500 else '[WARNING]'}")
        print(f"  - 输出: {result[:80]}...")

    except Exception as e:
        print(f"  - [ERROR] 推理失败: {e}")
        import traceback
        traceback.print_exc()

# 6. 性能统计
print("\n" + "=" * 70)
print("性能统计")
print("=" * 70)

if latencies:
    avg_latency = sum(latencies) / len(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)

    print(f"平均延迟: {avg_latency:.2f}ms")
    print(f"最小延迟: {min_latency:.2f}ms")
    print(f"最大延迟: {max_latency:.2f}ms")

    # 性能达标检查
    if avg_latency < 500:
        print("\n[SUCCESS] 性能测试通过！平均延迟 < 500ms")
    else:
        print(f"\n[WARNING] 性能未达标！平均延迟 = {avg_latency:.2f}ms (目标 < 500ms)")

    # 设备检查
    print(f"\n设备信息:")
    print(f"  - 运行设备: NPU (Hexagon)")
    print(f"  - 模型: Qwen2.0-7B-SSD")
    print(f"  - 参数量: 7B")
    print(f"  - 量化版本: QNN 2.34")

else:
    print("[ERROR] 没有推理数据")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)