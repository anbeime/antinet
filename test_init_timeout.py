import subprocess
import sys
import os
import time

print("测试 GenieContext 初始化（带超时）")
print("=" * 60)

# 创建测试脚本
test_code = """
import sys
import os
import time
import traceback

# 设置环境
lib_path = r"C:\\ai-engine-direct-helper\\samples\\qai_libs"
os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
sys.path.insert(0, r'C:\\ai-engine-direct-helper\\samples')

try:
    from qai_appbuilder import GenieContext
    
    config = r"C:\\model\\llama3.2-3b-8380-qnn2.37\\config.json"
    print(f"CONFIG_PATH:{config}")
    print(f"CONFIG_EXISTS:{os.path.exists(config)}")
    
    start = time.time()
    print(f"START_TIME:{time.time()}")
    
    # 尝试初始化
    dialog = GenieContext(config, False)
    
    end = time.time()
    elapsed = end - start
    
    print(f"SUCCESS")
    print(f"ELAPSED:{elapsed}")
    print(f"DIALOG_TYPE:{type(dialog).__name__}")
    
except Exception as e:
    end = time.time()
    elapsed = end - start if 'start' in locals() else 0
    print(f"ERROR")
    print(f"ELAPSED:{elapsed}")
    print(f"ERROR_TYPE:{type(e).__name__}")
    print(f"ERROR_MSG:{str(e)}")
    traceback.print_exc()
    
print(f"END_TIME:{time.time()}")
"""

# 写入临时文件
with open('temp_test.py', 'w', encoding='utf-8') as f:
    f.write(test_code)

print("[1] 运行测试（30秒超时）...")
print("    开始时间:", time.strftime('%H:%M:%S'))

try:
    # 运行子进程，设置超时
    result = subprocess.run(
        [sys.executable, 'temp_test.py'],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='ignore',
        timeout=30  # 30秒超时
    )
    
    print("[2] 进程完成")
    print("    返回码:", result.returncode)
    print("\n    标准输出:")
    print("    " + result.stdout.replace('\n', '\n    '))
    
    if result.stderr:
        print("\n    标准错误:")
        print("    " + result.stderr.replace('\n', '\n    '))
        
except subprocess.TimeoutExpired:
    print("[2] ❌ 超时！进程运行超过30秒")
    print("    GenieContext 初始化卡住")
    print("    可能原因:")
    print("      1. 模型文件损坏或不完整")
    print("      2. QNN 运行时库缺失依赖")
    print("      3. NPU 驱动/硬件问题")
    print("      4. 需要更长的加载时间（>30秒）")
    
except Exception as e:
    print("[2] ❌ 运行失败:", e)

# 清理
if os.path.exists('temp_test.py'):
    os.remove('temp_test.py')

print("\n" + "=" * 60)
print("测试完成 时间:", time.strftime('%H:%M:%S'))