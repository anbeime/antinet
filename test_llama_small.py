"""测试较小的 llama3.2-3b 模型"""
import os
import sys
import time
import threading
import ctypes

print("=" * 70)
print("测试 llama3.2-3b 模型（~2.3GB）")
print("=" * 70)

# [1] 设置环境
print("\n[1] 设置环境...")
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
original_path = os.getenv('PATH', '')
print(f"    原始 PATH 长度: {len(original_path)}")
print(f"    库路径: {lib_path}")
print(f"    库路径存在: {os.path.exists(lib_path)}")

# 添加库路径到 PATH
if lib_path not in original_path:
    os.environ['PATH'] = lib_path + ";" + original_path
    print(f"    ✅ 已添加库路径到 PATH")
else:
    print(f"    ℹ️ 库路径已在 PATH 中")

# [2] 测试是否能加载 QNN DLL
print("\n[2] 测试加载 QNN DLL...")
dll_path = os.path.join(lib_path, "QnnHtp.dll")
print(f"    DLL 路径: {dll_path}")
print(f"    DLL 存在: {os.path.exists(dll_path)}")

if os.path.exists(dll_path):
    try:
        # 尝试加载 DLL
        dll = ctypes.WinDLL(dll_path)
        print(f"    ✅ QnnHtp.dll 加载成功")
    except Exception as e:
        print(f"    ❌ QnnHtp.dll 加载失败: {e}")
else:
    print(f"    ❌ DLL 文件不存在")

# [3] 导入 qai_appbuilder
print("\n[3] 导入 qai_appbuilder...")
try:
    sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')
    from qai_appbuilder import GenieContext
    print("    ✅ qai_appbuilder 导入成功")
    print(f"    GenieContext: {GenieContext}")
except ImportError as e:
    print(f"    ❌ 导入失败: {e}")
    sys.exit(1)

# [4] 配置模型路径
print("\n[4] 配置模型路径...")
model_dir = "C:/model/llama3.2-3b-8380-qnn2.37"
config_path = os.path.join(model_dir, "config.json")
print(f"    模型目录: {model_dir}")
print(f"    目录存在: {os.path.exists(model_dir)}")
print(f"    配置文件: {config_path}")
print(f"    文件存在: {os.path.exists(config_path)}")

if not os.path.exists(config_path):
    print(f"    ❌ 配置文件不存在")
    sys.exit(1)

# 检查模型文件
bin_files = [f for f in os.listdir(model_dir) if f.endswith('.bin')]
print(f"    .bin 文件数量: {len(bin_files)}")
if bin_files:
    for i, f in enumerate(bin_files[:3]):
        file_path = os.path.join(model_dir, f)
        size = os.path.getsize(file_path) / (1024**3)  # GB
        print(f"      {i+1}. {f} ({size:.2f} GB)")

# [5] 创建 GenieContext（带超时和线程）
print("\n[5] 创建 GenieContext...")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")
print(f"    注意: 2.3GB 模型首次加载可能需要 1-3 分钟")

result = {
    "dialog": None,
    "error": None,
    "done": False,
    "start_time": time.time()
}

def create_genie():
    try:
        print(f"    [线程] 开始创建 GenieContext...")
        result["dialog"] = GenieContext(config_path, False)
        result["done"] = True
        print(f"    [线程] GenieContext 创建成功")
    except Exception as e:
        result["error"] = e
        result["done"] = True
        print(f"    [线程] 创建失败: {e}")

# 启动线程
thread = threading.Thread(target=create_genie, daemon=True)
thread.start()

# 等待，定期输出状态
timeout = 180  # 3分钟
check_interval = 10  # 每10秒检查一次
elapsed = 0

print(f"\n[等待] 最长等待 {timeout} 秒...")
while elapsed < timeout and not result["done"]:
    time.sleep(check_interval)
    elapsed += check_interval
    print(f"    [{time.strftime('%H:%M:%S')}] 已等待 {elapsed} 秒...")
    
    # 检查线程是否存活
    if not thread.is_alive():
        print(f"    ⚠️ 线程已退出但未设置完成标志")
        break

# 处理结果
if result["done"]:
    if result["error"]:
        print(f"\n[失败] GenieContext 创建失败:")
        print(f"    错误: {result['error']}")
        import traceback
        traceback.print_exc()
    else:
        total_time = time.time() - result["start_time"]
        print(f"\n[成功] ✅ GenieContext 创建成功!")
        print(f"    总耗时: {total_time:.2f} 秒 ({total_time/60:.2f} 分钟)")
        print(f"    类型: {type(result['dialog']).__name__}")
        
        # 快速推理测试
        print(f"\n[6] 快速推理测试...")
        def response(text):
            print(f"    输出: {text}", end='', flush=True)
            return True
        
        prompt = "Hello"
        print(f"    查询: {prompt}")
        
        try:
            result["dialog"].SetParams(32, 0.7, 40, 0.95)
            print(f"    参数已设置")
            
            # 设置超时
            import queue
            q = queue.Queue()
            
            def query_thread():
                try:
                    result["dialog"].Query(prompt, response)
                    q.put("success")
                except Exception as e:
                    q.put(e)
            
            t = threading.Thread(target=query_thread, daemon=True)
            t.start()
            
            # 等待最多30秒
            try:
                output = q.get(timeout=30)
                if output == "success":
                    print(f"\n    ✅ 推理完成")
                else:
                    print(f"\n    ❌ 推理失败: {output}")
            except queue.Empty:
                print(f"\n    ⚠️ 推理超时（30秒）")
                print(f"    模型可能仍在处理中")
                
        except Exception as e:
            print(f"    ❌ 推理设置失败: {e}")
            
else:
    print(f"\n[超时] ⚠️ 等待 {timeout} 秒后超时")
    print(f"    模型加载仍在进行中")
    print(f"    可能的原因:")
    print(f"      1. 模型文件损坏或不完整")
    print(f"      2. QNN 运行时库缺失依赖")
    print(f"      3. 需要更长的加载时间（>3分钟）")
    print(f"      4. NPU 驱动或硬件问题")

print("\n" + "=" * 70)
print("测试完成")
print("=" * 70)