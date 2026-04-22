"""
Auto-Compilation Agent for Jinyi WeiHu (锦衣卫) Knowledge Network
Automatically extracts entities, relationships, and applies compilation rules
"""
import os
import sys
import re
import json
import logging
import threading
import time
from pathlib import Path
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@dataclass
class ExtractedEntity:
    name: str
    entity_type: str
    page_id: str
    properties: Dict = field(default_factory=dict)
    confidence: float = 1.0


@dataclass
class ExtractedRelation:
    source: str
    target: str
    relation_type: str
    context: str = ""
    confidence: float = 1.0


class CompilationRules:
    ENTITY_PATTERNS = {
        'person': [
            r'(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s|,|:|。|$)',
            r'(?:姓名|负责人|主讲人|作者|译者)[:：]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        ],
        'project': [
            r'(?:项目|计划|方案)[:：]\s*([^新的\n]+)',
            r'([^\s]{2,20}(?:项目|计划|系统|平台))',
        ],
        'tool': [
            r'(?:使用|基于|采用)([^新的\n]+)(?:开发|实现|构建)',
            r'(?:工具|软件|框架)[:：]\s*([A-Z][a-z]+)',
        ],
        'concept': [
            r'#(\w+)',
            r'术语[:：]\s*([^\n]+)',
        ]
    }

    RELATION_PATTERNS = {
        'works_on': [
            r'([A-Z][a-z]+)\s+(?:负责|参与|从事)\s+([^\s，。]+)',
        ],
        'related_to': [
            r'([^\s，。]+)\s+(?:与|和|以及)\s+([^\s，。]+)\s+(?:相关|关联)',
            r'([^\s，。]+)\s*[-–—]\s*([^\s，。]+)',
        ],
        'based_on': [
            r'(?:基于|采用)\s+([^\s，。]+)\s+(?:实现|构建|开发)',
            r'([^\s，。]+)\s+(?:使用|依赖)\s+([^\s，。]+)',
        ],
        'links_to': [
            r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]',
        ]
    }

    AUTO_TAGS = {
        '概念': ['concept'],
        '笔记': ['note'],
        '项目': ['project'],
        '人物': ['person'],
        '工具': ['tool'],
        '方法': ['method'],
        '论文': ['paper'],
        '会议': ['meeting'],
    }


class EntityExtractor:
    def __init__(self):
        self.rules = CompilationRules()
        self.page_titles: Set[str] = set()
    
    def set_page_titles(self, titles: Set[str]):
        self.page_titles = titles
    
    def extract_entities(self, content: str, page_id: str) -> List[ExtractedEntity]:
        entities = []
        
        for entity_type, patterns in self.rules.ENTITY_PATTERNS.items():
            for pattern in patterns:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    text = match.group(1).strip()
                    if text and len(text) >= 2:
                        entities.append(ExtractedEntity(
                            name=text,
                            entity_type=entity_type,
                            page_id=page_id,
                            confidence=0.8
                        ))
        
        return entities
    
    def extract_relations(self, content: str, source_page_id: str) -> List[ExtractedRelation]:
        relations = []
        
        for rel_type, patterns in self.rules.RELATION_PATTERNS.items():
            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    if rel_type == 'links_to':
                        target = match.group(1).strip()
                        if target.lower() in self.page_titles:
                            relations.append(ExtractedRelation(
                                source=source_page_id,
                                target=target.lower(),
                                relation_type=rel_type,
                                context=content[max(0, match.start()-20):match.end()+20],
                                confidence=1.0
                            ))
                    elif len(match.groups()) >= 2:
                        source = match.group(1).strip()
                        target = match.group(2).strip()
                        
                        if source and target:
                            relations.append(ExtractedRelation(
                                source=source,
                                target=target,
                                relation_type=rel_type,
                                context=content[max(0, match.start()-20):match.end()+20],
                                confidence=0.7
                            ))
        
        return relations


class AutoCompiler:
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.data_dir = self.wiki_root.parent / "wiki"
        self.entity_extractor = EntityExtractor()
        self.compiled_file = self.data_dir / "compiled.json"
        self.compiled_data: Dict = {}
        self._load_compiled()
    
    def _load_compiled(self):
        if self.compiled_file.exists():
            try:
                with open(self.compiled_file, 'r', encoding='utf-8') as f:
                    self.compiled_data = json.load(f)
            except:
                self.compiled_data = {'entities': {}, 'relations': {}, 'tags': {}, 'updated_at': ''}
    
    def _save_compiled(self):
        self.compiled_data['updated_at'] = datetime.now().isoformat()
        with open(self.compiled_file, 'w', encoding='utf-8') as f:
            json.dump(self.compiled_data, f, ensure_ascii=False, indent=2)
    
    def _get_all_titles(self) -> Set[str]:
        titles = set()
        for md_file in self.wiki_root.rglob("*.md"):
            try:
                content = md_file.read_text(encoding='utf-8')
            except:
                continue
            
            lines = content.split('\n')
            title = md_file.stem
            for line in lines:
                if line.startswith('title:'):
                    title = line.split(':', 1)[1].strip()
                    break
            
            titles.add(title.lower())
            titles.add(md_file.stem.lower())
        
        return titles
    
    def compile_page(self, page_id: str, content: str, title: str) -> Dict:
        self.entity_extractor.set_page_titles(self._get_all_titles())
        
        entities = self.entity_extractor.extract_entities(content, page_id)
        relations = self.entity_extractor.extract_relations(content, page_id)
        
        tags = set()
        for line in content.split('\n'):
            for tag, types in self.rules.AUTO_TAGS.items():
                if tag in line:
                    tags.update(types)
        
        frontmatter_match = re.search(r'^---\n([\s\S]+?)\n---', content)
        if frontmatter_match:
            for line in frontmatter_match.group(1).split('\n'):
                if line.startswith('tags:'):
                    tag_part = line.split(':', 1)[1].strip()
                    found_tags = [t.strip() for t in tag_part.split(',')]
                    tags.update(found_tags)
        
        compiled = {
            'page_id': page_id,
            'title': title,
            'entities': [e.name for e in entities],
            'relations': [(r.source, r.target, r.relation_type) for r in relations],
            'auto_tags': list(tags),
            'word_count': len(content),
            'link_count': len(re.findall(r'\[\[', content)),
            'timestamp': datetime.now().isoformat()
        }
        
        return compiled
    
    def compile_all(self) -> Dict:
        logger.info("[AutoCompiler] Starting full compilation...")
        
        all_pages = {}
        for md_file in self.wiki_root.rglob("*.md"):
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
            
            all_pages[page_id] = (content, title)
        
        for page_id, (content, title) in all_pages.items():
            compiled = self.compile_page(page_id, content, title)
            self.compiled_data['entities'][page_id] = compiled
        
        self._save_compiled()
        
        logger.info(f"[AutoCompiler] Compiled {len(all_pages)} pages")
        return {'compiled': len(all_pages), 'entities': len(self.compiled_data.get('entities', {}))}
    
    def get_statistics(self) -> Dict:
        total_entities = len(self.compiled_data.get('entities', {}))
        total_relations = sum(len(e.get('relations', [])) for e in self.compiled_data.get('entities', {}).values())
        
        type_counts = {}
        for page_data in self.compiled_data.get('entities', {}).values():
            for etype in page_data.get('entities', []):
                type_counts[etype] = type_counts.get(etype, 0) + 1
        
        tag_counts = {}
        for page_data in self.compiled_data.get('entities', {}).values():
            for tag in page_data.get('auto_tags', []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        return {
            'total_pages': total_entities,
            'total_relations': total_relations,
            'entity_types': type_counts,
            'tags': tag_counts,
            'last_updated': self.compiled_data.get('updated_at', '')
        }


class CompilerAgent:
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.auto_compiler = AutoCompiler(wiki_root)
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.last_compile_time = 0
        self.compile_interval = 300
    
    def start(self, interval: int = 300):
        if self.running:
            return
        
        self.running = True
        self.compile_interval = interval
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"[CompilerAgent] Started (interval: {interval}s)")
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("[CompilerAgent] Stopped")
    
    def _run_loop(self):
        self.auto_compiler.compile_all()
        self.last_compile_time = time.time()
        
        while self.running:
            try:
                now = time.time()
                elapsed = now - self.last_compile_time
                
                if elapsed >= self.compile_interval:
                    logger.info("[CompilerAgent] Running scheduled compilation...")
                    self.auto_compiler.compile_all()
                    self.last_compile_time = time.time()
                
                time.sleep(30)
            except Exception as e:
                logger.error(f"[CompilerAgent] Error: {e}")
                time.sleep(60)
    
    def force_compile(self):
        result = self.auto_compiler.compile_all()
        self.last_compile_time = time.time()
        return result
    
    def get_stats(self):
        return self.auto_compiler.get_statistics()


def compile_page_cli(page_id: str):
    from wiki.wiki import WikiFileManager
    from wiki.graph import KnowledgeGraph
    
    wiki_root = "data/wiki"
    fm = WikiFileManager(wiki_root)
    page = fm.read_page(page_id)
    
    if not page:
        print(f"Page not found: {page_id}")
        return
    
    compiler = AutoCompiler(wiki_root)
    result = compiler.compile_page(page_id, page.content, page.title)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        compile_page_cli(sys.argv[1])
    else:
        agent = CompilerAgent("data/wiki")
        stats = agent.force_compile()
        print(f"Compilation complete: {stats}")