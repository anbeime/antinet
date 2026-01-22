"""
修改config.json的branches配置，避免context index 2错误
"""
import json
import os
import sys

def patch_config():
    config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
    backup_path = config_path + ".backup"
    
    if not os.path.exists(config_path):
        print(f"配置文件不存在: {config_path}")
        return False
    
    # 读取配置
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 保存备份
    if not os.path.exists(backup_path):
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        print(f"备份已创建: {backup_path}")
    
    # 修改branches
    original_branches = config['dialog']['ssd-q1']['branches']
    print(f"原始branches: {original_branches}")
    
    # 改为[2, 1] - 两个分支，避免索引2
    new_branches = [2, 1]
    config['dialog']['ssd-q1']['branches'] = new_branches
    
    # 写回文件
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
    
    print(f"修改完成: branches改为{new_branches}")
    print("注意：此修改可能需要重启后端服务才能生效")
    return True

def restore_config():
    config_path = r"C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json"
    backup_path = config_path + ".backup"
    
    if not os.path.exists(backup_path):
        print(f"备份文件不存在: {backup_path}")
        return False
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
    
    print("配置已恢复为原始版本")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--restore":
        restore_config()
    else:
        patch_config()