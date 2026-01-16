"""GenieContext 测试 - 使用官方示例模式"""
import sys
import os

print("=" * 70)
print("GenieContext 测试 - 官方示例模式")
print("=" * 70)

# [1] 设置环境（和官方示例一样）
print("\n[步骤 1] 设置环境...")
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print("[OK] QNN 库已添加到 PATH")

# [2] 导入（和官方示例一样）
print("\n[步骤 2] 导入 qai_appbuilder...")
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
except Exception as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

# [3] 使用官方示例的模型路径
print("\n[步骤 3] 检查官方示例模型...")
model_dir = "C:/ai-engine-direct-helper/samples/genie/python/models"
if os.path.exists(model_dir):
    print(f"[OK] 模型目录存在: {model_dir}")
    available_models = os.listdir(model_dir)
    print(f"    可用模型: {available_models}")
else:
    print(f"[ERROR] 模型目录不存在: {model_dir}")

# [4] 尝试使用官方示例的 IBM-Granite 模型
config_path = os.path.join("genie", "python", "models", "IBM-Granite-v3.1-8B", "config.json")
print(f"\n[步骤 4] 尝试加载官方模型...")
print(f"    配置路径: {config_path}")
print(f"    绝对路径: {os.path.abspath(config_path)}")

if not os.path.exists(config_path):
    print(f"[WARNING] 官方模型不存在，尝试 llama3.2-3b")
    config_path = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"

print(f"\n[步骤 5] 创建 GenieContext（官方模式：1个参数）...")
try:
    import time
    start_time = time.time()
    print(f"    开始时间: {time.strftime('%H:%M:%S')}")

    # 官方示例：只传1个参数
    dialog = GenieContext(config_path, False)

    load_time = time.time() - start_time

    print(f"\n[SUCCESS] GenieContext 创建成功！")
    print(f"    结束时间: {time.strftime('%H:%M:%S')}")
    print(f"    加载耗时: {load_time:.2f}s")

except Exception as e:
    print(f"\n[ERROR] GenieContext 创建失败: {e}")
    print(f"\n错误类型: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
