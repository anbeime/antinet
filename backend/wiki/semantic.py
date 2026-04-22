"""
Vector Semantic Search for Jinyi WeiHu (锦衣卫) Knowledge Network
Uses BGE embeddings for semantic similarity search
"""
import os
import sys
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


class VectorStore:
    def __init__(self, data_dir: str = "data/wiki"):
        self.data_dir = Path(data_dir)
        self.vectors_file = self.data_dir / "vectors.json"
        self.vectors: Dict[str, np.ndarray] = {}
        self.page_ids: List[str] = []
        self.documents: Dict[str, dict] = {}
        self._load_or_init()
    
    def _load_or_init(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        if self.vectors_file.exists():
            try:
                with open(self.vectors_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.page_ids = data.get('page_ids', [])
                    self.documents = data.get('documents', {})
                    
                    vectors_list = data.get('vectors', [])
                    for i, page_id in enumerate(self.page_ids):
                        if i < len(vectors_list):
                            self.vectors[page_id] = np.array(vectors_list[i])
                    
                logger.info(f"[VectorStore] Loaded {len(self.vectors)} vectors")
            except Exception as e:
                logger.warning(f"[VectorStore] Load failed: {e}, starting fresh")
                self._init_fresh()
        else:
            self._init_fresh()
    
    def _init_fresh(self):
        self.page_ids = []
        self.documents = {}
        self.vectors = {}

    def _save(self):
        vectors_list = []
        for page_id in self.page_ids:
            if page_id in self.vectors:
                vectors_list.append(self.vectors[page_id].tolist())
        
        data = {
            'page_ids': self.page_ids,
            'documents': self.documents,
            'vectors': vectors_list,
            'dimension': len(list(self.vectors.values())[0]) if self.vectors else 0
        }
        
        with open(self.vectors_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
    
    def add_document(self, page_id: str, text: str, title: str, metadata: dict = None):
        if page_id not in self.page_ids:
            self.page_ids.append(page_id)
        
        self.documents[page_id] = {
            'text': text,
            'title': title,
            'metadata': metadata or {}
        }
    
    def add_vector(self, page_id: str, vector: np.ndarray):
        self.vectors[page_id] = vector
    
    def get_vector(self, page_id: str) -> Optional[np.ndarray]:
        return self.vectors.get(page_id)
    
    def get_all_vectors(self) -> Tuple[np.ndarray, List[str]]:
        if not self.page_ids:
            return np.array([]), []
        
        vectors = []
        for pid in self.page_ids:
            if pid in self.vectors:
                vectors.append(self.vectors[pid])
        
        if vectors:
            return np.stack(vectors), self.page_ids
        return np.array([]), []
    
    def search_similar(self, query_vector: np.ndarray, top_k: int = 5) -> List[Tuple[str, float]]:
        if not self.vectors or len(self.vectors) == 0:
            return []
        
        vector_array, page_ids = self.get_all_vectors()
        if len(vector_array) == 0:
            return []
        
        similarities = cosine_similarity(query_vector.reshape(1, -1), vector_array)[0]
        
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if idx < len(page_ids):
                results.append((page_ids[idx], float(similarities[idx])))
        
        return results
    
    def delete_document(self, page_id: str):
        if page_id in self.page_ids:
            self.page_ids.remove(page_id)
        if page_id in self.documents:
            del self.documents[page_id]
        if page_id in self.vectors:
            del self.vectors[page_id]
    
    def clear(self):
        self.page_ids = []
        self.documents = {}
        self.vectors = {}


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    dot_product = np.dot(a, b.T)
    norm_a = np.linalg.norm(a, axis=1, keepdims=True)
    norm_b = np.linalg.norm(b, axis=1, keepdims=True)
    
    norm_a[norm_a == 0] = 1
    norm_b[norm_b == 0] = 1
    
    return dot_product / (norm_a * norm_b.T)


class SemanticSearch:
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.vector_store = VectorStore(str(self.wiki_root.parent))
        self.embedding_service = None
        self._init_embedding_service()
    
    def _init_embedding_service(self):
        try:
            from embeddings.bge_service import BGEEmbeddingService
            
            self.embedding_service = BGEEmbeddingService(use_qnn=False)
            logger.info("[SemanticSearch] BGE embedding service initialized")
        except Exception as e:
            logger.warning(f"[SemanticSearch] BGE not available: {e}")
            self.embedding_service = None
    
    def _get_embedding(self, text: str) -> Optional[np.ndarray]:
        if self.embedding_service:
            try:
                vector = self.embedding_service.encode([text])
                return vector[0] if vector is not None else None
            except Exception as e:
                logger.error(f"[SemanticSearch] Embedding failed: {e}")
        
        return self._simple_embedding(text)
    
    def _simple_embedding(self, text: str, dim: int = 768) -> np.ndarray:
        words = text.lower().split()
        vector = np.zeros(dim)
        
        for i, word in enumerate(words[:100]):
            word_hash = hash(word) % dim
            vector[word_hash] += 1
        
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector
    
    def build_index(self, force: bool = False):
        if not force and self.vector_store.vectors:
            logger.info("[SemanticSearch] Index already exists, skipping build")
            return
        
        logger.info("[SemanticSearch] Building semantic index...")
        
        md_files = list(self.wiki_root.rglob("*.md"))
        
        for md_file in md_files:
            try:
                content = md_file.read_text(encoding='utf-8')
            except:
                continue
            
            page_id = str(md_file.relative_to(self.wiki_root)).replace('\\', '/').replace('.md', '')
            
            lines = content.split('\n')
            title = md_file.stem
            for line in lines:
                if line.startswith('title:'):
                    title = line.split(':', 1)[1].strip()
                    break
            
            text = '\n'.join([l for l in lines if not l.startswith('---') and l.strip()])
            
            self.vector_store.add_document(page_id, text, title)
            
            vector = self._get_embedding(text[:1000])
            if vector is not None:
                self.vector_store.add_vector(page_id, vector)
        
        self.vector_store._save()
        logger.info(f"[SemanticSearch] Indexed {len(self.vector_store.page_ids)} documents")
    
    def search(self, query: str, top_k: int = 5, threshold: float = 0.3) -> List[Dict]:
        if not self.vector_store.vectors:
            self.build_index()
        
        query_vector = self._get_embedding(query)
        if query_vector is None:
            return []
        
        results = self.vector_store.search_similar(query_vector, top_k)
        
        output = []
        for page_id, score in results:
            if score >= threshold:
                doc = self.vector_store.documents.get(page_id, {})
                output.append({
                    'page_id': page_id,
                    'title': doc.get('title', page_id),
                    'score': score,
                    'snippet': doc.get('text', '')[:200]
                })
        
        return output
    
    def find_similar(self, page_id: str, top_k: int = 5) -> List[Dict]:
        vector = self.vector_store.get_vector(page_id)
        if vector is None:
            return []
        
        results = self.vector_store.search_similar(vector, top_k + 1)
        
        output = []
        for pid, score in results:
            if pid != page_id:
                doc = self.vector_store.documents.get(pid, {})
                output.append({
                    'page_id': pid,
                    'title': doc.get('title', pid),
                    'score': score
                })
        
        return output[:top_k]
    
    def delete_index(self, page_id: str):
        self.vector_store.delete_document(page_id)
        self.vector_store._save()
    
    def rebuild_index(self):
        self.vector_store.clear()
        self.build_index(force=True)


if __name__ == "__main__":
    search = SemanticSearch("data/wiki")
    search.build_index()
    
    results = search.search("知识管理")
    print(f"\nSearch results: {len(results)}")
    for r in results:
        print(f"  - {r['title']} ({r['score']:.3f})")