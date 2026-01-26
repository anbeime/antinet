"""
验证 NPU 推理功能
"""
import os
import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
backend_path = project_root / "backend"
sys.path.insert(0, str(backend_path))

# 配置环境
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"
paths_to_add = [bridge_lib_path, lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path

# 添加DLL目录
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

# 设置日志
os.environ['QNN_LOG_LEVEL'] = "DEBUG"
os.environ['QNN_DEBUG'] = "1"

print("="*60)
print("NPU 推理验证")
print("="*60)

# 1. 验证配置
print("\n1. 验证配置...")
try:
    from config import settings
    print(f"[OK] AUTO_LOAD_MODEL = {settings.AUTO_LOAD_MODEL}")
    print(f"[OK] MODEL_NAME = {settings.MODEL_NAME}")
    print(f"[OK] MODEL_PATH = {settings.MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] 配置加载失败: {e}")
    sys.exit(1)

# 2. 测试导入
print("\n2. 测试导入...")
try:
    from models.model_loader import get_model_loader, load_model_if_needed
    print("[OK] 模型加载器导入成功")
except Exception as e:
    print(f"[ERROR] 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 3. 检查全局加载器
print("\n3. 检查全局加载器...")
try:
    from models.model_loader import _global_model_loader
    print(f"[INFO] _global_model_loader = {_global_model_loader}")
    if _global_model_loader is None:
        print("[OK] 全局加载器未初始化（按需加载模式）")
    else:
        print(f"[INFO] 加载器状态: is_loaded={_global_model_loader.is_loaded}")
except Exception as e:
    print(f"[ERROR] 检查失败: {e}")

# 4. 测试模型加载（可选，可能需要较长时间）
print("\n4. 是否测试模型加载？")
print("  - 如果想测试，请运行：python -m models.model_loader")
print("  - 或者通过 API 调用 /api/npu/load")

print("\n" + "="*60)
print("[SUCCESS] 配置验证通过！")
print("="*60)
print("\n下一步:")
print("1. 启动后端: start_backend.bat")
print("2. 访问健康检查: http://localhost:8000/api/health")
print("3. 通过 API 加载模型: POST /api/npu/load")
print("4. 执行推理: POST /api/npu/analyze")
