"""GenieContext 模型加载测试 - Qwen2.0 LLM 模型"""
import sys
import os
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')

# 设置 PATH 环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print(f"[OK] QNN 库已添加到 PATH")

from qai_appbuilder import GenieContext
from pathlib import Path
import time

print("=" * 70)
print("测试 GenieContext 加载 Qwen2.0-7B-SSD 模型")
print("=" * 70)

# 配置路径
config_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json")
prompt_path = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34/prompt.conf")

print(f"\n[1] 检查文件...")
print(f"    配置路径: {config_path}")
print(f"    提示路径: {prompt_path}")

if not config_path.exists():
    print(f"[ERROR] 配置文件不存在: {config_path}")
    sys.exit(1)
print("[OK] 文件存在")

print(f"\n[2] 加载模型...")
try:
    # GenieContext 初始化：参数=config.json路径
    print("    开始创建 GenieContext 实例...")
    print(f"    配置文件: {config_path}")
    
    import time
    start_time = time.time()
    print(f"    开始时间: {time.strftime('%H:%M:%S')}")
    
    try:
        genie = GenieContext(str(config_path))
    except Exception as e:
        print(f"[ERROR] GenieContext 创建失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    load_time = time.time() - start_time
    end_time = time.strftime('%H:%M:%S')
    
    print(f"[OK] 模型加载成功！")
    print(f"    结束时间: {end_time}")
    print(f"    加载耗时: {load_time:.2f}s")
    
    if load_time > 60:
        print(f"[WARNING] 加载时间较长（{load_time:.0f}s），属于正常现象（7B模型）")
    print(f"    类型: {type(genie).__name__}")
    print(f"    设备: NPU (GenieContext)")

    # 读取 prompt.conf
    if prompt_path.exists():
        with open(prompt_path, 'r', encoding='utf-8') as f:
            prompt_lines = f.read().strip().split('\n')
            prompt_tags = prompt_lines[0].split(': ')[1].strip()
            print(f"    提示模板: {prompt_tags}")
except Exception as e:
    print(f"[ERROR] 模型加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print(f"\n[3] 测试推理...")
try:
    # 设置推理参数
    max_length = 128
    temp = 0.8
    top_k = 40
    top_p = 0.95

    genie.SetParams(max_length, temp, top_k, top_p)
    print("[OK] 参数设置完成")

    # 构造查询提示
    query = "你好，请简单介绍一下高通骁龙 X Elite AIPC。"
    prompt = "User: " + query + "\nAssistant: "

    # 定义响应回调函数（使用列表来捕获响应）
    response_container = [""]
    def response_callback(text):
        response_container[0] += text
        print(text, end="", flush=True)

    print(f"\n[4] 执行推理...")
    print(f"    查询: {query}")
    print(f"    回答: ", end="")

    start_time = time.time()
    genie.Query(prompt, response_callback)
    inference_time = (time.time() - start_time) * 1000

    print(f"\n\n[OK] 推理完成！")
    print(f"    推理延迟: {inference_time:.2f}ms")

    # 获取性能数据
    try:
        profile_data = genie.GetProfile()
        print(f"    性能数据: {profile_data[:200]}..." if len(profile_data) > 200 else f"    性能数据: {profile_data}")
    except Exception as e:
        print(f"    性能数据获取失败: {e}")

except Exception as e:
    print(f"\n[ERROR] 推理失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)
