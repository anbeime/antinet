"""
任务提醒服务
使用 APScheduler 定时检查并触发提醒
"""
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "data" / "antinet.db"


class ReminderService:
    def __init__(self):
        self.scheduler = None
        self.sent_reminders = set()
        
    def start(self):
        """启动提醒服务"""
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from apscheduler.triggers.interval import IntervalTrigger
            
            self.scheduler = AsyncIOScheduler()
            self.scheduler.add_job(
                self.check_reminders,
                trigger=IntervalTrigger(hours=1),
                id='check_reminders',
                replace_existing=True
            )
            self.scheduler.start()
            logger.info("提醒服务已启动")
        except ImportError:
            logger.warning("APScheduler 未安装，提醒服务无法启动")
        except Exception as e:
            logger.error(f"启动提醒服务失败: {e}")
    
    def stop(self):
        """停止提醒服务"""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("提醒服务已停止")
    
    def check_reminders(self):
        """检查需要提醒的任务"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            now = datetime.now()
            
            cursor.execute("""
                SELECT id, title, description, remind_at, remind_before_minutes,
                       recurrence, due_date
                FROM gtd_tasks
                WHERE reminder_enabled = 1
                  AND is_completed = 0
                  AND remind_at IS NOT NULL
                  AND DATETIME(remind_at) >= DATETIME(?)
                  AND DATETIME(remind_at) <= DATETIME(?, '+5 minutes')
            """, (now.isoformat(), now.isoformat()))
            
            tasks = cursor.fetchall()
            
            for task in tasks:
                task_id = task["id"]
                remind_time = task["remind_at"][:16]
                reminder_key = f"{task_id}_{remind_time}"
                
                if reminder_key not in self.sent_reminders:
                    self.send_reminder({
                        "id": task_id,
                        "title": task["title"],
                        "description": task["description"],
                        "due_date": task["due_date"],
                        "remind_at": task["remind_at"]
                    })
                    self.sent_reminders.add(reminder_key)
                    logger.info(f"已发送提醒: {task['title']}")
            
            if len(self.sent_reminders) > 1000:
                self.sent_reminders.clear()
                
        except Exception as e:
            logger.error(f"检查提醒失败: {e}")
        finally:
            conn.close()
    
    def send_reminder(self, task: dict):
        """发送提醒通知"""
        logger.info(f"提醒任务: {task['title']} (到期: {task['due_date']})")
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reminder_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER,
                    title TEXT,
                    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'sent'
                )
            """)
            cursor.execute("""
                INSERT INTO reminder_logs (task_id, title, sent_at, status)
                VALUES (?, ?, datetime('now'), 'sent')
            """, (task["id"], task["title"]))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"记录提醒日志失败: {e}")


reminder_service = ReminderService()


def start_reminder_service():
    """启动服务"""
    reminder_service.start()


def stop_reminder_service():
    """停止服务"""
    reminder_service.stop()
