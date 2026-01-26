import sys
import os
import time

# 设置路径
lib_path = 'C:/ai-engine-direct-helper/samples/qai_libs'
bridge_lib_path = 'C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc'
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 添加 DLL 目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

os.environ['QNN_LOG_LEVEL'] = 'ERROR'

print("测试 GenieContext 创建...")
try:
    from qai_appbuilder import GenieContext
    print("导入成功")
    
    config_path = 'C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json'
    print(f"配置文件: {config_path}")
    print(f"文件存在: {os.path.exists(config_path)}")
    
    start = time.time()
    genie = GenieContext(config_path)  # 单参数
    load_time = time.time() - start
    print(f"创建成功! 耗时 {load_time:.2f} 秒")
    
    # 简单查询
    print("执行简单查询...")
    start = time.time()
    result = genie.Query("Hello")
    infer_time = time.time() - start
    print(f"推理成功! 耗时 {infer_time*1000:.2f} ms")
    print(f"结果: {result[:100]}...")
    
except Exception as e:
    print(f"失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)