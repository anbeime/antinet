"""
NPU 模型加载器
使用AIPC预装的GenieContext进行NPU推理

硬件平台: 骁龙® X Elite (X1E-84-100)
软件工具: QAI AppBuilder v2.31.0 + QNN SDK v2.38
Backend: QNN HTP (Hexagon Tensor Processor) - 直接调用Hexagon NPU
模型: Llama3.1-8B (INT8量化QNN格式)
"""
import os
import sys
import time
import logging
logger = logging.getLogger(__name__)
from typing import Optional, Dict, Any, List
from pathlib import Path
import threading

# 强制禁用 qai_hub_models 依赖，防止因缺少该库导致崩溃
HAS_QAI_HUB = False

# 🔒 NPU 推理锁 - 防止并发推理导致 DSP 崩溃
_npu_inference_lock = threading.Lock()
_npu_cooldown_seconds = 0.5  # 推理间隔冷却时间

# 添加Genie路径 - 支持多个位置查找
import os
import sys

# 获取项目根目录（backend的上级目录）
# PyInstaller 打包后 __file__ 指向 _MEI291162 内的路径，需要向上找到真正的项目根目录
def _get_project_root() -> Path:
    """智能获取项目根目录，支持 PyInstaller 打包后的环境"""
    if getattr(sys, 'frozen', False):
        # PyInstaller 打包后使用 _MEIPASS
        app_base = Path(sys._MEIPASS)
    else:
        app_base = Path(__file__).parent.parent.parent.absolute()

    # 查找标志性目录来确认项目根
    markers = ['backend', 'src', 'data', 'dist_package']
    current = app_base
    for _ in range(5):  # 最多向上5层
        if any((current / m).exists() for m in markers):
            return current
        current = current.parent

    # 回退：直接使用 app_base
    return app_base

PROJECT_ROOT = _get_project_root()

# 智能查找 ai-engine-direct-helper 目录
def find_ai_engine_helper() -> Path:
    """智能查找 ai-engine-direct-helper 目录，支持多个位置"""
    possible_locations = [
        PROJECT_ROOT / "ai-engine-direct-helper-main",
        PROJECT_ROOT / "ai-engine-direct-helper",
        Path("C:/D/zhiyi/ai-engine-direct-helper"),
        Path("C:/D/zhiyi/ai-engine-direct-helper-main"),
        Path("C:/D/zhiy/ai-engine-direct-helper"),
        Path("C:/D/zhiy/ai-engine-direct-helper-main"),
    ]

    for loc in possible_locations:
        if loc.exists():
            logger.info(f"[OK] 找到 ai-engine-direct-helper: {loc}")
            return loc

    logger.warning(f"[WARNING] 未找到 ai-engine-direct-helper，尝试位置: {possible_locations}")
    return possible_locations[0]  # 返回默认位置

AI_ENGINE_HELPER_PATH = find_ai_engine_helper()
GENIE_PATH = str(AI_ENGINE_HELPER_PATH / "samples" / "genie" / "python")
if GENIE_PATH not in sys.path:
    sys.path.append(GENIE_PATH)

# 尝试从 config 导入 QNN 版本路径映射
try:
    from backend.config import QNN_SDK_PATHS
except ImportError:
    # 回退：查找精确版本的 SDK，不跨版本回退（版本不兼容会导致 DSP 崩溃）
    def _find_qnn_sdk(version: str) -> str:
        # 每个版本只查找自己的精确目录，不回退到其他版本
        version_dirs = {
            "2.34": ["2.34.0.250626"],
            "2.37": ["2.37.1.250807"],
            "2.38": ["GenieAPIService_v2.1.0_QAIRT_v2.38.0_v73"],
            "2.42": ["2.42.0.251225"],
            "2.44": ["2.45.40.260406"],
        }
        for vdir in version_dirs.get(version, []):
            # 特殊处理：GenieAPIService 目录结构不同
            if "GenieAPIService" in vdir:
                p = str(PROJECT_ROOT / "QAIRT" / vdir)
                if os.path.exists(p):
                    return p
            else:
                # 优先 arm64x-windows-msvc
                for arch in ["arm64x-windows-msvc", "aarch64-windows-msvc"]:
                    p = str(PROJECT_ROOT / "QAIRT" / vdir / "lib" / arch)
                    if os.path.exists(p):
                        return p
        # 找不到精确版本时返回空字符串，而不是回退到其他版本
        logger.warning(f"[SDK] 未找到 QNN {version} 版本的 SDK，模型加载可能失败")
        return ""
    QNN_SDK_PATHS = {v: _find_qnn_sdk(v) for v in ["2.34", "2.37", "2.38", "2.42", "2.44"]}

# 提取 QNN 版本号的辅助函数
def extract_qnn_version(quantization_str: str) -> str:
    """从 quantization 字符串中提取版本号，如 'QNN 2.37' -> '2.37'"""
    if not quantization_str:
        return "2.38"
    import re
    match = re.search(r'(\d+\.\d+)', quantization_str)
    return match.group(1) if match else "2.38"

# 初始化logger
logger = logging.getLogger(__name__)

def get_qai_libs_path() -> str:
    """
    动态获取 qai_appbuilder 的库路径
    新机器：qai_appbuilder 包目录直接包含 DLL（没有 libs 子目录）
    """
    try:
        import qai_appbuilder
        pkg_dir = os.path.dirname(qai_appbuilder.__file__)
        # 优先检查 libs 子目录（旧安装方式）
        libs_dir = os.path.join(pkg_dir, 'libs')
        if os.path.exists(libs_dir):
            return libs_dir
        # 新安装方式：DLL 直接在包目录里
        if os.path.exists(os.path.join(pkg_dir, 'Genie.dll')):
            return pkg_dir
    except (ImportError, TypeError):
        pass
    # 兜底：使用 QAIRT SDK 路径（优先2.45，然后2.42）
    return QNN_SDK_PATHS.get("2.45", QNN_SDK_PATHS.get("2.42", ""))

# AIPC 预装的额外 DLL 目录 - 智能查找实际包含 DLL 的目录
def _find_extra_qai_libs() -> str:
    """查找 AIPC 预装 DLL 目录（包含 Genie.dll 的实际目录）"""
    # PyInstaller 打包后，从 _MEIPASS 查找
    meipass_base = Path(getattr(sys, '_MEIPASS', '')) if hasattr(sys, '_MEIPASS') else Path('')

    candidates = [
        # 打包后的 _MEIPASS 目录（优先）
        meipass_base / "QAIRT",
        meipass_base / "ai-engine-direct-helper-main" / "samples" / "qai_libs",
        meipass_base / "models",
        # 原始项目目录
        PROJECT_ROOT / "QAIRT",
        PROJECT_ROOT / "ai-engine-direct-helper-main" / "samples" / "qai_libs",
        AI_ENGINE_HELPER_PATH / "samples" / "qai_libs",
        PROJECT_ROOT / "QAIRT_Runtime",
        # 硬编码的开发路径
        Path("C:/D/zhiyi/QAIRT"),
        Path("C:/D/zhiyi/ai-engine-direct-helper-main/samples/qai_libs"),
    ]

    # 查找包含 Genie.dll 的目录
    for c in candidates:
        if c.exists() and (c / "Genie.dll").exists():
            logger.info(f"[OK] 找到 AIPC 预装 DLL 目录: {c}")
            return str(c)

    # 查找 QAIRT 下的具体架构目录
    for c in candidates:
        if c.exists():
            for arch in ["arm64x-windows-msvc", "aarch64-windows-msvc"]:
                arch_path = c / arch
                if arch_path.exists() and (arch_path / "Genie.dll").exists():
                    logger.info(f"[OK] 找到 AIPC DLL 目录: {arch_path}")
                    return str(arch_path)

    # 兜底返回
    fallback = str(PROJECT_ROOT / "QAIRT")
    logger.warning(f"[WARNING] 未找到包含 Genie.dll 的 AIPC 预装目录，使用: {fallback}")
    return fallback

EXTRA_QAI_LIBS = _find_extra_qai_libs()

def setup_qnn_paths(qnn_version: str = None):
    """
    根据 QNN 版本动态设置库路径
    
    【重要发现】系统NPU驱动版本必须与SDK版本匹配！
    错误: Stub lib id mismatch: expected (v2.42), detected (v2.37)
    解决: 使用与系统驱动匹配的 SDK 版本
    
    策略:
    1. 如果指定版本存在，优先使用
    2. 否则使用系统驱动检测到的版本（默认2.37）
    """
    # QAIRT 版本号到目录名的映射
    version_dir_map = {
        "2.45": ["2.45.40.260406"],
        "2.42": ["2.42.0.251225"],
        "2.38": ["GenieAPIService_v2.1.0_QAIRT_v2.38.0_v73"],
        "2.37": ["2.37.1.250807"],
        "2.34": ["2.34.0.250626"],
    }
    
    qairt_base = PROJECT_ROOT / "QAIRT"
    
    # 【关键】默认使用 2.37（匹配当前系统NPU驱动）
    # 如果需要其他版本，必须显式指定且SDK存在
    DEFAULT_SDK_VERSION = "2.37"
    
    # 找到第一个存在的版本
    def find_existing_version(versions):
        for ver in versions:
            ver_dirs = version_dir_map.get(ver, [])
            for ver_dir in ver_dirs:
                if "GenieAPIService" in ver_dir:
                    if (qairt_base / ver_dir).exists():
                        return ver
                else:
                    for arch in ["arm64x-windows-msvc", "aarch64-windows-msvc"]:
                        if (qairt_base / ver_dir / "lib" / arch).exists():
                            return ver
        return None
    
    # 确定使用的版本
    use_version = None
    
    if qnn_version:
        # 尝试使用指定版本
        existing = find_existing_version([qnn_version])
        if existing:
            use_version = qnn_version
            logger.info(f"[SDK] 使用指定版本: {qnn_version}")
        else:
            logger.warning(f"[SDK] 指定版本 {qnn_version} 不存在，回退到默认版本")
    
    if not use_version:
        # 使用默认版本（匹配系统驱动）
        existing = find_existing_version([DEFAULT_SDK_VERSION])
        if existing:
            use_version = DEFAULT_SDK_VERSION
            logger.info(f"[SDK] 使用默认版本（匹配系统驱动）: {DEFAULT_SDK_VERSION}")
    
    if not use_version:
        logger.error("[SDK] 未找到匹配版本的 QNN SDK！模型加载可能失败")
        return None
    
    # 只使用匹配版本的 SDK，不尝试其他版本（版本不兼容会导致 DSP 崩溃）
    lib_path = None
    ver_dirs = version_dir_map.get(use_version, [])
    for ver_dir in ver_dirs:
        # 特殊处理：GenieAPIService 目录结构不同（DLL直接在根目录）
        if "GenieAPIService" in ver_dir:
            candidate = qairt_base / ver_dir
            if candidate.exists():
                lib_path = str(candidate)
                logger.info(f"[INFO] 使用 Genie SDK: {lib_path}")
                break
        else:
            # 标准QAIRT目录结构：lib/arm64x-windows-msvc
            for arch in ["arm64x-windows-msvc", "aarch64-windows-msvc"]:
                candidate = qairt_base / ver_dir / "lib" / arch
                if candidate.exists():
                    lib_path = str(candidate)
                    logger.info(f"[INFO] 使用 QAIRT SDK: {lib_path}")
                    break
        if lib_path:
            break
    
    if not lib_path:
        lib_path = get_qai_libs_path()
        logger.info(f"[INFO] 回退到 qai_appbuilder: {lib_path}")
    
    # 需要添加的路径列表（按优先级排序）
    # 【重要】只添加匹配版本的 SDK，避免版本冲突
    paths_to_add = []
    
    # 1. QAIRT SDK（版本匹配，优先）
    if lib_path and os.path.exists(lib_path):
        paths_to_add.append(lib_path)
        logger.info(f"[SDK] 添加匹配版本SDK: {lib_path}")
    
    # 2. 不再添加可能冲突的其他路径
    # 注意：移除了 qai_appbuilder、EXTRA_QAI_LIBS、QAIRT_Runtime
    # 因为这些可能包含不同版本的 DLL，导致崩溃
    
    # 添加所有路径到 PATH 和 DLL 目录
    current_path = os.environ.get('PATH', '')
    for p in paths_to_add:
        if p not in current_path:
            os.environ['PATH'] = p + ';' + current_path
            try:
                os.add_dll_directory(p)
                logger.info(f"[OK] 已添加QNN库路径: {p}")
            except Exception as e:
                logger.warning(f"[WARNING] 添加DLL目录失败: {e}")
    
    # 设置 QAI_LIBS_PATH
    if lib_path:
        os.environ['QAI_LIBS_PATH'] = lib_path
    
    return lib_path

# 初始化默认路径（不在此处加载，避免提前锁定版本）
# SDK 路径将在模型加载时根据模型版本动态设置
lib_path = None
logger.info("[SDK] SDK路径将在模型加载时动态设置")

# 设置 QNN 日志级别为 DEBUG 以启用详细日志输出
try:
    from backend.config import settings
    qnn_log_level = settings.QNN_LOG_LEVEL
    os.environ['QNN_LOG_LEVEL'] = qnn_log_level
    logger.info(f"[OK] QNN 日志级别设置为: {qnn_log_level}")
except ImportError:
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"
    logger.info("[INFO] 使用默认 QNN 日志级别: DEBUG")

# 设置 QNN 其他环境变量（关闭 SDK 详细日志，只保留应用层日志）
os.environ['QNN_DEBUG'] = "0"
os.environ['QNN_VERBOSE'] = "0"
os.environ['QNN_LOG_LEVEL'] = "WARN"  # 只显示警告和错误
logger.info("[OK] QNN SDK 日志已设置为简洁模式")

# 【重要】不在模块导入时预加载 DLL
# DLL 将在模型加载时根据模型版本动态预加载，避免版本冲突
import ctypes

def _preload_dlls(lib_path: str):
    """
    预加载指定版本的 QNN DLL
    必须在 setup_qnn_paths 之后调用，确保版本匹配
    """
    if not lib_path:
        logger.warning("[DLL] 无有效SDK路径，跳过预加载")
        return
    
    logger.info(f"[DLL] 预加载 SDK: {lib_path}")
    dlls_to_load = [
        "Genie.dll",           # Genie核心库
        "QnnSystem.dll",       # QNN系统库
        "QnnModelDlc.dll",    # QNN模型库
        "QnnHtp.dll",         # NPU backend
        "QnnHtpPrepare.dll"   # NPU准备库
    ]

    for dll in dlls_to_load:
        dll_path = Path(lib_path) / dll
        if dll_path.exists():
            try:
                ctypes.WinDLL(str(dll_path))
                logger.info(f"[DLL] 预加载成功: {dll}")
            except Exception as e:
                logger.warning(f"[DLL] 预加载失败 {dll}: {e}")
        else:
            logger.debug(f"[DLL] 未找到: {dll_path}")

# qai_hub_models是可选的，仅用于性能配置（BURST模式）
PerfProfile = None
HAS_QAI_HUB = False
try:
    from qai_hub_models.models._shared.perf_profile import PerfProfile
    HAS_QAI_HUB = True
    logger.info("[OK] 已导入 qai_hub_models.PerfProfile，性能优化可用")
except ImportError:
    logger.debug("[DEBUG] qai_hub_models 未安装，使用默认性能配置 (Windows ARM64 平台不需要安装此包)")
    # 通过环境变量启用BURST模式
    os.environ['QNN_PERFORMANCE_MODE'] = 'BURST'
    os.environ['QNN_HTP_PERFORMANCE_MODE'] = 'burst'
    logger.info("[OK] 已通过环境变量启用BURST模式 (QNN_PERFORMANCE_MODE=BURST)")

try:
    from qai_appbuilder import GenieContext
    logger.info("[OK] GenieContext导入成功")
except ImportError as e:
    raise RuntimeError(f"无法导入GenieContext: {e}。请确保已安装qai_appbuilder库。")





class ModelConfig:
    """模型配置类"""

    # 预装模型配置
    MODELS = {
        # "qwen2.5-vl-3b": {
        #     "name": "Qwen2.5-VL-3B",
        #     "path": str(PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42"),
        #     "params": "3B",
        #     "quantization": "QNN 2.42",
        #     "description": "最新模型，支持视觉+语言，QNN 2.42优化，2个分片",
        #     "max_tokens": 2048,
        #     "recommended": True
        # },
        "qwen2.0-7b": {
            "name": "Qwen2.0-7B-SSD",
            "path": "C:/models/Qwen2.0-7B-SSD-8380-2.34",
            "params": "7B",
            "quantization": "QNN 2.34",
            "description": "对话/分析，速度快，中文支持好（需要KV缓存）",
            "max_tokens": 2048,
            "recommended": False
        },
        "llama3.2-3b": {
            "name": "Llama3.2-3B",
            "path": "C:/models/llama3.2-3b-8380-qnn2.37",
            "params": "3B",
            "quantization": "QNN 2.37",
            "description": "推荐首选，基础模式，3个分片，轻量快速",
            "max_tokens": 2048,
            "recommended": True
        }
    }

    # 默认使用的模型（Qwen2.0-7B 中文能力强，优先使用）
    DEFAULT_MODEL = "qwen2.0-7b"




class NPUModelLoader:
    """NPU 模型加载器（使用 GenieContext）"""

    def __init__(self, model_key: str = None):
        """
        初始化模型加载器

        Args:
            model_key: 模型键名，如 "qwen2-7b-ssd"
        """
        self.model_key = model_key or ModelConfig.DEFAULT_MODEL
        self.model_config = ModelConfig.MODELS.get(self.model_key)

        if not self.model_config:
            raise ValueError(f"未知模型: {self.model_key}，可用模型: {list(ModelConfig.MODELS.keys())}")

        self.model: Optional[Any] = None
        self.is_loaded = False

    def load(self) -> Any:
        """
        加载模型到 NPU

        Returns:
            模型实例（真实 NPU）
        """
        logger.info(f"[DEBUG load] self.is_loaded={self.is_loaded}, self.model={self.model is not None}")
        if self.is_loaded:
            logger.info(f"[OK] 模型已加载: {self.model_config['name']}")
            return self.model

        # 安全检查：如果模型实例已存在，直接返回并设置 is_loaded
        if self.model is not None:
            logger.warning(f"模型实例存在但 is_loaded=False，修正状态")
            self.is_loaded = True
            logger.info(f"[DEBUG load] 修正后 self.is_loaded={self.is_loaded}")
            return self.model

        logger.info(f"正在加载模型: {self.model_config['name']}...")
        logger.info(f"模型路径: {self.model_config['path']}")

        # 验证模型路径存在
        model_path = Path(self.model_config['path'])
        if not model_path.exists():
            raise FileNotFoundError(f"模型路径不存在: {model_path}，请确保模型文件已部署到AIPC")

        # 根据模型的 QNN 版本切换 DLL 路径（不同版本模型需要匹配的 QNN SDK）
        qnn_version = extract_qnn_version(self.model_config.get('quantization', ''))
        logger.info(f"[INFO] 模型 QNN 版本: {qnn_version}")
        sdk_path = setup_qnn_paths(qnn_version)
        
        # 预加载匹配版本的 DLL
        _preload_dlls(sdk_path)

        start_time = time.time()

        max_retries = 3
        last_exception = None

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.warning(f"重试加载模型 (尝试 {attempt+1}/{max_retries})")
                    # 递增等待时间，给DSP更多恢复时间
                    wait_time = 3.0 * attempt
                    logger.info(f"等待 {wait_time}s 让DSP恢复...")
                    time.sleep(wait_time)

                # 使用 config.json 路径创建 GenieContext（官方示例：只传一个参数）
                config_path = str(model_path / "config.json")
                logger.info(f"[INFO] 创建 GenieContext: {config_path}")

                # 动态修正 config.json 中的路径（模型文件中可能残留 /sdcard/GenieModels 等旧路径）
                self._patch_config_paths(model_path)

                # 创建 GenieContext（参考官方 GenieSample.py，只传 config 参数）
                logger.info(f"[DEBUG] 正在创建 GenieContext，config_path={config_path}")
                logger.info(f"[DEBUG] PATH环境变量长度: {len(os.environ.get('PATH', ''))}")
                logger.info(f"[DEBUG] QNN_LOG_LEVEL: {os.environ.get('QNN_LOG_LEVEL', 'NOT SET')}")
                logger.info(f"[DEBUG] 使用单参数创建（参考官方 GenieSample.py）")

                # 尝试单参数创建（参考官方示例）
                self.model = GenieContext(config_path)
                logger.info(f"[OK] GenieContext 创建成功")

                # 验证 backend 配置
                logger.info(f"[INFO] 验证 NPU backend 配置...")
                import json
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                backend_type = config.get('dialog', {}).get('engine', {}).get('backend', {}).get('type', 'UNKNOWN')
                logger.info(f"[INFO] Backend Type: {backend_type}")
                if backend_type != 'QnnHtp':
                    logger.warning(f"[WARNING] Backend 类型不是 QnnHtp，当前为: {backend_type}")
                else:
                    logger.info(f"[OK] 确认使用 QnnHtp backend (NPU)")

                load_time = time.time() - start_time

                logger.info(f"[OK] NPU 模型加载成功")
                logger.info(f"  - 模型: {self.model_config['name']}")
                logger.info(f"  - 参数量: {self.model_config['params']}")
                logger.info(f"  - 量化版本: {self.model_config['quantization']}")
                logger.info(f"  - 加载时间: {load_time:.2f}s")
                logger.info(f"  - 运行设备: NPU (Hexagon)")

                self.is_loaded = True
                logger.info(f"[DEBUG load] 成功加载后 self.is_loaded={self.is_loaded}")

                # ⚠️ 预热推理已禁用 - 避免阻塞FastAPI事件循环
                # 首次推理可能会慢一些，但不会阻塞服务启动
                logger.info(f"[PERF] 跳过预热推理（避免阻塞事件循环）")

                return self.model

            except Exception as e:
                last_exception = e
                error_msg = str(e)
                logger.error(f"[ERROR] NPU 模型加载失败 (尝试 {attempt+1}/{max_retries}): {e}")
                import traceback
                logger.error(f"详细堆栈:\n{traceback.format_exc()}")

                # 检查是否是设备创建错误（DSP崩溃/FastRPC超时）
                if "Device Creation failure" in error_msg or "Extensions Failure" in error_msg or "Fastrpc" in error_msg:
                    logger.error("[CRITICAL] NPU DSP 设备创建失败 - DSP可能需要恢复")
                    logger.error("建议: 等待30秒后重试，或重启计算机")
                    # 增加额外等待时间让DSP恢复
                    if attempt < max_retries - 1:
                        extra_wait = 10.0 * (attempt + 1)
                        logger.info(f"等待额外 {extra_wait}s 让DSP恢复...")
                        time.sleep(extra_wait)

                # 检查是否是设备创建错误（错误代码14001）
                if "14001" in error_msg or "Failed to create device" in error_msg:
                    logger.error("[CRITICAL] NPU设备创建失败（错误代码14001）")
                    logger.error("可能原因:")
                    logger.error("  1. NPU驱动未正确安装")
                    logger.error("  2. 另一个进程已占用NPU资源")
                    logger.error("  3. DLL版本不匹配")
                    logger.error("  4. 系统权限不足")
                    logger.error("建议:")
                    logger.error("  - 重启AIPC")
                    logger.error("  - 检查是否有其他NPU相关进程运行")
                    logger.error("  - 查看Windows事件查看器中的错误日志")

                # 如果是最后一次尝试，则抛出异常
                if attempt == max_retries - 1:
                    raise RuntimeError(
                        f"NPU模型加载失败，重试 {max_retries} 次后仍失败: {e}\n"
                        f"请检查NPU驱动和DLL路径配置。"
                    )
                # 否则继续重试

        # 不应到达此处
        raise RuntimeError(f"NPU模型加载失败，未知错误: {last_exception}")

    def _patch_config_paths(self, model_path: Path):
        """
        修正模型 config.json 中的路径，将旧路径替换为当前机器的实际路径。
        模型文件中的 config.json 可能包含 /sdcard/GenieModels/xxx 或 C:/D/zhiyi/modelsxxx 等旧路径，
        需要替换为当前模型目录的实际 Windows 路径。
        """
        config_path = model_path / "config.json"
        if not config_path.exists():
            return

        import json
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_text = f.read()

            # 检测是否需要修正（包含 /sdcard/ 或 C:/D/zhiyi/models 等旧路径）
            needs_patch = '/sdcard/' in config_text or 'C:/D/zhiyi/models' in config_text
            if not needs_patch:
                return

            # 将旧路径前缀替换为实际模型目录路径
            # 使用正斜杠，与原始 config.json 格式一致
            actual_path = str(model_path).replace('\\', '/')

            import re
            # 替换 /sdcard/GenieModels/模型目录名/ 为实际路径
            config_text = re.sub(
                r'/sdcard/GenieModels/[^/]+/',
                actual_path + '/',
                config_text
            )
            # 替换 C:/D/zhiyi/models_2.xx/模型目录名/ 为实际路径
            config_text = re.sub(
                r'C:/D/zhiyi/models[^/]*/[^/]+/',
                actual_path + '/',
                config_text
            )

            # 写回修正后的 config.json
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(config_text)
            logger.info(f"[OK] 已修正 config.json 路径: {actual_path}")

        except Exception as e:
            logger.warning(f"[WARNING] 修正 config.json 路径失败: {e}")

    def _format_prompt(self, user_input: str, system_prompt: str = None) -> str:
        """
        格式化用户输入为模型期望的 ChatML 格式
        
        Args:
            user_input: 用户输入文本（已包含所有上下文）
            system_prompt: 自定义系统提示词，None 时使用默认值
            
        Returns:
            格式化后的完整提示
        """
        # 使用自定义 system_prompt（如 Agent 角色设定），否则使用通用默认值
        effective_system = system_prompt if system_prompt else "You are a helpful assistant."
        prompt_tags_1 = f"<|im_start|>system\n{effective_system}<|im_end|>\n<|im_start|>user\n"
        prompt_tags_2 = "<|im_end|>\n<|im_start|>assistant\n"
        
        # 构建完整提示（user_input 已包含所有内容）
        formatted_prompt = prompt_tags_1 + user_input + prompt_tags_2
        
        logger.debug(f"[ChatML] system_prompt长度={len(effective_system)}, user_input长度={len(user_input)}, 格式化后长度={len(formatted_prompt)}")
        
        return formatted_prompt

    def _clean_output(self, output: str, input_prompt: str) -> str:
        """
        清理模型输出，移除特殊 token（简化版，参考旧版本）
        
        Args:
            output: 原始模型输出
            input_prompt: 格式化后的输入提示词（未使用，保留参数兼容）
            
        Returns:
            清理后的输出
        """
        if not output:
            return output
        
        # 只清理基本的特殊 token
        special_tokens = [
            '<|im_start|>', '<|im_end|>',
            '</s>', '<|end|>', '<|bos|>', '<|eos|>'
        ]
        for tok in special_tokens:
            output = output.replace(tok, '')
        
        return output.strip()

    def infer(self, prompt: str, max_new_tokens: int = 32, temperature: float = 0.7, system_prompt: str = None) -> str:
        """
        执行推理

        Args:
            prompt: 用户输入提示词
            max_new_tokens: 最大生成token数
            temperature: 温度参数
            system_prompt: 自定义系统提示词（Agent角色设定等）

        Returns:
            生成的文本

        Raises:
            Exception: 如果推理过程发生错误
        """
        # 安全检查：如果模型实例已存在但 is_loaded=False，修正状态
        if self.model is not None and not self.is_loaded:
            logger.warning(f"模型实例存在但 is_loaded=False，在 infer() 中修正状态")
            self.is_loaded = True
        
        if not self.is_loaded:
            self.load()

        # 🔒 获取NPU推理锁，防止并发导致DSP崩溃
        acquired = _npu_inference_lock.acquire(timeout=120)  # 最多等待2分钟
        if not acquired:
            raise RuntimeError("NPU推理锁获取超时，可能存在死锁或长时间推理")
        
        try:
            # 🧊 推理前冷却等待
            time.sleep(_npu_cooldown_seconds)
            
            # 🔑 分段计时1: 整体开始
            total_start = time.time()

            # 🔑 分段计时2: 提示词格式化
            format_start = time.time()
            formatted_prompt = self._format_prompt(prompt, system_prompt=system_prompt)
            format_time = (time.time() - format_start) * 1000
            logger.debug(f"提示词格式化: {format_time:.2f}ms")

            # 设置推理参数
            if hasattr(self.model, 'SetParams'):
                try:
                    # SetParams需要字符串参数
                    max_tokens_str = str(max_new_tokens)
                    temp_str = str(temperature)
                    top_k_str = str(40)  # top_k参数
                    top_p_str = str(0.95)  # top_p参数
                    logger.debug(f"设置推理参数: max_tokens={max_tokens_str}, temperature={temp_str}")
                    success = self.model.SetParams(max_tokens_str, temp_str, top_k_str, top_p_str)
                    logger.debug(f"SetParams返回: {success}")
                except Exception as param_error:
                    logger.warning(f"SetParams失败，使用默认参数: {param_error}")

            # 🔑 关键优化1: 推理前启用BURST性能模式
            burst_enabled = False
            burst_start = time.time()
            try:
                if PerfProfile is not None:
                    PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
                    burst_enabled = True
                    logger.info("[PERF] ✅ BURST模式已启用 (via PerfProfile)")
                elif os.environ.get('QNN_PERFORMANCE_MODE') == 'BURST':
                    burst_enabled = True
                    logger.info("[PERF] ✅ BURST模式已启用 (via 环境变量)")
                else:
                    logger.info("[PERF] INFO: 未检测到BURST模式配置")
            except Exception as e:
                logger.warning(f"[PERF] ⚠️ 启用BURST模式失败: {e}")
            burst_set_time = (time.time() - burst_start) * 1000
            logger.info(f"[PERF] BURST模式设置耗时: {burst_set_time:.2f}ms")

            # 创建回调函数收集结果
            result_parts = []
            token_count = 0

            def callback(text):
                nonlocal token_count
                token_count += 1
                result_parts.append(text)
                # 只记录前几次回调，避免日志过多
                if token_count <= 5:
                    logger.debug(f"回调 #{token_count}: {repr(text[:50])}...")
                return True

            # 🔑 分段计时3: 纯推理时间
            inference_start = time.time()
            logger.debug(f"开始NPU推理...")
            
            # 使用线程+超时保护，防止 DSP 卡死导致整个服务挂住
            import concurrent.futures
            query_error = [None]
            
            def _do_query():
                try:
                    self.model.Query(formatted_prompt, callback)
                except Exception as e:
                    query_error[0] = e
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_do_query)
                try:
                    # 推理超时：max_new_tokens * 5秒/token + 30秒基础
                    query_timeout = max(max_new_tokens * 5 + 30, 60)
                    future.result(timeout=query_timeout)
                except concurrent.futures.TimeoutError:
                    logger.error(f"[ERROR] NPU推理超时 ({query_timeout}s)，DSP可能卡死")
                    # 释放 GenieContext，让 DSP 有机会恢复
                    try:
                        if self.model and hasattr(self.model, 'release'):
                            self.model.release()
                            logger.info("[RECOVERY] 已释放 GenieContext，DSP 资源已回收")
                    except Exception as release_err:
                        logger.warning(f"[RECOVERY] 释放 GenieContext 失败: {release_err}")
                    self.model = None
                    self.is_loaded = False
                    raise RuntimeError(f"NPU推理超时 ({query_timeout}s)，GenieContext 已释放，下次推理将重新加载")
            
            if query_error[0]:
                raise query_error[0]
            inference_time = (time.time() - inference_start) * 1000
            logger.debug(f"推理完成，生成Token数: {token_count}")

            # 🔑 分段计时4: 结果拼接
            join_start = time.time()
            result = ''.join(result_parts)
            join_time = (time.time() - join_start) * 1000
            logger.debug(f"结果拼接: {join_time:.2f}ms")

            # 🔑 关键优化2: 推理后释放BURST模式（仅在使用PerfProfile时）
            if burst_enabled and PerfProfile is not None:
                try:
                    PerfProfile.RelPerfProfileGlobal()
                    logger.info("[PERF] ✅ BURST模式已释放")
                except Exception as e:
                    logger.warning(f"[PERF] ⚠️ 释放BURST模式失败: {e}")

            # 🔑 分段计时5: 总耗时
            total_time = (time.time() - total_start) * 1000

            # 🔑 详细的分段性能日志
            logger.info(f"[PERF] ========== 推理分段性能 ==========")
            logger.info(f"[PERF] 1. 格式化耗时: {format_time:.2f}ms")
            logger.info(f"[PERF] 2. BURST设置: {burst_set_time:.2f}ms")
            logger.info(f"[PERF] 3. 纯推理耗时: {inference_time:.2f}ms ⭐")
            logger.info(f"[PERF] 4. 结果拼接: {join_time:.2f}ms")
            logger.info(f"[PERF] 5. 总耗时: {total_time:.2f}ms")
            logger.info(f"[PERF] =====================================")

            logger.info(f"[PERF] ========== 推理性能统计 ==========")
            logger.info(f"[PERF] 生成Token数: {token_count}")
            if token_count > 0:
                logger.info(f"[PERF] 每Token耗时: {inference_time/token_count:.2f}ms")
                logger.info(f"[PERF] 吞吐量: {token_count/inference_time*1000:.1f} tokens/sec")
            logger.info(f"[PERF] BURST模式: {'✅ 已启用' if burst_enabled else '❌ 未启用'}")
            logger.info(f"[PERF] =====================================")

            # 🔑 关键优化3: 性能检查（高通赛道要求：每Token延迟 < 200ms）
            avg_token_time = inference_time / token_count if token_count > 0 else 0
            throughput = token_count / inference_time * 1000 if token_count > 0 else 0
            
            if avg_token_time > 200:
                warning_msg = (
                    f"[PERF] ⚠️ 每Token延迟 {avg_token_time:.2f}ms > 200ms（性能不佳）\n"
                    f"可能原因：\n"
                    f"  1. NPU驱动未正确加载\n"
                    f"  2. Backend配置不是QnnHtp\n"
                    f"  3. BURST模式未生效\n"
                    f"\n"
                    f"建议检查：\n"
                    f"  - config.json中的backend.type是否为'QnnHtp'\n"
                    f"  - htp_backend_ext_config.json中perf_profile是否为'burst'\n"
                    f"  - NPU驱动是否正确安装"
                )
                logger.warning(warning_msg)
            elif throughput < 5:
                warning_msg = (
                    f"[PERF] ⚠️ 吞吐量 {throughput:.1f} tokens/sec < 5（性能不佳）"
                )
                logger.warning(warning_msg)
            else:
                logger.info(f"[PERF] ✅ 性能正常: {throughput:.1f} tokens/sec, 每Token {avg_token_time:.1f}ms")

            # 🔑 关键修复：清理输出中可能包含的输入提示词
            result = self._clean_output(result, formatted_prompt)
            
            # 🧊 推理后冷却等待
            time.sleep(_npu_cooldown_seconds)
            
            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            import traceback
            logger.error(f"详细堆栈:\n{traceback.format_exc()}")
            # 推理异常时释放 GenieContext，避免 DSP 资源残留
            if "Fastrpc" in str(e) or "Device Creation" in str(e) or "DSP" in str(e).upper():
                logger.warning("[RECOVERY] 检测到 DSP 相关错误，释放 GenieContext 以恢复 NPU")
                try:
                    if self.model and hasattr(self.model, 'release'):
                        self.model.release()
                        logger.info("[RECOVERY] GenieContext 已释放")
                except Exception as release_err:
                    logger.warning(f"[RECOVERY] 释放 GenieContext 失败: {release_err}")
                self.model = None
                self.is_loaded = False
            raise
        finally:
            # 🔓 确保锁被释放
            _npu_inference_lock.release()

    def get_performance_stats(self) -> Dict[str, Any]:
        """
        获取性能统计数据

        Returns:
            性能统计字典
        """
        return {
            "model_name": self.model_config['name'],
            "params": self.model_config['params'],
            "quantization": self.model_config['quantization'],
            "is_loaded": self.is_loaded,
            "device": "NPU (Hexagon)",
            "runtime": "HTP",
            "log_level": "INFO"
        }

    def unload(self):
        """卸载模型释放资源"""
        # 🔒 等待推理锁释放
        acquired = _npu_inference_lock.acquire(timeout=30)
        
        try:
            if self.model and hasattr(self.model, 'release'):
                self.model.release()
                # 等待资源完全释放
                time.sleep(1.0)

            self.model = None
            self.is_loaded = False
            logger.info(f"[OK] 模型已卸载: {self.model_config['name']}")
        finally:
            if acquired:
                _npu_inference_lock.release()

    @staticmethod
    def list_available_models() -> Dict[str, Dict[str, Any]]:
        """
        列出所有可用模型

        Returns:
            模型配置字典
        """
        return ModelConfig.MODELS

    @staticmethod
    def get_recommended_model() -> str:
        """
        获取推荐模型键名

        Returns:
            推荐模型的键名
        """
        for key, config in ModelConfig.MODELS.items():
            if config.get("recommended"):
                return key
        return ModelConfig.DEFAULT_MODEL


# 全局模型实例（单例模式）
_global_model_loader: Optional[NPUModelLoader] = None

logger.info(f"[MODULE INIT] _global_model_loader initialized to: {_global_model_loader}")


def get_model_loader(model_key: str = None) -> NPUModelLoader:
    """
    获取全局模型加载器实例（单例模式）

    Args:
        model_key: 模型键名

    Returns:
        模型加载器实例
    """
    global _global_model_loader
    
    logger.info(f"[get_model_loader] _global_model_loader before: {_global_model_loader}")

    if _global_model_loader is None:
        logger.info(f"[get_model_loader] Creating new NPUModelLoader with key: {model_key}")
        _global_model_loader = NPUModelLoader(model_key)
        logger.info(f"[get_model_loader] Created: {_global_model_loader}")
    else:
        logger.info(f"[get_model_loader] Returning existing: {_global_model_loader}")

    return _global_model_loader


def load_model_if_needed(model_key: str = None) -> Any:
    """
    加载模型（如果尚未加载）

    Args:
        model_key: 模型键名

    Returns:
        模型实例
    """
    loader = get_model_loader(model_key)
    return loader.load()


# 使用示例
if __name__ == "__main__":
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("=" * 60)
    print("NPU 模型加载器测试")
    print("=" * 60)

    # 1. 列出所有可用模型
    print("\n可用模型:")
    for key, config in NPUModelLoader.list_available_models().items():
        print(f"  [{key}] {config['name']} ({config['params']})")
        print(f"      - {config['description']}")
        if config.get('recommended'):
            print(f"      - * 推荐首选")

    # 2. 加载推荐模型
    print(f"\n正在加载推荐模型...")
    loader = NPUModelLoader()
    model = loader.load()

    # 3. 执行推理测试
    print("\n执行推理测试...")
    test_prompt = "请分析一下端侧AI的优势"
    result = loader.infer(test_prompt, max_new_tokens=100)
    print(f"输入: {test_prompt}")
    print(f"输出: {result[:100]}...")

    # 4. 查看性能统计
    print("\n性能统计:")
    stats = loader.get_performance_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
