#!/usr/bin/env python3
"""
NPU 性能深度诊断和优化工具
"""
import os
import sys
import json
from pathlib import Path

print("=" * 60)
print("NPU 性能深度诊断工具")
print("=" * 60)
print()

# ==================== 1. 检查配置文件 ====================
print("[1/5] 检查配置文件...")

config_path = Path("C:/test/antinet/config.json")

if not config_path.exists():
    print("  ✗ config.json 不存在")
    sys.exit(1)

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

print(f"  ✓ 配置文件存在")

# 检查关键配置
backend_config = config.get("backend", {})
inference_config = config.get("inference", {})

print()
print("  当前配置:")
print(f"    - Backend Type: {backend_config.get('type', 'N/A')}")
print(f"    - Performance Mode: {backend_config.get('performance_mode', 'N/A')}")
print(f"    - Max New Tokens: {inference_config.get('max_new_tokens', 'N/A')}")
print(f"    - Temperature: {inference_config.get('temperature', 'N/A')}")

# 检查是否启用 BURST 模式
if backend_config.get("performance_mode") != "BURST":
    print()
    print("  ⚠️  未启用 BURST 性能模式")
    print("  建议: 设置 backend.performance_mode = 'BURST'")

# 检查 max_new_tokens
max_tokens = inference_config.get("max_new_tokens", 512)
if max_tokens > 256:
    print()
    print(f"  ⚠️  max_new_tokens 过大 ({max_tokens})")
    print("  建议: 减少至 128-256 以降低延迟")

print()

# ==================== 2. 检查 QNN 库 ====================
print("[2/5] 检查 QNN 库...")

qai_libs_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_libs_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

required_dlls = [
    (qai_libs_path, "QnnHtp.dll"),
    (qai_libs_path, "QnnSystem.dll"),
    (bridge_libs_path, "QnnHtp.dll"),
]

all_dlls_exist = True
for lib_path, dll_name in required_dlls:
    dll_path = Path(lib_path) / dll_name
    if dll_path.exists():
        print(f"  ✓ {dll_name} 存在于 {lib_path}")
    else:
        print(f"  ✗ {dll_name} 不存在于 {lib_path}")
        all_dlls_exist = False

if not all_dlls_exist:
    print()
    print("  ⚠️  部分 DLL 缺失，NPU 可能无法正常工作")

print()

# ==================== 3. 检查模型文件 ====================
print("[3/5] 检查模型文件...")

model_config = config.get("model", {})
model_path = Path(model_config.get("path", ""))

if model_path.exists():
    print(f"  ✓ 模型路径存在: {model_path}")
    
    # 检查模型文件
    model_files = list(model_path.glob("*.bin"))
    if model_files:
        print(f"  ✓ 找到 {len(model_files)} 个模型文件")
        for f in model_files[:3]:  # 只显示前3个
            size_mb = f.stat().st_size / (1024 ** 2)
            print(f"    - {f.name} ({size_mb:.1f} MB)")
    else:
        print(f"  ⚠️  未找到 .bin 模型文件")
else:
    print(f"  ✗ 模型路径不存在: {model_path}")

print()

# ==================== 4. 检查环境变量 ====================
print("[4/5] 检查环境变量...")

env_vars = {
    "QNN_LOG_LEVEL": os.environ.get("QNN_LOG_LEVEL", "未设置"),
    "QAI_LIBS_PATH": os.environ.get("QAI_LIBS_PATH", "未设置"),
}

for var, value in env_vars.items():
    print(f"  {var}: {value}")

if env_vars["QNN_LOG_LEVEL"] == "未设置":
    print()
    print("  ⚠️  QNN_LOG_LEVEL 未设置")
    print("  建议: 设置为 DEBUG 以启用详细日志")

print()

# ==================== 5. 生成优化建议 ====================
print("[5/5] 生成优化建议...")
print()

suggestions = []

# 检查 BURST 模式
if backend_config.get("performance_mode") != "BURST":
    suggestions.append({
        "priority": "高",
        "issue": "未启用 BURST 性能模式",
        "solution": "在 config.json 中设置 backend.performance_mode = 'BURST'",
        "expected_improvement": "延迟降低 30-50%"
    })

# 检查 max_new_tokens
if max_tokens > 256:
    suggestions.append({
        "priority": "高",
        "issue": f"max_new_tokens 过大 ({max_tokens})",
        "solution": "减少至 128-256",
        "expected_improvement": "延迟降低 20-40%"
    })

# 检查熔断阈值
circuit_breaker_threshold = backend_config.get("circuit_breaker_threshold_ms", 1000)
if circuit_breaker_threshold < 2000:
    suggestions.append({
        "priority": "中",
        "issue": f"熔断阈值过低 ({circuit_breaker_threshold}ms)",
        "solution": "提高至 2000-3000ms",
        "expected_improvement": "减少误报"
    })

# 检查 QNN 日志级别
if env_vars["QNN_LOG_LEVEL"] != "DEBUG":
    suggestions.append({
        "priority": "低",
        "issue": "QNN 日志级别未设置为 DEBUG",
        "solution": "设置 QNN_LOG_LEVEL=DEBUG 环境变量",
        "expected_improvement": "更详细的诊断信息"
    })

if suggestions:
    print("优化建议:")
    print()
    for i, s in enumerate(suggestions, 1):
        print(f"{i}. [{s['priority']}优先级] {s['issue']}")
        print(f"   解决方案: {s['solution']}")
        print(f"   预期改善: {s['expected_improvement']}")
        print()
else:
    print("✓ 配置已优化，无需调整")
    print()

# ==================== 自动应用优化 ====================
print("=" * 60)
print("是否自动应用优化？(y/n): ", end="")

try:
    choice = input().strip().lower()
    
    if choice == 'y':
        print()
        print("正在应用优化...")
        
        modified = False
        
        # 应用 BURST 模式
        if backend_config.get("performance_mode") != "BURST":
            backend_config["performance_mode"] = "BURST"
            modified = True
            print("  ✓ 启用 BURST 性能模式")
        
        # 减少 max_new_tokens
        if max_tokens > 256:
            inference_config["max_new_tokens"] = 256
            modified = True
            print("  ✓ 减少 max_new_tokens 至 256")
        
        # 调整熔断阈值
        if circuit_breaker_threshold < 2000:
            backend_config["circuit_breaker_threshold_ms"] = 2000
            modified = True
            print("  ✓ 提高熔断阈值至 2000ms")
        
        if modified:
            # 保存配置
            config["backend"] = backend_config
            config["inference"] = inference_config
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print()
            print("✓ 优化已应用并保存到 config.json")
            print()
            print("下一步:")
            print("  1. 重启后端服务")
            print("  2. 运行性能测试: python test_fixes.py")
        else:
            print()
            print("✓ 无需修改配置")
    else:
        print()
        print("已取消自动优化")
        
except KeyboardInterrupt:
    print()
    print("已取消")

print()
print("=" * 60)
print("诊断完成")
print("=" * 60)
print()

# 输出关键信息摘要
print("关键信息摘要:")
print(f"  - 配置文件: {'✓' if config_path.exists() else '✗'}")
print(f"  - QNN 库: {'✓' if all_dlls_exist else '✗'}")
print(f"  - 模型文件: {'✓' if model_path.exists() else '✗'}")
print(f"  - BURST 模式: {'✓' if backend_config.get('performance_mode') == 'BURST' else '✗'}")
print(f"  - 优化建议: {len(suggestions)} 项")
print()

if len(suggestions) > 0:
    print("⚠️  建议应用优化以提升性能")
else:
    print("✓ 配置已优化")

print()
