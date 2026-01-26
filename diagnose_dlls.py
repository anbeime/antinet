
import os
from pathlib import Path

# 需要检查的库路径
lib_paths = [
    r"C:\ai-engine-direct-helper\samples\qai_libs",
    r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"
]

# 需要的关键 DLL 文件
required_dlls = [
    "QnnSystem.dll",
    "QnnHtp.dll",
    "QnnHtpV68Stub.dll",
    "QnnHtpV69Stub.dll",
    "QnnHtpV75Stub.dll",
    "QnnHtpV73Stub.dll",
    "QnnSaver.dll",
    "QnnLog.dll",
    "QnnContextBinary.dll",
    "QnnCommon.dll",
    "QnnModel.dll",
    "QnnExecutionProvider.dll",
    "QnnOpPackageInterfaces.dll",
    "QnnBackend.dll",
    "QnnHtpPrepare.dll",
    "QnnHtpNet.dll",
    "QnnHtpArchFactory.dll",
    "QnnHtpPerfInfrastructure.dll",
    "QnnHtpQaic.dll",
    "QnnHtpQaicV75Stub.dll",
    "QnnHtpQaicV68Stub.dll",
    "QnnHtpQaicV69Stub.dll",
    "QnnHtpQaicV73Stub.dll",
    "QnnHtpQaicV75Stub.dll",
    "QnnHtpQaicNet.dll",
    "QnnHtpQaicArchFactory.dll",
    "QnnHtpQaicPerfInfrastructure.dll",
    "QnnHtpQaicSystem.dll",
    "QnnHtpQaicContextBinary.dll",
    "QnnHtpQaicModel.dll",
    "QnnHtpQaicExecutionProvider.dll",
    "QnnHtpQaicOpPackageInterfaces.dll",
    "QnnHtpQaicBackend.dll",
    "QnnHtpQaicPrepare.dll",
    "QnnHtpQaicNet.dll",
    "QnnHtpQaicArchFactory.dll",
    "QnnHtpQaicPerfInfrastructure.dll",
    "QnnHtpQaicQaic.dll",
    "QnnHtpQaicQaicV75Stub.dll",
    "QnnHtpQaicQaicV68Stub.dll",
    "QnnHtpQaicQaicV69Stub.dll",
    "QnnHtpQaicQaicV73Stub.dll",
    "QnnHtpQaicQaicV75Stub.dll",
    "QnnHtpQaicQaicNet.dll",
    "QnnHtpQaicQaicArchFactory.dll",
    "QnnHtpQaicQaicPerfInfrastructure.dll",
    "QnnHtpQaicQaicSystem.dll",
    "QnnHtpQaicQaicContextBinary.dll",
    "QnnHtpQaicQaicModel.dll",
    "QnnHtpQaicQaicExecutionProvider.dll",
    "QnnHtpQaicQaicOpPackageInterfaces.dll",
    "QnnHtpQaicQaicBackend.dll",
    "QnnHtpQaicQaicPrepare.dll",
    "QnnHtpQaicQaicNet.dll",
    "QnnHtpQaicQaicArchFactory.dll",
    "QnnHtpQaicQaicPerfInfrastructure.dll",
    "QnnHtpQaicQaicQaic.dll",
    "QnnHtpQaicQaicQaicV75Stub.dll",
    "QnnHtpQaicQaicQaicV68Stub.dll",
    "QnnHtpQaicQaicQaicV69Stub.dll",
    "QnnHtpQaicQaicQaicV73Stub.dll",
    "QnnHtpQaicQaicQaicV75Stub.dll",
    "QnnHtpQaicQaicQaicNet.dll",
    "QnnHtpQaicQaicQaicArchFactory.dll",
    "QnnHtpQaicQaicQaicPerfInfrastructure.dll",
    "QnnHtpQaicQaicQaicSystem.dll",
    "QnnHtpQaicQaicQaicContextBinary.dll",
    "QnnHtpQaicQaicQaicModel.dll",
    "QnnHtpQaicQaicQaicExecutionProvider.dll",
    "QnnHtpQaicQaicQaicOpPackageInterfaces.dll",
    "QnnHtpQaicQaicQaicBackend.dll",
    "QnnHtpQaicQaicQaicPrepare.dll",
    "QnnHtpQaicQaicQaicNet.dll",
    "QnnHtpQaicQaicQaicArchFactory.dll",
    "QnnHtpQaicQaicQaicPerfInfrastructure.dll",
]

print("=" * 60)
print("检查所需的 DLL 文件")
print("=" * 60)

# 检查每个路径
for lib_path in lib_paths:
    print(f"\n📂 检查路径: {lib_path}")
    if not os.path.exists(lib_path):
        print(f"  no 路径不存在")
        continue

    path_obj = Path(lib_path)
    dll_files = list(path_obj.glob("*.dll"))
    print(f"   📊 找到 {len(dll_files)} 个 DLL 文件")

    # 检查必需的 DLL
    missing_dlls = []
    found_dlls = []
    for dll in required_dlls:
        dll_path = path_obj / dll
        if dll_path.exists():
            found_dlls.append(dll)
        else:
            missing_dlls.append(dll)

    if found_dlls:
        print(f"   找到 {len(found_dlls)} 个必需的 DLL:")
        for dll in found_dlls[:10]:  # 只显示前10个
            print(f"      - {dll}")
        if len(found_dlls) > 10:
            print(f"      ... 还有 {len(found_dlls) - 10} 个")

    if missing_dlls:
        print(f"  no 缺少 {len(missing_dlls)} 个必需的 DLL:")
        for dll in missing_dlls[:10]:  # 只显示前10个
            print(f"      - {dll}")
        if len(missing_dlls) > 10:
            print(f"      ... 还有 {len(missing_dlls) - 10} 个")

# 检查当前 PATH
print("\n" + "=" * 60)
print("当前 PATH 环境变量")
print("=" * 60)
current_path = os.getenv('PATH', '')
for lib_path in lib_paths:
    if lib_path in current_path:
        print(f"{lib_path} 已在 PATH 中")
    else:
        print(f" {lib_path} 不在 PATH 中")

print("\n" + "=" * 60)
print("所有 DLL 文件列表")
print("=" * 60)
for lib_path in lib_paths:
    if os.path.exists(lib_path):
        path_obj = Path(lib_path)
        dll_files = sorted([f.name for f in path_obj.glob("*.dll")])
        print(f"\n📂 {lib_path}:")
        for dll in dll_files:
            print(f"   - {dll}")
