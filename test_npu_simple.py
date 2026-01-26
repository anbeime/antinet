"""
最简单的 NPU 通信测试
"""
import sys
import os

# 添加 backend 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from npu_core import NPUInferenceCore

def test_npu_communication():
    """测试 NPU 是否能够正常通信"""
    print("=" * 50)
    print("NPU 通信测试")
    print("=" * 50)

    try:
        # 创建 NPU 核心
        print("\n[1/3] 创建 NPU 核心...")
        npu = NPUInferenceCore()
        print("NPU 核心创建成功")

        # 加载模型
        print("\n[2/3] 加载模型...")
        npu.load_model()
        print("模型加载成功")

        # 执行简单推理
        print("\n[3/3] 执行推理测试...")
        test_prompt = "你好"
        print(f"测试提示词: {test_prompt}")

        result, latency = npu.infer(test_prompt)

        print(f"\n推理成功!")
        print(f"推理结果: {result}")
        print(f"推理延迟: {latency:.2f}ms")

        print("\n" + "=" * 50)
        print("NPU 通信测试通过!")
        print("=" * 50)
        return True

    except Exception as e:
        print(f"\n 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_npu_communication()
    sys.exit(0 if success else 1)
