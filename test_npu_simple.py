#!/usr/bin/env python3
"""
简单的NPU测试脚本 - 验证NPU库能否加载和运行
"""
import os
import sys
import time
import traceback

def setup_environment():
    """设置NPU库路径"""
    # 设置NPU库路径
    lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
    bridge_lib_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    
    paths_to_add = [lib_path, bridge_lib_path]
    current_path = os.environ.get('PATH', '')
    
    for p in paths_to_add:
        if p not in current_path:
            current_path = p + ';' + current_path
    
    os.environ['PATH'] = current_path
    os.environ['QAI_LIBS_PATH'] = lib_path
    
    # 显式添加 DLL 目录
    for p in paths_to_add:
        if os.path.exists(p):
            os.add_dll_directory(p)
    
    print(f"[SETUP] NPU库路径已配置")
    print(f"  - qai_libs: {lib_path}")
    print(f"  - bridge libs: {bridge_lib_path}")
    print(f"  - PATH中包含qai_libs: {lib_path in os.environ['PATH']}")

def test_qai_import():
    """测试QAI库导入"""
    print("\n[TEST 1] 测试QAI库导入...")
    try:
        import qai_appbuilder
        print("  ✓ qai_appbuilder 导入成功")
        return True
    except Exception as e:
        print(f"  ✗ qai_appbuilder 导入失败: {e}")
        return False

def test_genie_import():
    """测试GenieContext导入"""
    print("\n[TEST 2] 测试GenieContext导入...")
    try:
        from qai_appbuilder import GenieContext
        print("  ✓ GenieContext 导入成功")
        return True
    except Exception as e:
        print(f"  ✗ GenieContext 导入失败: {e}")
        return False

def test_config_file():
    """测试配置文件"""
    print("\n[TEST 3] 测试配置文件...")
    config_path = r"C:\test\antinet\config.json"
    if os.path.exists(config_path):
        print(f"  ✓ 配置文件存在: {config_path}")
        return True
    else:
        print(f"  ✗ 配置文件不存在: {config_path}")
        return False

def test_model_files():
    """测试模型文件是否存在"""
    print("\n[TEST 4] 测试模型文件...")
    config_path = r"C:\test\antinet\config.json"
    
    try:
        import json
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 检查模型文件
        engine = config.get('dialog', {}).get('engine', {})
        model = engine.get('model', {})
        
        if model.get('type') == 'binary':
            bins = model.get('binary', {}).get('ctx-bins', [])
            missing = []
            for bin_file in bins:
                if not os.path.exists(bin_file):
                    missing.append(bin_file)
            
            if missing:
                print(f"  ✗ 缺少模型文件: {len(missing)} 个文件缺失")
                for m in missing[:3]:  # 只显示前3个
                    print(f"    - {m}")
                return False
            else:
                print(f"  ✓ 模型文件检查通过 ({len(bins)} 个文件)")
                return True
        else:
            print("  ✗ 配置文件格式错误")
            return False
    except Exception as e:
        print(f"  ✗ 读取配置文件失败: {e}")
        return False

def test_quick_inference():
    """快速推理测试"""
    print("\n[TEST 5] 快速推理测试...")
    try:
        from qai_appbuilder import GenieContext
        
        config_path = r"C:\test\antinet\config.json"
        print(f"  正在加载模型: {config_path}")
        
        start_time = time.time()
        model = GenieContext(config_path)
        load_time = (time.time() - start_time) * 1000
        
        print(f"  ✓ 模型加载成功 ({load_time:.0f}ms)")
        
        # 简单推理
        print("  执行推理测试...")
        result_parts = []
        
        def callback(text: str) -> bool:
            result_parts.append(text)
            sys.stdout.write(text)
            sys.stdout.flush()
            return True
        
        infer_start = time.time()
        model.Query("你好", callback)
        infer_time = (time.time() - infer_start) * 1000
        
        result = ''.join(result_parts)
        print(f"\n  ✓ 推理完成 ({infer_time:.0f}ms)")
        print(f"  响应: {result[:100]}...")
        
        return True
    except Exception as e:
        print(f"  ✗ 推理测试失败: {e}")
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("NPU 真实运行测试")
    print("=" * 60)
    
    # 设置环境
    setup_environment()
    
    tests = [
        test_qai_import,
        test_genie_import,
        test_config_file,
        test_model_files,
        test_quick_inference
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"  ✗ 测试异常: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    print("测试总结:")
    print("=" * 60)
    
    for i, (test, result) in enumerate(zip(tests, results)):
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {i+1}. {test.__doc__.split('.')[0]}: {status}")
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n通过: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有测试通过！NPU 正常运行。")
    elif passed >= 3:
        print("⚠️  部分测试通过，NPU可能存在问题但基本可用。")
    else:
        print("❌ NPU 测试失败，需要检查环境配置。")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n测试被用户中断。")
        sys.exit(1)