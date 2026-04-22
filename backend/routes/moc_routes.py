#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOC (Multi-dimension Organized Collection) 多维动态筛选路由
支持多维度筛选、动态分类、智能排序
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/moc", tags=["MOC多维动态筛选"])

DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"


def get_db():
    import sqlite3
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


class MOCFilter(BaseModel):
    """MOC筛选条件"""
    colors: List[str] = Field(default_factory=list)  # ["blue", "green", "yellow", "red"]
    time_range: Optional[str] = None  # "today", "week", "month", "year"
    keywords: List[str] = Field(default_factory=list)
    has_relations: Optional[bool] = None
    tags: List[str] = Field(default_factory=list)
    sort_by: str = "created_at"  # "created_at", "updated_at", "similarity", "title"
    sort_order: str = "desc"  # "asc", "desc"
    limit: int = 100


class MOCResult(BaseModel):
    """MOC筛选结果"""
    cards: List[Dict[str, Any]]
    total: int
    stats: Dict[str, Any]
    facets: Dict[str, Any]  # 分面统计


@router.post("/search", response_model=MOCResult)
async def moc_search(filter: MOCFilter):
    """MOC多维动态筛选"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # 构建 WHERE 条件
        conditions = []
        params = []
        
        # 颜色筛选
        if filter.colors:
            placeholders = ','.join(['?'] * len(filter.colors))
            conditions.append(f"card_type IN ({placeholders})")
            params.extend(filter.colors)
        
        # 时间范围
        if filter.time_range:
            now = datetime.now()
            if filter.time_range == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif filter.time_range == "week":
                start = now - timedelta(days=now.weekday())
                start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            elif filter.time_range == "month":
                start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif filter.time_range == "year":
                start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                start = None
            
            if start:
                conditions.append("created_at >= ?")
                params.append(start.isoformat())
        
        # 关键词
        if filter.keywords:
            keyword_conditions = []
            for kw in filter.keywords:
                keyword_conditions.append("(title LIKE ? OR content LIKE ?)")
                params.extend([f"%{kw}%", f"%{kw}%"])
            conditions.append(f"({' OR '.join(keyword_conditions)})")
        
        # 有关联卡片
        if filter.has_relations is not None:
            if filter.has_relations:
                conditions.append("related_cards IS NOT NULL AND related_cards != ''")
            else:
                conditions.append("(related_cards IS NULL OR related_cards = '')")
        
        # 构建 SQL
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # 排序
        order_col = filter.sort_by if filter.sort_by in ["created_at", "updated_at", "similarity", "title"] else "created_at"
        order = "DESC" if filter.sort_order == "desc" else "ASC"
        
        # 查询卡片
        sql = f"""
            SELECT id, title, content, COALESCE(card_type, 'blue') as card_type, 
                   COALESCE(category, '事实') as category,
                   COALESCE(similarity, 0.5) as similarity,
                   COALESCE(related_cards, '') as related_cards,
                   created_at, updated_at
            FROM knowledge_cards
            WHERE {where_clause}
            ORDER BY {order_col} {order}
            LIMIT ?
        """
        params.append(filter.limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        cards = []
        for row in rows:
            cards.append({
                "id": row["id"],
                "title": row["title"],
                "content": row["content"],
                "type": row["card_type"],
                "category": row["category"],
                "similarity": row["similarity"],
                "related_cards": row["related_cards"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
        
        # 统计
        total = len(cards)
        
        # 分面统计
        color_stats = defaultdict(int)
        category_stats = defaultdict(int)
        
        for card in cards:
            color_stats[card["type"]] += 1
            category_stats[card["category"]] += 1
        
        stats = {
            "total": total,
            "by_color": dict(color_stats),
            "by_category": dict(category_stats)
        }
        
        facets = {
            "colors": [
                {"value": "blue", "count": color_stats.get("blue", 0), "label": "事实"},
                {"value": "green", "count": color_stats.get("green", 0), "label": "解释"},
                {"value": "yellow", "count": color_stats.get("yellow", 0), "label": "风险"},
                {"value": "red", "count": color_stats.get("red", 0), "label": "行动"}
            ],
            "time_ranges": [
                {"value": "today", "label": "今天"},
                {"value": "week", "label": "本周"},
                {"value": "month", "label": "本月"},
                {"value": "year", "label": "今年"}
            ]
        }
        
        return MOCResult(
            cards=cards,
            total=total,
            stats=stats,
            facets=facets
        )
        
    except Exception as e:
        logger.error(f"MOC搜索失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/facets")
async def get_moc_facets():
    """获取MOC分面数据"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        facets = {}
        
        # 颜色分布
        cursor.execute("""
            SELECT COALESCE(card_type, 'blue') as color, COUNT(*) as count
            FROM knowledge_cards
            GROUP BY COALESCE(card_type, 'blue')
        """)
        facets["colors"] = [{"value": r[0], "count": r[1]} for r in cursor.fetchall()]
        
        # 分类分布
        cursor.execute("""
            SELECT COALESCE(category, '事实') as cat, COUNT(*) as count
            FROM knowledge_cards
            GROUP BY COALESCE(category, '事实')
        """)
        facets["categories"] = [{"value": r[0], "count": r[1]} for r in cursor.fetchall()]
        
        # 时间分布
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= ?", [today.isoformat()])
        today_count = cursor.fetchone()[0]
        
        week_ago = now - timedelta(days=now.weekday())
        week_start = week_ago.replace(hour=0, minute=0, second=0, microsecond=0)
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= ?", [week_start.isoformat()])
        week_count = cursor.fetchone()[0]
        
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= ?", [month_start.isoformat()])
        month_count = cursor.fetchone()[0]
        
        facets["time_ranges"] = [
            {"value": "today", "count": today_count},
            {"value": "week", "count": week_count},
            {"value": "month", "count": month_count}
        ]
        
        # 关联统计
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE related_cards IS NOT NULL AND related_cards != ''")
        with_relations = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total_cards = cursor.fetchone()[0]
        
        facets["relations"] = [
            {"value": True, "count": with_relations, "label": "有关联"},
            {"value": False, "count": total_cards - with_relations, "label": "无关联"}
        ]
        
        return {"success": True, "facets": facets}
        
    except Exception as e:
        logger.error(f"获取分面失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/health")
async def moc_health():
    """MOC健康检查"""
    return {"status": "ok", "service": "MOC"}