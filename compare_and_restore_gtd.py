import sqlite3
import json
from datetime import datetime

def compare_databases():
    """比较两个数据库中的GTD任务"""
    # 主数据库
    main_conn = sqlite3.connect('data/antinet.db')
    main_cursor = main_conn.cursor()
    
    # Backend数据库
    backend_conn = sqlite3.connect('backend/data/antinet.db')
    backend_cursor = backend_conn.cursor()
    
    print("=== 数据库对比分析 ===\n")
    
    # 获取主数据库任务
    main_tasks = main_cursor.execute("""
        SELECT id, title, description, priority, category, created_at 
        FROM gtd_tasks 
        ORDER BY id
    """).fetchall()
    
    # 获取backend数据库任务
    backend_tasks = backend_cursor.execute("""
        SELECT id, title, description, priority, category, created_at 
        FROM gtd_tasks 
        ORDER BY id
    """).fetchall()
    
    print(f"主数据库GTD任务数: {len(main_tasks)}")
    print(f"Backend数据库GTD任务数: {len(backend_tasks)}")
    
    # 找出差异
    main_titles = {task[1] for task in main_tasks}
    backend_titles = {task[1] for task in backend_tasks}
    
    missing_in_main = backend_titles - main_titles
    extra_in_main = main_titles - backend_titles
    
    print(f"\n📊 对比结果:")
    print(f"  Backend中有但主数据库缺少的任务: {len(missing_in_main)}")
    print(f"  主数据库中有但Backend中缺少的任务: {len(extra_in_main)}")
    
    if missing_in_main:
        print(f"\n📋 Backend中缺失的任务:")
        for title in missing_in_main:
            task_info = backend_cursor.execute(
                "SELECT * FROM gtd_tasks WHERE title = ?", (title,)
            ).fetchone()
            if task_info:
                print(f"  - {title}")
                print(f"    优先级: {task_info[3]}, 分类: {task_info[5]}")
                print(f"    创建时间: {task_info[6]}")
                print()
    
    main_conn.close()
    backend_conn.close()
    
    return missing_in_main

def restore_missing_tasks():
    """恢复缺失的任务"""
    # 先备份当前主数据库
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'data/antinet_backup_{timestamp}.db'
    shutil.copy2('data/antinet.db', backup_path)
    print(f"✅ 已备份主数据库到: {backup_path}")
    
    # 连接两个数据库
    main_conn = sqlite3.connect('data/antinet.db')
    main_cursor = main_conn.cursor()
    
    backend_conn = sqlite3.connect('backend/data/antinet.db')
    backend_cursor = backend_conn.cursor()
    
    # 获取所有backend中的任务
    backend_tasks = backend_cursor.execute("""
        SELECT title, description, priority, due_date, category, created_at, updated_at
        FROM gtd_tasks
        ORDER BY id
    """).fetchall()
    
    restored_count = 0
    skipped_count = 0
    
    print(f"\n🔄 开始恢复 {len(backend_tasks)} 条任务...")
    
    for task in backend_tasks:
        title, description, priority, due_date, category, created_at, updated_at = task
        
        # 检查是否已存在
        exists = main_cursor.execute(
            "SELECT COUNT(*) FROM gtd_tasks WHERE title = ? AND created_at = ?",
            (title, created_at)
        ).fetchone()[0]
        
        if exists:
            skipped_count += 1
            print(f"  ⏭️  跳过(已存在): {title}")
        else:
            try:
                main_cursor.execute("""
                    INSERT INTO gtd_tasks 
                    (title, description, priority, due_date, category, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (title, description, priority, due_date, category, created_at, updated_at))
                restored_count += 1
                print(f"  ✅ 恢复: {title}")
            except Exception as e:
                print(f"  ❌ 失败: {title} - {e}")
    
    main_conn.commit()
    
    # 验证结果
    final_count = main_cursor.execute("SELECT COUNT(*) FROM gtd_tasks").fetchone()[0]
    
    print(f"\n📊 恢复完成:")
    print(f"  ✅ 新增任务: {restored_count}")
    print(f"  ⏭️  跳过任务: {skipped_count}")
    print(f"  📈 最终总数: {final_count}")
    
    main_conn.close()
    backend_conn.close()
    
    return restored_count

if __name__ == "__main__":
    import shutil
    
    print("=== GTD任务对比与恢复工具 ===\n")
    
    # 比较数据库
    missing_tasks = compare_databases()
    
    if missing_tasks:
        print(f"\n🎯 发现 {len(missing_tasks)} 条可能缺失的任务!")
        confirm = input("\n是否开始恢复这些任务？(y/N): ")
        if confirm.lower() == 'y':
            restored = restore_missing_tasks()
            if restored > 0:
                print(f"\n🎉 成功恢复 {restored} 条任务!")
            else:
                print("\nℹ️  没有新任务需要恢复")
        else:
            print("已取消恢复操作")
    else:
        print("\n✅ 两个数据库中的任务一致，无需恢复")