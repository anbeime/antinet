#!/usr/bin/env python3
import os
import sys
import time

# 设置环境变量
os.environ['QAIRT_ROOT'] = r'C:\Qualcomm\AIStack\QAIRT\2.38.0.250901'
os.environ['QNN_SDK_ROOT'] = r'C:\Qualcomm\AIStack\QNN-SDK\2.38'
os.environ['PATH'] = r'C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc;' + os.environ.get('PATH', '')

print("=" * 80)
print("最小化 NPU 测试")
print("=" * 80)
print()

# 1. 测试导入
print("[1] 测试导入 qai_appbuilder 和 GenieContext...")
try:c
    from qai_appbuilder import GenieContext
    print("  ✓ GenieContext 导入成功")
except Exception as e:
    print(f"  ✗ 导入失败: {e}")
    sys.exit(1)

print()

# 2. 测试创建 GenieContext
print("[2] 测试创建 GenieContext...")
try:
    # 使用 Llama3.2-3B 模型，因为它更小
    config_path = r"C:\model\llama3.2-3b-8380-qnn2.37\config.json"
    print(f"  配置路径: {config_path}")
    print(f"  文件存在: {os.path.exists(config_path)}")
    
    # 检查 tokenizer 文件
    tokenizer_path = r"C:\model\llama3.2-3b-8380-qnn2.37\tokenizer.json"
    print(f"  tokenizer.json 存在: {os.path.exists(tokenizer_path)}")
    if os.path.exists(tokenizer_path):
        size = os.path.getsize(tokenizer_path) / 1024  # KB
        print(f"  tokenizer.json 大小: {size:.1f} KB")
    
    # 创建 GenieContext
    print("  创建 GenieContext...")
    start_time = time.time()
    model = GenieContext(config_path, False)  # debug=False
    load_time = time.time() - start_time
    print(f"  ✓ GenieContext 创建成功 ({load_time:.2f}s)")
    
    # 测试模型是否有必要的方法
    print("  检查模型方法...")
    has_query = hasattr(model, 'Query')
    has_setparams = hasattr(model, 'SetParams')
    print(f"    Query 方法: {'✓' if has_query else '✗'}")
    print(f"    SetParams 方法: {'✓' if has_setparams else '✗'}")
    
except Exception as e:
    print(f"  ✗ 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()

# 3. 测试简单查询（简化回调）
print("[3] 测试简单查询...")
try:
    # 设置参数（如果可用）
    if hasattr(model, 'SetParams'):
        try:
            model.SetParams("50", "0.7", "40", "0.95")  # max_tokens, temperature, top_k, top_p
            print("  ✓ SetParams 成功")
        except Exception as e:
            print(f"  ✗ SetParams 失败: {e}")
    
    # 创建简单的回调函数
    result_parts = []
    callback_count = 0
    
    def simple_callback(text):
        nonlocal callback_count
        callback_count += 1
        result_parts.append(text)
        print(f"    回调 #{callback_count}: 收到 {len(text)} 字符")
        # 返回 True 表示继续处理
        return True
    
    # 准备提示
    test_prompt = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\nHello<|im_end|>\n<|im_start|>assistant\n"
    print(f"  提示长度: {len(test_prompt)} 字符")
    
    # 执行查询（带超时）
    print("  执行 Query（最多等待10秒）...")
    query_start = time.time()
    timeout = 10  # 秒
    
    try:
        # 注意：Query 可能是阻塞调用
        model.Query(test_prompt, simple_callback)
        query_time = time.time() - query_start
        
        print(f"  ✓ Query 完成 ({query_time:.2f}s)")
        
        if result_parts:
            full_result = ''.join(result_parts)
            print(f"  结果: {full_result[:100]}...")
            print(f"  总长度: {len(full_result)} 字符")
        else:
            print("    没有收到回调结果")
            
    except KeyboardInterrupt:
        print("  ✗ Query 被用户中断")
        query_time = time.time() - query_start
        print(f"  已运行时间: {query_time:.2f}s")
        
    except Exception as e:
        print(f"  ✗ Query 失败: {e}")
        import traceback
        traceback.print_exc()
    
except Exception as e:
    print(f"  ✗ 测试查询失败: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 80)
print("测试完成")
print("=" * 80)