import sys
import os
import time
import traceback

print("=" * 60)
print("测试: 无Unicode字符版本")
print("=" * 60)

# 设置路径
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
print("[1] 库路径:", lib_path)
print("    存在:", os.path.exists(lib_path))

os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
sys.path.insert(0, r'C:\ai-engine-direct-helper\samples')

print("[2] 导入 qai_appbuilder...")
try:
    import qai_appbuilder
    print("    OK 导入成功")
    print("    模块位置:", qai_appbuilder.__file__)
except Exception as e:
    print("    FAILED 导入失败:", e)
    traceback.print_exc()
    sys.exit(1)

print("[3] 导入 GenieContext...")
try:
    from qai_appbuilder import GenieContext
    print("    OK GenieContext 导入成功")
except Exception as e:
    print("    FAILED GenieContext 导入失败:", e)
    traceback.print_exc()
    sys.exit(1)

print("[4] 检查模型...")
config_path = r"C:\model\llama3.2-3b-8380-qnn2.37\config.json"
print("    配置文件:", config_path)
print("    存在:", os.path.exists(config_path))

if not os.path.exists(config_path):
    print("    FAILED 配置文件不存在")
    sys.exit(1)

print("[5] 尝试初始化 (最多等待30秒)...")
print("    开始时间:", time.strftime('%H:%M:%S'))

start = time.time()
timeout = 30
dialog = None

try:
    # 直接尝试
    dialog = GenieContext(config_path, False)
    elapsed = time.time() - start
    print("    SUCCESS 初始化成功!")
    print("    耗时:", elapsed, "秒")
    print("    对象类型:", type(dialog).__name__)
except Exception as e:
    elapsed = time.time() - start
    print("    ERROR 初始化失败!")
    print("    耗时:", elapsed, "秒")
    print("    错误类型:", type(e).__name__)
    print("    错误信息:", e)
    traceback.print_exc()

print("[6] 如果成功，测试推理...")
if dialog:
    print("    测试简单查询...")
    
    def response(text):
        print("    输出:", text, end='', flush=True)
        return True
    
    prompt = "Hello"
    print("    查询:", prompt)
    
    try:
        dialog.SetParams(32, 0.7, 40, 0.95)
        print("    参数已设置")
        
        # 快速查询
        dialog.Query(prompt, response)
        print("\n    OK 推理完成")
    except Exception as e:
        print("    ERROR 推理失败:", e)

print("\n" + "=" * 60)
print("测试完成 时间:", time.strftime('%H:%M:%S'))
print("=" * 60)