"""GenieContext 测试 - 修复版本，使用绝对路径和详细调试"""
import os
import sys
import time

print("=" * 70)
print("GenieContext 测试 - 修复版本")
print("=" * 70)

# [1] 设置环境 - 绝对路径
print("\n[步骤 1] 设置环境...")
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
original_path = os.getenv('PATH', '')
print(f"    原始 PATH 长度: {len(original_path)}")
print(f"    库路径存在: {os.path.exists(lib_path)}")

# 添加库路径到 PATH
if lib_path not in original_path:
    os.environ['PATH'] = lib_path + ";" + original_path
    print(f"    已添加库路径到 PATH")
else:
    print(f"    库路径已在 PATH 中")

print(f"    当前 PATH 包含 qai_libs: {'qai_libs' in os.getenv('PATH', '')}")

# [2] 导入
print("\n[步骤 2] 导入 qai_appbuilder...")
try:
    sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')
    from qai_appbuilder import GenieContext
    print("[OK] 导入成功")
    print(f"    GenieContext 类: {GenieContext}")
except ImportError as e:
    print(f"[ERROR] 导入失败: {e}")
    sys.exit(1)

# [3] 配置 - 使用 Qwen2.0 模型
print("\n[步骤 3] 配置路径...")
config = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
print(f"    配置文件: {config}")
print(f"    文件存在: {os.path.exists(config)}")

# 检查模型文件
model_dir = "C:/model/Qwen2.0-7B-SSD-8380-2.34"
print(f"    模型目录存在: {os.path.exists(model_dir)}")
if os.path.exists(model_dir):
    bin_files = [f for f in os.listdir(model_dir) if f.endswith('.bin')]
    print(f"    .bin 文件数量: {len(bin_files)}")
    for i, f in enumerate(bin_files[:5]):
        print(f"      {i+1}. {f}")

# [4] 创建 GenieContext（带超时）
print("\n[步骤 4] 创建 GenieContext...")
print(f"    参数: {config}")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")

try:
    start = time.time()
    
    # 设置超时（10分钟）
    import threading
    result = {"dialog": None, "error": None, "done": False}
    
    def create_context():
        try:
            result["dialog"] = GenieContext(config, False)
            result["done"] = True
        except Exception as e:
            result["error"] = e
            result["done"] = True
    
    thread = threading.Thread(target=create_context, daemon=True)
    thread.start()
    
    # 等待最多10分钟
    timeout = 600  # 10分钟
    waited = 0
    interval = 5   # 每5秒检查一次
    
    while waited < timeout and not result["done"]:
        time.sleep(interval)
        waited += interval
        if waited % 30 == 0:  # 每30秒打印一次
            print(f"    [{time.strftime('%H:%M:%S')}] 已等待 {waited} 秒...")
    
    if not result["done"]:
        print(f"\n[TIMEOUT] 超时！已等待 {timeout} 秒")
        print(f"    GenieContext 仍在初始化中（可能正在加载大型模型）")
        print(f"    Qwen2.0-7B-SSD 模型约 5GB，首次加载可能需要较长时间")
        sys.exit(0)
    
    if result["error"]:
        raise result["error"]
    
    elapsed = time.time() - start
    
    print(f"\n[SUCCESS] GenieContext 创建成功！")
    print(f"    结束时间: {time.strftime('%H:%M:%S')}")
    print(f"    耗时: {elapsed:.2f}s")
    print(f"    类型: {type(result['dialog']).__name__}")

    # 测试推理
    print(f"\n[步骤 5] 测试推理...")
    def response(text):
        print(f"    推理输出: {text}", end='', flush=True)
        return True
    
    prompt = "你好，请简单介绍一下高通骁龙 X Elite AIPC。"
    print(f"    查询: {prompt}")
    
    try:
        # 设置推理参数
        result["dialog"].SetParams(64, 0.7, 40, 0.95)
        print(f"    参数已设置")
        
        # 执行推理
        result["dialog"].Query(prompt, response)
        print(f"\n    [推理完成]")
    except Exception as e:
        print(f"\n    [推理错误] {e}")

except Exception as e:
    elapsed = time.time() - start if 'start' in locals() else 0
    print(f"\n[ERROR] GenieContext 创建失败！")
    print(f"    耗时: {elapsed:.2f}s")
    print(f"    错误: {e}")
    print(f"    类型: {type(e).__name__}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)