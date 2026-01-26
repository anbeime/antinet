#!/usr/bin/env python3
import os
import sys
import traceback

print("=" * 80)
print("NPU 推理错误诊断脚本")
print("=" * 80)
print()

# 1. 检查环境变量
print("[1] 环境变量检查")
print("-" * 40)
env_vars = ['QAIRT_ROOT', 'QNN_SDK_ROOT', 'PATH']
for var in env_vars:
    value = os.environ.get(var, '未设置')
    if var == 'PATH':
        print(f"  {var}: (长度: {len(value)})")
        # 检查关键路径
        key_paths = ['QAIRT', 'QNN', 'Qualcomm', 'Genie']
        for key in key_paths:
            if key in value:
                print(f"    ✓ 包含 '{key}'")
        # 打印PATH前200字符
        print(f"    PATH前200字符: {value[:200]}...")
    else:
        print(f"  {var}: {value}")

print()

# 2. 检查模型文件
print("[2] 模型文件检查")
print("-" * 40)
models = [
    ("Qwen2.0-7B-SSD", r"C:\model\Qwen2.0-7B-SSD-8380-2.34"),
    ("Llama3.2-3B", r"C:\model\llama3.2-3b-8380-qnn2.37"),
]

for name, path in models:
    print(f"  模型: {name}")
    print(f"    路径: {path}")
    if os.path.exists(path):
        print("    ✓ 目录存在")
        
        # 检查关键文件
        key_files = [
            ("config.json", "配置文件"),
            ("tokenizer.json", "分词器文件"),
            ("model-1.bin", "模型文件1"),
            ("prompt.conf", "提示配置"),
        ]
        
        for file, desc in key_files:
            file_path = os.path.join(path, file)
            if os.path.exists(file_path):
                size = os.path.getsize(file_path) / 1024  # KB
                print(f"    ✓ {desc}: {file} ({size:.1f} KB)")
            else:
                print(f"    ✗ {desc}: {file} 不存在")
        
        # 列出所有文件
        try:
            files = os.listdir(path)
            print(f"    目录内容 ({len(files)} 个文件):")
            for f in sorted(files)[:10]:  # 只显示前10个
                f_path = os.path.join(path, f)
                if os.path.isfile(f_path):
                    size = os.path.getsize(f_path) / (1024 * 1024)  # MB
                    print(f"      - {f} ({size:.2f} MB)")
                else:
                    print(f"      - {f}/ (目录)")
            if len(files) > 10:
                print(f"      ... 还有 {len(files)-10} 个文件")
        except:
            print("    无法列出目录内容")
    else:
        print("    ✗ 目录不存在")
    print()

# 3. 测试qai_appbuilder导入
print("[3] qai_appbuilder 导入测试")
print("-" * 40)
try:
    import qai_appbuilder
    print("  ✓ qai_appbuilder 导入成功")
    print(f"    位置: {qai_appbuilder.__file__}")
    
    # 尝试导入 GenieContext
    try:
        from qai_appbuilder import GenieContext
        print("  ✓ GenieContext 导入成功")
        
        # 尝试创建实例
        try:
            config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
            print(f"  尝试创建 GenieContext: {config_path}")
            model = GenieContext(config_path, False)
            print("  ✓ GenieContext 创建成功")
            
            # 测试简单查询
            print("  测试简单查询...")
            result_parts = []
            def test_callback(text):
                result_parts.append(text)
                print(f"    回调收到: {repr(text[:50])}...")
                return True
            
            # 设置参数
            if hasattr(model, 'SetParams'):
                try:
                    model.SetParams("100", "0.7", "40", "0.95")
                    print("  ✓ SetParams 调用成功")
                except Exception as e:
                    print(f"  ✗ SetParams 失败: {e}")
            
            # 执行查询
            test_prompt = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n请说你好<|im_end|>\n<|im_start|>assistant\n"
            print(f"  执行 Query: 提示长度={len(test_prompt)}")
            
            try:
                model.Query(test_prompt, test_callback)
                print("  ✓ Query 调用成功")
                if result_parts:
                    print(f"  结果: {''.join(result_parts)[:100]}...")
                else:
                    print("  警告: 没有收到回调结果")
            except Exception as e:
                print(f"  ✗ Query 失败: {e}")
                print(f"    错误类型: {type(e).__name__}")
                
        except Exception as e:
            print(f"  ✗ GenieContext 创建失败: {e}")
            print(f"    错误类型: {type(e).__name__}")
            
    except Exception as e:
        print(f"  ✗ GenieContext 导入失败: {e}")
        
except Exception as e:
    print(f"  ✗ qai_appbuilder 导入失败: {e}")
    import traceback
    traceback.print_exc()

print()

# 4. 检查DLL文件
print("[4] DLL 文件检查")
print("-" * 40)
dll_paths = [
    r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc",
    r"C:\ai-engine-direct-helper\samples\qai_libs",
]

for dll_path in dll_paths:
    print(f"  检查: {dll_path}")
    if os.path.exists(dll_path):
        print(f"    ✓ 目录存在")
        # 检查关键DLL
        key_dlls = ['Genie.dll', 'QnnHtp.dll', 'QnnHtpV73Stub.dll', 'QnnSystem.dll']
        for dll in key_dlls:
            dll_file = os.path.join(dll_path, dll)
            if os.path.exists(dll_file):
                size = os.path.getsize(dll_file) / (1024 * 1024)  # MB
                print(f"    ✓ {dll} ({size:.2f} MB)")
            else:
                print(f"    ✗ {dll} 不存在")
    else:
        print(f"    ✗ 目录不存在")
    print()

# 5. 建议
print("[5] 问题诊断与建议")
print("-" * 40)
print("""
可能的问题：
1. tokenizer.json 文件格式不兼容
2. GenieContext 初始化参数不正确
3. 回调函数实现有问题
4. DLL 文件加载失败
5. NPU 运行时环境未正确配置

建议尝试：
1. 检查 tokenizer.json 文件是否完整
2. 尝试不同的模型 (Llama3.2-3B)
3. 简化回调函数实现
4. 确保所有DLL文件可访问
5. 设置正确的环境变量
""")

print("=" * 80)
print("诊断完成")
print("=" * 80)