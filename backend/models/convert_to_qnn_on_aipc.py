#!/usr/bin/env python3
"""
转换模型到QNN格式（在AIPC上运行）
此脚本验证模型文件并测试GenieContext是否正常工作
"""

import os
import sys
import zipfile
from pathlib import Path
import shutil

# 添加Genie路径
GENIE_PATH = "C:\\ai-engine-direct-helper\\samples\\genie\\python"
if GENIE_PATH not in sys.path:
    sys.path.append(GENIE_PATH)

# 设置必要的环境变量
lib_path = "C:/ai-engine-direct-helper/samples/qai_libs"
bridge_lib_path = "C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc"

paths_to_add = [lib_path, bridge_lib_path]
current_path = os.environ.get('PATH', '')
for p in paths_to_add:
    if p not in current_path:
        current_path = p + ';' + current_path
os.environ['PATH'] = current_path
os.environ['QAI_LIBS_PATH'] = lib_path

# 显式添加 DLL 目录（Python 3.8+）
for p in paths_to_add:
    if os.path.exists(p):
        os.add_dll_directory(p)

def check_qai_appbuilder():
    """检查QAI AppBuilder是否可用"""
    try:
        from qai_appbuilder import GenieContext
        print("✅ QAI AppBuilder 导入成功")
        return True
    except ImportError as e:
        print(f"❌ QAI AppBuilder 导入失败: {e}")
        print("请运行: pip install C:\\ai-engine-direct-helper\\samples\\qai_appbuilder-2.31.0-cp312-cp312-win_amd64.whl")
        return False

def extract_model_zip(model_zip_path, target_dir):
    """解压模型zip文件"""
    if not os.path.exists(model_zip_path):
        print(f"❌ 模型ZIP文件不存在: {model_zip_path}")
        return False
    
    if os.path.exists(target_dir) and len(os.listdir(target_dir)) > 0:
        print(f"✅ 模型目录已存在并包含文件: {target_dir}")
        return True
    
    print(f"正在解压模型: {model_zip_path} -> {target_dir}")
    try:
        with zipfile.ZipFile(model_zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        print(f"✅ 解压成功")
        return True
    except Exception as e:
        print(f"❌ 解压失败: {e}")
        return False

def verify_model_files(model_dir):
    """验证模型文件完整性"""
    required_files = [
        "config.json",
        "model-1.bin",
        "model-2.bin",
        "model-3.bin",
        "model-4.bin",
        "model-5.bin",
        "kv-cache.primary.qnn-htp",
        "htp_backend_ext_config.json"
    ]
    
    missing_files = []
    for file in required_files:
        path = Path(model_dir) / file
        if not path.exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ 模型文件缺失: {missing_files}")
        return False
    
    print(f"✅ 所有必需模型文件存在")
    
    # 检查文件大小
    for file in required_files:
        path = Path(model_dir) / file
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"   {file}: {size_mb:.1f} MB")
    
    return True

def test_genie_context(model_dir):
    """测试GenieContext是否可以加载模型"""
    try:
        from qai_appbuilder import GenieContext
        config_path = str(Path(model_dir) / "config.json")
        print(f"正在测试GenieContext: {config_path}")
        
        # 创建GenieContext但不执行推理（加载测试）
        context = GenieContext(config_path)
        print(f"✅ GenieContext 创建成功")
        
        # 检查属性
        if hasattr(context, 'GetStats'):
            try:
                stats = context.GetStats()
                print(f"   Stats: {stats}")
            except:
                pass
        
        return True
    except Exception as e:
        print(f"❌ GenieContext 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("QNN 模型转换与验证工具")
    print("=" * 60)
    
    # 1. 检查QAI AppBuilder
    if not check_qai_appbuilder():
        sys.exit(1)
    
    # 2. 定义模型路径
    models = {
        "qwen2-7b-ssd": {
            "zip": "C:/model/Qwen2.0-7B-SSD-8380-2.34.zip",
            "dir": "C:/model/Qwen2.0-7B-SSD-8380-2.34"
        },
        "llama3.1-8b": {
            "zip": "C:/model/llama3.1-8b-8380-qnn2.38.zip",
            "dir": "C:/model/llama3.1-8b-8380-qnn2.38"
        },
        "llama3.2-3b": {
            "zip": "C:/model/llama3.2-3b-8380-qnn2.37.zip",
            "dir": "C:/model/llama3.2-3b-8380-qnn2.37"
        }
    }
    
    # 3. 解压模型（如果需要）
    for model_name, paths in models.items():
        print(f"\n[{model_name}]")
        if not os.path.exists(paths["dir"]) or len(os.listdir(paths["dir"])) == 0:
            if not extract_model_zip(paths["zip"], paths["dir"]):
                print(f"⚠️  跳过 {model_name}，解压失败")
        else:
            print(f"✅ 模型目录已存在")
    
    # 4. 验证推荐模型（Qwen2.0-7B-SSD）
    print(f"\n[验证推荐模型: Qwen2.0-7B-SSD]")
    model_dir = models["qwen2-7b-ssd"]["dir"]
    if not verify_model_files(model_dir):
        print("❌ 模型验证失败")
        sys.exit(1)
    
    # 5. 测试GenieContext
    if not test_genie_context(model_dir):
        print("❌ GenieContext 测试失败")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ 模型验证成功！")
    print("   模型已准备好用于NPU推理")
    print("=" * 60)
    print("\n下一步:")
    print("1. 重启后端服务: cd backend && python main.py")
    print("2. 测试API接口: curl http://localhost:8000/api/npu/status")
    print("3. 进行推理测试: python test_model_real_loading.py")

if __name__ == "__main__":
    main()