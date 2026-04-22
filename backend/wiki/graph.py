"""
Knowledge Graph Engine - Native implementation for Jinyi WeiHu (锦衣卫) system
"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any, Set, Tuple
from dataclasses import dataclass, field, asdict
from collections import defaultdict
import re


@dataclass
class Node:
    id: str
    title: str
    node_type: str
    content: str = ""
    tags: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    file_path: str = ""


@dataclass  
class Edge:
    source_id: str
    target_id: str
    edge_type: str
    weight: float = 1.0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


class KnowledgeGraph:
    def __init__(self, data_dir: str = "data/wiki"):
        self.data_dir = Path(data_dir)
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Dict[str, Edge]] = defaultdict(dict)
        self.inverted_index: Dict[str, Set[str]] = defaultdict(set)
        self.title_to_id: Dict[str, str] = {}
        self._load_or_init()
    
    def _load_or_init(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.nodes_file = self.data_dir / "nodes.json"
        self.edges_file = self.data_dir / "edges.json"
        
        if self.nodes_file.exists():
            self._load()
        else:
            self._scan_wiki_files()
    
    def _load(self):
        with open(self.nodes_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get('nodes', []):
                node = Node(**item)
                self.nodes[node.id] = node
                self.title_to_id[node.title.lower()] = node.id
                self._update_inverted_index(node)
        
        with open(self.edges_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get('edges', []):
                edge = Edge(**item)
                self.edges[edge.source_id][edge.target_id] = edge
    
    def _save(self):
        with open(self.nodes_file, 'w', encoding='utf-8') as f:
            json.dump({'nodes': [asdict(n) for n in self.nodes.values()]}, f, ensure_ascii=False, indent=2)
        
        with open(self.edges_file, 'w', encoding='utf-8') as f:
            all_edges = []
            for src_edges in self.edges.values():
                all_edges.extend(src_edges.values())
            json.dump({'edges': [asdict(e) for e in all_edges]}, f, ensure_ascii=False, indent=2)
    
    def _scan_wiki_files(self):
        wiki_root = self.data_dir.parent / "wiki"
        if not wiki_root.exists():
            wiki_root.mkdir(parents=True, exist_ok=True)
        
        md_files = list(wiki_root.rglob("*.md"))
        for md_file in md_files:
            self._index_file(md_file)
        
        self._save()
    
    def _index_file(self, file_path: Path):
        rel_path = file_path.relative_to(self.data_dir.parent)
        node_id = str(rel_path).replace('\\', '/').replace('.md', '')
        
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception:
            content = ""
        
        title = file_path.stem
        frontmatter, body = self._parse_frontmatter(content)
        
        if frontmatter.get('title'):
            title = frontmatter['title']
        
        tags = frontmatter.get('tags', [])
        node_type = frontmatter.get('type', 'note')
        
        node = Node(
            id=node_id,
            title=title,
            node_type=node_type,
            content=body,
            tags=tags,
            properties=frontmatter,
            file_path=str(rel_path)
        )
        
        self.nodes[node_id] = node
        self.title_to_id[title.lower()] = node_id
        self._update_inverted_index(node)
        
        self._extract_links(node_id, body)
    
    def _parse_frontmatter(self, content: str) -> Tuple[Dict, str]:
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                try:
                    fm = yaml.safe_load(parts[1]) if 'yaml' in dir() else {}
                    if isinstance(fm, dict):
                        return fm, parts[2].strip()
                except:
                    pass
        return {}, content
    
    def _update_inverted_index(self, node: Node):
        tokens = self._tokenize(f"{node.title} {node.content}")
        for token in tokens:
            self.inverted_index[token].add(node.id)
    
    def _tokenize(self, text: str) -> Set[str]:
        words = re.findall(r'\b\w+\b', text.lower())
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        return {w for w in words if w not in stop_words and len(w) > 1}
    
    def add_node(self, node_id: str, title: str, node_type: str = 'note', content: str = "", 
                tags: List[str] = None, properties: Dict = None) -> Node:
        node = Node(
            id=node_id,
            title=title,
            node_type=node_type,
            content=content,
            tags=tags or [],
            properties=properties or {},
            file_path=node_id + ".md"
        )
        
        self.nodes[node_id] = node
        self.title_to_id[title.lower()] = node_id
        self._update_inverted_index(node)
        
        self._save()
        return node
    
    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)
    
    def get_node_by_title(self, title: str) -> Optional[Node]:
        node_id = self.title_to_id.get(title.lower())
        return self.nodes.get(node_id)
    
    def update_node(self, node_id: str, **kwargs) -> Optional[Node]:
        node = self.nodes.get(node_id)
        if not node:
            return None
        
        for key, value in kwargs.items():
            if hasattr(node, key):
                setattr(node, key, value)
        
        node.updated_at = datetime.now().isoformat()
        self._save()
        return node
    
    def delete_node(self, node_id: str):
        if node_id in self.nodes:
            node = self.nodes[node_id]
            del self.title_to_id[node.title.lower()]
            del self.nodes[node_id]
        
        if node_id in self.edges:
            del self.edges[node_id]
        
        for src_edges in self.edges.values():
            if node_id in src_edges:
                del src_edges[node_id]
        
        self._save()
    
    def add_edge(self, source_id: str, target_id: str, edge_type: str, weight: float = 1.0):
        if source_id not in self.nodes or target_id not in self.nodes:
            return None
        
        edge = Edge(source_id, target_id, edge_type, weight)
        self.edges[source_id][target_id] = edge
        self._save()
        return edge
    
    def get_edges(self, node_id: str) -> List[Edge]:
        return list(self.edges.get(node_id, {}).values())
    
    def get_incoming_edges(self, node_id: str) -> List[Edge]:
        result = []
        for src_edges in self.edges.values():
            if node_id in src_edges:
                result.append(src_edges[node_id])
        return result
    
    def get_connected_nodes(self, node_id: str, depth: int = 2) -> List[Tuple[str, int]]:
        visited = set()
        queue = [(node_id, 0)]
        result = []
        
        while queue:
            current_id, current_depth = queue.pop(0)
            if current_id in visited or current_depth > depth:
                continue
            
            visited.add(current_id)
            if current_id != node_id:
                result.append((current_id, current_depth))
            
            for edge in self.edges.get(current_id, {}).values():
                neighbor_id = edge.target_id
                if neighbor_id not in visited:
                    queue.append((neighbor_id, current_depth + 1))
        
        return result
    
    def find_paths(self, start_id: str, end_id: str, max_depth: int = 3) -> List[List[str]]:
        paths = []
        queue = [(start_id, [start_id])]
        
        while queue:
            current_id, path = queue.pop(0)
            if len(path) > max_depth:
                continue
            
            if current_id == end_id:
                paths.append(path)
                continue
            
            for edge in self.edges.get(current_id, {}).values():
                neighbor_id = edge.target_id
                if neighbor_id not in path:
                    queue.append((neighbor_id, path + [neighbor_id]))
        
        return paths
    
    def _extract_links(self, node_id: str, content: str):
        link_pattern = r'\[\[([^\]]+)\]\]'
        links = re.findall(link_pattern, content)
        
        for link_text in links:
            target_title = link_text.strip()
            target_id = self.title_to_id.get(target_title.lower())
            
            if target_id and target_id != node_id:
                self.add_edge(node_id, target_id, 'links_to')
    
    def rebuild_index(self):
        self.inverted_index.clear()
        self.title_to_id.clear()
        self.edges.clear()
        self._scan_wiki_files()
    
    def search(self, query: str, limit: int = 20) -> List[Tuple[str, float]]:
        query_tokens = self._tokenize(query)
        scores = defaultdict(float)
        
        for token in query_tokens:
            if token in self.inverted_index:
                for node_id in self.inverted_index[token]:
                    tf = 1
                    idf = 1.0 / (len(self.inverted_index[token]) + 1)
                    scores[node_id] += tf * idf
        
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_scores[:limit]
    
    def get_backlinks(self, node_id: str) -> List[str]:
        backlinks = []
        for src_id, edges in self.edges.items():
            for tgt_id in edges:
                if tgt_id == node_id:
                    backlinks.append(src_id)
        return backlinks