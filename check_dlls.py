
import os
from pathlib import Path

# 检查的目录
check_dir = r"C:\ai-engine-direct-helper"

print("=" * 60)
print(f"检查 {check_dir} 下的 DLL 文件")
print("=" * 60)

if not os.path.exists(check_dir):
    print(f" 目录不存在: {check_dir}")
    exit(1)

# 递归查找所有 DLL 文件
dll_files = []
for root, dirs, files in os.walk(check_dir):
    for file in files:
        if file.lower().endswith('.dll'):
            full_path = os.path.join(root, file)
            relative_path = os.path.relpath(full_path, check_dir)
            dll_files.append((relative_path, os.path.getsize(full_path)))

print(f"\n共找到 {len(dll_files)} 个 DLL 文件:\n")

# 按大小排序显示
dll_files.sort(key=lambda x: x[1], reverse=True)

for dll_path, size in dll_files:
    size_mb = size / (1024 * 1024)
    print(f"  {dll_path} ({size_mb:.2f} MB)")

# 检查关键 DLL
key_dlls = [
    "QnnSystem.dll",
    "QnnHtp.dll",
    "QnnContextBinary.dll",
    "QnnModel.dll"
]

print("\n" + "=" * 60)
print("检查关键 DLL 文件")
print("=" * 60)

for key_dll in key_dlls:
    found = False
    for dll_path, _ in dll_files:
        if dll_path.lower().endswith(key_dll.lower()):
            print(f"{key_dll} - 找到于: {dll_path}")
            found = True
            break
    if not found:
        print(f" {key_dll} - 未找到")

# 检查 qai_libs 目录
qai_libs = os.path.join(check_dir, "samples", "qai_libs")
print("\n" + "=" * 60)
print(f"检查 {qai_libs} 目录")
print("=" * 60)

if os.path.exists(qai_libs):
    dlls_in_qai = list(Path(qai_libs).glob("*.dll"))
    print(f"找到 {len(dlls_in_qai)} 个 DLL 文件")
    for dll in sorted(dlls_in_qai):
        size_mb = dll.stat().st_size / (1024 * 1024)
        print(f"  - {dll.name} ({size_mb:.2f} MB)")
else:
    print(f" 目录不存在: {qai_libs}")
