"""
为 GTD 系统添加示例任务数据
"""
import sys
import os

# 添加 backend 目录到路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import DatabaseManager
from pathlib import Path

def add_sample_gtd_tasks():
    """添加示例 GTD 任务"""
    
    # 初始化数据库
    db_path = Path(__file__).parent / "data" / "antinet.db"
    db = DatabaseManager(str(db_path))
    
    # 示例任务
    sample_tasks = [
        {
            "title": "完成 PDF 功能测试",
            "description": "测试 PDF 上传、文本提取、知识卡片生成和导出功能",
            "category": "today",
            "priority": "high"
        },
        {
            "title": "修复前端空白页面",
            "description": "检查并修复概览、数据分析等页面的显示问题",
            "category": "today",
            "priority": "high"
        },
        {
            "title": "优化 NPU 性能",
            "description": "调整 NPU 配置，提升推理速度",
            "category": "later",
            "priority": "medium"
        },
        {
            "title": "编写用户文档",
            "description": "为 Antinet 编写详细的用户使用文档",
            "category": "projects",
            "priority": "medium"
        },
        {
            "title": "准备演示材料",
            "description": "准备项目演示的 PPT 和演讲稿",
            "category": "today",
            "priority": "high"
        },
        {
            "title": "测试 8-Agent 系统",
            "description": "验证 8-Agent 协作系统的功能",
            "category": "later",
            "priority": "low"
        },
        {
            "title": "已完成的示例任务",
            "description": "这是一个已完成的示例任务",
            "category": "archive",
            "priority": "low"
        }
    ]
    
    print("=" * 60)
    print("添加 GTD 示例任务")
    print("=" * 60)
    print()
    
    # 检查是否已有任务
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM gtd_tasks")
    count = cursor.fetchone()[0]
    
    if count > 0:
        print(f"⚠ 数据库中已有 {count} 个任务")
        response = input("是否清空并重新添加示例任务？(y/n): ")
        if response.lower() != 'y':
            print("取消操作")
            conn.close()
            return
        
        # 清空现有任务
        cursor.execute("DELETE FROM gtd_tasks")
        conn.commit()
        print("✓ 已清空现有任务")
        print()
    
    # 添加示例任务
    for i, task in enumerate(sample_tasks, 1):
        cursor.execute("""
            INSERT INTO gtd_tasks (title, description, category, priority, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (
            task["title"],
            task["description"],
            task["category"],
            task["priority"]
        ))
        print(f"[{i}/{len(sample_tasks)}] ✓ 添加任务: {task['title']}")
    
    conn.commit()
    
    print()
    print("=" * 60)
    print(f"✓ 成功添加 {len(sample_tasks)} 个示例任务")
    print("=" * 60)
    print()
    print("任务分类统计:")
    
    # 统计各类别任务数
    for category in ['inbox', 'today', 'later', 'archive', 'projects']:
        cursor.execute("SELECT COUNT(*) FROM gtd_tasks WHERE category = ?", (category,))
        count = cursor.fetchone()[0]
        category_names = {
            'inbox': '收件箱',
            'today': '今天',
            'later': '稍后',
            'archive': '归档',
            'projects': '项目'
        }
        print(f"  {category_names[category]}: {count} 个")
    
    conn.close()
    
    print()
    print("现在可以在前端 GTD 系统中查看这些任务了！")

if __name__ == "__main__":
    add_sample_gtd_tasks()
