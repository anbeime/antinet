"""
任务提醒服务 - 修复版
使用 APScheduler 定时检查并触发提醒
修复：每分钟检查，查找最近5分钟内的提醒
新增：使用 edge-tts 语音合成（与聊天机器人同音色：晓晓女声）
"""

import sqlite3
import logging
import asyncio
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from paths import DB_PATH

logger = logging.getLogger(__name__)

# 与聊天机器人相同的语音设置
REMINDER_TTS_VOICE = "zh-CN-XiaoxiaoNeural"  # 晓晓女声
REMINDER_TTS_RATE = "+0%"  # 语速
REMINDER_TTS_VOLUME = "+0%"  # 音量


def _play_audio_file(audio_path: str):
    """播放音频文件（使用 Windows 原生方式，支持 mp3）"""
    try:
        # 尝试用 playsound（最简单，支持 mp3）
        try:
            from playsound import playsound
            playsound(audio_path)
            logger.info(f"[Reminder] 音频播放完成: {audio_path}")
            return
        except ImportError:
            pass
        
        # playsound 未安装，尝试用 pygame
        try:
            import pygame
            pygame.mixer.init()
            pygame.mixer.music.load(audio_path)
            pygame.mixer.music.play()
            import time
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
            logger.info(f"[Reminder] 音频播放完成: {audio_path}")
            return
        except ImportError:
            pass
        
        # 最后尝试用 Windows Media Player
        import subprocess
        subprocess.Popen(["start", "", audio_path], shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info(f"[Reminder] 已用系统默认播放器打开音频: {audio_path}")
    except Exception as e:
        logger.warning(f"[Reminder] 音频播放失败: {e}")


async def _generate_reminder_audio(text: str) -> Optional[str]:
    """生成提醒语音音频文件（使用 edge-tts，与聊天机器人同音色）"""
    try:
        from edge_tts import Communicate
    except ImportError:
        logger.warning("[Reminder] edge-tts 未安装，无法生成语音提醒")
        return None

    try:
        temp_dir = Path(__file__).parent.parent.parent / "data" / "reminder_audio"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"reminder_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        output_path = str(temp_dir / filename)
        
        communicate = Communicate(text, REMINDER_TTS_VOICE)
        await communicate.save(output_path)
        logger.info(f"[Reminder] 生成提醒语音: {output_path}")
        return output_path
    except Exception as e:
        logger.warning(f"[Reminder] 生成语音失败: {e}")
        return None


def send_windows_notification(title: str, message: str):
    """发送 Windows Toast 通知"""
    try:
        from win10toast_click import ToastNotifier
        import threading
        
        def show_toast():
            toaster = ToastNotifier()
            toaster.show_toast(
                title=title,
                msg=message,
                duration=10,
                threaded=False
            )
        
        thread = threading.Thread(target=show_toast, daemon=True)
        thread.start()
        logger.info(f"已发送 Windows 通知: {title}")
    except Exception as e:
        logger.warning(f"无法发送 Windows 通知: {e}")


class ReminderService:
    def __init__(self):
        self.scheduler = None
        self.sent_reminders = set()  # 已发送的提醒 (task_id + remind_time)
        self._check_interval_minutes = 1440  # 每天检查一次 (1440分钟 = 24小时)
        self._load_sent_reminders()  # 从数据库加载已发送的提醒
    
    def start(self):
        """启动提醒服务"""
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from apscheduler.triggers.interval import IntervalTrigger
            
            self.scheduler = AsyncIOScheduler()
            
            # 每天检查一次（而不是每分钟）
            self.scheduler.add_job(
                self.check_reminders,
                trigger=IntervalTrigger(minutes=self._check_interval_minutes),
                id='check_reminders',
                replace_existing=True,
                max_instances=1,  # 防止重复执行
            )
            
            self.scheduler.start()
            logger.info(f"[Reminder] 提醒服务已启动 (检查间隔: {self._check_interval_minutes}分钟)")
        except ImportError:
            logger.warning("[Reminder] APScheduler 未安装，提醒服务无法启动")
        except Exception as e:
            logger.error(f"[Reminder] 启动提醒服务失败: {e}")
    
    def stop(self):
        """停止提醒服务"""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("[Reminder] 提醒服务已停止")
    
    def _load_sent_reminders(self):
        """从数据库加载已发送的提醒记录"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sent_reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER,
                    remind_time TEXT,
                    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(task_id, remind_time)
                )
            """)
            cursor.execute("SELECT task_id, remind_time FROM sent_reminders")
            rows = cursor.fetchall()
            for row in rows:
                reminder_key = f"{row[0]}_{row[1][:16]}"
                self.sent_reminders.add(reminder_key)
            conn.close()
            logger.info(f"[Reminder] 已从数据库加载 {len(self.sent_reminders)} 条已发送提醒记录")
        except Exception as e:
            logger.warning(f"[Reminder] 加载已发送提醒记录失败: {e}")
    
    def _save_sent_reminder(self, task_id: int, remind_time: str):
        """保存已发送的提醒到数据库"""
        try:
            # 标准化 remind_time 到分钟精度
            if len(remind_time) > 16:
                remind_time = remind_time[:16]
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO sent_reminders (task_id, remind_time)
                VALUES (?, ?)
            """, (task_id, remind_time))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"[Reminder] 保存已发送提醒记录失败: {e}")
    
    def check_reminders(self):
        """检查需要提醒的任务 - 每分钟执行"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            now = datetime.now()
            # 查找当前时间之前1分钟到未来5分钟内的提醒
            # 这样可以捕获所有应该触发的提醒，而不仅仅是狭窄窗口内的
            check_window = now + timedelta(minutes=5)
            
            cursor.execute("""
                SELECT id, title, description, remind_at, remind_before_minutes,
                       recurrence, due_date
                FROM gtd_tasks
                WHERE reminder_enabled = 1
                  AND is_completed = 0
                  AND remind_at IS NOT NULL
                  AND DATETIME(remind_at) <= DATETIME(?)
                  AND DATETIME(remind_at) >= DATETIME(?, '-1 minute')
            """, (check_window.isoformat(), now.isoformat()))
            
            tasks = cursor.fetchall()
            found_count = 0
            
            for task in tasks:
                task_id = task["id"]
                # 标准化 remind_at 到分钟精度，避免格式不一致导致重复提醒
                remind_at = task["remind_at"]
                if len(remind_at) > 16:
                    remind_at = remind_at[:16]  # 去掉秒和更精确的时间
                remind_time = remind_at
                reminder_key = f"{task_id}_{remind_time}"
                
                # 避免重复发送
                if reminder_key not in self.sent_reminders:
                    self.send_reminder({
                        "id": task_id,
                        "title": task["title"],
                        "description": task["description"],
                        "due_date": task["due_date"],
                        "remind_at": task["remind_at"]
                    })
                    self.sent_reminders.add(reminder_key)
                    self._save_sent_reminder(task_id, task["remind_at"])
                    found_count += 1
                    logger.info(f"[Reminder] 已发送提醒: {task['title']} (提醒时间: {task['remind_at']})")
            
            if found_count > 0:
                logger.info(f"[Reminder] 本次检查发送了 {found_count} 个提醒")
            
            # 防止内存泄漏 - 清理过期的已发送记录（保留最近7天的）
            if len(self.sent_reminders) > 10000:
                try:
                    cursor.execute("""
                        DELETE FROM sent_reminders
                        WHERE sent_at < datetime('now', '-7 days')
                    """)
                    conn.commit()
                    logger.info("[Reminder] 已清理7天前的已发送提醒记录")
                except Exception as e:
                    logger.warning(f"[Reminder] 清理过期提醒记录失败: {e}")
                    
        except Exception as e:
            logger.error(f"[Reminder] 检查提醒失败: {e}")
        finally:
            conn.close()
    
    def send_reminder(self, task: dict):
        """发送提醒通知（包含语音播报，与聊天机器人同音色）"""
        title = f"📅 任务提醒: {task['title']}"
        message = f"到期时间: {task.get('due_date', '未设置')}"
        if task.get('description'):
            desc = task['description'][:100] if len(task['description']) > 100 else task['description']
            message += f"\n{desc}"
        
        logger.info(f"[Reminder] 提醒: {task['title']} (到期: {task['due_date']})")
        
        # 发送 Windows 通知
        send_windows_notification(title, message)
        
        # 生成并播放语音提醒（与聊天机器人同音色：晓晓女声）
        reminder_text = f"任务提醒：{task['title']}。{message}"
        threading.Thread(
            target=self._play_reminder_audio,
            args=(reminder_text,),
            daemon=True
        ).start()
        
        # 记录到数据库
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
            logger.error(f"[Reminder] 记录提醒日志失败: {e}")
    
    def _play_reminder_audio(self, text: str):
        """播放提醒语音（在后台线程中执行）"""
        try:
            # 异步生成音频
            audio_path = asyncio.run(_generate_reminder_audio(text))
            if audio_path:
                _play_audio_file(audio_path)
        except Exception as e:
            logger.warning(f"[Reminder] 语音提醒播放失败: {e}")
    
    def get_pending_reminders(self):
        """获取待提醒的任务（用于调试）"""
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            now = datetime.now()
            cursor.execute("""
                SELECT id, title, description, remind_at, due_date
                FROM gtd_tasks
                WHERE reminder_enabled = 1
                  AND is_completed = 0
                  AND remind_at IS NOT NULL
                  AND DATETIME(remind_at) > DATETIME(?)
                ORDER BY remind_at ASC
                LIMIT 20
            """, (now.isoformat(),))
            
            tasks = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return tasks
        except Exception as e:
            logger.error(f"[Reminder] 获取待提醒任务失败: {e}")
            return []
    
    def force_check(self):
        """强制执行一次检查（用于手动触发）"""
        logger.info("[Reminder] 强制执行提醒检查")
        self.check_reminders()


# 全局单例
_reminder_service: Optional[ReminderService] = None


def get_reminder_service() -> ReminderService:
    """获取提醒服务单例"""
    global _reminder_service
    if _reminder_service is None:
        _reminder_service = ReminderService()
    return _reminder_service


def start_reminder_service():
    """启动提醒服务"""
    service = get_reminder_service()
    service.start()


def stop_reminder_service():
    """停止提醒服务"""
    global _reminder_service
    if _reminder_service:
        _reminder_service.stop()
        _reminder_service = None
