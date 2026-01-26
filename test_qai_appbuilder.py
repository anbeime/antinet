import sys
import os

# 添加qai_appbuilder的libs目录到PATH
qai_libs_path = os.path.join(os.path.dirname(__import__('qai_appbuilder').__file__), 'libs')
os.environ['PATH'] = qai_libs_path + ';' + os.environ.get('PATH', '')

print("=" * 60)
print("测试 qai_appbuilder 模块")
print("=" * 60)
print()

try:
    import qai_appbuilder
    print("qai_appbuilder 模块导入成功")
    print(f"   版本: {getattr(qai_appbuilder, '__version__', 'unknown')}")
    print(f"   位置: {qai_appbuilder.__file__}")
    print()

    # 测试QNNContext
    from qai_appbuilder.qnncontext import QNNConfig, Runtime, LogLevel, ProfilingLevel
    print("QNNContext 相关类导入成功")
    print()

    # 配置QNN
    qnn_lib_path = os.path.join(os.path.dirname(qai_appbuilder.__file__), 'libs')
    QNNConfig.Config(
        qnn_lib_path=qnn_lib_path,
        runtime=Runtime.HTP,
        log_level=LogLevel.ERROR,
        profiling_level=ProfilingLevel.OFF
    )
    print("QNN 配置成功")
    print(f"   QNN库路径: {qnn_lib_path}")
    print()

    # 检查关键DLL文件
    print("检查关键DLL文件:")
    dll_files = [
        'QnnSystem.dll',
        'QnnHtp.dll',
        'QnnHtpPrepare.dll',
        'QnnHtpV73Stub.dll',
        'QnnHtpNetRunExtensions.dll',
        'QnnCpu.dll',
        'QnnGpu.dll',
        'QnnIr.dll',
        'QnnModelDlc.dll'
    ]

    for dll in dll_files:
        dll_path = os.path.join(qnn_lib_path, dll)
        if os.path.exists(dll_path):
            size = os.path.getsize(dll_path) / (1024 * 1024)  # MB
            print(f"   {dll} ({size:.2f} MB)")
        else:
            print(f"  no {dll} 未找到")

    print()
    print("=" * 60)
    print("所有测试通过！qai_appbuilder 已正确配置")
    print("=" * 60)

except Exception as e:
    print(f" 错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
