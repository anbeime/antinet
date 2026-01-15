"""GenieContext 简单测试 - 使用更小的模型"""
import sys
import os
import time
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')

# 设置 PATH 环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print(f"[OK] QNN 库已添加到 PATH")

from qai_appbuilder import GenieContext
from pathlib import Path

print("=" * 70)
print("GenieContext 简单测试 - 使用 llama3.2-3b 模型")
print("=" * 70)

# 使用更小的模型（加载更快）
config_path = Path("C:/model/llama3.2-3b-8380-qnn2.37/config.json")

print(f"\n[1] 检查配置文件...")
if not config_path.exists():
    print(f"[ERROR] 配置文件不存在: {config_path}")
    print(f"\n可用模型:")
    model_dir = Path("C:/model")
    if model_dir.exists():
        for item in model_dir.iterdir():
            if item.is_dir():
                config_file = item / "config.json"
                if config_file.exists():
                    print(f"  - {item.name}")
    sys.exit(1)
print(f"[OK] 配置文件存在: {config_path}")

print(f"\n[2] 尝试加载 GenieContext...")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")
print(f"    模型大小: ~2.3GB（比 Qwen2.0-7B-SSD 小很多）")

try:
    start_time = time.time()
    
    # 尝试加载
    genie = GenieContext(str(config_path))
    
    load_time = time.time() - start_time
    
    print(f"\n[SUCCESS] 模型加载成功！")
    print(f"    结束时间: {time.strftime('%H:%M:%S')}")
    print(f"    加载耗时: {load_time:.2f}s")
    print(f"    类型: {type(genie).__name__}")
    
    # 测试推理（简化版）
    print(f"\n[3] 测试简单推理...")
    try:
        test_prompt = "你好"
        
        # 使用列表捕获输出
        response_container = [""]
        def callback(text):
            response_container[0] += text
        
        infer_start = time.time()
        genie.Query(test_prompt, callback)
        infer_time = (time.time() - infer_start) * 1000
        
        print(f"[OK] 推理成功")
        print(f"    查询: {test_prompt}")
        print(f"    回答: {response_container[0]}")
        print(f"    延迟: {infer_time:.2f}ms")
        
    except Exception as e:
        print(f"[ERROR] 推理失败: {e}")
        import traceback
        traceback.print_exc()

except Exception as e:
    print(f"\n[ERROR] GenieContext 加载失败！")
    print(f"    错误: {e}")
    print(f"\n排查建议:")
    print(f"    1. 检查模型文件是否完整")
    print(f"    2. 检查 PATH 环境变量")
    print(f"    3. 检查是否有足够的内存")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
