
"""
BGE 模型服务

使用 QNN 原生工具执行 BGE 嵌入推理
需要 QNN SDK 2.41+ 和 qnn-net-run.exe

硬件平台: 骁龙® X Elite (X1E-84-100)
软件工具: QNN SDK 2.41
模型: bge-base-zh-v1.5-qnn-8380
"""

import os
import sys
import subprocess
import logging
from typing import List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# 模型路径
BGE_MODEL_PATH = "C:/model/models_2.38/bge-base-zh-v1.5-qnn-8380"
BGE_CONFIG_PATH = os.path.join(BGE_MODEL_PATH, "htp_backend.json")

# QNN 工具路径（使用 2.38 版本）
QNN_NET_RUN_PATH = r"C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/bin/x86_64-windows-msvc/qnn-net-run.exe"
QNN_BACKEND_PATH = r"C:/Qualcomm/AIStack/QAIRT/2.38.0.250901/lib/arm64x-windows-msvc/libQnnHtp.dll"

class BGEEmbeddingService:
    """BGE 嵌入服务"""

    def __init__(self, use_qnn=True):
        """
        初始化

        Args:
            use_qnn: 是否使用 QNN 推理
        """
        self.use_qnn = use_qnn

        if use_qnn:
            # 检查 QNN 工具
            if os.path.exists(QNN_NET_RUN_PATH):
                logger.info(f"[OK] QNN 工具找到: {QNN_NET_RUN_PATH}")
            else:
                logger.warning(f"[WARNING] QNN 工具未找到: {QNN_NET_RUN_PATH}")
                logger.info("将使用 TF-IDF 作为备用方案")

    def embed(self, text: str, max_length: int = 512) -> List[float]:
        """
        将文本转换为向量

        Args:
            text: 输入文本
            max_length: 最大长度

        Returns:
            向量列表
        """
        if not self.use_qnn:
            # 使用 TF-IDF（备用方案）
            return self._embed_with_tfidf(text, max_length)

        try:
            # 使用 QNN 原生工具
            return self._embed_with_qnn(text, max_length)
        except Exception as e:
            logger.error(f"[ERROR] QNN 推理失败: {e}")
            # 降级到 TF-IDF
            logger.info("[INFO] 降级到 TF-IDF")
            return self._embed_with_tfidf(text, max_length)

    def encode_text(self, text: str, max_length: int = 512) -> List[float]:
        """
        将文本转换为向量（兼容接口）

        Args:
            text: 输入文本
            max_length: 最大长度

        Returns:
            向量列表
        """
        return self.embed(text, max_length)

    def embed_batch(self, texts: List[str], max_length: int = 512) -> List[List[float]]:
        """
        批量嵌入

        Args:
            texts: 文本列表
            max_length: 最大长度

        Returns:
            向量列表
        """
        results = []
        for text in texts:
            result = self.embed(text, max_length)
            results.append(result)
        return results

    def _embed_with_qnn(self, text: str, max_length: int = 512) -> List[float]:
        """使用 QNN 推理"""
        import numpy as np
        import tempfile

        # 创建临时输入文件
        input_dir = tempfile.mkdtemp()

        # 创建 input_list.txt
        input_list_path = os.path.join(input_dir, "input_list.txt")
        with open(input_list_path, 'w', encoding='utf-8') as f:
            f.write(f"0\t{len(text)}\t0\t{max_length}\n")

        # 创建输入文件（实际使用二进制格式）
        input_file_path = os.path.join(input_dir, "input.bin")
        # 这里需要根据 BGE 模型格式准备输入

        # 构建命令
        cmd = [
            QNN_NET_RUN_PATH,
            "--retrieve_context", os.path.join(BGE_MODEL_PATH, "model.bin"),
            "--backend", QNN_BACKEND_PATH,
            "--input_list", input_list_path,
            "--use_native_input_files",
            "--config_file", BGE_CONFIG_PATH,
            "--output_dir", input_dir
        ]

        logger.debug(f"[INFO] 执行命令: {' '.join(cmd)}")

        # 执行命令
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            logger.error(f"[ERROR] QNN 推理失败: {result.stderr}")
            raise RuntimeError(f"QNN 推理失败: {result.stderr}")

        logger.debug(f"[INFO] 推理成功")

        # 读取输出
        output_dir = os.path.join(input_dir, "output")
        output_file = os.path.join(output_dir, "0.bin")

        if os.path.exists(output_file):
            with open(output_file, 'rb') as f:
                vector = np.frombuffer(f.read(), dtype=np.float32)
                return vector.tolist()
        else:
            raise RuntimeError("输出文件未找到")

    def _embed_with_tfidf(self, text: str, max_length: int = 512) -> List[float]:
        """使用 TF-IDF（备用方案）"""
        try:
            import jieba
            from sklearn.feature_extraction.text import TfidfVectorizer

            # 中文分词
            tokens = list(jieba.cut(text))
            tokenized_text = ' '.join(tokens)

            # TF-IDF 向量化
            vectorizer = TfidfVectorizer(max_features=max_length, token_pattern=r'(?u)\b\w+\b')
            vector = vectorizer.fit_transform([tokenized_text])
            result = vector.toarray()[0].tolist()

            # 确保维度正确
            if len(result) < max_length:
                result.extend([0.0] * (max_length - len(result)))
            elif len(result) > max_length:
                result = result[:max_length]

            return result

        except ImportError:
            logger.error("[ERROR] sklearn/jieba 未安装，无法使用 TF-IDF")
            # 最后降级：返回零向量
            return [0.0] * max_length

# 全局服务实例
_service: BGEEmbeddingService = None

def get_embedding_service(use_qnn: bool = True) -> BGEEmbeddingService:
    """获取嵌入服务实例"""
    global _service
    if _service is None:
        _service = BGEEmbeddingService(use_qnn=use_qnn)
    return _service

def embed_text(text: str, max_length: int = 512) -> List[float]:
    """便捷函数：嵌入文本"""
    service = get_embedding_service()
    return service.embed(text, max_length)

def embed_batch(texts: List[str], max_length: int = 512) -> List[List[float]]:
    """便捷函数：批量嵌入"""
    service = get_embedding_service()
    return service.embed_batch(texts, max_length)
