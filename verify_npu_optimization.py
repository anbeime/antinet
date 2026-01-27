"""
NPU 优化效果快速验证脚本
测试优化后的推理性能
"""
import sys
import time
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_npu_optimization():
    """测试 NPU 优化效果"""
    
    print("=" * 70)
    print("NPU 性能优化验证测试")
    print("=" * 70)
    
    try:
        # 导入模型加载器
        logger.info("导入模型加载器...")
        from backend.models.model_loader import get_model_loader
        
        # 获取模型加载器实例
        logger.info("获取模型加载器实例...")
        loader = get_model_loader()
        
        # 加载模型
        logger.info("加载模型到 NPU...")
        start_load = time.time()
        model = loader.load()
        load_time = time.time() - start_load
        logger.info(f"✅ 模型加载完成，耗时: {load_time:.2f}s")
        
        # 测试用例
        test_cases = [
            {
                "name": "快速问答",
                "prompt": "什么是AI PC？",
                "max_tokens": 64,
                "expected_time": 500
            },
            {
                "name": "数据分析",
                "prompt": "分析一下端侧AI的优势",
                "max_tokens": 64,
                "expected_time": 500
            },
            {
                "name": "简短对话",
                "prompt": "你好",
                "max_tokens": 32,
                "expected_time": 300
            }
        ]
        
        results = []
        
        print("\n" + "=" * 70)
        print("开始推理性能测试")
        print("=" * 70)
        
        for i, test in enumerate(test_cases, 1):
            print(f"\n测试 {i}/{len(test_cases)}: {test['name']}")
            print(f"提示词: {test['prompt']}")
            print(f"Token 数: {test['max_tokens']}")
            print(f"期望延迟: < {test['expected_time']}ms")
            print("-" * 70)
            
            try:
                # 执行推理
                start_time = time.time()
                result = loader.infer(
                    prompt=test['prompt'],
                    max_new_tokens=test['max_tokens']
                )
                inference_time = (time.time() - start_time) * 1000
                
                # 判断是否通过
                passed = inference_time < test['expected_time']
                status = "✅ 通过" if passed else "❌ 未通过"
                
                print(f"推理延迟: {inference_time:.2f}ms")
                print(f"测试结果: {status}")
                print(f"生成内容: {result[:100]}...")
                
                results.append({
                    "name": test['name'],
                    "inference_time": inference_time,
                    "expected_time": test['expected_time'],
                    "passed": passed
                })
                
            except Exception as e:
                logger.error(f"❌ 推理失败: {e}")
                results.append({
                    "name": test['name'],
                    "inference_time": None,
                    "expected_time": test['expected_time'],
                    "passed": False,
                    "error": str(e)
                })
        
        # 汇总结果
        print("\n" + "=" * 70)
        print("测试结果汇总")
        print("=" * 70)
        
        passed_count = sum(1 for r in results if r['passed'])
        total_count = len(results)
        
        print(f"\n通过率: {passed_count}/{total_count} ({passed_count/total_count*100:.1f}%)")
        print("\n详细结果:")
        
        for r in results:
            if r.get('error'):
                print(f"  ❌ {r['name']}: 错误 - {r['error']}")
            else:
                status = "✅" if r['passed'] else "❌"
                print(f"  {status} {r['name']}: {r['inference_time']:.2f}ms (期望 < {r['expected_time']}ms)")
        
        # 性能统计
        valid_times = [r['inference_time'] for r in results if r['inference_time'] is not None]
        if valid_times:
            avg_time = sum(valid_times) / len(valid_times)
            min_time = min(valid_times)
            max_time = max(valid_times)
            
            print("\n性能统计:")
            print(f"  平均延迟: {avg_time:.2f}ms")
            print(f"  最快延迟: {min_time:.2f}ms")
            print(f"  最慢延迟: {max_time:.2f}ms")
        
        # 优化效果评估
        print("\n" + "=" * 70)
        print("优化效果评估")
        print("=" * 70)
        
        if passed_count == total_count:
            print("✅ 所有测试通过！NPU 优化效果显著！")
            print("   - BURST 模式已生效")
            print("   - Token 优化已生效")
            print("   - 推理性能达标")
        elif passed_count > 0:
            print("⚠️  部分测试通过，优化效果一般")
            print("   建议检查:")
            print("   - NPU 驱动状态")
            print("   - QNN backend 配置")
            print("   - 模型量化版本")
        else:
            print("❌ 所有测试未通过，优化效果不佳")
            print("   请检查:")
            print("   - 后端服务是否重启")
            print("   - NPU 是否正常工作")
            print("   - 查看后端日志获取详细信息")
        
        print("\n" + "=" * 70)
        
        return passed_count == total_count
        
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("\n🚀 开始 NPU 优化验证测试...\n")
    
    success = test_npu_optimization()
    
    print("\n" + "=" * 70)
    if success:
        print("✅ 验证完成：NPU 优化成功！")
        sys.exit(0)
    else:
        print("❌ 验证完成：NPU 优化需要进一步调整")
        sys.exit(1)
