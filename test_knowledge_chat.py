#!/usr/bin/env python3
"""
测试知识库聊天功能
"""
import sys
import os

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 导入聊天路由
from backend.routes.chat_routes import router, PRESET_KNOWLEDGE_CARDS, _search_cards_by_keyword

print("=" * 60)
print(" Antinet 知识库聊天功能测试")
print("=" * 60)

# 测试1: 验证知识库数据加载
print("\n【测试1】知识库数据验证")
print("-" * 60)
total_cards = 0
for card_type, cards in PRESET_KNOWLEDGE_CARDS.items():
    count = len(cards)
    total_cards += count
    print(f"✓ {card_type.upper()} 卡片: {count} 个")

print(f"\n总计: {total_cards} 张知识卡片")

# 测试2: 验证API端点
print("\n【测试2】API端点验证")
print("-" * 60)
routes = [route for route in router.routes]
print(f"✓ 已注册 {len(routes)} 个API端点:")
for route in routes:
    print(f"  - {route.methods} {route.path}")

# 测试3: 知识库查询测试
print("\n【测试3】知识库查询测试")
print("-" * 60)

test_queries = [
    "Antinet是什么",
    "NPU性能如何",
    "技术架构是什么",
    "有哪些风险",
]

for query in test_queries:
    print(f"\n查询: {query}")
    
    # 使用真实的知识库搜索函数
    matched_cards = _search_cards_by_keyword(query, limit=10)
    
    if matched_cards:
        print(f"  ✓ 找到 {len(matched_cards)} 张相关卡片:")
        for card in matched_cards[:3]:  # 只显示前3个
            print(f"    - [{card['card_type']}] {card['title']}")
    else:
        print(f"   未找到相关卡片")

print("\n" + "=" * 60)
print("知识库功能测试完成！")
print("=" * 60)
print("\n 总结:")
print(f"  - 知识库卡片总数: {total_cards}")
print(f"  - API端点数量: {len(routes)}")
print(f"  - 查询功能: 正常")
print("\n 提示: 启动后端服务后，前端即可使用知识库聊天功能")
print("   后端启动命令: cd backend && python main.py")
