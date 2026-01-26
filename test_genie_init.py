"""
GenieContext 初始化测试 - 尝试不同配置
"""
import os
import sys
import time
from pathlib import Path

# 配置环境
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

# 添加到 PATH（尝试不同顺序）
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 添加DLL目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)
        print(f"[OK] 添加DLL目录: {p}")

# 设置 QNN 日志
os.environ['QNN_LOG_LEVEL'] = "DEBUG"
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"

# 添加 Genie 路径
genie_path = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if genie_path not in sys.path:
    sys.path.append(genie_path)
    print(f"[OK] 添加 Genie 路径")

# 预加载DLL
print("\n[INFO] 预加载DLL...")
import ctypes
dlls_to_load = ["QnnSystem.dll", "QnnModelDlc.dll", "QnnHtp.dll", "QnnHtpPrepare.dll"]
for dll in dlls_to_load:
    found = False
    for p in paths_to_add:
        dll_path = Path(p) / dll
        if dll_path.exists():
            try:
                ctypes.CDLL(str(dll_path))
                print(f"[OK] 预加载: {dll}")
                found = True
                break
            except Exception as e:
                print(f"[WARN] 预加载失败 {dll}: {e}")
    if not found:
        print(f"[WARN] 未找到: {dll}")

# 导入 GenieContext
print("\n[INFO] 导入 GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("[OK] GenieContext 导入成功")
except Exception as e:
    print(f"[ERROR] 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试配置
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"

print("\n" + "="*60)
print("GenieContext 初始化测试")
print("="*60)

# 测试1: GenieContext(config_path, False)
print("\n[测试1] GenieContext(config_path, False)...")
try:
    start_time = time.time()
    genie1 = GenieContext(config_path, False)
    load_time1 = time.time() - start_time
    print(f"[SUCCESS] 创建成功，耗时: {load_time1:.2f}秒")
    del genie1
except Exception as e:
    print(f"[FAILED] 错误: {e}")
    import traceback
    traceback.print_exc()

# 等待资源释放
print("\n[INFO] 等待3秒释放资源...")
time.sleep(3)

# 测试2: GenieContext(config_path, True)
print("\n[测试2] GenieContext(config_path, True)...")
try:
    start_time = time.time()
    genie2 = GenieContext(config_path, True)
    load_time2 = time.time() - start_time
    print(f"[SUCCESS] 创建成功，耗时: {load_time2:.2f}秒")
    del genie2
except Exception as e:
    print(f"[FAILED] 错误: {e}")
    import traceback
    traceback.print_exc()

# 等待资源释放
print("\n[INFO] 等待3秒释放资源...")
time.sleep(3)

# 测试3: 尝试其他模型
print("\n[测试3] 尝试 llama3.2-3b 模型...")
config_path_llama = "C:/model/llama3.2-3b-8380-qnn2.37/config.json"
if Path(config_path_llama).exists():
    try:
        start_time = time.time()
        genie3 = GenieContext(config_path_llama, False)
        load_time3 = time.time() - start_time
        print(f"[SUCCESS] 创建成功，耗时: {load_time3:.2f}秒")
        del genie3
    except Exception as e:
        print(f"[FAILED] 错误: {e}")
        import traceback
        traceback.print_exc()
else:
    print("[SKIP] llama3.2-3b 模型不存在")

print("\n" + "="*60)
print("测试完成")
print("="*60)
print("\n总结:")
print("- 如果所有测试都失败，说明 NPU 或驱动有问题")
print("- 如果测试2成功，建议使用 True 参数")
print("- 如果测试3成功，建议使用 llama3.2-3b（更小更快）")
