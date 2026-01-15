"""GenieContext 测试 - 使用绝对路径"""
import os

# 设置环境
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print(f"[OK] PATH 已设置: {lib_path}")

# 导入
from qai_appbuilder import GenieContext

# 使用绝对路径
config = "C:/ai-engine-direct-helper/samples/genie/python/models/IBM-Granite-v3.1-8B/config.json"

print("=" * 70)
print("GenieContext 绝对路径测试")
print("=" * 70)

print(f"\n配置路径: {config}")
print(f"文件存在: {os.path.exists(config)}")

if not os.path.exists(config):
    print(f"\n[ERROR] 配置文件不存在")
    print(f"尝试 llama3.2-3b")
    config = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"
    print(f"    新路径: {config}")
    print(f"    文件存在: {os.path.exists(config)}")

print(f"\n创建 GenieContext...")

import time
start = time.time()

try:
    dialog = GenieContext(config)
    elapsed = time.time() - start

    print(f"[OK] GenieContext 创建成功！")
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
    print(f"[ERROR] GenieContext 创建失败！")
    print(f"    耗时: {elapsed:.2f}s")
    print(f"    错误: {e}")
    print(f"    类型: {type(e).__name__}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
