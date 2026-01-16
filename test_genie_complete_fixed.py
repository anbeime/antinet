"""
GenieContext 完整测试（修复版）
"""
import os
import sys
import time
import traceback

# 1. 设置 PATH（使用绝对路径）
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
current_path = os.getenv('PATH', '')

if lib_path not in current_path:
    os.environ['PATH'] = lib_path + ';' + current_path
    print(f"✅ PATH 已添加: {lib_path}")

print("=" * 70)
print("GenieContext 完整测试")
print("=" * 70)

# 2. 验证文件存在
dll_files = [
    "QnnHtp.dll",
    "QnnSystem.dll",
    "QnnHtpPrepare.dll",
    "msvcp140.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "ucrtbase.dll"
]

print("\n[1] 验证 DLL 文件")
all_exist = True
for dll in dll_files:
    dll_path = os.path.join(lib_path, dll)
    exists = os.path.exists(dll_path)
    status = "✅" if exists else "❌"
    print(f"  {status} {dll}: {exists}")
    if not exists:
        all_exist = False

if not all_exist:
    print("\n❌ 缺少必要的 DLL 文件")
    sys.exit(1)

# 3. 检查 Visual C++ 运行时
print("\n[2] 检查 Visual C++ 运行时")
try:
    import ctypes
    # 尝试加载关键 DLL
    ctypes.WinDLL(os.path.join(lib_path, "msvcp140.dll"))
    print("  ✅ msvcp140.dll 可加载")
    ctypes.WinDLL(os.path.join(lib_path, "vcruntime140.dll"))
    print("  ✅ vcruntime140.dll 可加载")
except Exception as e:
    print(f"  ❌ 加载失败: {e}")

# 4. 测试 GenieContext
print("\n[3] 测试 GenieContext 初始化")
try:
    from qai_appbuilder import GenieContext, QNNConfig

    # 配置 QNN
    print("  配置 QNN HTP 模式...")
    QNNConfig.Config(lib_path, 'Htp', 2, 0, '')
    print("  ✅ QNN 配置成功")

    # 初始化
    config_path = r'C:\test\antinet\config.json'
    print(f"  初始化 GenieContext...")

    start_time = time.time()
    genie = GenieContext(config_path)
    elapsed = time.time() - start_time

    print(f"  ✅ GenieContext 创建成功！耗时: {elapsed:.2f}s")
    print(f"  类型: {type(genie)}")

    # 检查方法
    methods = [m for m in dir(genie) if not m.startswith('_')]
    print(f"  可用方法数: {len(methods)}")

    if hasattr(genie, 'Query'):
        print("  ✅ 找到 Query 方法")

        # 5. 测试推理
        print("\n[4] 测试推理功能")
        test_prompt = "Hello, how are you?"
        print(f"  输入: {test_prompt}")

        result_parts = []
        def callback(text):
            result_parts.append(text)
            return True

        start_time = time.time()
        genie.Query(test_prompt, callback)
        inference_time = (time.time() - start_time) * 1000

        result = ''.join(result_parts)
        print(f"  ✅ 推理完成！耗时: {inference_time:.2f}ms")
        print(f"  输出: {result[:100]}...")

        if inference_time > 500:
            print(f"  ⚠️ 警告: 延迟超标 ({inference_time:.2f}ms > 500ms)")

    else:
        print("  ❌ 缺少 Query 方法")
        sys.exit(1)

except Exception as e:
    print(f"\n❌ 测试失败: {e}")
    print("\n详细错误追踪:")
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ 所有测试通过！")
print("=" * 70)