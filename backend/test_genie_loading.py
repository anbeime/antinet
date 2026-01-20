"""
GenieContext 加载测试 - 带超时和详细日志
"""
import os
import sys
import time
from pathlib import Path
from multiprocessing import Process, Queue

# 设置PATH环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
if lib_path not in os.getenv('PATH', ''):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')

print(f"PATH: {os.getenv('PATH')}")
print(f"当前工作目录: {os.getcwd()}")

def load_model_with_timeout(config_path, result_queue):
    """在独立进程中加载模型"""
    try:
        from qai_appbuilder import GenieContext

        print(f"[子进程] 开始加载 GenieContext...")
        print(f"[子进程] 配置文件: {config_path}")

        # 配置QNN（必需）
        from qai_appbuilder import QNNConfig, Runtime, LogLevel, ProfilingLevel

        print(f"[子进程] 配置QNN...")
        qnn_libs_path = "C:/ai-engine-direct-helper/samples/qai_libs"
        QNNConfig.Config(
            str(qnn_libs_path),
            Runtime.HTP,
            LogLevel.INFO,
            ProfilingLevel.BASIC,
            "None"
        )
        print(f"[子进程] QNN配置成功")

        # 加载模型
        print(f"[子进程] 创建 GenieContext...")
        start = time.time()
        model = GenieContext(config_path)
        load_time = time.time() - start

        print(f"[子进程] 加载成功！耗时: {load_time:.2f}秒")
        result_queue.put(("success", f"加载成功，耗时 {load_time:.2f}秒"))
    except Exception as e:
        print(f"[子进程] 加载失败: {e}")
        import traceback
        traceback.print_exc()
        result_queue.put(("error", str(e)))

def main():
    print("=" * 70)
    print("GenieContext 加载测试")
    print("=" * 70)

    # 检查配置文件
    config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
    if not Path(config_path).exists():
        print(f"\n❌ 配置文件不存在: {config_path}")
        return

    print(f"\n✓ 配置文件存在: {config_path}")

    # 检查模型文件
    model_dir = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
    model_files = list(model_dir.glob("model-*.bin"))
    print(f"\n✓ 模型文件数量: {len(model_files)}")
    if model_files:
        total_size = sum(f.stat().st_size for f in model_files)
        print(f"✓ 模型总大小: {total_size / 1024**3:.2f} GB")

    # 使用多进程加载（带超时）
    result_queue = Queue()
    process = Process(
        target=load_model_with_timeout,
        args=(config_path, result_queue)
    )

    print(f"\n✓ 开始加载（最多等待60秒）...")
    print(f"  时间: {time.strftime('%H:%M:%S')}")

    process.start()
    process.join(timeout=60)

    if process.is_alive():
        print(f"\n❌ 超时！加载超过60秒")
        print(f"  可能原因:")
        print(f"    1. 模型文件太大（{total_size / 1024**3:.2f}GB）")
        print(f"    2. NPU驱动初始化慢")
        print(f"    3. GenieContext 内部卡住")
        process.terminate()
        process.join(timeout=5)
        if process.is_alive():
            process.kill()
        return

    if not result_queue.empty():
        status, message = result_queue.get()
        if status == "success":
            print(f"\n✅ {message}")
        else:
            print(f"\n❌ 加载失败: {message}")
    else:
        print(f"\n❌ 未收到结果")

    print("\n" + "=" * 70)
    print("测试完成")
    print("=" * 70)

if __name__ == "__main__":
    main()
