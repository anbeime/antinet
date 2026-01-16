"""
GenieContext 完整可用性测试
安装VC++ Redistributable后运行此脚本验证NPU环境
"""
import os
import sys
import traceback

def test_genie_context():
    print("=" * 60)
    print("GenieContext 完整可用性测试")
    print("=" * 60)

    # [1] 环境检查
    print("\n[1] 环境检查")
    lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
    os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')

    # 检查DLL文件
    dlls = ['QnnHtp.dll', 'QnnSystem.dll', 'QnnHtpPrepare.dll']
    dll_status = {}
    for dll in dlls:
        path = os.path.join(lib_path, dll)
        dll_status[dll] = os.path.exists(path)
        print(f"  {dll}: {'✅' if dll_status[dll] else '❌'}")

    missing_dlls = [dll for dll, exists in dll_status.items() if not exists]
    if missing_dlls:
        print(f"❌ 缺少DLL文件: {missing_dlls}")
        return False

    # 检查config.json
    config_path = r'C:\test\antinet\config.json'
    config_exists = os.path.exists(config_path)
    print(f"  config.json: {'✅' if config_exists else '❌'}")
    if not config_exists:
        print("❌ 配置文件不存在")
        return False

    # [2] 导入测试
    print("\n[2] 导入测试")
    try:
        from qai_appbuilder import GenieContext, QNNConfig
        print("  ✅ QAI AppBuilder导入成功")
    except ImportError as e:
        print(f"  ❌ 导入失败: {e}")
        return False

    # [3] QNN配置测试
    print("\n[3] QNN配置测试")
    try:
        QNNConfig.Config(lib_path, 'Htp', 2, 0, '')
        print("  ✅ QNN HTP配置成功")
    except Exception as e:
        print(f"  ❌ QNN配置失败: {e}")
        return False

    # [4] GenieContext初始化测试
    print("\n[4] GenieContext初始化测试")
    try:
        print(f"  初始化路径: {config_path}")
        genie = GenieContext(config_path)
        print("  ✅ GenieContext创建成功！")
        print(f"  类型: {type(genie).__name__}")

        # 检查关键方法
        methods = [m for m in dir(genie) if not m.startswith('_')]
        required_methods = ['Query', 'SetParams']
        available_methods = [m for m in required_methods if m in methods]

        print(f"  可用方法: {len(methods)}")
        print(f"  必需方法: {available_methods}")

        if len(available_methods) == len(required_methods):
            print("  ✅ 所有必需方法都可用")
        else:
            missing = [m for m in required_methods if m not in methods]
            print(f"  ❌ 缺少方法: {missing}")
            return False

    except Exception as e:
        print(f"  ❌ GenieContext初始化失败: {e}")
        print("\n🔧 故障排除:")
        print("  1. 确认已安装 Visual C++ Redistributable 2015-2022")
        print("  2. 以管理员权限运行VS Code")
        print("  3. 检查Windows更新")
        print("  4. 重启系统")
        print(f"\n  详细错误: {traceback.format_exc()}")
        return False

    # [5] 推理测试
    print("\n[5] 推理功能测试")
    try:
        # 设置参数
        genie.SetParams(64, 0.7, 40, 0.95)
        print("  ✅ 参数设置成功")

        # 测试推理
        result_parts = []
        def callback(text):
            result_parts.append(text)
            return True

        test_prompt = "Hello, test NPU inference"
        genie.Query(test_prompt, callback)

        result = ''.join(result_parts)
        print("  ✅ 推理执行成功")
        print(f"  输入: {test_prompt}")
        print(f"  输出长度: {len(result)} 字符")
        if len(result) > 0:
            print(f"  输出预览: {result[:100]}...")
        else:
            print("  ⚠️  输出为空")

    except Exception as e:
        print(f"  ❌ 推理测试失败: {e}")
        return False

    print("\n" + "=" * 60)
    print("🎉 GenieContext 完全可用！可以进行NPU推理")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_genie_context()
    if not success:
        print("\n❌ 测试失败，请解决上述问题后重试")
        sys.exit(1)
    else:
        print("\n✅ 所有测试通过！")