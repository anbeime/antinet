"""
Wiki Page and Link Parser - Native implementation for Jinyi WeiHu (锦衣卫) system
"""
import re
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Set
from dataclasses import dataclass, field, asdict


@dataclass
class WikiLink:
    source_id: str
    target_title: str
    target_id: Optional[str] = None
    link_type: str = "wikilink"
    position: int = 0


@dataclass
class WikiPage:
    id: str
    title: str
    content: str
    node_type: str = "note"
    tags: List[str] = field(default_factory=list)
    frontmatter: Dict = field(default_factory=dict)
    file_path: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class WikiLinkParser:
    WIKILINK_PATTERN = r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]'
    TAG_PATTERN = r'(?<!\[)#(\w+)'
    
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.pages_index: Dict[str, str] = {}
        self._build_index()
    
    def _build_index(self):
        if not self.wiki_root.exists():
            self.wiki_root.mkdir(parents=True, exist_ok=True)
        
        for md_file in self.wiki_root.rglob("*.md"):
            page_id = str(md_file.relative_to(self.wiki_root)).replace('\\', '/').replace('.md', '')
            self.pages_index[md_file.stem.lower()] = page_id
            self.pages_index[page_id.lower()] = page_id
    
    def parse(self, content: str, source_id: str) -> List[WikiLink]:
        links = []
        for match in re.finditer(self.WIKILINK_PATTERN, content):
            target_title = match.group(1).strip()
            alias = match.group(2).strip() if match.group(2) else None
            
            target_id = self._resolve_link(target_title)
            
            links.append(WikiLink(
                source_id=source_id,
                target_title=alias or target_title,
                target_id=target_id,
                position=match.start()
            ))
        
        return links
    
    def _resolve_link(self, link_text: str) -> Optional[str]:
        search_lower = link_text.lower()
        
        if search_lower in self.pages_index:
            return self.pages_index[search_lower]
        
        for page_id in self.pages_index:
            if search_lower in page_id:
                return self.pages_index[page_id]
        
        return None
    
    def extract_tags(self, content: str) -> List[str]:
        tags = set()
        for match in re.finditer(self.TAG_PATTERN, content):
            tags.add(match.group(1))
        return list(tags)
    
    def extract_headings(self, content: str) -> List[Dict[str, any]]:
        headings = []
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        
        for match in re.finditer(heading_pattern, content, re.MULTILINE):
            level = len(match.group(1))
            text = match.group(2).strip()
            headings.append({
                'level': level,
                'text': text,
                'position': match.start()
            })
        
        return headings
    
    def resolve_wikilinks(self, content: str) -> str:
        def replace_link(match):
            link_text = match.group(1).strip()
            alias = match.group(2).strip() if match.group(2) else link_text
            target_id = self._resolve_link(link_text)
            
            if target_id:
                return f'[{alias}](/wiki/{target_id})'
            else:
                return f'[{alias}](/wiki/new?title={link_text})'
        
        pattern = r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]'
        return re.sub(pattern, replace_link, content)


class WikiFileManager:
    def __init__(self, wiki_root: str = "data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.parser = WikiLinkParser(str(self.wiki_root))
        self._ensure_root()
    
    def _ensure_root(self):
        subdirs = ['articles', 'papers', 'meetings', 'resources', 'entities', 'concepts', 'queries', 'comparisons']
        for subdir in subdirs:
            (self.wiki_root / subdir).mkdir(parents=True, exist_ok=True)
    
    def get_page_path(self, page_id: str) -> Path:
        parts = page_id.split('/')
        return self.wiki_root / (parts[0] if parts else 'notes') / (parts[-1] + '.md')
    
    def read_page(self, page_id: str) -> Optional[WikiPage]:
        file_path = self.get_page_path(page_id)
        
        if not file_path.exists():
            return None
        
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception:
            return None
        
        frontmatter, body = self._parse_frontmatter(content)
        title = frontmatter.get('title', file_path.stem)
        node_type = frontmatter.get('type', 'note')
        tags = frontmatter.get('tags', [])
        
        return WikiPage(
            id=page_id,
            title=title,
            content=body,
            node_type=node_type,
            tags=tags,
            frontmatter=frontmatter,
            file_path=str(file_path.relative_to(self.wiki_root)),
            created_at=frontmatter.get('created_at', datetime.now().isoformat()),
            updated_at=frontmatter.get('updated_at', datetime.now().isoformat())
        )
    
    def write_page(self, page_id: str, title: str, content: str, node_type: str = 'note', 
                 tags: List[str] = None, overwrite: bool = False):
        file_path = self.get_page_path(page_id)
        
        if file_path.exists() and not overwrite:
            return False
        
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        frontmatter = {
            'title': title,
            'type': node_type,
            'tags': tags or [],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        fm_yaml = self._render_frontmatter(frontmatter)
        full_content = f"---\n{fm_yaml}---\n\n{content}"
        
        file_path.write_text(full_content, encoding='utf-8')
        
        self.parser._build_index()
        return True
    
    def delete_page(self, page_id: str) -> bool:
        file_path = self.get_page_path(page_id)
        
        if file_path.exists():
            file_path.unlink()
            self.parser._build_index()
            return True
        
        return False
    
    def list_pages(self, folder: str = None) -> List[Dict]:
        pattern = self.wiki_root / folder if folder else self.wiki_root
        pages = []
        
        for md_file in pattern.rglob("*.md"):
            rel_path = str(md_file.relative_to(self.wiki_root)).replace('\\', '/')
            page_id = rel_path.replace('.md', '')
            
            try:
                content = md_file.read_text(encoding='utf-8')
                frontmatter, _ = self._parse_frontmatter(content)
            except:
                frontmatter = {}
            
            pages.append({
                'id': page_id,
                'title': frontmatter.get('title', md_file.stem),
                'type': frontmatter.get('type', 'note'),
                'tags': frontmatter.get('tags', []),
                'file_path': rel_path
            })
        
        return pages
    
    def _parse_frontmatter(self, content: str) -> Tuple[Dict, str]:
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                fm = {}
                for line in parts[1].strip().split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip()
                        if key == 'tags':
                            fm[key] = [t.strip() for t in value.split(',') if t.strip()]
                        else:
                            fm[key] = value
                return fm, parts[2].strip()
        
        return {}, content
    
    def _render_frontmatter(self, fm: Dict) -> str:
        lines = []
        for key, value in fm.items():
            if key == 'tags':
                lines.append(f"{key}: {', '.join(value)}")
            else:
                lines.append(f"{key}: {value}")
        return '\n'.join(lines)
    
    def search_content(self, query: str, case_sensitive: bool = False) -> List[Dict]:
        results = []
        pattern = re.compile(query, 0 if case_sensitive else re.IGNORECASE)
        
        for md_file in self.wiki_root.rglob("*.md"):
            try:
                content = md_file.read_text(encoding='utf-8')
            except:
                continue
            
            matches = list(pattern.finditer(content))
            if matches:
                rel_path = str(md_file.relative_to(self.wiki_root)).replace('\\', '/')
                
                snippets = []
                for match in matches[:3]:
                    start = max(0, match.start() - 30)
                    end = min(len(content), match.end() + 30)
                    snippet = content[start:end].replace('\n', ' ').strip()
                    snippets.append(f"...{snippet}...")
                
                results.append({
                    'id': rel_path.replace('.md', ''),
                    'title': md_file.stem,
                    'matches': len(matches),
                    'snippets': snippets
                })
        
        return results