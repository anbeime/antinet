"""GenieContext 测试 - 使用预装的 Qwen2.0 模型"""
import os
import time

print("=" * 70)
print("GenieContext 测试 - Qwen2.0-7B-SSD 模型")
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

# [3] 配置 - 使用 Qwen2.0 模型
print("\n[步骤 3] 配置路径...")
config = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"    配置文件: {config}")
print(f"    文件存在: {os.path.exists(config)}")

# [4] 创建 GenieContext
print("\n[步骤 4] 创建 GenieContext...")
print(f"    参数1 (config): {config}")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")

try:
    start = time.time()

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

    prompt = "你好，请简单介绍一下高通骁龙 X Elite AIPC。"
    print(f"\n执行推理...")
    print(f"    查询: {prompt}")
    
    # 设置推理参数
    dialog.SetParams(64, 0.7, 40, 0.95)
    
    # 执行推理
    dialog.Query(prompt, response)
    print("\n")

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
