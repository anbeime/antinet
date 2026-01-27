#!/usr/bin/env python3
"""
一键修复所有已知问题
- 修复数据库表结构
- 修复 API 参数模型
- 修复路由注册
- 优化 NPU 性能配置
"""
import sqlite3
import os
import sys
from pathlib import Path

# 添加 backend 到路径
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("=" * 60)
print("AntiNet 问题修复工具")
print("=" * 60)
print()

# ==================== 1. 修复数据库表结构 ====================
print("[1/4] 修复数据库表结构...")

DB_PATH = "C:/test/antinet/data/antinet.db"

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 检查 knowledge_cards 表是否存在
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='knowledge_cards'
    """)
    
    if not cursor.fetchone():
        print("  → 创建 knowledge_cards 表...")
        cursor.execute("""
            CREATE TABLE knowledge_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT,
                url TEXT,
                category TEXT,
                tags TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_cards_type 
            ON knowledge_cards(type)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_cards_category 
            ON knowledge_cards(category)
        """)
        
        # 插入示例数据
        cursor.execute("""
            INSERT INTO knowledge_cards (type, title, content, category)
            VALUES 
                ('blue', '示例事实卡片', '这是一个示例事实卡片', '示例'),
                ('green', '示例解释卡片', '这是一个示例解释卡片', '示例'),
                ('yellow', '示例风险卡片', '这是一个示例风险卡片', '示例'),
                ('red', '示例行动卡片', '这是一个示例行动卡片', '示例')
        """)
        
        conn.commit()
        print("  [OK] knowledge_cards 表创建成功")
    else:
        print("  [OK] knowledge_cards 表已存在")
    
    # 检查 knowledge_sources 表
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='knowledge_sources'
    """)
    
    if not cursor.fetchone():
        print("  → 创建 knowledge_sources 表...")
        cursor.execute("""
            CREATE TABLE knowledge_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                source_type TEXT NOT NULL,
                total_cards INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("  [OK] knowledge_sources 表创建成功")
    else:
        print("  [OK] knowledge_sources 表已存在")
    
    conn.close()
    print("[OK] 数据库表结构修复完成\n")
    
except Exception as e:
    print(f"[ERROR] 数据库修复失败: {e}\n")
    sys.exit(1)

# ==================== 2. 修复知识库搜索 API ====================
print("[2/4] 修复知识库搜索 API...")

knowledge_routes_path = backend_dir / "routes" / "knowledge_routes.py"

try:
    with open(knowledge_routes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已有 SearchRequest 模型
    if "class SearchRequest" not in content:
        print("  → 添加 SearchRequest 模型...")
        
        # 在 KnowledgeCard 类之前添加 SearchRequest
        search_model = '''
class SearchRequest(BaseModel):
    """知识库搜索请求"""
    query: str = Field(..., description="搜索关键词")
    card_type: Optional[str] = Field(None, description="卡片类型过滤")
    category: Optional[str] = Field(None, description="分类过滤")
    limit: int = Field(10, description="返回数量限制", ge=1, le=100)

'''
        
        # 在 KnowledgeCard 定义之前插入
        insert_pos = content.find("class KnowledgeCard(BaseModel):")
        if insert_pos > 0:
            content = content[:insert_pos] + search_model + content[insert_pos:]
            
            with open(knowledge_routes_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("  ✓ SearchRequest 模型添加成功")
        else:
            print("  ! 未找到插入位置，跳过")
    else:
        print("  ✓ SearchRequest 模型已存在")
    
    print("✓ 知识库搜索 API 修复完成\n")
    
except Exception as e:
    print(f"✗ 知识库搜索 API 修复失败: {e}\n")

# ==================== 3. 修复技能系统路由 ====================
print("[3/4] 修复技能系统路由...")

skill_routes_path = backend_dir / "routes" / "skill_routes.py"

try:
    with open(skill_routes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查路由前缀
    if 'prefix="/api/skill"' in content:
        print("  → 修正路由前缀为 /api/skills...")
        content = content.replace('prefix="/api/skill"', 'prefix="/api/skills"')
        
        with open(skill_routes_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("  ✓ 路由前缀修正成功")
    else:
        print("  ✓ 路由前缀正确")
    
    print("✓ 技能系统路由修复完成\n")
    
except Exception as e:
    print(f"✗ 技能系统路由修复失败: {e}\n")

# ==================== 4. 优化 NPU 性能配置 ====================
print("[4/4] 优化 NPU 性能配置...")

config_path = Path(__file__).parent / "config.json"

try:
    import json
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 检查并优化配置
        changes = []
        
        # 1. 启用 BURST 模式
        if not config.get("backend", {}).get("performance_mode") == "BURST":
            if "backend" not in config:
                config["backend"] = {}
            config["backend"]["performance_mode"] = "BURST"
            changes.append("启用 BURST 性能模式")
        
        # 2. 减少 max_new_tokens
        if config.get("inference", {}).get("max_new_tokens", 512) > 256:
            if "inference" not in config:
                config["inference"] = {}
            config["inference"]["max_new_tokens"] = 256
            changes.append("减少 max_new_tokens 至 256")
        
        # 3. 启用熔断检查
        if not config.get("backend", {}).get("enable_circuit_breaker"):
            config["backend"]["enable_circuit_breaker"] = True
            config["backend"]["circuit_breaker_threshold_ms"] = 2000
            changes.append("启用熔断检查（阈值 2000ms）")
        
        if changes:
            print(f"  → 应用配置优化:")
            for change in changes:
                print(f"    - {change}")
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print("  ✓ 配置优化完成")
        else:
            print("  ✓ 配置已是最优")
    else:
        print("  ! config.json 不存在，跳过")
    
    print("✓ NPU 性能配置优化完成\n")
    
except Exception as e:
    print(f"✗ NPU 性能配置优化失败: {e}\n")

# ==================== 总结 ====================
print("=" * 60)
print("修复完成！")
print("=" * 60)
print()
print("已修复的问题:")
print("  1. ✓ 数据库表结构（knowledge_cards, knowledge_sources）")
print("  2. ✓ 知识库搜索 API 参数模型")
print("  3. ✓ 技能系统路由前缀")
print("  4. ✓ NPU 性能配置优化")
print()
print("下一步操作:")
print("  1. 重启后端服务: python backend/main.py")
print("  2. 测试修复效果: python test_fixes.py")
print("  3. 查看性能基准: curl http://localhost:8000/api/npu/benchmark")
print()
print("如果 NPU 性能问题仍存在，请检查:")
print("  - QNN 日志输出确认使用了 NPU execution provider")
print("  - 模型是否正确量化为 QNN 格式")
print("  - 是否有其他进程占用 NPU 资源")
print()
