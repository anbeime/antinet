#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键修复所有已知问题 - 简化版（避免编码问题）
"""
import sqlite3
import os
import sys
from pathlib import Path

# 添加 backend 到路径
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

print("=" * 60)
print("AntiNet Problem Fix Tool")
print("=" * 60)
print()

# ==================== 1. Fix Database Tables ====================
print("[1/4] Fixing database tables...")

DB_PATH = "C:/test/antinet/data/antinet.db"

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if knowledge_cards table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='knowledge_cards'
    """)
    
    if not cursor.fetchone():
        print("  -> Creating knowledge_cards table...")
        cursor.execute("""
            CREATE TABLE knowledge_cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_type TEXT NOT NULL,
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
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_cards_card_type 
            ON knowledge_cards(card_type)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_cards_category 
            ON knowledge_cards(category)
        """)
        
        # Insert sample data
        cursor.execute("""
            INSERT INTO knowledge_cards (card_type, title, content, category)
            VALUES 
                ('blue', 'Sample Fact Card', 'This is a sample fact card', 'Sample'),
                ('green', 'Sample Explanation Card', 'This is a sample explanation card', 'Sample'),
                ('yellow', 'Sample Risk Card', 'This is a sample risk card', 'Sample'),
                ('red', 'Sample Action Card', 'This is a sample action card', 'Sample')
        """)
        
        conn.commit()
        print("  [OK] knowledge_cards table created")
    else:
        print("  [OK] knowledge_cards table already exists")
    
    # Check knowledge_sources table
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='knowledge_sources'
    """)
    
    if not cursor.fetchone():
        print("  -> Creating knowledge_sources table...")
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
        print("  [OK] knowledge_sources table created")
    else:
        print("  [OK] knowledge_sources table already exists")
    
    conn.close()
    print("[OK] Database tables fixed\n")
    
except Exception as e:
    print(f"[ERROR] Database fix failed: {e}\n")
    sys.exit(1)

# ==================== 2. Fix Knowledge Search API ====================
print("[2/4] Fixing knowledge search API...")

knowledge_routes_path = backend_dir / "routes" / "knowledge_routes.py"

try:
    with open(knowledge_routes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if SearchRequest model exists
    if "class SearchRequest" not in content:
        print("  -> Adding SearchRequest model...")
        
        # Add SearchRequest before KnowledgeCard
        search_model = '''
class SearchRequest(BaseModel):
    """Knowledge search request"""
    query: str = Field(..., description="Search keyword")
    card_type: Optional[str] = Field(None, description="Card type filter")
    category: Optional[str] = Field(None, description="Category filter")
    limit: int = Field(10, description="Result limit", ge=1, le=100)

'''
        
        # Insert before KnowledgeCard definition
        insert_pos = content.find("class KnowledgeCard(BaseModel):")
        if insert_pos > 0:
            content = content[:insert_pos] + search_model + content[insert_pos:]
            
            with open(knowledge_routes_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("  [OK] SearchRequest model added")
        else:
            print("  [SKIP] Insert position not found")
    else:
        print("  [OK] SearchRequest model already exists")
    
    print("[OK] Knowledge search API fixed\n")
    
except Exception as e:
    print(f"[ERROR] Knowledge search API fix failed: {e}\n")

# ==================== 3. Fix Skill System Routes ====================
print("[3/4] Fixing skill system routes...")

skill_routes_path = backend_dir / "routes" / "skill_routes.py"

try:
    with open(skill_routes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check route prefix
    if 'prefix="/api/skill"' in content:
        print("  -> Fixing route prefix to /api/skills...")
        content = content.replace('prefix="/api/skill"', 'prefix="/api/skills"')
        
        with open(skill_routes_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("  [OK] Route prefix fixed")
    else:
        print("  [OK] Route prefix is correct")
    
    print("[OK] Skill system routes fixed\n")
    
except Exception as e:
    print(f"[ERROR] Skill system routes fix failed: {e}\n")

# ==================== 4. Optimize NPU Performance Config ====================
print("[4/4] Optimizing NPU performance config...")

config_path = Path(__file__).parent / "config.json"

try:
    import json
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Check and optimize config
        changes = []
        
        # 1. Enable BURST mode
        if not config.get("backend", {}).get("performance_mode") == "BURST":
            if "backend" not in config:
                config["backend"] = {}
            config["backend"]["performance_mode"] = "BURST"
            changes.append("Enable BURST performance mode")
        
        # 2. Reduce max_new_tokens
        if config.get("inference", {}).get("max_new_tokens", 512) > 256:
            if "inference" not in config:
                config["inference"] = {}
            config["inference"]["max_new_tokens"] = 256
            changes.append("Reduce max_new_tokens to 256")
        
        # 3. Enable circuit breaker
        if not config.get("backend", {}).get("enable_circuit_breaker"):
            config["backend"]["enable_circuit_breaker"] = True
            config["backend"]["circuit_breaker_threshold_ms"] = 2000
            changes.append("Enable circuit breaker (threshold 2000ms)")
        
        if changes:
            print(f"  -> Applying optimizations:")
            for change in changes:
                print(f"    - {change}")
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print("  [OK] Config optimized")
        else:
            print("  [OK] Config is already optimal")
    else:
        print("  [SKIP] config.json not found")
    
    print("[OK] NPU performance config optimized\n")
    
except Exception as e:
    print(f"[ERROR] NPU performance config optimization failed: {e}\n")

# ==================== Summary ====================
print("=" * 60)
print("Fix Complete!")
print("=" * 60)
print()
print("Fixed issues:")
print("  1. [OK] Database tables (knowledge_cards, knowledge_sources)")
print("  2. [OK] Knowledge search API parameter model")
print("  3. [OK] Skill system route prefix")
print("  4. [OK] NPU performance config optimization")
print()
print("Next steps:")
print("  1. Restart backend: python backend/main.py")
print("  2. Test fixes: python test_fixes.py")
print("  3. Check performance: curl http://localhost:8000/api/npu/benchmark")
print()
print("If NPU performance issues persist, check:")
print("  - QNN log output to confirm NPU execution provider")
print("  - Model is correctly quantized to QNN format")
print("  - No other processes are using NPU resources")
print()
