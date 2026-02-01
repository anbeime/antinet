"""
NPU Backend 诊断脚本
检查实际使用的 backend 和 NPU 状态
"""
import os
import sys
import json
import time
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 添加 Genie 路径
GENIE_PATH = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if GENIE_PATH not in sys.path:
    sys.path.append(GENIE_PATH)

# 设置 DLL 路径
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 添加 DLL 目录
for p in paths_to_add:
    if os.path.exists(p):
        try:
            os.add_dll_directory(p)
            logger.info(f"[OK] 已添加DLL目录: {p}")
        except Exception as e:
            logger.warning(f"[WARNING] 添加DLL目录失败 {p}: {e}")

# 设置 QNN 环境变量（强制启用详细日志）
os.environ['QNN_LOG_LEVEL'] = 'DEBUG'
os.environ['QNN_DEBUG'] = '1'
os.environ['QNN_VERBOSE'] = '1'
os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'

logger.info("[INFO] QNN 环境变量已设置")
logger.info(f"  QNN_LOG_LEVEL: {os.environ.get('QNN_LOG_LEVEL')}")
logger.info(f"  QNN_DEBUG: {os.environ.get('QNN_DEBUG')}")
logger.info(f"  QNN_VERBOSE: {os.environ.get('QNN_VERBOSE')}")
logger.info(f"  QNN_PERFORMANCE_MODE: {os.environ.get('QNN_PERFORMANCE_MODE')}")

# 预加载 DLL
logger.info("[INFO] 预加载 QNN 核心 DLL...")
import ctypes
dlls_to_load = [
    "Genie.dll",
    "QnnSystem.dll",
    "QnnModelDlc.dll",
    "QnnHtp.dll",
    "QnnHtpPrepare.dll"
]

for dll in dlls_to_load:
    found = False
    for p in paths_to_add:
        dll_path = Path(p) / dll
        if dll_path.exists():
            try:
                ctypes.WinDLL(str(dll_path))
                logger.info(f"[OK] 预加载成功: {dll}")
                found = True
                break
            except Exception as e:
                logger.warning(f"[WARNING] 预加载失败 {dll}: {e}")
    if not found:
        logger.warning(f"[WARNING] 未找到DLL: {dll}")

# 检查配置文件
config_path = "C:/model/Qwen2.0-7B-SSD-8380-2.34/config.json"
if not os.path.exists(config_path):
    logger.error(f"[ERROR] 配置文件不存在: {config_path}")
    sys.exit(1)

logger.info(f"[INFO] 读取配置文件: {config_path}")
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'UNKNOWN')
ext_config = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('extensions', 'NOT SET')

logger.info(f"[INFO] 配置文件检查:")
logger.info(f"  Backend Type: {backend_type}")
logger.info(f"  扩展配置: {ext_config}")

# 检查扩展配置
if ext_config != 'NOT SET' and os.path.exists(ext_config):
    with open(ext_config, 'r', encoding='utf-8') as f:
        ext_config_data = json.load(f)
    logger.info(f"[INFO] 扩展配置内容:")
    logger.info(json.dumps(ext_config_data, indent=2, ensure_ascii=False))

# 导入 GenieContext
logger.info("[INFO] 导入 GenieContext...")
try:
    from qai_appbuilder import GenieContext
    logger.info("[OK] GenieContext 导入成功")
except Exception as e:
    logger.error(f"[ERROR] GenieContext 导入失败: {e}")
    sys.exit(1)

# 创建 GenieContext
logger.info("=" * 70)
logger.info("创建 GenieContext 并捕获 QNN 日志")
logger.info("=" * 70)

try:
    model = GenieContext(config_path)
    logger.info("[OK] GenieContext 创建成功")
except Exception as e:
    logger.error(f"[ERROR] GenieContext 创建失败: {e}")
    import traceback
    logger.error(f"详细堆栈:\n{traceback.format_exc()}")
    sys.exit(1)

# 执行简单推理测试
logger.info("=" * 70)
logger.info("执行推理性能测试")
logger.info("=" * 70)

prompt = "你好"
logger.info(f"测试提示词: {prompt}")
logger.info(f"预期延迟: < 500ms (NPU)")

try:
    start_time = time.time()

    def callback(text):
        return True

    model.Query(prompt, callback)

    inference_time = (time.time() - start_time) * 1000

    logger.info(f"[OK] 推理完成: {inference_time:.2f}ms")

    # 判断是否使用 NPU
    if inference_time < 500:
        logger.info("[SUCCESS] 推理延迟 < 500ms，确认使用 NPU！")
    elif inference_time < 1000:
        logger.warning("[WARNING] 推理延迟 500-1000ms，可能使用 NPU 但性能一般")
    elif inference_time < 3000:
        logger.error("[ERROR] 推理延迟 1-3s，可能回退到 CPU 或 NPU 异常")
    else:
        logger.error("[CRITICAL] 推理延迟 > 3s，确认未使用 NPU，使用 CPU")

    logger.info("=" * 70)
    logger.info("诊断总结")
    logger.info("=" * 70)
    logger.info(f"Backend 配置: {backend_type}")
    logger.info(f"实际推理延迟: {inference_time:.2f}ms")
    logger.info(f"预期 NPU 延迟: < 500ms")

    if inference_time >= 1000:
        logger.error("[建议]")
        logger.error("  1. 检查 NPU 驱动是否正确安装")
        logger.error("  2. 检查是否有其他进程占用 NPU")
        logger.error("  3. 检查 Windows 事件查看器中的 NPU 相关错误")
        logger.error("  4. 尝试重启 AIPC")
        logger.error("  5. 检查 QNN 日志输出（上面）")

except Exception as e:
    logger.error(f"[ERROR] 推理测试失败: {e}")
    import traceback
    logger.error(f"详细堆栈:\n{traceback.format_exc()}")
    sys.exit(1)
