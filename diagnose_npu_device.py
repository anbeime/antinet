"""
NPU设备创建诊断脚本
检查NPU驱动、DLL依赖和GenieContext初始化
"""
import os
import sys
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("=" * 80)
print("NPU设备创建诊断脚本")
print("=" * 80)

# 1. 检查Python版本
print("\n[1] 检查Python版本...")
print(f"    Python版本: {sys.version}")
print(f"    平台: {sys.platform}")
print(f"    架构: {sys.winver if hasattr(sys, 'winver') else 'unknown'}")

# 2. 检查模型路径
print("\n[2] 检查模型路径...")
model_path = Path(r"C:\model\Qwen2.0-7B-SSD-8380-2.34")
config_path = model_path / "config.json"
print(f"    模型路径: {model_path}")
print(f"    路径存在: {model_path.exists()}")
print(f"    Config.json存在: {config_path.exists()}")

# 3. 检查DLL路径
print("\n[3] 检查DLL路径...")
qai_libs_path = r"C:\ai-engine-direct-helper\samples\qai_libs"
qairt_libs_path = r"C:\Qualcomm\AIStack\QAIRT\2.38.0.250901\lib\arm64x-windows-msvc"

print(f"    QAI库路径: {qai_libs_path}")
print(f"    QAI库存在: {Path(qai_libs_path).exists()}")
print(f"    QAIRT库路径: {qairt_libs_path}")
print(f"    QAIRT库存在: {Path(qairt_libs_path).exists()}")

# 4. 设置环境变量
print("\n[4] 设置环境变量...")
paths_to_add = [qai_libs_path, qairt_libs_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = qai_libs_path
os.environ['QNN_LOG_LEVEL'] = "DEBUG"
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"
print("    ✓ 环境变量已设置")

# 5. 添加DLL目录
print("\n[5] 添加DLL目录...")
for p in paths_to_add:
    if os.path.exists(p):
        try:
            os.add_dll_directory(p)
            print(f"    ✓ 已添加: {p}")
        except Exception as e:
            print(f"    ✗ 添加失败 {p}: {e}")

# 6. 检查关键DLL
print("\n[6] 检查关键DLL...")
required_dlls = [
    "Genie.dll",
    "QnnHtp.dll",
    "QnnSystem.dll",
    "QnnModelDlc.dll",
    "NPUDetect.dll"
]

for dll in required_dlls:
    found = False
    for path in paths_to_add:
        dll_path = Path(path) / dll
        if dll_path.exists():
            print(f"    ✓ {dll} -> {dll_path}")
            found = True
            break
    if not found:
        print(f"    ✗ {dll} 未找到")

# 7. 尝试导入qai_appbuilder
print("\n[7] 尝试导入qai_appbuilder...")
try:
    # 添加Genie路径
    genie_path = r"C:\ai-engine-direct-helper\samples\genie\python"
    if genie_path not in sys.path:
        sys.path.append(genie_path)
        print(f"    ✓ 已添加Genie路径到sys.path")

    from qai_appbuilder import GenieContext
    print("    ✓ qai_appbuilder导入成功")
    print(f"    GenieContext模块: {GenieContext}")
except ImportError as e:
    print(f"    ✗ qai_appbuilder导入失败: {e}")
    print("    请检查qai_appbuilder是否正确安装")
    sys.exit(1)
except Exception as e:
    print(f"    ✗ 导入过程出错: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 8. 尝试创建GenieContext
print("\n[8] 尝试创建GenieContext...")
print(f"    Config路径: {config_path}")

try:
    import json
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'UNKNOWN')
    print(f"    Backend Type: {backend_type}")

    if backend_type != 'QnnHtp':
        print(f"    ⚠ 警告: Backend类型不是QnnHtp")

    # 尝试创建GenieContext
    print("\n    正在创建GenieContext实例...")
    genie = GenieContext(str(config_path))
    print("    ✓ GenieContext创建成功")
    print(f"    实例: {genie}")

    # 尝试释放
    del genie
    print("    ✓ GenieContext释放成功")

except Exception as e:
    print(f"    ✗ GenieContext创建失败: {e}")
    print("\n    错误详情:")
    import traceback
    traceback.print_exc()

    # 提供常见解决方案
    print("\n    可能的解决方案:")
    print("    1. 检查NPU驱动是否正确安装")
    print("    2. 确认系统是ARM64架构")
    print("    3. 重启电脑")
    print("    4. 检查是否有其他程序占用了NPU")
    print("    5. 查看事件查看器中的NPU相关错误")

    sys.exit(1)

# 9. 检查NPU驱动状态
print("\n[9] 检查NPU驱动状态...")
try:
    import ctypes
    npu_detect = ctypes.CDLL(str(Path(qai_libs_path) / "NPUDetect.dll"))
    print("    ✓ NPUDetect.dll加载成功")
except Exception as e:
    print(f"    ⚠ NPUDetect.dll加载失败: {e}")

# 10. 总结
print("\n" + "=" * 80)
print("诊断完成")
print("=" * 80)
print("\n如果所有检查都通过但仍然报错，请尝试:")
print("  1. 重启AIPC")
print("  2. 检查Windows事件查看器中的错误日志")
print("  3. 联系高通技术支持")
