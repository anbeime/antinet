"""
NPU模型加载器
支持多模型动态切换（llama3.2-3b/Qwen2.0-7B-SSD/llama3.1-8b）
"""

import os
from typing import Dict, Optional, Any


class NPUModelLoader:
    """
    NPU模型加载器
    
    支持的模型：
    - llama3.2-3b: 3B参数，~280ms，最快响应
    - Qwen2.0-7B-SSD: 7B参数，~450ms，通用推荐
    - llama3.1-8b: 8B参数，~520ms，更强推理
    """
    
    # 模型路径配置
    MODEL_PATHS = {
        "qwen2.0-7b-ssd": "C:/model/Qwen2.0-7B-SSD-8380-2.34/",  # 通用推荐 ⭐️ (~450ms)
        "llama3.1-8b": "C:/model/llama3.1-8b/",                    # 更强推理 (~520ms)
        "llama3.2-3b": "C:/model/llama3.2-3b/",                     # 最快响应 (~280ms)
        # 四色卡片生成器专用模型
        "qwen2-1.5b-int4": "C:/model/Qwen2-1.5B-INT4/",            # 事实卡片生成器
        "qwen2-7b-lora-int4": "C:/model/Qwen2-7B-LoRA-INT4/",      # 解释卡片生成器
        "phi-3-mini-int4": "C:/model/Phi-3-mini-INT4/",             # 风险卡片生成器
        "qwen2-7b-cot-int4": "C:/model/Qwen2-7B-CoT-INT4/",        # 行动卡片生成器
    }
    
    # 模型性能指标
    MODEL_PERFORMANCE = {
        "qwen2.0-7b-ssd": {
            "latency_ms": 450,
            "memory_gb": 3.2,
            "accuracy": 0.92
        },
        "llama3.1-8b": {
            "latency_ms": 520,
            "memory_gb": 3.8,
            "accuracy": 0.95
        },
        "llama3.2-3b": {
            "latency_ms": 280,
            "memory_gb": 1.8,
            "accuracy": 0.85
        },
        "qwen2-1.5b-int4": {
            "latency_ms": 150,
            "memory_gb": 0.8,
            "accuracy": 0.88
        },
        "qwen2-7b-lora-int4": {
            "latency_ms": 380,
            "memory_gb": 2.8,
            "accuracy": 0.93
        },
        "phi-3-mini-int4": {
            "latency_ms": 200,
            "memory_gb": 1.2,
            "accuracy": 0.90
        },
        "qwen2-7b-cot-int4": {
            "latency_ms": 400,
            "memory_gb": 2.8,
            "accuracy": 0.94
        }
    }
    
    def __init__(
        self,
        model_key: Optional[str] = None,
        model_path: Optional[str] = None,
        device: str = "NPU",
        precision: str = "INT4"
    ):
        """
        初始化模型加载器

        Args:
            model_key: 模型标识符（如"qwen2.0-7b-ssd"、"llama3.2-3b"）
            model_path: 自定义模型路径（优先级高于model_key）
            device: 部署设备（仅支持"NPU"）
            precision: 精度（"INT4"或"INT8"）
        """
        if device != "NPU":
            raise ValueError(f"仅支持NPU部署，不支持CPU: {device}")

        self.model_key = model_key or "qwen2.0-7b-ssd"
        self.model_path = model_path or self.MODEL_PATHS.get(self.model_key.lower())
        self.device = device
        self.precision = precision
        self._model = None

        # 验证模型路径存在
        if not self.model_path or not os.path.exists(self.model_path):
            raise FileNotFoundError(f"模型路径不存在: {self.model_path}")
    
    def load(self):
        """
        加载NPU模型

        Returns:
            模型实例

        Raises:
            RuntimeError: 如果模型加载失败
        """
        import sys
        from pathlib import Path

        # 添加backend到路径
        backend_path = Path(__file__).parent.parent / "backend"
        if str(backend_path) not in sys.path:
            sys.path.insert(0, str(backend_path))

        try:
            # 导入真实的NPU模型加载器
            from models.model_loader import get_model_loader
            print(f"[NPUModelLoader] 正在加载模型: {self.model_key}")
            loader = get_model_loader(self.model_key)
            self._model = loader.load()
            print(f"[NPUModelLoader] 模型加载成功")
            return self._model
        except Exception as e:
            raise RuntimeError(f"模型加载失败: {e}") from e
    def generate(self, prompt: str, max_tokens: int = 2000, temperature: float = 0.7):
        """
        使用NPU生成文本

        Args:
            prompt: 输入提示词
            max_tokens: 最大生成token数
            temperature: 温度参数（控制生成随机性）

        Returns:
            生成结果

        Raises:
            RuntimeError: 如果模型未加载或推理失败
        """
        if not self._model:
            raise RuntimeError("模型未加载，请先调用load()方法")

        import sys
        from pathlib import Path

        # 添加backend到路径
        backend_path = Path(__file__).parent.parent / "backend"
        if str(backend_path) not in sys.path:
            sys.path.insert(0, str(backend_path))

        try:
            # 导入真实的NPU模型加载器
            from models.model_loader import get_model_loader
            print(f"[NPUModelLoader] 正在执行NPU推理...")
            loader = get_model_loader(self.model_key)
            result = loader.infer(prompt=prompt, max_new_tokens=max_tokens, temperature=temperature)
            print(f"[NPUModelLoader] 推理完成")
            return result
        except Exception as e:
            raise RuntimeError(f"NPU推理失败: {e}") from e
    
    @staticmethod
    def get_model_info(model_key: str) -> Dict:
        """
        获取模型信息
        
        Args:
            model_key: 模型标识符
        
        Returns:
            模型信息字典
        """
        model_key_lower = model_key.lower()
        if model_key_lower not in NPUModelLoader.MODEL_PATHS:
            raise ValueError(f"不支持的模型: {model_key}")
        
        return {
            "model_key": model_key,
            "model_path": NPUModelLoader.MODEL_PATHS[model_key_lower],
            "latency_ms": NPUModelLoader.MODEL_PERFORMANCE[model_key_lower]["latency_ms"],
            "memory_gb": NPUModelLoader.MODEL_PERFORMANCE[model_key_lower]["memory_gb"],
            "accuracy": NPUModelLoader.MODEL_PERFORMANCE[model_key_lower]["accuracy"]
        }
    
    @staticmethod
    def list_available_models():
        """
        列出所有可用模型
        
        Returns:
            模型列表
        """
        models = []
        for model_key in NPUModelLoader.MODEL_PATHS.keys():
            info = NPUModelLoader.get_model_info(model_key)
            models.append(info)
        
        return models


# 示例使用
if __name__ == "__main__":
    # 示例1：使用默认模型（Qwen2.0-7B-SSD）
    print("=== 示例1：使用默认模型 ===")
    loader1 = NPUModelLoader()
    model1 = loader1.load()
    result1 = loader1.generate("分析上个月销售趋势")
    print(result1)
    print()
    
    # 示例2：使用更小模型（llama3.2-3b）
    print("=== 示例2：使用更小模型 ===")
    loader2 = NPUModelLoader(model_key="llama3.2-3b")
    model2 = loader2.load()
    result2 = loader2.generate("查询上个月销售额", max_tokens=1000)
    print(result2)
    print()
    
    # 示例3：使用更强模型（llama3.1-8b）
    print("=== 示例3：使用更强模型 ===")
    loader3 = NPUModelLoader(model_key="llama3.1-8b")
    model3 = loader3.load()
    result3 = loader3.generate("分析销售下滑的深层原因并预测下月趋势", max_tokens=3000)
    print(result3)
    print()
    
    # 示例4：列出所有可用模型
    print("=== 示例4：列出所有可用模型 ===")
    models = NPUModelLoader.list_available_models()
    for model in models:
        print(f"模型: {model['model_key']}")
        print(f"  路径: {model['model_path']}")
        print(f"  延迟: {model['latency_ms']}ms")
        print(f"  内存: {model['memory_gb']}GB")
        print(f"  准确率: {model['accuracy']*100}%")
        print()
