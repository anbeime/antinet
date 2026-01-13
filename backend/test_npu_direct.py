"""
直接测试 NPU 模型加载和推理
不依赖 FastAPI 服务
"""
import sys
import time
import logging
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.model_loader import NPUModelLoader

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_model_loading():
    """测试 1: 模型加载"""
    print("\n" + "=" * 70)
    print("测试 1: 模型加载")
    print("=" * 70)

    try:
        loader = NPUModelLoader()  # 使用默认推荐模型 (Qwen2.0-7B-SSD)
        model = loader.load()

        print("[OK] 模型加载成功")
        stats = loader.get_performance_stats()
        print(f"  - 模型: {stats['model_name']}")
        print(f"  - 参数量: {stats['params']}")
        print(f"  - 运行设备: {stats['device']}")

        return loader, True
    except Exception as e:
        print(f"[ERROR] 模型加载失败: {e}")
        import traceback
        traceback.print_exc()
        return None, False


def test_inference_performance(loader):
    """测试 2: NPU 推理性能"""
    print("\n" + "=" * 70)
    print("测试 2: NPU 推理性能（目标 < 500ms）")
    print("=" * 70)

    test_prompts = [
        "分析这段数据的趋势",
        "总结一下关键信息",
        "这个问题的解决方案是什么"
    ]

    latencies = []

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n测试 {i}/{len(test_prompts)}: {prompt}")

        start_time = time.time()
        result = loader.infer(prompt, max_new_tokens=64)
        latency = (time.time() - start_time) * 1000

        latencies.append(latency)

        status = "[OK]" if latency < 500 else "[WARNING] 超标"
        print(f"  - 延迟: {latency:.2f}ms {status}")
        print(f"  - 输出预览: {result[:80]}...")

    avg_latency = sum(latencies) / len(latencies)
    print(f"\n平均延迟: {avg_latency:.2f}ms")

    if avg_latency < 500:
        print("[OK] 性能测试通过（< 500ms）")
        return True
    else:
        print("[WARNING] 性能测试未通过（>= 500ms）")
        return False


def test_all_models():
    """测试 3: 所有可用模型"""
    print("\n" + "=" * 70)
    print("测试 3: 检查所有可用模型")
    print("=" * 70)

    models = NPUModelLoader.list_available_models()

    print(f"\n发现 {len(models)} 个可用模型:")

    for key, config in models.items():
        print(f"\n[{key}] {config['name']}")
        print(f"  - 参数量: {config['params']}")
        print(f"  - 量化: {config['quantization']}")
        print(f"  - 路径: {config['path']}")

        # 检查模型文件是否存在
        if Path(config['path']).exists():
            print(f"  - 状态: [OK] 文件存在")
        else:
            print(f"  - 状态: [WARNING] 文件不存在")

        if config.get('recommended'):
            print(f"  - [RECOMMENDED] 推荐首选")

    return True


def main():
    """主测试函数"""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "NPU 模型端到端测试" + " " * 37 + "║")
    print("╚" + "=" * 68 + "╝")

    # 测试所有可用模型
    test_all_models()

    # 测试模型加载
    loader, load_success = test_model_loading()

    if not load_success:
        print("\n[ERROR] 模型加载失败，无法继续测试")
        return 1

    # 测试推理性能
    inference_success = test_inference_performance(loader)

    # 汇总结果
    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)

    tests = [
        ("模型加载", load_success),
        ("推理性能", inference_success)
    ]

    for test_name, result in tests:
        status = "[OK] 通过" if result else "[ERROR] 失败"
        print(f"{test_name:<20} {status}")

    passed = sum(1 for _, r in tests if r)
    total = len(tests)

    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n[OK] 所有测试通过！NPU 端到端功能正常")
        return 0
    else:
        print(f"\n[WARNING] 部分测试失败 ({total - passed}/{total})")
        return 1


if __name__ == "__main__":
    sys.exit(main())
