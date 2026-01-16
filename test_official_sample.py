"""官方 GenieSample.py 的复制版本（测试是否能运行）"""
import os

lib_path = "qai_libs"  # The QAIRT runtime libraries path.
if not lib_path in os.getenv('PATH'):
    lib_path = os.getenv('PATH') + ";" + lib_path + ";"
    os.environ['PATH'] = lib_path

from qai_appbuilder import (GenieContext)

def response(text):
    # Print model generated text.
    print(text, end='', flush=True)
    return True

# Initialize model with official example model path.
config = os.path.join("C:/ai-engine-direct-helper/samples/genie/python/models", "IBM-Granite-v3.1-8B", "config.json")

print("=" * 70)
print("运行官方 GenieSample.py")
print("=" * 70)

print(f"\n配置路径: {config}")
print(f"绝对路径: {os.path.abspath(config)}")
print(f"文件存在: {os.path.exists(config)}")

if not os.path.exists(config):
    print(f"\n[ERROR] 官方模型不存在，使用 llama3.2-3b")
    config = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"
    print(f"    替换为: {config}")

print(f"\n创建 GenieContext...")

import time
start = time.time()

try:
    dialog = GenieContext(config, False)
    elapsed = time.time() - start
    print(f"[OK] GenieContext 创建成功！耗时: {elapsed:.2f}s")

    # Ask question.
    prompt = "<|start_of_role|>system<|end_of_role|>You are a helpful assistant.<|end_of_text|> <|start_of_role|>user<|end_of_role|>Hello<|end_of_text|> <|start_of_role|>assistant<|end_of_role|>"
    print(f"\n执行推理...")
    dialog.Query(prompt, response)

except Exception as e:
    elapsed = time.time() - start
    print(f"[ERROR] GenieContext 创建失败！耗时: {elapsed:.2f}s")
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
