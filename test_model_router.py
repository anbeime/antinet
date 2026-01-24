#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试智能模型路由器
"""
import requests
import json

API_BASE = "http://localhost:8000"

# 测试用例
test_cases = [
    {
            "query": "你好",
            "expected_model": "llama3.2-3b",
            "expected_complexity": "simple",
            "reason": "简单问候"
        },
        {
            "query": "NPU性能怎么样",
            "expected_model": "llama3.2-3b",
            "expected_complexity": "simple",
            "reason": "简单技术问题"
        },
        {
            "query": "分析一下这个数据",
            "expected_model": "llama3.1-8b",
            "expected_complexity": "medium",
            "reason": "中等复杂度，包含'分析'"
        },
        {
            "query": "帮我详细分析NPU和CPU的性能差异，并给出优化建议和实施方案",
            "expected_model": "qwen2-7b-ssd",
            "expected_complexity": "complex",
            "reason": "复杂查询，包含多个技术术语"
        }
]

print("=" * 60)
print("智能模型路由器测试")
print("=" * 60)
print()

print(f"API端点: {API_BASE}/api/npu/test-router")
print()

results = []

for i, test in enumerate(test_cases, 1):
    print(f"--- 测试 {i}: {test['reason']} ---")
    print(f"查询: {test['query']}")
    print(f"预期模型: {test['expected_model']} ({test['expected_complexity']})")
    print()

    try:
        response = requests.post(
            f"{API_BASE}/api/npu/test-router",
            params={"query": test['query']},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()

            selected_model = result['selected_model']
            actual_complexity = result['complexity']['complexity']
            score = result['complexity']['score']

            # 验证结果
            model_match = selected_model == test['expected_model']
            complexity_match = actual_complexity == test['expected_complexity']

            print(f"✓ 实际模型: {selected_model}")
            print(f"  复杂度: {actual_complexity} (评分: {score}/100)")
            print(f"  模型选择: {'✓ 正确' if model_match else '✗ 错误'}")
            print(f"  复杂度判断: {'✓ 正确' if complexity_match else '✗ 错误'}")

            if not model_match:
                print(f"  预期: {test['expected_model']}")
                print(f"  实际: {selected_model}")

            print(f"  原因: {', '.join(result['complexity']['reasons'])}")

            results.append({
                'test_num': i,
                'query': test['query'],
                'model_match': model_match,
                'complexity_match': complexity_match,
                'score': score,
                'selected_model': selected_model
            })
        else:
            print(f"✗ 请求失败: HTTP {response.status_code}")
            print(f"  响应: {response.text}")
            results.append({
                'test_num': i,
                'query': test['query'],
                'model_match': False,
                'complexity_match': False,
                'error': f"HTTP {response.status_code}"
            })

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        results.append({
            'test_num': i,
            'query': test['query'],
            'model_match': False,
            'error': str(e)
        })

    print()

# 总结
print("=" * 60)
print("测试总结")
print("=" * 60)
print()

total = len(results)
model_correct = sum(1 for r in results if r.get('model_match', False))
complexity_correct = sum(1 for r in results if r.get('complexity_match', False))

print(f"总测试数: {total}")
print(f"模型选择正确: {model_correct}/{total} ({model_correct*100//total}%)")
print(f"复杂度判断正确: {complexity_correct}/{total} ({complexity_correct*100//total}%)")
print()

if model_correct == total and complexity_correct == total:
    print("✓ 所有测试通过！智能路由器工作正常")
else:
    print("⚠️  部分测试失败，需要调整路由逻辑")

print()
print("=" * 60)
