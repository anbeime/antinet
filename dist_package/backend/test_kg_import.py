#!/usr/bin/env python3
import sys
sys.path.insert(0, 'C:/D/zhiyi/backend')

try:
    from routes import knowledge_graph
    print("OK: knowledge_graph imported")
    print(f"  search_entities: {knowledge_graph.search_entities}")
except Exception as e:
    print(f"ERROR: {e}")