# MemoryAgent 扩展方法 - 用户数据库查询技能
# 将这些方法添加到 MemoryAgent 类中

    # ========== 用户数据库查询技能 (antinet.db) ==========
    
    def query_antinet_knowledge_cards(self, query: str = None, category: str = None, limit: int = 10) -> list:
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
            logger.info(f"[MemoryAgent] Knowledge cards query: {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"[MemoryAgent] Query knowledge cards failed: {e}")
            return []
    
    def query_antinet_gtd_tasks(self, priority: str = None, limit: int = 20) -> list:
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
            
            sql += " ORDER BY due_date ASC, priority DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()
            
            results = [dict(row) for row in rows]
            logger.info(f"[MemoryAgent] GTD tasks query: {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"[MemoryAgent] Query GTD tasks failed: {e}")
            return []
    
    def get_antinet_stats(self) -> dict:
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
            logger.info(f"[MemoryAgent] User DB stats: {stats}")
            return stats
        except Exception as e:
            logger.error(f"[MemoryAgent] Get stats failed: {e}")
            return {}
    
    def enrich_context_with_user_data(self, query: str) -> dict:
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
            return {"query": query, "has_data": False, "error": str(e)}
    
    def format_user_data_for_prompt(self, context: dict) -> str:
        """将用户数据格式化为AI提示词"""
        if not context.get("has_data"):
            return ""
        
        prompt_parts = []
        
        if context.get("knowledge_cards"):
            prompt_parts.append("## User Knowledge Base")
            for i, card in enumerate(context["knowledge_cards"][:3], 1):
                title = card.get("title", "No title")
                content = card.get("content", "")[:200]
                category = card.get("category", "Uncategorized")
                prompt_parts.append(f"{i}. [{category}] {title}: {content}...")
            prompt_parts.append("")
        
        if context.get("gtd_tasks"):
            prompt_parts.append("## User Tasks")
            for i, task in enumerate(context["gtd_tasks"][:5], 1):
                title = task.get("title", "No title")
                priority = task.get("priority", "normal")
                due = task.get("due_date", "No deadline")
                prompt_parts.append(f"{i}. [{priority}] {title} (Due: {due})")
            prompt_parts.append("")
        
        prompt_parts.append("Please answer based on the above user data. If unrelated, answer normally.")
        return "\n".join(prompt_parts)
