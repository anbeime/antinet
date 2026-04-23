"""
Advanced Search Engine for Jinyi WeiHu (锦衣卫) Knowledge Network
"""
import re
import math
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class SearchResult:
    page_id: str
    title: str
    score: float
    matches: List[str] = field(default_factory=list)
    snippet: str = ""


class AdvancedSearch:
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.inverted_index: Dict[str, Dict[str, List[int]]] = defaultdict(dict)
        self.documents: Dict[str, dict] = {}
        self.total_docs: int = 0
        self._build_index()
    
    def _build_index(self):
        if not self.wiki_root.exists():
            return
        
        md_files = list(self.wiki_root.rglob("*.md"))
        
        for md_file in md_files:
            page_id = str(md_file.relative_to(self.wiki_root)).replace('\\', '/').replace('.md', '')
            
            try:
                content = md_file.read_text(encoding='utf-8')
            except:
                continue
            
            tokens = self._tokenize(content)
            
            for token, positions in tokens.items():
                if page_id not in self.inverted_index[token]:
                    self.inverted_index[token][page_id] = positions
                else:
                    self.inverted_index[token][page_id].extend(positions)
            
            self.documents[page_id] = {
                'title': md_file.stem,
                'content': content,
                'path': str(md_file)
            }
        
        self.total_docs = len(self.documents)
    
    def _tokenize(self, text: str) -> Dict[str, List[int]]:
        words = re.findall(r'\b\w+\b', text.lower())
        token_positions = defaultdict(list)
        
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being'
        }
        
        for i, word in enumerate(words):
            if word not in stop_words and len(word) > 1:
                token_positions[word].append(i)
        
        return dict(token_positions)
    
    def search(self, query: str, mode: str = 'fulltext', limit: int = 20) -> List[SearchResult]:
        if mode == 'fulltext':
            return self._fulltext_search(query, limit)
        elif mode == 'semantic':
            return self._semantic_search(query, limit)
        elif mode == 'graph':
            return self._graph_search(query, limit)
        else:
            results = self._fulltext_search(query, limit)
            return results
    
    def _fulltext_search(self, query: str, limit: int) -> List[SearchResult]:
        query_tokens = set(re.findall(r'\b\w+\b', query.lower()))
        scores = defaultdict(float)
        
        for token in query_tokens:
            if token in self.inverted_index:
                df = len(self.inverted_index[token])
                idf = math.log((self.total_docs + 1) / (df + 1))
                
                for doc_id in self.inverted_index[token]:
                    tf = len(self.inverted_index[token][doc_id])
                    scores[doc_id] += tf * idf
        
        results = []
        for doc_id, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limit]:
            doc = self.documents.get(doc_id)
            if doc:
                results.append(SearchResult(
                    page_id=doc_id,
                    title=doc['title'],
                    score=score,
                    snippet=self._get_snippet(doc['content'], query)
                ))
        
        return results
    
    def _semantic_search(self, query: str, limit: int) -> List[SearchResult]:
        return self._fulltext_search(query, limit)
    
    def _graph_search(self, query: str, limit: int) -> List[SearchResult]:
        return self._fulltext_search(query, limit)
    
    def _get_snippet(self, content: str, query: str, context: int = 50) -> str:
        query_lower = query.lower()
        content_lower = content.lower()
        
        pos = content_lower.find(query_lower)
        if pos == -1:
            return content[:100] + "..." if len(content) > 100 else content
        
        start = max(0, pos - context)
        end = min(len(content), pos + len(query) + context)
        
        snippet = content[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
        
        return snippet
    
    def find_similar(self, page_id: str, limit: int = 5) -> List[SearchResult]:
        doc = self.documents.get(page_id)
        if not doc:
            return []
        
        content = doc['content']
        query_terms = ' '.join(self._tokenize(content).keys())
        
        similar = self._fulltext_search(query_terms, limit + 1)
        return [r for r in similar if r.page_id != page_id][:limit]
    
    def find_by_tag(self, tag: str) -> List[SearchResult]:
        tag_pattern = re.compile(rf'#\b{re.escape(tag)}\b', re.IGNORECASE)
        results = []
        
        for page_id, doc in self.documents.items():
            if tag_pattern.search(doc['content']):
                results.append(SearchResult(
                    page_id=page_id,
                    title=doc['title'],
                    score=1.0
                ))
        
        return results
    
    def rebuild_index(self):
        self.inverted_index.clear()
        self.documents.clear()
        self._build_index()