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

# 强制禁用 qai_hub_models 依赖，防止因缺少该库导致崩溃
HAS_QAI_HUB = False

# 引入 requests 库用于 API 调用
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    logger.warning("requests 库未安装，API 模型将不可用")

# 添加Genie路径 - 支持多个位置查找
import os
# 获取项目根目录（backend的上级目录）
PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()

# 智能查找 ai-engine-direct-helper 目录
def find_ai_engine_helper() -> Path:
    """智能查找 ai-engine-direct-helper 目录，支持多个位置"""
    possible_locations = [
        PROJECT_ROOT / "ai-engine-direct-helper-main",
        PROJECT_ROOT / "ai-engine-direct-helper",
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
    # 回退：按优先级查找精确版本，然后 fallback 到 2.42
    def _find_qnn_sdk(version: str) -> str:
        version_dirs = {
            "2.34": ["2.34.0.250626", "2.42.0.251225"],
            "2.37": ["2.37.1.250807", "2.42.0.251225"],
            "2.38": ["2.38.0.250901", "2.42.0.251225"],
            "2.42": ["2.42.0.251225"],
            "2.44": ["2.42.0.251225"],
        }
        for vdir in version_dirs.get(version, ["2.42.0.251225"]):
            p = str(PROJECT_ROOT / "QAIRT" / vdir / "lib" / "aarch64-windows-msvc")
            if os.path.exists(p):
                return p
        return str(PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "lib" / "aarch64-windows-msvc")
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
    # 兜底：使用 QAIRT SDK 路径
    return QNN_SDK_PATHS.get("2.42", "")

# AIPC 预装的额外 DLL 目录 - 智能查找实际包含 DLL 的目录
def _find_extra_qai_libs() -> str:
    """查找 AIPC 预装 DLL 目录（包含 Genie.dll 的实际目录）"""
    candidates = [
        AI_ENGINE_HELPER_PATH / "samples" / "qai_libs" / "QAIRT_Runtime" / "aarch64-windows-msvc",
        AI_ENGINE_HELPER_PATH / "samples" / "qai_libs" / "QAIRT_Runtime" / "arm64x-windows-msvc",
        AI_ENGINE_HELPER_PATH / "samples" / "qai_libs",
        PROJECT_ROOT / "QAIRT_Runtime" / "aarch64-windows-msvc",
        PROJECT_ROOT / "QAIRT_Runtime" / "arm64x-windows-msvc",
    ]
    for c in candidates:
        if c.exists() and (c / "Genie.dll").exists():
            logger.info(f"[OK] 找到 AIPC 预装 DLL 目录: {c}")
            return str(c)
    # 兜底返回上层目录
    fallback = str(AI_ENGINE_HELPER_PATH / "samples" / "qai_libs")
    logger.warning(f"[WARNING] 未找到包含 Genie.dll 的 AIPC 预装目录，使用: {fallback}")
    return fallback

EXTRA_QAI_LIBS = _find_extra_qai_libs()

def setup_qnn_paths(qnn_version: str = None):
    """
    根据 QNN 版本动态设置库路径
    优先使用特定模型配套的 SDK 目录
    """
    # 优先使用特定模型配套的 SDK（用户指定的正确路径）
    model_specific_paths = [
        PROJECT_ROOT / "QAIRT" / "GenieAPIService_v2.1.0_QAIRT_v2.38.0_v73",
    ]
    
    for sdk_path in model_specific_paths:
        if sdk_path.exists():
            lib_path = str(sdk_path)
            logger.info(f"[INFO] 使用模型专用 SDK: {lib_path}")
            
            # 添加到 PATH
            if lib_path not in os.environ.get('PATH', ''):
                os.environ['PATH'] = lib_path + ';' + os.environ.get('PATH', '')
            try:
                os.add_dll_directory(lib_path)
                logger.info(f"[OK] 已添加模型专用 SDK 路径: {lib_path}")
            except Exception as e:
                logger.warning(f"[WARNING] 添加DLL目录失败: {e}")
            
            os.environ['QAI_LIBS_PATH'] = lib_path
            return lib_path
    
    # 备选方案：尝试 C:\D\zhiyi\QAIRT 目录下的其他 SDK
    qairt_base = PROJECT_ROOT / "QAIRT"
    version_priority = ["2.37", "2.38", "2.42"]
    if qnn_version and qnn_version not in version_priority:
        version_priority.insert(0, qnn_version)
    
    lib_path = None
    for ver in version_priority:
        for ver_dir in [f"{ver}.0.251225", f"{ver}.0.250901", f"{ver}.1.250807", f"{ver}.0.250724"]:
            candidate = qairt_base / ver_dir / "lib" / "aarch64-windows-msvc"
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
    paths_to_add = []
    
    # 1. QAIRT SDK（最完整，优先）
    if lib_path and os.path.exists(lib_path):
        paths_to_add.append(lib_path)
    
    # 2. qai_appbuilder 包目录（DLL直接在包里）
    try:
        import qai_appbuilder
        pkg_dir = os.path.dirname(qai_appbuilder.__file__)
        if pkg_dir not in paths_to_add and os.path.exists(os.path.join(pkg_dir, 'Genie.dll')):
            paths_to_add.append(pkg_dir)
    except ImportError:
        pass
    
    # 3. AIPC 预装 DLL 目录
    if os.path.exists(EXTRA_QAI_LIBS) and EXTRA_QAI_LIBS not in paths_to_add:
        paths_to_add.append(EXTRA_QAI_LIBS)
    
    # 4. QAIRT_Runtime 备用目录
    for rt_dir in [
        str(PROJECT_ROOT / "QAIRT_Runtime" / "aarch64-windows-msvc"),
        str(PROJECT_ROOT / "QAIRT_Runtime" / "arm64x-windows-msvc"),
    ]:
        if os.path.exists(rt_dir) and rt_dir not in paths_to_add:
            paths_to_add.append(rt_dir)
    
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

# 初始化默认路径
lib_path = setup_qnn_paths("2.38")

# 设置 QNN 日志级别为 DEBUG 以启用详细日志输出
try:
    from backend.config import settings
    qnn_log_level = settings.QNN_LOG_LEVEL
    os.environ['QNN_LOG_LEVEL'] = qnn_log_level
    logger.info(f"[OK] QNN 日志级别设置为: {qnn_log_level}")
except ImportError:
    os.environ['QNN_LOG_LEVEL'] = "DEBUG"
    logger.info("[INFO] 使用默认 QNN 日志级别: DEBUG")

# 设置 QNN 其他环境变量以启用详细日志
os.environ['QNN_DEBUG'] = "1"
os.environ['QNN_VERBOSE'] = "1"
logger.info("[OK] QNN 调试标志已设置（QNN_DEBUG=1, QNN_VERBOSE=1）")

# 预加载QNN核心DLL，确保正确的加载顺序
logger.info("[INFO] 预加载QNN核心DLL...")
import ctypes

# 从 setup_qnn_paths 中获取所有 DLL 搜索路径
_dll_paths = [lib_path] if lib_path else []
# 补充其他可能的 DLL 路径
for extra in [
    EXTRA_QAI_LIBS,
    str(PROJECT_ROOT / "QAIRT_Runtime" / "aarch64-windows-msvc"),
    str(PROJECT_ROOT / "QAIRT_Runtime" / "arm64x-windows-msvc"),
    str(PROJECT_ROOT / "QAIRT" / "2.42.0.251225" / "lib" / "aarch64-windows-msvc"),
]:
    if extra and os.path.exists(extra) and extra not in _dll_paths:
        _dll_paths.append(extra)
# qai_appbuilder 包目录也可能包含 DLL
try:
    import qai_appbuilder
    pkg_dir = os.path.dirname(qai_appbuilder.__file__)
    if pkg_dir not in _dll_paths:
        _dll_paths.append(pkg_dir)
except ImportError:
    pass
logger.info(f"[DLL搜索路径] {_dll_paths}")
try:
    # 按顺序预加载DLL，避免版本冲突（改进版：先加载Genie.dll）
    dlls_to_load = [
        "Genie.dll",           # Genie核心库
        "QnnSystem.dll",       # QNN系统库
        "QnnModelDlc.dll",    # QNN模型库
        "QnnHtp.dll",         # NPU backend
        "QnnHtpPrepare.dll"   # NPU准备库
    ]

    for dll in dlls_to_load:
        found = False
        for p in _dll_paths:
            dll_path = Path(p) / dll
            if dll_path.exists():
                try:
                    # 使用windll而不是CDLL，因为有些DLL需要stdcall调用约定
                    ctypes.WinDLL(str(dll_path))
                    logger.info(f"[OK] 预加载成功: {dll}")
                    found = True
                    break
                except Exception as e:
                    logger.warning(f"[WARNING] 预加载失败 {dll}: {e}")
        if not found:
            logger.warning(f"[WARNING] 未找到DLL: {dll}")

    logger.info("[OK] DLL预加载完成")
except Exception as e:
    logger.warning(f"[WARNING] DLL预加载过程出错: {e}")

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

    # 预装模型配置（注意：qwen2.5-vl-3b 不在此列表，它需要独立 VL 服务）
    MODELS = {
        "gemma4": {
            "name": "Gemma 4",
            "api_endpoint": "http://localhost:11434",
            "method": "POST",
            "type": "api",
            "params": "API",
            "quantization": "API",
            "description": "Gemma 4 - 通过本地API服务访问的模型",
            "max_tokens": 2048,
            "recommended": True,
            "path": ""
        },
        # "qwen2.5-vl-3b": {  # VL 模型，走独立服务，不在此列表
        #     "name": "Qwen2.5-VL-3B",
        #     "path": "C:/D/zhiyi/models/models_2.42/qwen2.5vl3b-8380-2.42",
        #     "params": "3B",
        #     "quantization": "QNN 2.42",
        #     "description": "最新模型，支持视觉+语言，QNN 2.42优化，2个分片",
        #     "max_tokens": 2048,
        #     "recommended": True
        # },
        "qwen2.0-7b": {
            "name": "Qwen2.0-7B-SSD",
            "path": str(PROJECT_ROOT / "models" / "Qwen2.0-7B-SSD-8380-2.34"),
            "params": "7B",
            "quantization": "QNN 2.34",
            "description": "对话/分析，速度快，中文支持好（需要KV缓存）",
            "max_tokens": 2048,
            "recommended": False
        },
        "llama3.2-3b": {
            "name": "Llama3.2-3B",
            "path": str(PROJECT_ROOT / "models" / "llama3.2-3b-8380-qnn2.37"),
            "params": "3B",
            "quantization": "QNN 2.37",
            "description": "推荐首选，基础模式，3个分片，轻量快速",
            "max_tokens": 2048,
            "recommended": True
        },
        "qwen2.5-vl-3b": {
            "name": "Qwen2.5-VL-3B",
            "path": str(PROJECT_ROOT / "models" / "qwen2.5vl3b-8380-2.42"),
            "params": "3B",
            "quantization": "QNN 2.38",
            "description": "视觉语言模型，配套 GenieAPIService_v2.1.0_QAIRT_v2.38.0_v73",
            "max_tokens": 2048,
            "recommended": True
        },
        "bge-base-zh": {
            "name": "BGE-Base-ZH",
            "path": str(PROJECT_ROOT / "models" / "bge-base-zh-v1.5-qnn-8380"),
            "params": "110M",
            "quantization": "QNN",
            "description": "中文文本嵌入模型，RAG知识库，完整单文件",
            "max_tokens": 512,
            "recommended": True
        },
        # "llama3.1-8b": {  # 已禁用，NPU加载失败
        #     "name": "Llama3.1-8B",
        #     "path": "C:/D/zhiyi/models/llama3.1-8b-8380-qnn2.38",
        #     "params": "8B",
        #     "quantization": "QNN 2.38",
        #     "description": "对话生成，英文效果好，推理能力强，性能优化（分片文件，需合并）",
        #     "max_tokens": 2048,
        #     "recommended": False
        # },
    }

    # 默认使用的模型
    # Llama3.2-3B: 纯文本模型，QNN 2.37，稳定可用
    DEFAULT_MODEL = "llama3.2-3b"


class APIModelLoader:
    """API-based model loader for models like Gemma4"""
    
    def __init__(self, model_key: str = None):
        """
        Initialize API model loader
        
        Args:
            model_key: Model key name, e.g., "gemma4"
        """
        self.model_key = model_key or "gemma4"
        self.model_config = ModelConfig.MODELS.get(self.model_key)
        
        if not self.model_config:
            raise ValueError(f"Unknown model: {self.model_key}, available models: {list(ModelConfig.MODELS.keys())}")
        
        if self.model_config.get("type") != "api":
            raise ValueError(f"Model {self.model_key} is not an API model")
        
        self.api_endpoint = self.model_config.get("api_endpoint")
        self.method = self.model_config.get("method", "POST")
        self.is_loaded = True  # API models are always "loaded"
    
    def load(self) -> Any:
        """API models don't need loading, just confirm availability"""
        logger.info(f"API model {self.model_config['name']} is ready")
        self.is_loaded = True
        return self
    
    def infer(self, prompt: str, max_new_tokens: int = 256, temperature: float = 0.7) -> str:
        """
        Execute inference via API
        
        Args:
            prompt: Input prompt
            max_new_tokens: Maximum tokens to generate
            temperature: Temperature parameter
            
        Returns:
            Generated text
            
        Raises:
            Exception: If inference fails
        """
        if not HAS_REQUESTS:
            raise ImportError("requests library is required for API models")
        
        try:
            logger.info(f"Calling API model {self.model_key} at {self.api_endpoint}")
            
            # Build request payload - 使用 Ollama /api/chat 端点
            payload = {
                "model": "gemma4",
                "messages": [{"role": "user", "content": prompt}],
                "options": {
                    "num_predict": max_new_tokens,
                    "temperature": temperature
                }
            }
            
            # Make API request - 使用 /api/chat 端点
            response = requests.post(
                f"{self.api_endpoint}/api/chat",
                json=payload,
                timeout=120  # 120 second timeout
            )
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Parse response
            result = response.json()
            
            # Extract text from response (adjust based on actual API format)
            if isinstance(result, dict):
                if "response" in result:
                    return result["response"]
                elif "output" in result:
                    return result["output"]
                elif "choices" in result and len(result["choices"]) > 0:
                    choice = result["choices"][0]
                    if isinstance(choice, dict) and "text" in choice:
                        return choice["text"]
                    elif isinstance(choice, str):
                        return choice
                elif "message" in result and isinstance(result["message"], dict) and "content" in result["message"]:
                    return result["message"]["content"]
            
            # Fallback: return string representation
            return str(result)
            
        except requests.exceptions.ConnectionError as e:
            error_msg = f"Failed to connect to API endpoint {self.api_endpoint}: {e}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except requests.exceptions.Timeout as e:
            error_msg = f"API request timed out: {e}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"API request failed: {e}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"API inference failed: {e}"
            logger.error(error_msg)
            raise
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance stats for API model"""
        return {
            "model_name": self.model_config['name'],
            "params": self.model_config['params'],
            "quantization": self.model_config['quantization'],
            "is_loaded": self.is_loaded,
            "device": "API",
            "runtime": "HTTP",
            "api_endpoint": self.api_endpoint,
            "log_level": "INFO"
        }
    
    def unload(self):
        """API models don't need unloading"""
        self.is_loaded = False
        logger.info(f"API model {self.model_config['name']} marked as unloaded")


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
        setup_qnn_paths(qnn_version)

        start_time = time.time()

        max_retries = 3
        last_exception = None

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.warning(f"重试加载模型 (尝试 {attempt+1}/{max_retries})")
                    # 等待一小段时间再重试
                    time.sleep(2.0)

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

                # 注意：config.json已经配置了BURST模式，不需要在Python代码中重复设置
                # 避免重复设置导致冲突

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
                logger.error(f"[ERROR] NPU 模型加载失败 (尝试 {attempt+1}/{max_retries}): {e}")
                import traceback
                logger.error(f"详细堆栈:\n{traceback.format_exc()}")

                # 检查是否是设备创建错误（错误代码14001）
                error_msg = str(e)
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
            # 替换 C:/D/zhiyi/modelsmodels_2.xx/模型目录名/ 为实际路径
            config_text = re.sub(
                r'C:/D/zhiyi/modelsmodels[^/]*/[^/]+/',
                actual_path + '/',
                config_text
            )

            # 写回修正后的 config.json
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(config_text)
            logger.info(f"[OK] 已修正 config.json 路径: {actual_path}")

        except Exception as e:
            logger.warning(f"[WARNING] 修正 config.json 路径失败: {e}")

    def _format_prompt(self, user_input: str) -> str:
        """
        格式化用户输入为模型期望的提示格式
        
        根据prompt.conf文件格式：
        prompt_tags_1: <|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n
        prompt_tags_2: <|im_end|>\n<|im_start|>assistant\n
        
        Args:
            user_input: 用户输入文本
            
        Returns:
            格式化后的完整提示
        """
        # 硬编码的提示格式（从prompt.conf解析）
        prompt_tags_1 = "<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n<|im_start|>user\n"
        prompt_tags_2 = "<|im_end|>\n<|im_start|>assistant\n"
        
        # 构建完整提示
        formatted_prompt = prompt_tags_1 + user_input + prompt_tags_2
        logger.debug(f"提示格式化: 用户输入={repr(user_input)}, 格式化后长度={len(formatted_prompt)}")
        
        return formatted_prompt

    def infer(self, prompt: str, max_new_tokens: int = 256, temperature: float = 0.7) -> str:
        """
        执行推理

        Args:
            prompt: 输入提示词
            max_new_tokens: 最大生成token数（默认64以优化性能）
            temperature: 温度参数

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

        try:
            # 🔑 分段计时1: 整体开始
            total_start = time.time()

            # 🔑 分段计时2: 提示词格式化
            format_start = time.time()
            formatted_prompt = self._format_prompt(prompt)
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
            self.model.Query(formatted_prompt, callback)
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

            return result

        except Exception as e:
            logger.error(f"[ERROR] 推理失败: {e}")
            import traceback
            logger.error(f"详细堆栈:\n{traceback.format_exc()}")
            raise

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
        if self.model and hasattr(self.model, 'release'):
            self.model.release()

        self.model = None
        self.is_loaded = False
        logger.info(f"[OK] 模型已卸载: {self.model_config['name']}")

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


def get_model_loader(model_key: str = None):
    """
    获取全局模型加载器实例（单例模式），支持API和NPU模型

    Args:
        model_key: 模型键名

    Returns:
        模型加载器实例 (NPUModelLoader or APIModelLoader)
    """
    global _global_model_loader
    
    # Determine which model to use
    use_model_key = model_key or ModelConfig.DEFAULT_MODEL
    
    # Check if model is API-based
    model_config = ModelConfig.MODELS.get(use_model_key)
    if model_config and model_config.get("type") == "api":
        # API models don't use the global singleton
        logger.info(f"[get_model_loader] Creating APIModelLoader for: {use_model_key}")
        return APIModelLoader(use_model_key)
    
    # For NPU models, use the global singleton
    logger.info(f"[get_model_loader] _global_model_loader before: {_global_model_loader}")

    if _global_model_loader is None:
        logger.info(f"[get_model_loader] Creating new NPUModelLoader with key: {use_model_key}")
        _global_model_loader = NPUModelLoader(use_model_key)
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
