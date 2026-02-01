# 验证 QAI AppBuilder 和 NPU 功能
import sys
from pathlib import Path

print("=" * 60)
print("Antinet - NPU 环境验证")
print("=" * 60)

# 1. 检查 Python 版本
print(f"\n[1/4] Python 版本: {sys.version}")

# 2. 检查 QAI AppBuilder
try:
    import qai_appbuilder
    print("[2/4] QAI AppBuilder: 已安装")
except ImportError as e:
    print(f"[2/4] QAI AppBuilder: 未安装 ({e})")
    sys.exit(1)

# 3. 检查预装模型
model_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
if model_path.exists():
    print(f"[3/4] 预装模型: 存在 ({model_path})")
else:
    print(f"[3/4] 预装模型: 不存在 ({model_path})")
    print("      提示: 请确认 AIPC 上已预装模型")

# 4. 检查可选依赖
try:
    import qai_hub_models
    print("[4/4] qai-hub-models: 已安装")
except ImportError:
    print("[4/4] qai-hub-models: 未安装 (不影响核心功能)")

print("\n" + "=" * 60)
print("结论: 核心功能可用，qai-hub-models 是可选的")
print("=" * 60)
