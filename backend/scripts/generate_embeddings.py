#!/usr/bin/env python3
"""
为所有知识卡片生成向量嵌入
"""
import sys
sys.path.insert(0, 'C:/test/antinet')

from backend.database import DatabaseManager
from backend.database_vector import add_vector_methods
from backend.services.embedding_service import get_embedding_service
from pathlib import Path
import time

def main():
    print("=" * 60)
    print("Antinet 向量生成工具")
    print("=" * 60)
    print()
    
    # 1. 初始化数据库
    print("1. 初始化数据库...")
    db_path = Path('C:/test/antinet/data/antinet.db')
    db = DatabaseManager(db_path)
    
    # 添加向量方法
    add_vector_methods(db)
    
    # 创建向量表
    db.create_vector_table()
    print("   OK 向量表已创建")
    
    # 2. 初始化嵌入服务
    print("\n2. 初始化嵌入服务...")
    embedding_service = get_embedding_service()
    print(f"   OK 模型: {embedding_service.model_name}")
    print(f"   OK 维度: {embedding_service.dimension}")
    
    # 3. 获取所有卡片
    print("\n3. 获取知识卡片...")
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content FROM knowledge_cards")
    cards = cursor.fetchall()
    conn.close()
    
    print(f"   OK 找到 {len(cards)} 张卡片")
    
    if len(cards) == 0:
        print("\n⚠️  数据库中没有卡片，退出")
        return
    
    # 4. 生成向量
    print("\n4. 生成向量嵌入...")
    print(f"   {'ID':<6} {'标题':<30} {'状态':<10} {'时间'}")
    print("   " + "-" * 60)
    
    total_time = 0
    success_count = 0
    
    for card_id, title, content in cards:
        # 组合文本：标题 + 内容
        text = f"{title} {content}"
        
        try:
            start = time.time()
            
            # 生成向量
            embedding = embedding_service.encode_text(text)
            
            # 存储到数据库
            db.add_card_embedding(card_id, embedding)
            
            elapsed = time.time() - start
            total_time += elapsed
            success_count += 1
            
            # 显示进度
            title_short = title[:28] + ".." if len(title) > 30 else title
            print(f"   {card_id:<6} {title_short:<30} {'OK':<10} {elapsed:.3f}s")
            
        except Exception as e:
            print(f"   {card_id:<6} {title[:30]:<30} {'FAIL':<10} {e}")
    
    # 5. 统计信息
    print("\n" + "=" * 60)
    print("生成完成！")
    print("=" * 60)
    print(f"  成功: {success_count}/{len(cards)}")
    print(f"  总耗时: {total_time:.2f}s")
    print(f"  平均: {total_time/len(cards):.3f}s/卡片")
    
    # 6. 验证
    print("\n5. 验证向量数据...")
    stats = db.get_embedding_stats()
    print(f"   总卡片: {stats['total_cards']}")
    print(f"   已生成向量: {stats['embedded_cards']}")
    print(f"   覆盖率: {stats['coverage']:.1%}")
    
    # 7. 测试搜索
    print("\n6. 测试向量搜索...")
    test_query = "Antinet系统功能"
    print(f"   查询: {test_query}")
    
    query_embedding = embedding_service.encode_text(test_query)
    results = db.search_similar_cards(query_embedding, limit=3)
    
    print(f"   找到 {len(results)} 个相似结果:")
    for i, card in enumerate(results, 1):
        print(f"   {i}. {card['title']} (相似度: {card['similarity']:.3f})")
    
    print("\n" + "=" * 60)
    print("✓ 全部完成！")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n中断！")
    except Exception as e:
        print(f"\n\n错误: {e}")
        import traceback
        traceback.print_exc()
