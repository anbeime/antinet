"""
File System Watcher for Jinyi WeiHu (锦衣卫) Knowledge Network
Monitors wiki files for changes and triggers auto-rebuild
"""
import os
import sys
from pathlib import Path
from typing import Optional, Callable
import time
import threading
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WikiFileWatcher:
    def __init__(self, wiki_root: str = "backend/data/wiki", on_change: Optional[Callable] = None):
        self.wiki_root = Path(wiki_root)
        self.on_change = on_change
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.file_mtimes: dict = {}
        self._ensure_wiki_dir()
    
    def _ensure_wiki_dir(self):
        self.wiki_root.mkdir(parents=True, exist_ok=True)
    
    def _scan_files(self) -> dict:
        mtimes = {}
        if not self.wiki_root.exists():
            return mtimes
        
        for md_file in self.wiki_root.rglob("*.md"):
            rel_path = str(md_file.relative_to(self.wiki_root))
            try:
                mtimes[rel_path] = md_file.stat().st_mtime
            except:
                pass
        return mtimes
    
    def _check_changes(self) -> list:
        changes = []
        current_mtimes = self._scan_files()
        
        for rel_path, mtime in current_mtimes.items():
            if rel_path not in self.file_mtimes:
                changes.append(('created', rel_path))
            elif mtime != self.file_mtimes[rel_path]:
                changes.append(('modified', rel_path))
        
        for rel_path in self.file_mtimes:
            if rel_path not in current_mtimes:
                changes.append(('deleted', rel_path))
        
        self.file_mtimes = current_mtimes
        return changes
    
    def _watch_loop(self):
        logger.info(f"[WikiWatcher] Started watching: {self.wiki_root}")
        
        self.file_mtimes = self._scan_files()
        
        while self.running:
            try:
                changes = self._check_changes()
                
                if changes:
                    for change_type, rel_path in changes:
                        logger.info(f"[WikiWatcher] {change_type}: {rel_path}")
                    
                    if self.on_change:
                        self.on_change(changes)
                
                time.sleep(2)
            except Exception as e:
                logger.error(f"[WikiWatcher] Watch error: {e}")
                time.sleep(5)
        
        logger.info("[WikiWatcher] Stopped")
    
    def start(self):
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._watch_loop, daemon=True)
        self.thread.start()
        logger.info("[WikiWatcher] File watcher started")
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        logger.info("[WikiWatcher] File watcher stopped")
    
    def trigger_rebuild(self):
        from wiki.graph import KnowledgeGraph
        from wiki.search import AdvancedSearch
        
        logger.info("[WikiWatcher] Triggering index rebuild...")
        
        graph = KnowledgeGraph(str(self.wiki_root.parent))
        graph.rebuild_index()
        
        search = AdvancedSearch(str(self.wiki_root))
        search.rebuild_index()
        
        logger.info("[WikiWatcher] Index rebuild complete")
        
        if self.on_change:
            self.on_change([('rebuild', 'all')])


class AutoMaintenance:
    def __init__(self, wiki_root: str = "backend/data/wiki"):
        self.wiki_root = Path(wiki_root)
        self.graph: Optional[KnowledgeGraph] = None
    
    def run_clean_orphaned(self):
        if not self.graph:
            from wiki.graph import KnowledgeGraph
            self.graph = KnowledgeGraph(str(self.wiki_root.parent))
        
        orphaned = []
        for node_id, node in self.graph.nodes.items():
            backlinks = self.graph.get_backlinks(node_id)
            if not backlinks and node.node_type != 'index':
                orphaned.append(node_id)
        
        logger.info(f"[Maintenance] Found {len(orphaned)} orphaned pages")
        return orphaned
    
    def run_merge_duplicates(self):
        pass
    
    def run_update_cross_references(self):
        pass
    
    def run_all(self):
        tasks = [
            self.run_clean_orphaned,
            self.run_merge_duplicates,
            self.run_update_cross_references
        ]
        
        results = {}
        for task in tasks:
            try:
                name = task.__name__
                results[name] = task()
            except Exception as e:
                logger.error(f"[Maintenance] {task.__name__} failed: {e}")
                results[task.__name__] = str(e)
        
        return results


if __name__ == "__main__":
    watcher = WikiFileWatcher("backend/data/wiki")
    watcher.start()
    
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        watcher.stop()