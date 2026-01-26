#!/usr/bin/env python3
import os
import sys

# 设置环境变量
os.environ['QAIRT_ROOT'] = r'C:\Qualcomm\AIStack\QAIRT\2.38.0.250901'
os.environ['QNN_SDK_ROOT'] = r'C:\Qualcomm\AIStack\QNN-SDK\2.38'
os.environ['PATH'] = r'C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc;' + os.environ.get('PATH', '')

print("=" * 80)
print("简单 NPU 测试")
print("=" * 80)
print()

# 1. 测试导入
print("[1] 测试导入...")
try:
    import qai_appbuilder
    print(f"  ✓ qai_appbuilder 导入成功")
    print(f"    位置: {qai_appbuilder.__file__}")
    
    # 尝试查看版本
    try:
        version = qai_appbuilder.__version__
        print(f"    版本: {version}")
    except:
        print(f"    版本: 未知")
        
    # 检查是否有 GenieContext
    from qai_appbuilder import GenieContext
    print(f"  ✓ GenieContext 导入成功")
    
except Exception as e:
    print(f"  ✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# 2. 测试创建 GenieContext
print("[2] 测试创建 GenieContext...")
try:
    # 使用 Llama3.2-3B 模型
    config_path = r"C:\model\llama3.2-3b-8380-qnn2.37\config.json"
    print(f"  使用配置文件: {config_path}")
    
    print("  正在创建 GenieContext...")
    model = GenieContext(config_path, False)  # debug=False
    print(f"  ✓ GenieContext 创建成功")
    
    # 检查模型方法
    print("  检查模型方法:")
    print(f"    Query: {'✓' if hasattr(model, 'Query') else '✗'}")
    print(f"    SetParams: {'✓' if hasattr(model, 'SetParams') else '✗'}")
    
    # 测试 SetParams
    if hasattr(model, 'SetParams'):
        try:
            print("  测试 SetParams...")
            result = model.SetParams("50", "0.7", "40", "0.95")
            print(f"  ✓ SetParams 成功: {result}")
        except Exception as e:
            print(f"  ✗ SetParams 失败: {e}")
    
except Exception as e:
    print(f"  ✗ 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# 3. 简单查询测试（如果上述都成功）
print("[3] 简单查询测试...")
try:
    # 准备回调函数
    received_text = []
    
    def test_callback(text):
        received_text.append(text)
        print(f"    回调收到: {repr(text[:50])}...")
        return True
    
    # 准备提示
    prompt = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\nHello<|im_end|>\n<|im_start|>assistant\n"
    print(f"  提示长度: {len(prompt)}")
    
    # 执行查询（带超时处理）
    print("  执行 Query（5秒超时）...")
    
    import threading
    import time
    
    query_completed = False
    query_error = None
    
    def run_query():
        nonlocal query_completed, query_error
        try:
            model.Query(prompt, test_callback)
            query_completed = True
        except Exception as e:
            query_error = e
    
    # 启动查询线程
    query_thread = threading.Thread(target=run_query, daemon=True)
    query_thread.start()
    
    # 等待最多5秒
    for i in range(50):  # 50 * 0.1 = 5秒
        if query_completed or query_error:
            break
        time.sleep(0.1)
    
    if query_error:
        print(f"  ✗ Query 失败: {query_error}")
    elif query_completed:
        print(f"  ✓ Query 完成")
        if received_text:
            full_result = ''.join(received_text)
            print(f"  结果长度: {len(full_result)}")
            print(f"  结果预览: {full_result[:100]}...")
        else:
            print(f"   没有收到回调数据")
    else:
        print(f"   Query 超时（5秒）")
        print(f"    可能正常（模型推理需要时间），也可能卡住了")
        
except Exception as e:
    print(f"  ✗ 查询测试失败: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 80)
print("测试完成")
print("=" * 80)