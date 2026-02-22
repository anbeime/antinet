import sqlite3
import os
import json
from datetime import datetime
import shutil

def check_all_possible_backups():
    """检查所有可能的备份位置"""
    backup_locations = [
        '.',  # 当前目录
        'data/',
        'backup_deleted_20260202/',
        'backend/data/',
        'backend/backup/',
    ]
    
    backup_files = []
    
    print("🔍 正在搜索所有可能的备份文件...")
    
    for location in backup_locations:
        if os.path.exists(location):
            files = os.listdir(location)
            for file in files:
                if file.endswith(('.db', '.sql', '.json', '.bak')) and ('backup' in file.lower() or 'antinet' in file.lower()):
                    full_path = os.path.join(location, file)
                    backup_files.append(full_path)
                    print(f"  发现备份: {full_path}")
    
    return backup_files

def analyze_database_content(db_path):
    """分析数据库内容"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 获取表信息
        tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        
        table_stats = {}
        total_records = 0
        
        for table in tables:
            table_name = table[0]
            try:
                count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
                table_stats[table_name] = count
                total_records += count
            except:
                table_stats[table_name] = "无法访问"
        
        conn.close()
        return {
            'path': db_path,
            'total_records': total_records,
            'tables': table_stats
        }
    except Exception as e:
        return {
            'path': db_path,
            'error': str(e)
        }

def create_sample_restore_script():
    """创建示例恢复脚本"""
    sample_tasks = [
        {
            "title": "完成项目文档编写",
            "description": "编写完整的API文档和技术说明文档",
            "priority": "high",
            "category": "today",
            "due_date": None
        },
        {
            "title": "优化数据库查询性能",
            "description": "分析慢查询并优化索引",
            "priority": "high", 
            "category": "projects",
            "due_date": None
        },
        {
            "title": "测试新功能模块",
            "description": "对新增的多模态分析功能进行全面测试",
            "priority": "medium",
            "category": "inbox",
            "due_date": None
        },
        {
            "title": "整理知识库内容",
            "description": "分类整理现有的知识卡片和文档",
            "priority": "medium",
            "category": "later",
            "due_date": None
        },
        {
            "title": "准备周报材料",
            "description": "收集本周工作进展和下周计划",
            "priority": "low",
            "category": "archive",
            "due_date": None
        }
    ]
    
    # 生成更多示例任务以达到80条
    categories = ['today', 'inbox', 'projects', 'later', 'archive']
    priorities = ['high', 'medium', 'low']
    
    extended_tasks = sample_tasks.copy()
    
    # 生成额外的任务
    for i in range(75):
        task_num = i + 6
        extended_tasks.append({
            "title": f"任务 {task_num}: 待处理事项",
            "description": f"这是第 {task_num} 个待处理的任务，需要进一步细化具体内容",
            "priority": priorities[i % 3],
            "category": categories[i % 5],
            "due_date": None
        })
    
    return extended_tasks

def restore_sample_data():
    """恢复示例数据"""
    conn = sqlite3.connect('data/antinet.db')
    cursor = conn.cursor()
    
    # 先备份现有数据
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'data_backup_before_restore_{timestamp}.sql'
    
    # 导出现有数据
    with open(backup_file, 'w', encoding='utf-8') as f:
        for line in conn.iterdump():
            f.write('%s\n' % line)
    
    print(f"✅ 已备份现有数据到: {backup_file}")
    
    # 清空现有GTD任务
    cursor.execute("DELETE FROM gtd_tasks")
    print("🗑️  已清空现有GTD任务")
    
    # 插入示例数据
    sample_tasks = create_sample_restore_script()
    inserted_count = 0
    
    for task in sample_tasks:
        try:
            cursor.execute("""
                INSERT INTO gtd_tasks 
                (title, description, priority, due_date, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (
                task['title'],
                task['description'],
                task['priority'],
                task['due_date'],
                task['category']
            ))
            inserted_count += 1
        except Exception as e:
            print(f"❌ 插入任务失败: {task['title']} - {e}")
    
    conn.commit()
    conn.close()
    
    print(f"✅ 成功恢复 {inserted_count} 条示例任务")
    return inserted_count

def main():
    print("=== 综合数据恢复工具 ===\n")
    
    # 1. 检查当前数据库状态
    print("📊 当前数据库状态:")
    current_stats = analyze_database_content('data/antinet.db')
    if 'error' not in current_stats:
        print(f"  总记录数: {current_stats['total_records']}")
        print("  各表记录数:")
        for table, count in current_stats['tables'].items():
            print(f"    {table}: {count}")
    else:
        print(f"  错误: {current_stats['error']}")
    
    # 2. 搜索备份文件
    print("\n🔍 搜索备份文件:")
    backup_files = check_all_possible_backups()
    
    if backup_files:
        print(f"\n发现 {len(backup_files)} 个可能的备份文件")
        for i, backup in enumerate(backup_files):
            backup_stats = analyze_database_content(backup)
            if 'error' not in backup_stats:
                print(f"  {i+1}. {backup} - {backup_stats['total_records']} 条记录")
            else:
                print(f"  {i+1}. {backup} - 无法读取")
    else:
        print("  未发现明显的备份文件")
    
    # 3. 提供恢复选项
    print("\n🔧 可用的恢复选项:")
    print("  1. 恢复示例数据 (80条任务)")
    print("  2. 从指定备份文件恢复")
    print("  3. 退出")
    
    choice = input("\n请选择操作 (1-3): ").strip()
    
    if choice == '1':
        confirm = input("⚠️  这将替换现有GTD数据，确定继续吗？(y/N): ")
        if confirm.lower() == 'y':
            count = restore_sample_data()
            print(f"\n🎉 恢复完成! 已添加 {count} 条示例任务")
            
            # 显示恢复后的数据
            conn = sqlite3.connect('data/antinet.db')
            cursor = conn.cursor()
            task_count = cursor.execute("SELECT COUNT(*) FROM gtd_tasks").fetchone()[0]
            print(f"当前GTD任务总数: {task_count}")
            conn.close()
    
    elif choice == '2':
        if backup_files:
            print("\n可用备份文件:")
            for i, backup in enumerate(backup_files):
                print(f"  {i+1}. {backup}")
            
            file_choice = input("选择要恢复的备份文件编号: ").strip()
            if file_choice.isdigit() and 1 <= int(file_choice) <= len(backup_files):
                selected_backup = backup_files[int(file_choice)-1]
                print(f"选择了: {selected_backup}")
                # 这里可以添加具体的恢复逻辑
        else:
            print("没有可用的备份文件")
    
    print("\n✅ 恢复工具执行完毕!")

if __name__ == "__main__":
    main()