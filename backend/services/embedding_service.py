"""
轻量级嵌入服务 - 基于 TF-IDF
适用于 Windows ARM64，无需 PyTorch
"""
import numpy as np
from typing import List, Union
import logging
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import jieba  # 中文分词

logger = logging.getLogger(__name__)

# 全局嵌入服务实例
_embedding_service = None


class LightweightEmbeddingService:
    """轻量级文本向量嵌入服务（基于 TF-IDF）"""
    
    def __init__(self):
        """初始化嵌入服务"""
        self.model_name = 'TF-IDF'
        self.dimension = 512  # TF-IDF 特征维度
        self.vectorizer = None
        self.corpus = []  # 用于训练 TF-IDF 的语料库
        
        logger.info(f"[EmbeddingService] 初始化轻量级嵌入服务: {self.model_name}")
        self._init_vectorizer()
    
    def _init_vectorizer(self):
        """初始化 TF-IDF 向量化器"""
        try:
            # 创建 TF-IDF 向量化器
            self.vectorizer = TfidfVectorizer(
                max_features=self.dimension,  # 最大特征数
                ngram_range=(1, 2),  # 使用 1-gram 和 2-gram
                tokenizer=self._tokenize,  # 自定义分词器
                lowercase=True,
                min_df=1,  # 最小文档频率
                max_df=1.0  # 最大文档频率（修改为 1.0）
            )
            logger.info(f"[EmbeddingService] TF-IDF 向量化器已初始化")
            
        except Exception as e:
            logger.error(f"[EmbeddingService] 向量化器初始化失败: {e}", exc_info=True)
            raise
    
    def _tokenize(self, text: str) -> List[str]:
        """
        中文分词
        
        Args:
            text: 输入文本
            
        Returns:
            分词列表
        """
        # 使用 jieba 进行中文分词
        tokens = jieba.cut(text)
        return list(tokens)
    
    def fit(self, texts: List[str]):
        """
        训练 TF-IDF 模型
        
        Args:
            texts: 文本列表（语料库）
        """
        try:
            logger.info(f"[EmbeddingService] 训练 TF-IDF 模型，语料库大小: {len(texts)}")
            self.corpus = texts
            self.vectorizer.fit(texts)
            logger.info(f"[EmbeddingService] TF-IDF 模型训练完成")
            
        except Exception as e:
            logger.error(f"[EmbeddingService] 模型训练失败: {e}", exc_info=True)
            raise
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        将文本转换为向量
        
        Args:
            text: 输入文本
            
        Returns:
            向量数组
        """
        try:
            if self.vectorizer is None or not hasattr(self.vectorizer, 'vocabulary_'):
                # 如果模型未训练，使用单个文本训练
                self.fit([text])
            
            # 生成向量
            embedding = self.vectorizer.transform([text]).toarray()[0]
            
            # 确保维度一致
            if len(embedding) < self.dimension:
                # 填充零
                embedding = np.pad(embedding, (0, self.dimension - len(embedding)))
            elif len(embedding) > self.dimension:
                # 截断
                embedding = embedding[:self.dimension]
            
            return embedding.astype(np.float32)
            
        except Exception as e:
            logger.error(f"[EmbeddingService] 文本编码失败: {e}")
            # 返回零向量作为后备
            return np.zeros(self.dimension, dtype=np.float32)
    
    def encode_batch(self, texts: List[str]) -> np.ndarray:
        """
        批量将文本转换为向量
        
        Args:
            texts: 文本列表
            
        Returns:
            向量数组 (shape: [n, dimension])
        """
        try:
            if self.vectorizer is None or not hasattr(self.vectorizer, 'vocabulary_'):
                # 使用这批文本训练模型
                self.fit(texts)
            
            # 批量生成向量
            embeddings = self.vectorizer.transform(texts).toarray()
            
            # 确保维度一致
            if embeddings.shape[1] < self.dimension:
                # 填充零
                padding = np.zeros((embeddings.shape[0], self.dimension - embeddings.shape[1]))
                embeddings = np.hstack([embeddings, padding])
            elif embeddings.shape[1] > self.dimension:
                # 截断
                embeddings = embeddings[:, :self.dimension]
            
            return embeddings.astype(np.float32)
            
        except Exception as e:
            logger.error(f"[EmbeddingService] 批量编码失败: {e}")
            # 返回零向量作为后备
            return np.zeros((len(texts), self.dimension), dtype=np.float32)
    
    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        计算两个向量的余弦相似度
        
        Args:
            embedding1: 向量1
            embedding2: 向量2
            
        Returns:
            相似度分数 (0-1)
        """
        try:
            # 使用 sklearn 的余弦相似度
            similarity = cosine_similarity(
                embedding1.reshape(1, -1),
                embedding2.reshape(1, -1)
            )[0][0]
            
            # 归一化到 [0, 1]
            return (similarity + 1) / 2
            
        except Exception as e:
            logger.error(f"[EmbeddingService] 相似度计算失败: {e}")
            return 0.0
    
    def save_model(self, path: str):
        """保存模型"""
        try:
            with open(path, 'wb') as f:
                pickle.dump({
                    'vectorizer': self.vectorizer,
                    'corpus': self.corpus
                }, f)
            logger.info(f"[EmbeddingService] 模型已保存: {path}")
        except Exception as e:
            logger.error(f"[EmbeddingService] 模型保存失败: {e}")
    
    def load_model(self, path: str):
        """加载模型"""
        try:
            with open(path, 'rb') as f:
                data = pickle.load(f)
                self.vectorizer = data['vectorizer']
                self.corpus = data['corpus']
            logger.info(f"[EmbeddingService] 模型已加载: {path}")
        except Exception as e:
            logger.error(f"[EmbeddingService] 模型加载失败: {e}")


def get_embedding_service() -> LightweightEmbeddingService:
    """获取全局嵌入服务实例（单例模式）"""
    global _embedding_service
    
    if _embedding_service is None:
        _embedding_service = LightweightEmbeddingService()
    
    return _embedding_service


# 测试代码
if __name__ == "__main__":
    import time
    
    print("=== Testing Lightweight Embedding Service ===\n")
    
    # 初始化服务
    service = LightweightEmbeddingService()
    
    # 准备测试数据
    corpus = [
        "Antinet是一个智能知识管理系统",
        "NPU推理性能优化技术",
        "团队协作知识共享平台",
        "四色卡片系统设计方法",
        "向量语义搜索实现原理"
    ]
    
    # 训练模型
    print("1. Training TF-IDF model...")
    start = time.time()
    service.fit(corpus)
    elapsed = time.time() - start
    print(f"   Training time: {elapsed:.3f}s")
    
    # 测试单个文本编码
    print("\n2. Testing single text encoding...")
    text = "如何优化NPU性能"
    start = time.time()
    embedding = service.encode_text(text)
    elapsed = time.time() - start
    
    print(f"   Text: {text}")
    print(f"   Embedding shape: {embedding.shape}")
    print(f"   Embedding (first 10): {embedding[:10]}")
    print(f"   Time: {elapsed:.3f}s")
    
    # 测试批量编码
    print("\n3. Testing batch encoding...")
    start = time.time()
    embeddings = service.encode_batch(corpus)
    elapsed = time.time() - start
    
    print(f"   Texts: {len(corpus)}")
    print(f"   Embeddings shape: {embeddings.shape}")
    print(f"   Time: {elapsed:.3f}s ({elapsed/len(corpus):.3f}s per text)")
    
    # 测试相似度计算
    print("\n4. Testing similarity computation...")
    query = "如何提升NPU推理速度"
    query_emb = service.encode_text(query)
    
    print(f"   Query: {query}")
    for i, text in enumerate(corpus):
        similarity = service.compute_similarity(query_emb, embeddings[i])
        print(f"   - {text}: {similarity:.3f}")
    
    print("\n=== Test Complete ===")
