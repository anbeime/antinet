"""GenieContext 最终测试 - 正确的参数格式"""
import os
import time

print("=" * 70)
print("GenieContext 正确参数测试")
print("=" * 70)

# [1] 设置环境
print("\n[步骤 1] 设置环境...")
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print("[OK] PATH 已设置")

# [2] 导入
print("\n[步骤 2] 导入 qai_appbuilder...")
from qai_appbuilder import GenieContext
print("[OK] 导入成功")

# [3] 配置
print("\n[步骤 3] 配置路径...")
config = "C:/ai-engine-direct-helper/samples/genie/python/models/IBM-Granite-v3.1-8B/config.json"
print(f"    配置文件: {config}")
print(f"    文件存在: {os.path.exists(config)}")

# [4] 创建 GenieContext（关键：传 2 个参数）
print("\n[步骤 4] 创建 GenieContext...")
print(f"    参数1 (config): {config}")
print(f"    参数2 (DEBUG): False")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")

try:
    start = time.time()

    # 只传 1 个参数（根据当前版本的 API）
    dialog = GenieContext(config, False)

    elapsed = time.time() - start

    print(f"\n[SUCCESS] GenieContext 创建成功！")
    print(f"    结束时间: {time.strftime('%H:%M:%S')}")
    print(f"    耗时: {elapsed:.2f}s")
    print(f"    类型: {type(dialog).__name__}")

    # 测试推理
    def response(text):
        print(f"[推理输出] {text}", end='', flush=True)
        return True

    prompt = "<|start_of_role|>system<|end_of_role|>You are a helpful assistant.<|end_of_text|> <|start_of_role|>user<|end_of_role|>Hello<|end_of_text|> <|start_of_role|>assistant<|end_of_role|>"
    print(f"\n执行推理...")
    dialog.Query(prompt, response)

except Exception as e:
    elapsed = time.time() - start
    print(f"\n[ERROR] GenieContext 创建失败！")
    print(f"    耗时: {elapsed:.2f}s")
    print(f"    错误: {e}")
    print(f"    类型: {type(e).__name__}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
