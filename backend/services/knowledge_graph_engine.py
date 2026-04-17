"""
端侧知识图谱引擎
支持增量更新、冲突消解、版本管理和多模态知识表示
"""
import logging
import json
import sqlite3
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import hashlib
import re

logger = logging.getLogger(__name__)


class KnowledgeGraphEngine:
    """端侧知识图谱引擎"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_graph_tables()
    
    def _init_graph_tables(self):
        """初始化图谱相关表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 实体表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    description TEXT,
                    properties TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1
                )
            """)
            
            # 关系表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    relation_id TEXT UNIQUE NOT NULL,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    properties TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 向量索引表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT UNIQUE NOT NULL,
                    embedding BLOB NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 版本历史表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    properties TEXT,
                    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    change_type TEXT
                )
            """)
            
            # 权限表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kg_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_id TEXT NOT NULL,
                    permission_type TEXT NOT NULL,
                    principal TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    def get_connection(self) -> sqlite3.Connection:
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn
    
    def add_entity(self, name: str, entity_type: str, description: str = "", 
                   properties: Dict = None, confidence: float = 1.0) -> str:
        """添加实体"""
        entity_id = self._generate_entity_id(name, entity_type)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            properties_json = json.dumps(properties or {}, ensure_ascii=False)
            
            cursor.execute("""
                INSERT OR REPLACE INTO kg_entities 
                (entity_id, name, entity_type, description, properties, confidence, updated_at, version)
                VALUES (?, ?, ?, ?, ?, ?, ?, 
                    COALESCE((SELECT version FROM kg_entities WHERE entity_id = ?), 0) + 1)
            """, (entity_id, name, entity_type, description, properties_json, confidence, 
                  datetime.now().isoformat(), entity_id))
            
            conn.commit()
            
            # 记录版本历史
            cursor.execute("""
                INSERT INTO kg_versions (entity_id, version, name, entity_type, properties, change_type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (entity_id, 1, name, entity_type, properties_json, "created"))
            
            conn.commit()
        
        logger.info(f"[KG] 添加实体: {name} ({entity_type})")
        return entity_id
    
    def add_relation(self, source_name: str, target_name: str, 
                     relation_type: str, properties: Dict = None, 
                     confidence: float = 1.0) -> Optional[str]:
        """添加关系"""
        source_id = self._generate_entity_id(source_name, "unknown")
        target_id = self._generate_entity_id(target_name, "unknown")
        
        # 检查实体是否存在
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT entity_id FROM kg_entities WHERE entity_id = ?", (source_id,))
            if not cursor.fetchone():
                source_id = self.add_entity(source_name, "unknown")
            
            cursor.execute("SELECT entity_id FROM kg_entities WHERE entity_id = ?", (target_id,))
            if not cursor.fetchone():
                target_id = self.add_entity(target_name, "unknown")
        
        relation_id = self._generate_relation_id(source_id, target_id, relation_type)
        properties_json = json.dumps(properties or {}, ensure_ascii=False)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO kg_relations
                (relation_id, source_id, target_id, relation_type, properties, confidence, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (relation_id, source_id, target_id, relation_type, properties_json, confidence,
                  datetime.now().isoformat()))
            
            conn.commit()
        
        logger.info(f"[KG] 添加关系: {source_name} --[{relation_type}]--> {target_name}")
        return relation_id
    
    def query_entities(self, entity_type: str = None, keyword: str = None, 
                       limit: int = 100) -> List[Dict]:
        """查询实体"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM kg_entities WHERE 1=1"
            params = []
            
            if entity_type:
                query += " AND entity_type = ?"
                params.append(entity_type)
            
            if keyword:
                query += " AND (name LIKE ? OR description LIKE ?)"
                params.extend([f"%{keyword}%", f"%{keyword}%"])
            
            query += " LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    def query_relations(self, source_id: str = None, target_id: str = None,
                        relation_type: str = None, limit: int = 100) -> List[Dict]:
        """查询关系"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM kg_relations WHERE 1=1"
            params = []
            
            if source_id:
                query += " AND source_id = ?"
                params.append(source_id)
            
            if target_id:
                query += " AND target_id = ?"
                params.append(target_id)
            
            if relation_type:
                query += " AND relation_type = ?"
                params.append(relation_type)
            
            query += " LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    def get_neighbors(self, entity_id: str, depth: int = 1) -> Dict:
        """获取邻居实体"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            neighbors = []
            visited = set()
            queue = [(entity_id, 0)]
            visited.add(entity_id)
            
            while queue:
                current_id, current_depth = queue.pop(0)
                
                if current_depth >= depth:
                    continue
                
                # 查找出边
                cursor.execute("""
                    SELECT kr.*, ke.name as target_name, ke.entity_type as target_type
                    FROM kg_relations kr
                    JOIN kg_entities ke ON kr.target_id = ke.entity_id
                    WHERE kr.source_id = ?
                """, (current_id,))
                
                for row in cursor.fetchall():
                    neighbor = dict(row)
                    if neighbor['target_id'] not in visited:
                        neighbors.append(neighbor)
                        visited.add(neighbor['target_id'])
                        queue.append((neighbor['target_id'], current_depth + 1))
                
                # 查找入边
                cursor.execute("""
                    SELECT kr.*, ke.name as source_name, ke.entity_type as source_type
                    FROM kg_relations kr
                    JOIN kg_entities ke ON kr.source_id = ke.entity_id
                    WHERE kr.target_id = ?
                """, (current_id,))
                
                for row in cursor.fetchall():
                    neighbor = dict(row)
                    if neighbor['source_id'] not in visited:
                        neighbors.append(neighbor)
                        visited.add(neighbor['source_id'])
                        queue.append((neighbor['source_id'], current_depth + 1))
            
            return {
                "center": entity_id,
                "neighbors": neighbors,
                "total": len(neighbors)
            }
    
    def detect_conflicts(self) -> List[Dict]:
        """检测知识冲突"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            conflicts = []
            
            # 检测同名实体不同类型
            cursor.execute("""
                SELECT name, COUNT(DISTINCT entity_type) as type_count
                FROM kg_entities
                GROUP BY name
                HAVING type_count > 1
            """)
            
            for row in cursor.fetchall():
                conflicts.append({
                    "type": "type_conflict",
                    "entity_name": row[0],
                    "count": row[1],
                    "description": f"实体「{row[0]}」存在{row[1]}种不同类型"
                })
            
            # 检测高置信度与低置信度冲突
            cursor.execute("""
                SELECT e1.name, e1.confidence as conf1, e2.confidence as conf2
                FROM kg_entities e1
                JOIN kg_entities e2 ON e1.name = e2.name
                WHERE e1.confidence > 0.8 AND e2.confidence < 0.5
            """)
            
            for row in cursor.fetchall():
                conflicts.append({
                    "type": "confidence_conflict",
                    "entity_name": row[0],
                    "confidence_high": row[1],
                    "confidence_low": row[2],
                    "description": f"实体「{row[0]}」同时存在高置信度和低置信度版本"
                })
            
            return conflicts
    
    def get_entity_versions(self, entity_id: str) -> List[Dict]:
        """获取实体版本历史"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM kg_versions
                WHERE entity_id = ?
                ORDER BY version DESC
            """, (entity_id,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def set_permission(self, entity_id: str, permission_type: str, principal: str):
        """设置权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO kg_permissions
                (entity_id, permission_type, principal, created_at)
                VALUES (?, ?, ?, ?)
            """, (entity_id, permission_type, principal, datetime.now().isoformat()))
            
            conn.commit()
    
    def check_permission(self, entity_id: str, principal: str, required_permission: str) -> bool:
        """检查权限"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM kg_permissions
                WHERE entity_id = ? AND principal = ? AND permission_type = ?
            """, (entity_id, principal, required_permission))
            
            return cursor.fetchone() is not None
    
    def _generate_entity_id(self, name: str, entity_type: str) -> str:
        """生成实体ID"""
        raw = f"{name}:{entity_type}"
        return f"entity_{hashlib.md5(raw.encode()).hexdigest()[:16]}"
    
    def _generate_relation_id(self, source_id: str, target_id: str, relation_type: str) -> str:
        """生成关系ID"""
        raw = f"{source_id}:{target_id}:{relation_type}"
        return f"rel_{hashlib.md5(raw.encode()).hexdigest()[:16]}"
    
    def get_statistics(self) -> Dict:
        """获取图谱统计信息"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM kg_entities")
            entity_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM kg_relations")
            relation_count = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT entity_type, COUNT(*) as count
                FROM kg_entities
                GROUP BY entity_type
            """)
            type_dist = {row[0]: row[1] for row in cursor.fetchall()}
            
            cursor.execute("""
                SELECT relation_type, COUNT(*) as count
                FROM kg_relations
                GROUP BY relation_type
            """)
            rel_dist = {row[0]: row[1] for row in cursor.fetchall()}
            
            return {
                "entity_count": entity_count,
                "relation_count": relation_count,
                "entity_types": type_dist,
                "relation_types": rel_dist,
                "avg_degree": round(relation_count / entity_count, 2) if entity_count > 0 else 0
            }


class EntityExtractor:
    """实体抽取器 - 从文本中识别实体"""
    
    def __init__(self, kg_engine: KnowledgeGraphEngine):
        self.kg = kg_engine
    
    def extract_from_text(self, text: str) -> List[Dict]:
        """从文本中抽取实体"""
        entities = []
        
        # 时间实体
        time_patterns = [
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
            r'Q[1-4](?:\s*)?(\d{4})',
        ]
        
        for pattern in time_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                entities.append({
                    "name": match.group(),
                    "type": "time",
                    "span": (match.start(), match.end())
                })
        
        # 数字/指标实体
        number_pattern = r'(\d+(?:\.\d+)?)\s*(%|万元|元|人|次|个)'
        matches = re.finditer(number_pattern, text)
        for match in matches:
            entities.append({
                "name": match.group(),
                "type": "metric",
                "span": (match.start(), match.end())
            })
        
        # 项目/产品名（简单规则）
        project_keywords = ['项目', '产品', '系统', '平台', '服务']
        for keyword in project_keywords:
            pattern = rf'{keyword}[：:]\s*([^\n，,。.]+)'
            matches = re.finditer(pattern, text)
            for match in matches:
                entities.append({
                    "name": match.group(1).strip(),
                    "type": "project",
                    "span": (match.start(), match.end())
                })
        
        return entities
    
    def extract_relations(self, text: str, entities: List[Dict]) -> List[Tuple]:
        """抽取实体间关系"""
        relations = []
        
        # 因果关系
        cause_patterns = [
            r'(.+)导致(.+)',
            r'(.+)引起(.+)',
            r'(.+)造成(.+)',
            r'(.+)影响(.+)',
        ]
        
        for pattern in cause_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                relations.append((match.group(1).strip(), match.group(2).strip(), "causes"))
        
        # 包含关系
        contain_patterns = [
            r'(.+)包含(.+)',
            r'(.+)包括(.+)',
            r'(.+)属于(.+)',
        ]
        
        for pattern in contain_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                relations.append((match.group(1).strip(), match.group(2).strip(), "contains"))
        
        return relations
    
    def build_graph_from_document(self, doc_id: str, content: str) -> Dict:
        """从文档构建图谱"""
        entities = self.extract_from_text(content)
        relations = self.extract_relations(content, entities)
        
        added_entities = {}
        for entity in entities:
            entity_id = self.kg.add_entity(
                name=entity["name"],
                entity_type=entity["type"],
                description=f"从文档{doc_id}抽取",
                properties={"source_doc": doc_id, "span": str(entity["span"])}
            )
            added_entities[entity["name"]] = entity_id
        
        for source, target, rel_type in relations:
            self.kg.add_relation(
                source_name=source,
                target_name=target,
                relation_type=rel_type,
                properties={"source_doc": doc_id}
            )
        
        return {
            "entities_added": len(entities),
            "relations_added": len(relations)
        }