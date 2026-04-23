#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知识图谱检索模块
支持实体查询、关系遍历、混合搜索
"""
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import logging
import re

logger = logging.getLogger(__name__)

db_manager = None


@dataclass
class KGEntity:
    """知识图谱实体"""
    id: str
    name: str
    entity_type: str
    properties: Dict[str, Any]
    description: Optional[str] = None


@dataclass
class KGRelation:
    """知识图谱关系"""
    id: str
    source_id: str
    target_id: str
    relation_type: str
    properties: Dict[str, Any]


@dataclass
class KGSearchResult:
    """知识图谱搜索结果"""
    entities: List[KGEntity]
    relations: List[KGRelation]
    context: str  # 用于 LLM 的上下文描述


def set_db_manager(manager):
    """设置数据库管理器"""
    global db_manager
    db_manager = manager
    logger.info("[KG] 数据库管理器已设置")


def search_entities(query: str, limit: int = 10) -> List[KGEntity]:
    """搜索实体"""
    global db_manager
    if db_manager is None:
        return []
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        keywords = _extract_keywords(query)
        conditions = []
        params = []
        
        for kw in keywords:
            conditions.append("(name LIKE ? OR description LIKE ? OR properties LIKE ?)")
            params.extend([f"%{kw}%", f"%{kw}%", f"%{kw}%"])
        
        if conditions:
            where = " OR ".join(conditions)
            sql = """
                SELECT id, name, COALESCE(entity_type, '概念') as etype, 
                       COALESCE(properties, '{}') as props,
                       COALESCE(description, '') as desc
                FROM kg_entities
                WHERE %s
                ORDER BY created_at DESC
                LIMIT ?
            """ % where
            params.append(limit)
            cursor.execute(sql, params)
        else:
            cursor.execute("""
                SELECT id, name, COALESCE(entity_type, '概念') as etype, 
                       COALESCE(properties, '{}') as props,
                       COALESCE(description, '') as desc
                FROM kg_entities
                ORDER BY created_at DESC
                LIMIT ?
            """, [limit])
        
        entities = []
        for row in cursor.fetchall():
            import json
            try:
                props = json.loads(row[3]) if row[3] else {}
            except:
                props = {}
            entities.append(KGEntity(
                id=str(row[0]),
                name=row[1],
                entity_type=row[2],
                properties=props,
                description=row[4]
            ))
        
        conn.close()
        return entities
        
    except Exception as e:
        logger.error(f"搜索实体失败: {e}")
        return []


def search_relations(entity_id: str, depth: int = 1) -> List[KGRelation]:
    """搜索实体的关系"""
    global db_manager
    if db_manager is None:
        return []
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 搜索关系
        cursor.execute("""
            SELECT id, source_id, target_id, COALESCE(relation_type, '相关') as rtype, 
                   COALESCE(properties, '{}') as props
            FROM kg_relations
            WHERE source_id = ? OR target_id = ?
            ORDER BY created_at DESC
        """, [entity_id, entity_id])
        
        import json
        relations = []
        for row in cursor.fetchall():
            try:
                props = json.loads(row[4]) if row[4] else {}
            except:
                props = {}
            relations.append(KGRelation(
                id=str(row[0]),
                source_id=str(row[1]),
                target_id=str(row[2]),
                relation_type=row[3],
                properties=props
            ))
        
        conn.close()
        return relations
        
    except Exception as e:
        logger.error(f"搜索关系失败: {e}")
        return []


def get_entity_context(entity_id: str) -> str:
    """获取实体的上下文描述（用于 LLM）"""
    entity = search_entities(f"id:{entity_id}", limit=1)
    if not entity:
        return ""
    
    e = entity[0]
    ctx = f"【{e.name}】({e.entity_type})"
    if e.description:
        ctx += f"\n{e.description}"
    if e.properties:
        for k, v in e.properties.items():
            ctx += f"\n{k}: {v}"
    
    # 添加关联实体
    relations = search_relations(entity_id)
    if relations:
        ctx += "\n\n相关联:"
        for r in relations[:5]:
            target = r.target_id if r.source_id == entity_id else r.source_id
            target_name = _get_entity_name(target)
            if target_name:
                ctx += f"\n- {r.relation_type} {target_name}"
    
    return ctx


def _get_entity_name(entity_id: str) -> Optional[str]:
    """获取实体名称"""
    global db_manager
    if db_manager is None:
        return None
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM kg_entities WHERE id = ?", [entity_id])
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except:
        return None


def hybrid_search(query: str, limit: int = 5) -> Tuple[List[KGEntity], str]:
    """
    混合搜索：知识图谱 + 知识卡片
    返回：(实体列表, 上下文描述)
    """
    entities = search_entities(query, limit)
    
    # 构建上下文
    context_parts = []
    for e in entities[:3]:
        ctx = f"【{e.entity_type}】{e.name}"
        if e.description:
            ctx += f": {e.description[:80]}"
        context_parts.append(ctx)
    
    context = "\n".join(context_parts)
    return entities, context


def _extract_keywords(query: str) -> List[str]:
    """提取关键词"""
    stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '上', '也', 
              '很', '到', '说', '要', '去', '你', '会', '看', '好', '这', '那', '什么', '怎么', 
              '如何', '为什么', '哪', '吗', '呢', '吧', '啊', '请', '能', '可以', '帮', '想', '知道'}
    
    keywords = []
    chinese_chars = re.findall(r'[\u4e00-\u9fff]+', query)
    for segment in chinese_chars:
        filtered = ''.join(c for c in segment if c not in stop_words)
        if len(filtered) >= 2:
            keywords.append(filtered)
            if len(filtered) >= 4:
                for i in range(len(filtered) - 1):
                    bigram = filtered[i:i+2]
                    if bigram not in keywords:
                        keywords.append(bigram)
    
    return keywords[:6]