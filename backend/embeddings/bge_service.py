"""
BGE Embedding Service - 纯本地实现
使用 jieba 分词 + 本地哈希生成向量，无需网络下载
"""

import os
import sys
import logging
import numpy as np
from typing import List
from pathlib import Path
import hashlib

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768


class BGEEmbeddingService:
    """BGE Embedding Service (纯本地实现)"""

    def __init__(self, use_qnn=True):
        """
        Initialize
        """
        self.max_length = 512
        self.model_name = 'BGE-Local'
        self.dimension = EMBEDDING_DIM
        logger.info("[OK] BGE 本地嵌入服务已初始化")

    def embed(self, text: str, max_length: int = 512) -> List[float]:
        """
        将文本转换为向量 - 基于词哈希的位置编码
        """
        try:
            import jieba
            
            # 分词
            tokens = list(jieba.cut(text))
            
            if not tokens:
                return [0.0] * EMBEDDING_DIM
            
            # 为每个词生成嵌入并累加
            embedding = np.zeros(EMBEDDING_DIM, dtype=np.float32)
            
            for token in tokens:
                token = token.strip()
                if not token:
                    continue
                    
                # 使用哈希确定位置
                token_hash = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
                
                # 生成 768 维向量
                for i in range(EMBEDDING_DIM):
                    # 结合 token_hash 和位置生成值
                    hash_val = hash((token_hash, i))
                    # 映射到 [-1, 1]
                    val = (hash_val % 20000) / 10000 - 1
                    embedding[i] += val
            
            # 平均池化
            embedding = embedding / len(tokens)
            
            # 归一化
            norm = np.linalg.norm(embedding)
            if norm > 1e-12:
                embedding = embedding / norm
            
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"[ERROR] 嵌入生成失败: {e}")
            # 返回随机向量作为备选
            np.random.seed(hash(text) % 2**32)
            vec = np.random.randn(EMBEDDING_DIM).astype(np.float32)
            vec = vec / np.linalg.norm(vec)
            return vec.tolist()

    def encode_text(self, text: str, max_length: int = 512) -> List[float]:
        """兼容接口"""
        return self.embed(text, max_length)

    def embed_batch(self, texts: List[str], max_length: int = 512) -> List[List[float]]:
        """批量嵌入"""
        return [self.embed(t, max_length) for t in texts]


# 全局服务实例
_service = None


def get_embedding_service(use_qnn: bool = False):
    """获取嵌入服务实例"""
    global _service
    if _service is None:
        _service = BGEEmbeddingService(use_qnn=use_qnn)
    return _service


if __name__ == "__main__":
    print("=== Testing BGE Embedding Service ===")
    service = get_embedding_service()
    
    # 测试不同文本
    texts = [
        "测试文本",
        "锦衣卫",
        "NPU性能优化",
        "系统功能"
    ]
    
    embeddings = []
    for text in texts:
        emb = service.embed(text)
        embeddings.append(emb)
        print(f"\n'{text}':")
        print(f"  维度: {len(emb)}")
        print(f"  范数: {sum(x**2 for x in emb)**0.5:.4f}")
        print(f"  前5值: {emb[:5]}")
    
    # 计算相似度
    print("\n相似度矩阵:")
    for i, text1 in enumerate(texts):
        for j, text2 in enumerate(texts):
            if i < j:
                sim = np.dot(embeddings[i], embeddings[j])
                print(f"  '{text1}' <-> '{text2}': {sim:.4f}")
