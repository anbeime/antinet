import sqlite3
import logging

logger = logging.getLogger(__name__)

ANTINET_DB = "./data/antinet.db"

def query_antinet_knowledge_cards(self, query=None, category=None, limit=10):
    """查询用户知识卡片"""
    try:
        conn = sqlite3.connect(self.antinet_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        sql = "SELECT * FROM knowledge_cards WHERE 1=1"
        params = []
        if query:
            sql += " AND (title LIKE ? OR content LIKE ?)"
            params.extend([f"%{query}%", f"%{query}%"])
        if category:
            sql += " AND category = ?"
            params.append(category)
        sql += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        results = [dict(row) for row in rows]
        logger.info(f"[MemoryAgent] Knowledge cards: {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"[MemoryAgent] Query knowledge cards failed: {e}")
        return []

def query_antinet_gtd_tasks(self, priority=None, limit=20):
    """查询用户GTD任务"""
    try:
        conn = sqlite3.connect(self.antinet_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        sql = "SELECT * FROM gtd_tasks WHERE 1=1"
        params = []
        if priority:
            sql += " AND priority = ?"
            params.append(priority)
        sql += " ORDER BY due_date ASC LIMIT ?"
        params.append(limit)
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        results = [dict(row) for row in rows]
        logger.info(f"[MemoryAgent] GTD tasks: {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"[MemoryAgent] Query GTD tasks failed: {e}")
        return []

def get_antinet_stats(self):
    """获取用户数据库统计信息"""
    try:
        conn = sqlite3.connect(self.antinet_db_path)
        cursor = conn.cursor()
        stats = {}
        cursor.execute("SELECT COUNT(*) FROM knowledge_cards")
        stats['knowledge_cards_count'] = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM gtd_tasks")
        stats['gtd_tasks_count'] = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM knowledge_spaces")
        stats['spaces_count'] = cursor.fetchone()[0]
        conn.close()
        return stats
    except Exception as e:
        logger.error(f"[MemoryAgent] Get stats failed: {e}")
        return {}

def enrich_context_with_user_data(self, query):
    """使用用户数据库数据丰富对话上下文"""
    try:
        context = {"query": query, "knowledge_cards": [], "gtd_tasks": [], "stats": {}, "has_data": False}
        cards = self.query_antinet_knowledge_cards(query=query, limit=5)
        if cards:
            context["knowledge_cards"] = cards
            context["has_data"] = True
        task_keywords = ["任务", "todo", "待办", "计划", "截止", "deadline", "priority", "优先级"]
        if any(kw in query.lower() for kw in task_keywords):
            tasks = self.query_antinet_gtd_tasks(limit=10)
            if tasks:
                context["gtd_tasks"] = tasks
                context["has_data"] = True
        context["stats"] = self.get_antinet_stats()
        return context
    except Exception as e:
        logger.error(f"[ContextEnrich] Failed: {e}")
        return {"query": query, "has_data": False}

def format_user_data_for_prompt(self, context):
    """将用户数据格式化为AI提示词"""
    if not context.get("has_data"):
        return ""
    parts = []
    if context.get("knowledge_cards"):
        parts.append("## 用户知识库相关资料")
        for i, card in enumerate(context["knowledge_cards"][:3], 1):
            title = card.get("title", "无标题")
            content = card.get("content", "")[:200]
            category = card.get("category", "未分类")
            parts.append(f"{i}. [{category}] {title}: {content}...")
        parts.append("")
    if context.get("gtd_tasks"):
        parts.append("## 用户待办任务")
        for i, task in enumerate(context["gtd_tasks"][:5], 1):
            title = task.get("title", "无标题")
            priority = task.get("priority", "normal")
            due = task.get("due_date", "无截止日期")
            parts.append(f"{i}. [{priority}] {title} (截止: {due})")
        parts.append("")
    parts.append("请基于以上用户数据回答问题。如果与问题无关，请正常回答。")
    return "\n".join(parts)


def patch_memory_agent(MemoryAgent):
    """将用户数据库查询技能注入到 MemoryAgent 类"""
    MemoryAgent.antinet_db_path = ANTINET_DB
    MemoryAgent.query_antinet_knowledge_cards = query_antinet_knowledge_cards
    MemoryAgent.query_antinet_gtd_tasks = query_antinet_gtd_tasks
    MemoryAgent.get_antinet_stats = get_antinet_stats
    MemoryAgent.enrich_context_with_user_data = enrich_context_with_user_data
    MemoryAgent.format_user_data_for_prompt = format_user_data_for_prompt
    logger.info("[MemoryAgent] User DB query skills patched successfully")
    return MemoryAgent
