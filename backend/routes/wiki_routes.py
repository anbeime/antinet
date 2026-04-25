# ---------------------------------------------------------------------
# Knowledge Wiki API Routes - Karpathy LLM Wiki模式实现
# ---------------------------------------------------------------------
"""
基于Karpathy的LLM Wiki模式:
- purpose.md: 定义知识库目标
- schema.md: 定义知识库规范
- log.md: 操作记录
- auto-fix: 自动修复冲突
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/wiki", tags=["Knowledge Wiki"])

# 全局数据库管理器
db_manager = None

def set_db_manager(manager):
    global db_manager
    db_manager = manager


# ---------------------------------------------------------------------
# 数据模型
# ---------------------------------------------------------------------

class PurposeConfig(BaseModel):
    """知识库目标配置"""
    goal: str
    key_questions: List[str]
    scope: str
    thesis: Optional[str] = None


class LogEntry(BaseModel):
    """操作记录条目"""
    id: Optional[int]
    timestamp: str
    action: str
    target: str
    details: str


class ConflictFix(BaseModel):
    """冲突修复"""
    card_id: int
    fix_type: str  # "remove_duplicates", "update_conflict", "archive_stale"
    new_content: str


# ---------------------------------------------------------------------
# purpose.md 功能
# ---------------------------------------------------------------------

@router.get("/purpose")
async def get_purpose():
    """获取知识库目标配置"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT key, value FROM config 
            WHERE category = 'knowledge_purpose'
        """)
        
        purpose_data = {}
        for row in cursor.fetchall():
            purpose_data[row[0]] = row[1]
        
        conn.close()
        
        if not purpose_data:
            return {
                "goal": "",
                "key_questions": [],
                "scope": "",
                "thesis": None,
                "exists": False
            }
        
        return {
            "goal": purpose_data.get("goal", ""),
            "key_questions": purpose_data.get("key_questions", "").split("\n") if purpose_data.get("key_questions") else [],
            "scope": purpose_data.get("scope", ""),
            "thesis": purpose_data.get("thesis"),
            "exists": True
        }
        
    except Exception as e:
        logger.error(f"获取purpose失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/purpose")
async def set_purpose(
    goal: str = Form(""),
    key_questions: str = Form(""),
    scope: str = Form(""),
    thesis: str = Form("")
):
    """设置知识库目标配置"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 删除旧的配置
        cursor.execute("""
            DELETE FROM config WHERE category = 'knowledge_purpose'
        """)
        
        # 插入新配置
        configs = [
            ("knowledge_purpose", "goal", goal),
            ("knowledge_purpose", "key_questions", key_questions),
            ("knowledge_purpose", "scope", scope),
            ("knowledge_purpose", "thesis", thesis),
        ]
        
        for category, key, value in configs:
            cursor.execute("""
                INSERT INTO config (category, key, value) VALUES (?, ?, ?)
            """, [category, key, value])
        
        conn.commit()
        conn.close()
        
        logger.info("[Knowledge Wiki] purpose已更新")
        
        return {"success": True, "message": "知识库目标已更新"}
        
    except Exception as e:
        logger.error(f"设置purpose失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# log.md 功能
# ---------------------------------------------------------------------

@router.get("/log")
async def get_operation_log(
    action: Optional[str] = None,
    limit: int = 50
):
    """获取操作记录"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        if action:
            cursor.execute("""
                SELECT id, timestamp, action, target, details 
                FROM knowledge_log 
                WHERE action = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, [action, limit])
        else:
            cursor.execute("""
                SELECT id, timestamp, action, target, details 
                FROM knowledge_log 
                ORDER BY timestamp DESC
                LIMIT ?
            """, [limit])
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                "id": row[0],
                "timestamp": row[1],
                "action": row[2],
                "target": row[3],
                "details": row[4]
            })
        
        conn.close()
        return logs
        
    except Exception as e:
        logger.error(f"获取log失败: {e}")
        return []


def _add_log(action: str, target: str, details: str):
    """添加操作记录"""
    global db_manager
    if db_manager is None:
        return
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 创建表（如果不存在）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT,
                details TEXT
            )
        """)
        
        cursor.execute("""
            INSERT INTO knowledge_log (timestamp, action, target, details)
            VALUES (?, ?, ?, ?)
        """, [datetime.now().isoformat(), action, target, details])
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"添加log失败: {e}")


# ---------------------------------------------------------------------
# auto-fix 功能
# ---------------------------------------------------------------------

@router.get("/conflicts")
async def detect_conflicts():
    """���测��识库冲突"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        conflicts = []
        
        # 1. 检测重复卡片
        cursor.execute("""
            SELECT title, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
            FROM knowledge_cards
            WHERE title IS NOT NULL AND title != ''
            GROUP BY title
            HAVING cnt > 1
        """)
        
        for row in cursor.fetchall():
            conflicts.append({
                "type": "duplicate_title",
                "title": row[0],
                "count": row[1],
                "ids": [int(x) for x in row[2].split(",")]
            })
        
        # 2. 检测内容相似的卡片（简单比较）
        cursor.execute("""
            SELECT id, title, SUBSTR(content, 1, 100) as content_start
            FROM knowledge_cards
            WHERE content IS NOT NULL
        """)
        
        cards = {}
        for row in cursor.fetchall():
            if row[2]:
                key = row[2].strip()
                if key in cards:
                    conflicts.append({
                        "type": "similar_content",
                        "card_1": row[0],
                        "card_2": cards[key][0],
                        "title_1": row[1],
                        "title_2": cards[key][1]
                    })
                else:
                    cards[key] = (row[0], row[1])
        
        # 3. 检测孤立卡片（无关联）
        cursor.execute("""
            SELECT id, title
            FROM knowledge_cards
            WHERE (related_cards IS NULL OR related_cards = '' OR related_cards = '[]')
        """)
        
        orphans = []
        for row in cursor.fetchall():
            orphans.append({"id": row[0], "title": row[1]})
        
        if orphans:
            conflicts.append({
                "type": "orphan_cards",
                "cards": orphans[:10]  # 限制数量
            })
        
        conn.close()
        
        return {
            "conflicts": conflicts,
            "count": len(conflicts)
        }
        
    except Exception as e:
        logger.error(f"检测冲突失败: {e}")
        return {"conflicts": [], "count": 0, "error": str(e)}


@router.post("/auto-fix")
async def auto_fix_conflicts(
    fix_type: str = Form("all"),
    dry_run: bool = Form(True)
):
    """自动修复冲突
    
    Args:
        fix_type: "duplicates" | "orphans" | "all" | "none"
        dry_run: True=预览, False=执行
    """
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        fixes_applied = []
        
        if fix_type in ["duplicates", "all"]:
            # 合并重复标题的卡片
            cursor.execute("""
                SELECT title, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
                FROM knowledge_cards
                WHERE title IS NOT NULL AND title != ''
                GROUP BY title
                HAVING cnt > 1
            """)
            
            for row in cursor.fetchall():
                ids = [int(x) for x in row[1].split(",")]
                keep_id = ids[0]
                remove_ids = ids[1:]
                
                if dry_run:
                    fixes_applied.append({
                        "action": "merge_duplicates",
                        "title": row[0],
                        "keep_id": keep_id,
                        "remove_ids": remove_ids,
                        "would_apply": True
                    })
                else:
                    # 合并内容
                    cursor.execute("""
                        SELECT content FROM knowledge_cards WHERE id = ?
                    """, [keep_id])
                    kept_content = cursor.fetchone()[0] if cursor.fetchone() else ""
                    
                    for rid in remove_ids:
                        cursor.execute("""
                            SELECT content FROM knowledge_cards WHERE id = ?
                        """, [rid])
                        old_content = cursor.fetchone()[0] if cursor.fetchone() else ""
                        
                        if old_content and old_content not in kept_content:
                            kept_content += f"\n\n--- 合并自卡片{rid} ---\n{old_content}"
                        
                        cursor.execute("DELETE FROM knowledge_cards WHERE id = ?", [rid])
                    
                    cursor.execute("""
                        UPDATE knowledge_cards SET content = ?, updated_at = ?
                        WHERE id = ?
                    """, [kept_content, datetime.now().isoformat(), keep_id])
                    
                    fixes_applied.append({
                        "action": "merge_duplicates",
                        "title": row[0],
                        "applied": True
                    })
                    
                    _add_log("auto_fix", f"duplicate:{row[0]}", f"合并{len(remove_ids)}个重复卡片")
        
        if fix_type in ["orphans", "all"]:
            # 为孤立卡片添加建议
            cursor.execute("""
                SELECT id, title FROM knowledge_cards
                WHERE (related_cards IS NULL OR related_cards = '' OR related_cards = '[]')
                LIMIT 20
            """)
            
            orphan_ids = []
            for row in cursor.fetchall():
                orphan_ids.append(row[0])
                
                if not dry_run:
                    # 添加标记，提醒需要关联
                    cursor.execute("""
                        UPDATE knowledge_cards SET tags = COALESCE(tags, '') || ';needs_review'
                        WHERE id = ?
                    """, [row[0]])
                    
                    _add_log("auto_fix", f"orphan:{row[1]}", "标记为需要审查")
            
            if orphan_ids:
                fixes_applied.append({
                    "action": "flag_orphans",
                    "count": len(orphan_ids),
                    "applied": not dry_run
                })
        
        if not dry_run:
            conn.commit()
        
        conn.close()
        
        return {
            "success": True,
            "fixes_applied": fixes_applied,
            "count": len(fixes_applied),
            "dry_run": dry_run
        }
        
    except Exception as e:
        logger.error(f"自动修复失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# schema.md 功能
# ---------------------------------------------------------------------

@router.get("/schema")
async def get_schema():
    """获取知识库规范"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 获取卡片类型统计
        cursor.execute("""
            SELECT card_type, COUNT(*) as cnt
            FROM knowledge_cards
            WHERE card_type IS NOT NULL
            GROUP BY card_type
        """)
        
        types = {}
        for row in cursor.fetchall():
            types[row[0]] = row[1]
        
        # 获取分类统计
        cursor.execute("""
            SELECT category, COUNT(*) as cnt
            FROM knowledge_cards
            WHERE category IS NOT NULL
            GROUP BY category
        """)
        
        categories = {}
        for row in cursor.fetchall():
            categories[row[0]] = row[1]
        
        conn.close()
        
        return {
            "card_types": types,
            "categories": categories,
            "version": "1.0",
            "created": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"获取schema失败: {e}")
        return {"error": str(e)}


# ---------------------------------------------------------------------
# 统计 Dashboard
# ---------------------------------------------------------------------

@router.get("/wiki-stats")
async def get_wiki_stats():
    """获取Wiki统计"""
    global db_manager
    if db_manager is None:
        raise HTTPException(status_code=500, detail="数据库未初始化")
    
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # 总卡片数
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        total = cursor.fetchone()[0]
        
        # 本周新增
        week_ago = datetime.now().isoformat()[:7] + "-01"
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards WHERE created_at >= ?", [week_ago])
        this_week = cursor.fetchone()[0]
        
        # 有链接的卡片
        cursor.execute("""
            SELECT COUNT(*) FROM knowledge_cards
            WHERE related_cards IS NOT NULL AND related_cards != '' AND related_cards != '[]'
        """)
        with_links = cursor.fetchone()[0]
        
        # 日志条数
        cursor.execute("SELECT COUNT(*) FROM knowledge_log")
        log_count = cursor.fetchone()[0] if cursor.fetchone() else 0
        
        conn.close()
        
        return {
            "total_cards": total,
            "this_week": this_week,
            "with_links": with_links,
            "link_rate": round(with_links / total * 100, 1) if total > 0 else 0,
            "log_entries": log_count
        }
        
    except Exception as e:
        logger.error(f"获取统计失败: {e}")
        return {"error": str(e)}