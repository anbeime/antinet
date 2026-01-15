"""最小化测试 - 只测试 GenieContext 导入和基本功能"""
import sys
import os

print("=" * 70)
print("GenieContext 最小化测试")
print("=" * 70)

# [1] 测试导入
print("\n[步骤 1] 测试 qai_appbuilder 导入...")
try:
    sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')
    from qai_appbuilder import GenieContext
    print("[OK] qai_appbuilder 导入成功")
    print(f"    GenieContext: {GenieContext}")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

# [2] 检查可用类和方法
print("\n[步骤 2] 检查 GenieContext 可用方法...")
print(f"    __init__: {GenieContext.__init__}")
print(f"    参数数量: {GenieContext.__init__.__code__.co_argcount}")

# [3] 测试配置文件读取
print("\n[步骤 3] 测试配置文件读取...")
from pathlib import Path
import json

config_path = Path("C:/model/llama3.2-3b-8380-qnn2.37/config.json")
try:
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    print(f"[OK] 配置文件读取成功")
    print(f"    大小: {len(json.dumps(config))} bytes")
    print(f"    前200字符: {json.dumps(config)[:200]}...")
except Exception as e:
    print(f"[ERROR] 配置文件读取失败: {e}")

# [4] 不实际创建 GenieContext，只打印信息
print("\n[步骤 4] 信息收集（不实际加载）...")
print("    模型: llama3.2-3b")
print("    大小: ~2.3GB")
print("    说明: 如果创建 GenieContext 卡住，可能是：")
print("      1. 模型文件损坏")
print("      2. GenieContext 需要额外的初始化")
print("      3. 缺少依赖库")

print("\n" + "=" * 70)
print("测试完成（未实际加载模型）")
print("=" * 70)

print("\n[建议]")
print("1. 如果上述步骤全部通过 → 尝试运行 GenieContext 示例")
print("2. 如果示例也失败 → 问题可能是环境或模型文件")
print("3. 如果示例成功 → 说明我们的代码有问题")
