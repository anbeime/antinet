"""
简单的NPU测试脚本
"""
import os
import sys
import json
import tempfile

# 设置UTF-8输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 原始config路径
original_config = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
backup_config = original_config + ".backup"

print("=== NPU配置测试 ===")

# 1. 读取原始配置
with open(original_config, 'r', encoding='utf-8') as f:
    config = json.load(f)

print(f"原始配置 branches: {config['dialog']['ssd-q1']['branches']}")

# 2. 尝试不同的分支配置
test_configs = [
    {"name": "单分支", "branches": [1]},
    {"name": "双分支", "branches": [2, 1]},
    {"name": "原配置", "branches": [3, 2]},
]

for test in test_configs:
    print(f"\n--- 测试: {test['name']} (branches: {test['branches']}) ---")
    
    # 修改配置
    config['dialog']['ssd-q1']['branches'] = test['branches']
    
    # 创建临时配置文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        temp_path = f.name
        json.dump(config, f, indent=2)
    
    try:
        # 测试导入和创建上下文
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'data-analysis-iteration'))
        
        # 设置DLL路径
        lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
        bridge_lib_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
        
        current_path = os.environ.get('PATH', '')
        for p in [lib_path, bridge_lib_path]:
            if p not in current_path:
                current_path = p + ';' + current_path
        os.environ['PATH'] = current_path
        
        # 添加DLL目录
        for p in [lib_path, bridge_lib_path]:
            if os.path.exists(p):
                os.add_dll_directory(p)
        
        # 导入qai_appbuilder
        from qai_appbuilder import GenieContext
        
        print(f"  正在创建 GenieContext...")
        context = GenieContext(temp_path)
        print(f"  ✅ 上下文创建成功!")
        
        # 简单查询测试
        print(f"  测试简单查询...")
        response_text = []
        
        def response_callback(text: str) -> bool:
            response_text.append(text)
            return True
        
        context.Query("Hello", response_callback)
        response = ''.join(response_text)
        print(f"  ✅ 查询成功: {response[:100]}...")
        
        context = None
        print(f"  ✅ 测试通过!")
        
    except Exception as e:
        print(f"  ❌ 失败: {e}")
    
    finally:
        # 清理临时文件
        try:
            os.unlink(temp_path)
        except:
            pass

print("\n=== 测试完成 ===")