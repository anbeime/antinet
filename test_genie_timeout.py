"""GenieContext 测试 - 超时检测（5分钟）"""
import os
import sys
import time
import threading

# 设置环境
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if not lib_path in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

print("=" * 70)
print("GenieContext 超时检测测试")
print("=" * 70)

# 导入
from qai_appbuilder import GenieContext

# 配置
config = "C:/ai-engine-direct-helper/samples/genie/python/models/IBM-Granite-v3.1-8B/config.json"

print(f"\n配置文件: {config}")
print(f"文件存在: {os.path.exists(config)}")

# 结果容器
result = {"success": False, "message": "", "elapsed": 0}

def create_genie_context():
    """在独立线程中创建 GenieContext"""
    try:
        start = time.time()
        print(f"\n[{time.strftime('%H:%M:%S')}] 开始创建 GenieContext...")

        dialog = GenieContext(config)

        elapsed = time.time() - start
        result["success"] = True
        result["message"] = f"GenieContext 创建成功，耗时: {elapsed:.2f}s"
        result["elapsed"] = elapsed
        print(f"[{time.strftime('%H:%M:%S')}] {result['message']}")

    except Exception as e:
        elapsed = time.time() - start
        result["success"] = False
        result["message"] = f"创建失败: {e}"
        result["elapsed"] = elapsed
        print(f"[{time.strftime('%H:%M:%S')}] [ERROR] {result['message']}")
        import traceback
        traceback.print_exc()

# 创建线程
print("\n启动创建线程（最大等待 5 分钟）...")
thread = threading.Thread(target=create_genie_context, daemon=True)
thread.start()

# 等待完成或超时
timeout_seconds = 300  # 5 分钟
interval = 10  # 每 10 秒打印一次状态
waited = 0

while thread.is_alive() and waited < timeout_seconds:
    time.sleep(interval)
    waited += interval
    print(f"[{time.strftime('%H:%M:%S')}] 已等待 {waited} 秒... (进度: {waited/timeout_seconds*100:.0f}%)", end='\r')

print()  # 换行

if waited >= timeout_seconds:
    print(f"\n[TIMEOUT] 超时！已等待 {timeout_seconds} 秒")
    print(f"GenieContext 创建仍在进行中（可能仍在加载模型）")
    print(f"\n说明:")
    print(f"  - 7-8B 模型第一次加载可能需要 5-10 分钟")
    print(f"  - 如果是这种情况，请继续等待")
    print(f"  - 如果等待 10 分钟后仍无响应，可能有问题")
else:
    print(f"\n[FINISHED] 线程完成")
    print(f"成功: {result['success']}")
    print(f"消息: {result['message']}")

print("\n" + "=" * 70)
print("诊断建议:")
print("=" * 70)

if result["success"]:
    print(f"✅ GenieContext 创建成功！")
    print(f"   耗时: {result['elapsed']:.2f}s")
    print(f"\n下一步:")
    print(f"  1. 测试推理功能")
    print(f"  2. 集成到 backend/models/model_loader.py")
else:
    print(f"❌ GenieContext 创建失败或超时")
    print(f"\n可能的原因:")
    print(f"  1. 模型文件损坏或不完整")
    print(f"  2. QNN 库加载失败")
    print(f"  3. GenieContext 内部错误")
    print(f"\n建议:")
    print(f"  1. 检查模型文件完整性")
    print(f"  2. 查看 Python 进程的 CPU/内存占用")
    print(f"  3. 检查是否有错误弹窗")
    print(f"  4. 尝试更小的模型（llama3.2-3b）")

print("=" * 70)
