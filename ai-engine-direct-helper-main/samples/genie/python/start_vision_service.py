# ---------------------------------------------------------------------
# Qwen2.5-VL-3B Vision Model Manual Launcher
# 手动启动脚本 - 绕过 BAT，直接配置环境
# ---------------------------------------------------------------------
# FIRST: Patch safetensors before any other imports
import sys
_original_import = __builtins__.__import__
def _patch_safetensors(name, *args, **kwargs):
    if name == 'safetensors':
        if 'safetensors' not in sys.modules:
            import types
            sys.modules['safetensors'] = types.ModuleType('safetensors')
    return _original_import(name, *args, **kwargs)
__builtins__.__import__ = _patch_safetensors

import os
import sys
import subprocess
import argparse

def setup_environment():
    """设置环境变量"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # QNN 库路径 - 修正为正确的路径 (samples/qai_libs)
    qnn_lib_path = os.path.join(base_dir, "..", "..", "qai_libs", "QAIRT_Runtime", "aarch64-windows-msvc")
    qnn_lib_path = os.path.abspath(qnn_lib_path)
    
    # 添加到 PATH
    current_path = os.environ.get("PATH", "")
    if qnn_lib_path not in current_path:
        os.environ["PATH"] = qnn_lib_path + os.pathsep + current_path
    
    # 设置 QNN 后端路径
    os.environ["QNN_BACKEND_PATH"] = qnn_lib_path
    
    # 设置模型路径
    os.environ["GENIE_MODELS_PATH"] = os.path.join(base_dir, "models")
    
    print(f"QNN Library Path: {qnn_lib_path}")
    print(f"Models Path: {os.environ['GENIE_MODELS_PATH']}")
    
    return base_dir


def check_qnn_libs():
    """检查 QNN 库是否完整"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # 修正路径：从 samples/genie/python 到 samples/qai_libs (只需要上两级)
    qnn_lib_path = os.path.join(base_dir, "..", "..", "qai_libs", "QAIRT_Runtime", "aarch64-windows-msvc")
    qnn_lib_path = os.path.abspath(qnn_lib_path)
    
    required_libs = [
        "QnnHtp.dll",
        "QnnHtpV73Stub.dll",
        "Genie.dll",
        "QnnSystem.dll"
    ]
    
    missing = []
    for lib in required_libs:
        lib_path = os.path.join(qnn_lib_path, lib)
        if not os.path.exists(lib_path):
            missing.append(lib)
    
    if missing:
        print(f"Warning: Missing libraries: {missing}")
        return False
    
    print("All required QNN libraries found.")
    return True


def check_model_files():
    """检查模型文件是否完整"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "qwen2.5vl3b")
    
    required_files = [
        "config.json",
        "llm_model-0.bin",
        "llm_model-1.bin",
        "veg.serialized.bin",
        "tokenizer.json",
        "veg.json",
        "text_encoder.json"
    ]
    
    missing = []
    for f in required_files:
        file_path = os.path.join(model_path, f)
        if not os.path.exists(file_path):
            missing.append(f)
    
    if missing:
        print(f"Warning: Missing model files: {missing}")
        return False
    
    print(f"Model files verified in: {model_path}")
    return True


def start_service(host="0.0.0.0", port=8910, model="qwen2.5vl3b"):
    """启动 Genie API 服务"""
    base_dir = setup_environment()
    
    print("=" * 60)
    print("Qwen2.5-VL-3B Vision Model Service")
    print("=" * 60)
    
    # 检查依赖
    if not check_qnn_libs():
        print("Error: QNN libraries check failed.")
        return 1
    
    if not check_model_files():
        print("Error: Model files check failed.")
        return 1
    
    print("-" * 60)
    print(f"Starting service on {host}:{port}")
    print(f"Default model: {model}")
    print("-" * 60)
    
    # 导入并启动服务
    sys.path.insert(0, base_dir)
    
    try:
        from GenieAPIService import main as service_main
        
        # 构建参数
        sys.argv = [
            "GenieAPIService.py",
            "--host", host,
            "--port", str(port),
            "--model", model
        ]
        
        service_main()
        
    except ImportError as e:
        print(f"Error importing GenieAPIService: {e}")
        return 1
    except Exception as e:
        print(f"Error starting service: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    parser = argparse.ArgumentParser(description="Qwen2.5-VL-3B Vision Model Launcher")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8910, help="Port to listen (default: 8910)")
    parser.add_argument("--model", default="qwen2.5vl3b", help="Default model name")
    args = parser.parse_args()
    
    return start_service(args.host, args.port, args.model)


if __name__ == "__main__":
    sys.exit(main())
