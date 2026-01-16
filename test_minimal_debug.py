#!/usr/bin/env python
"""最小化调试测试"""
import os
import sys
import time
import traceback

print("=" * 70)
print("最小化调试测试")
print("=" * 70)

# 设置环境变量
lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
print(f"[1] 设置 PATH: {lib_path}")
print(f"    目录存在: {os.path.exists(lib_path)}")

if os.path.exists(lib_path):
    os.environ['PATH'] = lib_path + ";" + os.getenv('PATH', '')
    print(f"    ✅ PATH 已更新")
    
    # 列出 DLL 文件
    print(f"    DLL 文件:")
    for f in os.listdir(lib_path):
        if f.endswith('.dll') or f.endswith('.so'):
            full_path = os.path.join(lib_path, f)
            size = os.path.getsize(full_path) / 1024
            print(f"      - {f} ({size:.1f} KB)")
else:
    print(f"    ❌ 库目录不存在!")

# 导入尝试
print(f"\n[2] 尝试导入 qai_appbuilder...")
sys.path.insert(0, r'C:\ai-engine-direct-helper\samples')

try:
    import qai_appbuilder
    print(f"    ✅ qai_appbuilder 导入成功")
    print(f"    模块位置: {qai_appbuilder.__file__}")
    
    # 列出可用类
    print(f"    可用类:")
    for attr in dir(qai_appbuilder):
        if not attr.startswith('_') and not attr.islower():
            print(f"      - {attr}")
            
except ImportError as e:
    print(f"    ❌ 导入失败: {e}")
    traceback.print_exc()
    sys.exit(1)

# 选择模型
print(f"\n[3] 选择模型...")
models_to_try = [
    (r"C:\model\llama3.2-3b-8380-qnn2.37", "llama3.2-3b (2.3GB)"),
    (r"C:\model\Qwen2.0-7B-SSD-8380-2.34", "Qwen2.0-7B-SSD (5GB)"),
]

for model_dir, model_name in models_to_try:
    config_path = os.path.join(model_dir, "config.json")
    print(f"\n    [{model_name}]")
    print(f"      目录: {model_dir}")
    print(f"      目录存在: {os.path.exists(model_dir)}")
    print(f"      配置: {config_path}")
    print(f"      配置存在: {os.path.exists(config_path)}")
    
    if os.path.exists(config_path):
        # 检查 .bin 文件
        bin_files = [f for f in os.listdir(model_dir) if f.endswith('.bin')]
        print(f"      .bin 文件: {len(bin_files)} 个")
        if bin_files:
            total_size = 0
            for f in bin_files[:3]:
                fp = os.path.join(model_dir, f)
                total_size += os.path.getsize(fp)
            print(f"      总大小: ~{total_size/(1024**3):.1f} GB")
    
print(f"\n[4] 测试 GenieContext 初始化...")
print(f"    开始时间: {time.strftime('%H:%M:%S')}")

# 使用最小的模型
test_model = r"C:\model\llama3.2-3b-8380-qnn2.37"
config_path = os.path.join(test_model, "config.json")

if not os.path.exists(config_path):
    print(f"    ❌ 配置文件不存在: {config_path}")
    sys.exit(1)

print(f"    使用模型: llama3.2-3b (2.3GB)")
print(f"    配置文件: {config_path}")

# 导入 GenieContext
try:
    from qai_appbuilder import GenieContext
    print(f"    ✅ GenieContext 导入成功")
except ImportError as e:
    print(f"    ❌ 导入失败: {e}")
    sys.exit(1)

# 尝试初始化（带超时）
print(f"\n[5] 尝试创建 GenieContext 对象...")
print(f"    (如果卡住，请等待最多 30 秒)")

start_time = time.time()

try:
    # 直接尝试，看看是否有立即错误
    dialog = GenieContext(config_path, False)
    elapsed = time.time() - start_time
    
    print(f"    [OK] 初始化成功!")
    print(f"    耗时: {elapsed:.2f} 秒")
    print(f"    对象类型: {type(dialog).__name__}")
    
except Exception as e:
    elapsed = time.time() - start_time
    print(f"    ❌ 初始化失败!")
    print(f"    耗时: {elapsed:.2f} 秒")
    print(f"    错误类型: {type(e).__name__}")
    print(f"    错误信息: {e}")
    traceback.print_exc()

print(f"\n[完成] 时间: {time.strftime('%H:%M:%S')}")
print("=" * 70)