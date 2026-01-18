#!/usr/bin/env python3
"""
最简单的 NPU 测试 - 验证真实推理
优化版本: 添加详细日志、超时保护、分步验证
"""
import sys
import os
import time
import signal
import logging
from datetime import datetime
from pathlib import Path

# 添加路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# 配置日志（同时输出到文件和控制台）
log_file = f"npu_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# 超时处理
class TimeoutError(Exception):
    pass

# Windows 下使用线程实现超时
if sys.platform == 'win32':
    import threading
    
    def with_timeout(seconds, func, *args, **kwargs):
        """Windows 平台的超时包装器"""
        result = [None]
        exception = [None]
        
        def target():
            try:
                result[0] = func(*args, **kwargs)
            except Exception as e:
                exception[0] = e
        
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(seconds)
        
        if thread.is_alive():
            raise TimeoutError(f"操作超时 ({seconds}秒)")
        
        if exception[0]:
            raise exception[0]
        
        return result[0]
else:
    # Unix 平台使用 signal
    def with_timeout(seconds, func, *args, **kwargs):
        """Unix 平台的超时包装器"""
        def timeout_handler(signum, frame):
            raise TimeoutError("操作超时")
        
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(seconds)
        try:
            result = func(*args, **kwargs)
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
        return result

print("=" * 70)
print("NPU 真实推理测试 - 优化版")
print("=" * 70)
print(f"日志文件: {log_file}")
print()

# 步骤1: 验证 Python 版本
print("[步骤 1/6] 验证 Python 版本...")
print(f"  - 版本: {sys.version}")
if sys.version_info >= (3, 12):
    print("  - [OK] Python 版本符合要求 (>= 3.12)")
else:
    print("  - [ERROR] Python 版本不符合要求 (需要 >= 3.12)")
    sys.exit(1)
print()

# 步骤2: 验证 QAI AppBuilder
print("[步骤 2/6] 验证 QAI AppBuilder...")
try:
    from qai_appbuilder import GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel
    print("  - [OK] QAI AppBuilder 导入成功")
    print("  - [INFO] 导入组件: GenieContext, QNNConfig, Runtime, LogLevel, ProfilingLevel")
except ImportError as e:
    print(f"  - [ERROR] 导入失败: {e}")
    print("  - [SOLUTION] pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl")
    sys.exit(1)
print()

# 步骤3: 验证模型文件
print("[步骤 3/6] 验证模型文件...")
model_dir = Path("C:/model/Qwen2.0-7B-SSD-8380-2.34")
config_file = model_dir / "config.json"

print(f"  - 模型目录: {model_dir}")
if not model_dir.exists():
    print("  - [ERROR] 模型目录不存在")
    print("  - [SOLUTION] 检查模型是否已解压到 C:/model/")
    sys.exit(1)
else:
    print("  - [OK] 模型目录存在")

print(f"  - 配置文件: {config_file}")
if not config_file.exists():
    print("  - [ERROR] 配置文件不存在")
    sys.exit(1)
else:
    print("  - [OK] 配置文件存在")
print()

# 步骤4: 验证 QNN 库
print("[步骤 4/6] 验证 QNN 库...")
libs_path = Path("C:/ai-engine-direct-helper/samples/qai_libs")
print(f"  - 库路径: {libs_path}")
if libs_path.exists():
    print("  - [OK] QNN 库目录存在")
    # 检查关键 DLL
    required_dlls = ["QnnHtp.dll", "QnnHtpPrepare.dll", "QnnSystem.dll"]
    missing_dlls = []
    for dll in required_dlls:
        dll_path = libs_path / dll
        if dll_path.exists():
            print(f"  - [OK] {dll} 存在")
        else:
            print(f"  - [WARNING] {dll} 不存在")
            missing_dlls.append(dll)
    
    if len(missing_dlls) == 0:
        print("  - [OK] 所有必需的 DLL 文件存在")
else:
    print("  - [WARNING] QNN 库目录不存在")
print()

# 导入模块
print("[步骤 5/6] 导入模块...")
try:
    from models.model_loader import NPUModelLoader
    print("  - [OK] NPUModelLoader 导入成功")
except Exception as e:
    print(f"  - [ERROR] 导入失败: {e}")
    sys.exit(1)
print()

# 创建加载器
print("[步骤 6/6] 创建加载器并加载模型...")
try:
    loader = NPUModelLoader()
    print("  - [OK] 加载器创建成功")
    
    # 使用超时保护加载模型（60秒）
    load_start = time.time()
    model = with_timeout(60, loader.load)
    load_time = time.time() - load_start
    
    print("  - [OK] 模型加载成功")
    print(f"  - [INFO] 加载时间: {load_time:.2f}s")
    
    # 获取设备信息
    stats = loader.get_performance_stats()
    print(f"  - [INFO] 设备: {stats['device']}")
    print(f"  - [INFO] 模型: {stats['model_name']}")
    
except TimeoutError as e:
    print(f"  - [ERROR] {e}")
    print("  - [SOLUTION] 检查 NPU 驱动是否正确安装")
    print("  - [SOLUTION] 尝试使用更小的模型 (llama3.2-3b)")
    sys.exit(1)
except Exception as e:
    print(f"  - [ERROR] 加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 执行推理
print()
print("执行推理测试...")
print("=" * 70)
test_prompt = "分析一下端侧AI的优势"
print(f"输入: {test_prompt}")
print()

try:
    # 使用超时保护推理（30秒）
    inference_start = time.time()
    result = with_timeout(30, loader.infer, test_prompt, max_new_tokens=128)
    inference_time = (time.time() - inference_start) * 1000
    
    print()
    print("[推理结果]")
    print("-" * 70)
    print(result[:200])
    if len(result) > 200:
        print("...")
    print("-" * 70)
    print()
    
    print(f"[性能指标]")
    print(f"  - 推理延迟: {inference_time:.2f}ms")
    
    if inference_time < 500:
        print(f"  - [OK] 性能达标 (< 500ms)")
    else:
        print(f"  - [WARNING] 性能超标 (>= 500ms)")
        print(f"  - [INFO] 建议: 使用 BURST 模式或减少 max_tokens")
    
    print()
    print("=" * 70)
    print("✅ 测试完成 - 所有步骤执行成功")
    print("=" * 70)
    print()
    print("[下一步]")
    print("  1. 查看详细日志: ", log_file)
    print("  2. 运行后端服务: cd backend && python main.py")
    print("  3. 测试 API: http://localhost:8000/docs")
    print("  4. 性能文档: backend/PERFORMANCE_RESULTS.md")
    
except TimeoutError as e:
    print()
    print(f"[ERROR] {e}")
    print("[SOLUTION] 检查模型推理是否正常工作")
    sys.exit(1)
except Exception as e:
    print()
    print(f"[ERROR] 推理失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)