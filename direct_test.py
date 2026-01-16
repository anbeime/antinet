import sys
import os
import traceback

# 重定向输出到文件
import sys
old_stdout = sys.stdout
old_stderr = sys.stderr

class Tee:
    def __init__(self, *files):
        self.files = files
    def write(self, data):
        for f in self.files:
            f.write(data)
            f.flush()
    def flush(self):
        for f in self.files:
            f.flush()

log_file = open('test_log.txt', 'w', encoding='utf-8')
sys.stdout = Tee(old_stdout, log_file)
sys.stderr = Tee(old_stderr, log_file)

print("=" * 60)
print("直接测试 qai_appbuilder 和 GenieContext")
print("=" * 60)

try:
    # 设置路径
    lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
    print(f"[1] 添加库路径: {lib_path}")
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    
    sys.path.insert(0, r'C:\ai-engine-direct-helper\samples')
    
    print("[2] 导入 qai_appbuilder...")
    import qai_appbuilder
    print(f"    [OK] 导入成功")
    print(f"    模块: {qai_appbuilder.__file__}")
    
    print("[3] 导入 GenieContext...")
    from qai_appbuilder import GenieContext
    print(f"    [OK] 导入成功")
    
    print("[4] 检查模型配置...")
    config_path = r"C:\model\llama3.2-3b-8380-qnn2.37\config.json"
    print(f"    配置文件: {config_path}")
    print(f"    文件存在: {os.path.exists(config_path)}")
    
    if os.path.exists(config_path):
        print("[5] 尝试创建 GenieContext...")
        print("    (如果卡住，请等待)")
        
        import time
        start = time.time()
        
        try:
            dialog = GenieContext(config_path, False)
            elapsed = time.time() - start
            
            print(f"    [OK] 创建成功!")
            print(f"    耗时: {elapsed:.2f} 秒")
            print(f"    对象: {type(dialog).__name__}")
            
            # 测试方法
            print("[6] 测试方法...")
            methods = [m for m in dir(dialog) if not m.startswith('_')]
            print(f"    可用方法: {methods[:10]}...")
            
        except Exception as e:
            elapsed = time.time() - start
            print(f"    [ERROR] 创建失败!")
            print(f"    耗时: {elapsed:.2f} 秒")
            print(f"    错误: {e}")
            traceback.print_exc()
    else:
        print("    [ERROR] 配置文件不存在")
        
except Exception as e:
    print(f"[ERROR] 测试过程出错: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)

# 恢复输出
sys.stdout = old_stdout
sys.stderr = old_stderr
log_file.close()

print("\n日志已保存到 test_log.txt")