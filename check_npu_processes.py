"""
检查和清理NPU占用进程
用于解决错误代码14001（Failed to create device）
"""
import psutil
import os

print("=" * 80)
print("NPU进程检查和清理工具")
print("=" * 80)

# 可能占用NPU的进程列表
npu_related_processes = [
    "python.exe",
    "pythonw.exe",
    "uvicorn.exe",
    "fastapi.exe",
    "node.exe"
]

print("\n正在检查占用NPU的进程...")
found_processes = False

for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
    try:
        process_name = proc.info['name'].lower()
        if any(name.lower() in process_name for name in npu_related_processes):
            cmdline = ' '.join(proc.info.get('cmdline', []))
            print(f"\n进程: {proc.info['name']} (PID: {proc.info['pid']})")
            print(f"  命令行: {cmdline[:200]}...")
            found_processes = True
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        continue

if not found_processes:
    print("  未发现可能占用NPU的Python/Node进程")
else:
    print("\n" + "=" * 80)
    print("建议:")
    print("  1. 如果上述进程中有正在运行的Python服务，请先停止它们")
    print("  2. 可以使用任务管理器结束进程")
    print("  3. 或者运行: taskkill /F /PID <进程ID>")
    print("=" * 80)

# 检查是否有GenieContext相关的进程
print("\n正在检查Genie相关进程...")
genie_processes = []
for proc in psutil.process_iter(['pid', 'name']):
    try:
        if 'genie' in proc.info['name'].lower():
            genie_processes.append(proc)
            print(f"  发现Genie进程: {proc.info['name']} (PID: {proc.info['pid']})")
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        continue

if genie_processes:
    print("\n警告: 发现Genie相关进程，可能影响NPU使用")
    print("建议重启电脑以确保NPU完全释放")

print("\n" + "=" * 80)
print("检查完成")
print("=" * 80)
