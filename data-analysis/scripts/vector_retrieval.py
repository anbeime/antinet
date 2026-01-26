"""
向量检索模块
使用BGE-M3模型生成向量嵌入，通过FAISS进行语义搜索
"""
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple
import pickle
import os


class VectorRetrieval:
    """向量检索类"""
    
    def __init__(self, model_name: str = "BAAI/bge-m3", 
                 index_path: str = "./faiss_index.bin",
                 data_path: str = "./vector_data.pkl"):
        """
        初始化向量检索
        
        参数：
            model_name: 向量模型名称
            index_path: FAISS索引文件路径
            data_path: 向量数据文件路径
        """
        self.model_name = model_name
        self.index_path = index_path
        self.data_path = data_path
        
        # 加载BGE-M3模型
        print(f"正在加载模型: {model_name}...")
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        print(f"模型加载完成，向量维度: {self.embedding_dim}")
        
        # 初始化FAISS索引
        self.index = faiss.IndexFlatIP(self.embedding_dim)  # 内积相似度
        self.documents = []  # 存储文档内容
        
        # 如果存在索引文件，加载索引
        if os.path.exists(index_path) and os.path.exists(data_path):
            self.load_index()
    
    def encode_text(self, texts: List[str]) -> np.ndarray:
        """
        将文本编码为向量
        
        参数：
            texts: 文本列表
        
        返回：
            向量数组
        """
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,  # 归一化，适合内积相似度
            show_progress_bar=len(texts) > 100
        )
        return embeddings
    
    def add_documents(self, documents: List[Dict]):
        """
        添加文档到索引
        
        参数：
            documents: 文档列表，每个文档包含id、text、metadata等
        """
        if not documents:
            return
        
        # 提取文本
        texts = [doc["text"] for doc in documents]
        
        # 生成向量
        embeddings = self.encode_text(texts)
        
        # 添加到索引
        self.index.add(embeddings.astype('float32'))
        
        # 保存文档
        self.documents.extend(documents)
        
        print(f"已添加 {len(documents)} 个文档到索引")
    
    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """
        搜索相似文档
        
        参数：
            query: 查询文本
            top_k: 返回Top-K结果
        
        返回：
            相似文档列表
        """
        if self.index.ntotal == 0:
            return []
        
        # 编码查询
        query_embedding = self.encode_text([query])[0]
        query_embedding = query_embedding.reshape(1, -1).astype('float32')
        
        # 搜索
        scores, indices = self.index.search(query_embedding, top_k)
        
        # 返回结果
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.documents):
                doc = self.documents[idx].copy()
                doc["similarity"] = float(score)
                results.append(doc)
        
        return results
    
    def save_index(self):
        """保存索引到文件"""
        # 保存FAISS索引
        faiss.write_index(self.index, self.index_path)
        
        # 保存文档数据
        with open(self.data_path, 'wb') as f:
            pickle.dump(self.documents, f)
        
        print(f"索引已保存: {self.index_path}")
    
    def load_index(self):
        """从文件加载索引"""
        # 加载FAISS索引
        self.index = faiss.read_index(self.index_path)
        
        # 加载文档数据
        with open(self.data_path, 'rb') as f:
            self.documents = pickle.load(f)
        
        print(f"索引已加载: {self.index_path}, 文档数: {len(self.documents)}")
    
    def get_stats(self) -> Dict:
        """
        获取索引统计信息
        
        返回：
            统计信息字典
        """
        return {
            "document_count": len(self.documents),
            "index_type": "IndexFlatIP",
            "embedding_dim": self.embedding_dim,
            "index_size": os.path.getsize(self.index_path) if os.path.exists(self.index_path) else 0
        }


# 测试代码
if __name__ == "__main__":
    # 创建向量检索实例
    vr = VectorRetrieval()
    
    # 添加示例文档
    documents = [
        {
            "id": "card_001",
            "text": "12月销售数据统计，总销售额120万，环比下降15%",
            "metadata": {
                "card_type": "blue",
                "tags": ["销售", "数据", "12月"],
                "created_at": "2024-12-31"
            }
        },
        {
            "id": "card_002",
            "text": "销售下滑原因分析，竞品推出促销活动导致客户分流",
            "metadata": {
                "card_type": "green",
                "tags": ["销售", "下滑", "原因"],
                "created_at": "2024-12-31"
            }
        },
        {
            "id": "card_003",
            "text": "库存积压预警，当前库存5000，预计需求2000，积压比例150%",
            "metadata": {
                "card_type": "yellow",
                "tags": ["风险", "库存", "积压"],
                "created_at": "2024-12-31"
            }
        },
        {
            "id": "card_004",
            "text": "库存清理行动建议，推出限时折扣清理库存，预计提升周转率30%",
            "metadata": {
                "card_type": "red",
                "tags": ["行动", "建议", "清理"],
                "created_at": "2024-12-31"
            }
        }
    ]
    
    # 添加文档
    vr.add_documents(documents)
    
    # 保存索引
    vr.save_index()
    
    # 搜索测试
    print("\n" + "=" * 80)
    print("搜索测试")
    print("=" * 80)
    
    queries = [
        "销售数据",
        "库存风险",
        "如何清理库存",
        "为什么销售额下降"
    ]
    
    for query in queries:
        print(f"\n查询: {query}")
        results = vr.search(query, top_k=3)
        
        for i, result in enumerate(results, 1):
            print(f"  {i}. [{result['metadata']['card_type']}] {result['text'][:50]}... (相似度: {result['similarity']:.4f})")
    
    # 打印统计信息
    print("\n" + "=" * 80)
    print("索引统计")
    print("=" * 80)
    stats = vr.get_stats()
    for key, value in stats.items():
        print(f"{key}: {value}")
