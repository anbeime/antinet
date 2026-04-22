"""
Wiki API Routes for Jinyi WeiHu (锦衣卫) Knowledge Network
"""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

from wiki.wiki import WikiFileManager, WikiLinkParser
from wiki.graph import KnowledgeGraph
from wiki.search import AdvancedSearch
from wiki.semantic import SemanticSearch
from wiki.compiler import CompilerAgent, AutoCompiler


router = APIRouter(prefix="/api/wiki", tags=["wiki"])

DATA_DIR = Path("data")
WIKI_ROOT = DATA_DIR / "wiki"
GRAPH_DATA_DIR = DATA_DIR / "wiki"

file_manager = WikiFileManager(str(WIKI_ROOT))
graph = KnowledgeGraph(str(GRAPH_DATA_DIR))
search_engine = AdvancedSearch(str(WIKI_ROOT))
semantic_search = SemanticSearch(str(WIKI_ROOT))
compiler_agent = CompilerAgent(str(WIKI_ROOT))


class PageCreate(BaseModel):
    page_id: str
    title: str
    content: str
    node_type: str = "note"
    tags: List[str] = []


class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    node_type: Optional[str] = None
    tags: Optional[List[str]] = None


class LinkCreate(BaseModel):
    source_id: str
    target_id: str
    edge_type: str = "links_to"
    weight: float = 1.0


@router.get("/pages")
async def list_pages(folder: Optional[str] = None):
    pages = file_manager.list_pages(folder)
    return {"pages": pages, "total": len(pages)}


@router.get("/pages/{page_id}")
async def get_page(page_id: str):
    page = file_manager.read_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = file_manager.parser.parse(page.content, page_id)
    backlinks = graph.get_backlinks(page_id)
    connected = graph.get_connected_nodes(page_id, depth=2)
    
    return {
        "page": {
            "id": page.id,
            "title": page.title,
            "content": page.content,
            "type": page.node_type,
            "tags": page.tags,
            "frontmatter": page.frontmatter,
            "file_path": page.file_path,
            "created_at": page.created_at,
            "updated_at": page.updated_at
        },
        "links": [{"target_title": l.target_title, "target_id": l.target_id} for l in links],
        "backlinks": [{"page_id": bid, "title": graph.get_node(bid).title if graph.get_node(bid) else bid} for bid in backlinks],
        "connected": [{"page_id": cid, "depth": d} for cid, d in connected]
    }


@router.post("/pages")
async def create_page(page: PageCreate):
    success = file_manager.write_page(
        page.page_id,
        page.title,
        page.content,
        page.node_type,
        page.tags
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Page already exists")
    
    graph.add_node(page.page_id, page.title, page.node_type, page.content, page.tags)
    search_engine.rebuild_index()
    
    return {"success": True, "page_id": page.page_id}


@router.put("/pages/{page_id}")
async def update_page(page_id: str, update: PageUpdate):
    page = file_manager.read_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    updates = {}
    if update.title is not None:
        updates['title'] = update.title
    if update.content is not None:
        updates['content'] = update.content
    if update.node_type is not None:
        updates['node_type'] = update.node_type
    if update.tags is not None:
        updates['tags'] = update.tags
    
    if updates:
        file_manager.write_page(
            page_id,
            updates.get('title', page.title),
            updates.get('content', page.content),
            updates.get('node_type', page.node_type),
            updates.get('tags', page.tags),
            overwrite=True
        )
        
        graph.update_node(page_id, **updates)
        search_engine.rebuild_index()
    
    return {"success": True}


@router.delete("/pages/{page_id}")
async def delete_page(page_id: str):
    success = file_manager.delete_page(page_id)
    if not success:
        raise HTTPException(status_code=404, detail="Page not found")
    
    graph.delete_node(page_id)
    search_engine.rebuild_index()
    
    return {"success": True}


@router.get("/search")
async def search(
    q: str = Query(..., description="Search query"),
    mode: str = Query("fulltext", description="Search mode: fulltext/semantic/graph"),
    limit: int = Query(20, description="Max results")
):
    if mode == "semantic":
        results = semantic_search.search(q, limit)
        return {
            "query": q,
            "mode": mode,
            "results": results,
            "total": len(results)
        }
    
    results = search_engine.search(q, mode, limit)
    
    return {
        "query": q,
        "mode": mode,
        "results": [
            {
                "page_id": r.page_id,
                "title": r.title,
                "score": r.score,
                "snippet": r.snippet
            }
            for r in results
        ],
        "total": len(results)
    }


@router.get("/semantic/search")
async def semantic_search_endpoint(
    q: str = Query(..., description="Search query"),
    limit: int = Query(5, description="Max results"),
    threshold: float = Query(0.3, description="Similarity threshold")
):
    results = semantic_search.search(q, limit, threshold)
    return {"query": q, "results": results, "total": len(results)}


@router.get("/semantic/similar/{page_id}")
async def find_similar_pages(page_id: str, limit: int = Query(5)):
    results = semantic_search.find_similar(page_id, limit)
    return {"page_id": page_id, "similar": results}


@router.post("/semantic/build")
async def build_semantic_index():
    semantic_search.rebuild_index()
    return {"success": True, "message": "Semantic index rebuilt"}


@router.get("/graph/nodes")
async def get_graph_nodes():
    nodes = []
    for node in graph.nodes.values():
        nodes.append({
            "id": node.id,
            "title": node.title,
            "type": node.node_type,
            "tags": node.tags
        })
    
    return {"nodes": nodes, "total": len(nodes)}


@router.get("/graph/edges")
async def get_graph_edges(node_id: Optional[str] = None):
    if node_id:
        edges = graph.get_edges(node_id)
        return {
            "edges": [
                {
                    "source": e.source_id,
                    "target": e.target_id,
                    "type": e.edge_type,
                    "weight": e.weight
                }
                for e in edges
            ]
        }
    
    all_edges = []
    for src_id, edges in graph.edges.items():
        for tgt_id, edge in edges.items():
            all_edges.append({
                "source": src_id,
                "target": tgt_id,
                "type": edge.edge_type,
                "weight": edge.weight
            })
    
    return {"edges": all_edges}


@router.get("/graph/connected/{node_id}")
async def get_connected_nodes(node_id: str, depth: int = Query(2, ge=1, le=5)):
    connected = graph.get_connected_nodes(node_id, depth)
    
    result = []
    for cid, d in connected:
        node = graph.get_node(cid)
        if node:
            result.append({
                "id": cid,
                "title": node.title,
                "type": node.node_type,
                "distance": d
            })
    
    return {"node_id": node_id, "connected": result, "depth": depth}


@router.get("/graph/paths/{start_id}/{end_id}")
async def find_paths(start_id: str, end_id: str, max_depth: int = Query(3, ge=1, le=5)):
    paths = graph.find_paths(start_id, end_id, max_depth)
    
    result = []
    for path in paths:
        path_nodes = []
        for node_id in path:
            node = graph.get_node(node_id)
            path_nodes.append({
                "id": node_id,
                "title": node.title if node else node_id
            })
        result.append(path_nodes)
    
    return {"start": start_id, "end": end_id, "paths": result}


@router.post("/graph/edges")
async def create_edge(link: LinkCreate):
    edge = graph.add_edge(link.source_id, link.target_id, link.edge_type, link.weight)
    
    if not edge:
        raise HTTPException(status_code=400, detail="Invalid source or target")
    
    return {"success": True}


@router.get("/backlinks/{page_id}")
async def get_backlinks(page_id: str):
    backlinks = graph.get_backlinks(page_id)
    result = []
    
    for bid in backlinks:
        node = graph.get_node(bid)
        if node:
            result.append({
                "id": bid,
                "title": node.title,
                "type": node.node_type
            })
    
    return {"page_id": page_id, "backlinks": result}


@router.get("/tags")
async def list_tags():
    tags = set()
    
    for node in graph.nodes.values():
        tags.update(node.tags)
    
    return {"tags": sorted(list(tags))}


@router.post("/rebuild")
async def rebuild_index():
    graph.rebuild_index()
    search_engine.rebuild_index()
    
    return {"success": True, "message": "Index rebuilt successfully"}


@router.get("/stats")
async def get_stats():
    """Get wiki system stats"""
    import sqlite3
    
    wiki_count = len(list(WIKI_ROOT.rglob("*.md")))
    
    db_path = BACKEND_DIR / "data" / "antinet.db"
    card_count = 0
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        card_count = cursor.fetchone()[0]
        conn.close()
    
    return {
        "wiki_pages": wiki_count,
        "knowledge_cards": card_count,
        "data_dir": str(WIKI_ROOT)
    }


@router.get("/export")
async def export_wiki(format: str = Query("json")):
    data = {
        "meta": {
            "version": "1.0",
            "export_time": datetime.now().isoformat(),
            "page_count": len(graph.nodes)
        },
        "pages": [
            {
                "id": node.id,
                "title": node.title,
                "type": node.node_type,
                "content": node.content,
                "tags": node.tags
            }
            for node in graph.nodes.values()
        ],
        "graph": {
            "nodes": [
                {"id": n.id, "title": n.title, "type": n.node_type}
                for n in graph.nodes.values()
            ],
            "edges": [
                {"source": e.source_id, "target": e.target_id, "type": e.edge_type}
                for edges in graph.edges.values()
                for e in edges.values()
            ]
        }
    }
    
    if format == "json":
        return data
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")


@router.post("/compiler/run")
async def run_compiler():
    result = compiler_agent.force_compile()
    return {"success": True, "result": result}


@router.get("/compiler/stats")
async def get_compiler_stats():
    stats = compiler_agent.get_stats()
    return stats


@router.get("/compiler/start")
async def start_compiler_agent(interval: int = Query(300)):
    compiler_agent.start(interval)
    return {"success": True, "message": f"Compiler agent started (interval: {interval}s)"}


@router.get("/compiler/stop")
async def stop_compiler_agent():
    compiler_agent.stop()
    return {"success": True, "message": "Compiler agent stopped"}


@router.post("/import/cards")
async def import_from_cards():
    """Import existing knowledge cards into Wiki"""
    import sqlite3
    
    db_path = BACKEND_DIR / "data" / "antinet.db"
    if not db_path.exists():
        return {"success": False, "message": "原数据库不存在"}
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, card_type, title, content, category, created_at FROM knowledge_cards")
    cards = cursor.fetchall()
    conn.close()
    
    imported = 0
    for card in cards:
        card_id, card_type, title, content, category, created_at = card
        
        wiki_type_map = {
            'blue': 'concept',
            'green': 'note', 
            'yellow': 'reference',
            'red': 'index'
        }
        
        wiki_type = wiki_type_map.get(card_type, 'note')
        
        content_with_metadata = f"""---
title: {title}
type: {wiki_type}
category: {category}
created_at: {created_at}
tags: [{category}]
---

# {title}

{content}
"""
        
        file_path = WIKI_ROOT / "imported" / f"{card_id}.md"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content_with_metadata, encoding='utf-8')
        imported += 1
    
    graph.rebuild_index()
    search_engine.rebuild_index()
    
    return {"success": True, "imported": imported, "message": f"导入了 {imported} 张卡片"}


# 七司编译流水线 API
from typing import Any

@router.post("/pipeline/compile")
async def compile_document(doc: dict = Any):
    """使用七司流水线编译文档"""
    try:
        from pipeline.qisi import compile_document as do_compile
        result = do_compile(doc)
        return {
            "success": result.success,
            "stage": result.stage,
            "doc_id": result.doc_id,
            "errors": result.errors
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/pipeline/status")
async def get_pipeline_status():
    """获取各司状态"""
    return {
        "tongzheng": {"name": "通政司", "status": "ready"},
        "jianchayuan": {"name": "监察院", "status": "ready"},
        "xingyusi": {"name": "刑狱司", "status": "ready"},
        "canmou": {"name": "参谋司", "status": "ready"},
        "mijuanfang": {"name": "密卷房", "status": "ready"},
        "taishige": {"name": "太史阁", "status": "ready"},
        "yichuansi": {"name": "驿传司", "status": "ready"}
    }