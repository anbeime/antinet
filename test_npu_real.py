#!/usr/bin/env python3
"""
NPU真实运行测试 - 验证NPU能否实际推理
"""
import os
import sys
import time
import traceback

def setup_npu_environment():
    """设置NPU环境"""
    lib_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
    bridge_lib_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
    
    paths_to_add = [lib_path, bridge_lib_path]
    current_path = os.environ.get('PATH', '')
    
    for p in paths_to_add:
        if p not in current_path:
            current_path = p + ';' + current_path
    
    os.environ['PATH'] = current_path
    os.environ['QAI_LIBS_PATH'] = lib_path
    
    for p in paths_to_add:
        if os.path.exists(p):
            os.add_dll_directory(p)
    
    print(f"[环境] NPU库路径已配置")
    return True

def test_npu_loading():
    """测试NPU模型加载"""
    print("\n[测试] NPU模型加载...")
    try:
        from qai_appbuilder import GenieContext
        print("  ✓ qai_appbuilder库导入成功")
        
        config_path = r"C:\test\antinet\config.json"
        if not os.path.exists(config_path):
            print(f"  ✗ 配置文件不存在: {config_path}")
            return False
        
        print("  ✓ 配置文件存在")
        
        # 检查模型文件
        import json
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        engine = config.get('dialog', {}).get('engine', {})
        model = engine.get('model', {})
        
        if model.get('type') == 'binary':
            bins = model.get('binary', {}).get('ctx-bins', [])
            missing = [b for b in bins if not os.path.exists(b)]
            
            if missing:
                print(f"  ✗ 缺少模型文件: {len(missing)}个")
                return False
            else:
                print(f"  ✓ 模型文件完整 ({len(bins)}个)")
        
        # 实际加载
        print("  正在加载模型...")
        start_time = time.time()
        model_instance = GenieContext(config_path)
        load_time = time.time() - start_time
        
        print(f"  ✓ 模型加载成功 ({load_time:.2f}s)")
        print(f"  设备: NPU (Hexagon)")
        
        return model_instance
    except Exception as e:
        print(f"  ✗ 加载失败: {e}")
        traceback.print_exc()
        return None

def test_npu_inference(model_instance, prompt="你好"):
    """测试NPU推理"""
    print(f"\n[测试] NPU推理测试...")
    print(f"  输入: '{prompt}'")
    
    try:
        result_parts = []
        
        def callback(text: str) -> bool:
            result_parts.append(text)
            sys.stdout.write(text)
            sys.stdout.flush()
            return True
        
        print("  推理输出: ", end="")
        start_time = time.time()
        model_instance.Query(prompt, callback)
        infer_time = time.time() - start_time
        
        result = ''.join(result_parts)
        print(f"\n  ✓ 推理完成 ({infer_time*1000:.0f}ms)")
        print(f"  响应: {result[:200]}")
        
        if len(result.strip()) > 0:
            print("  ✓ 推理返回有效内容")
            return True, infer_time
        else:
            print("  ✗ 推理返回空内容")
            return False, infer_time
    except Exception as e:
        print(f"  ✗ 推理失败: {e}")
        return False, 0

def main():
    print("=" * 70)
    print("NPU 真实运行验证测试")
    print("=" * 70)
    
    # 设置环境
    setup_npu_environment()
    
    # 测试NPU加载
    model = test_npu_loading()
    if not model:
        print("\n❌ NPU加载测试失败")
        return False
    
    # 测试推理
    success, infer_time = test_npu_inference(model, "介绍一下骁龙NPU的优势")
    
    # 性能评估
    print("\n" + "=" * 70)
    print("性能评估:")
    print("=" * 70)
    
    if success:
        latency_ms = infer_time * 1000
        print(f"  推理延迟: {latency_ms:.0f}ms")
        
        if latency_ms < 500:
            print(f"  ✓ 性能达标 (< 500ms)")
            print("🎉 NPU真实运行验证通过！")
            return True
        elif latency_ms < 1000:
            print(f"  ⚠ 性能尚可 ({latency_ms:.0f}ms)")
            print("⚠️  NPU运行正常但性能有待优化")
            return True
        else:
            print(f"  ✗ 性能较差 ({latency_ms:.0f}ms)")
            print("❌ NPU运行但性能不达标")
            return False
    else:
        print("  ✗ 推理测试失败")
        print("❌ NPU真实运行验证失败")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n测试异常: {e}")
        traceback.print_exc()
        sys.exit(1)