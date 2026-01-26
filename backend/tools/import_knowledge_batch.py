"""
批量知识导入工具
整合 HTML 解析和数据库导入功能
"""
import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from html_parser import HTMLKnowledgeParser
from knowledge_importer import KnowledgeImporter
from pathlib import Path
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def batch_import(html_dir: str, db_path: str = "C:/test/antinet/data/antinet.db"):
    """
    批量导入 HTML 文件到知识库

    Args:
        html_dir: HTML 文件目录
        db_path: 数据库文件路径
    """
    logger.info("=" * 60)
    logger.info("开始批量导入知识库")
    logger.info("=" * 60)

    # 第一步：解析 HTML 文件
    logger.info("\n步骤 1: 解析 HTML 文件...")
    parser = HTMLKnowledgeParser()
    results = parser.parse_directory(html_dir)

    logger.info(f"解析了 {len(results)} 个 HTML 文件")

    # 导出解析结果
    knowledge_dir = Path(html_dir).parent / "knowledge"
    knowledge_dir.mkdir(exist_ok=True)

    parsed_file = knowledge_dir / "parsed_knowledge.json"
    parser.export_to_json(results, str(parsed_file))
    logger.info(f"解析结果已导出到: {parsed_file}")

    # 提取知识卡片
    logger.info("\n步骤 2: 提取知识卡片...")
    cards = parser.extract_knowledge_cards(results)
    logger.info(f"提取了 {len(cards)} 张知识卡片")

    # 保存卡片
    cards_file = knowledge_dir / "knowledge_cards.json"
    import json
    with open(cards_file, 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    logger.info(f"卡片已保存到: {cards_file}")

    # 第二步：导入到数据库
    logger.info("\n步骤 3: 导入到数据库...")
    importer = KnowledgeImporter(db_path)

    try:
        importer.connect()
        logger.info("数据库连接成功")

        importer.init_tables()
        logger.info("数据表初始化完成")

        stats = importer.import_cards(cards)
        logger.info(f"\n导入统计:")
        logger.info(f"  成功: {stats['success']}")
        logger.info(f"  [WARN] 重复: {stats['duplicates']}")
        logger.info(f" [FAIL] 失败: {stats['failed']}")

        # 注册来源
        importer.register_source(
            source_path=html_dir,
            source_type='html',
            total_cards=stats['success']
        )

        # 获取统计信息
        db_stats = importer.get_import_stats()
        logger.info(f"\n知识库统计:")
        logger.info(f"  总卡片数: {db_stats['total_cards']}")
        logger.info(f"  按类型分布: {db_stats['cards_by_type']}")

    finally:
        importer.close()

    logger.info("\n" + "=" * 60)
    logger.info("批量导入完成!")
    logger.info("=" * 60)


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='批量导入知识库')
    parser.add_argument(
        '--html-dir',
        default='C:/test/antinet/data/html',
        help='HTML 文件目录'
    )
    parser.add_argument(
        '--db-path',
        default='C:/test/antinet/data/antinet.db',
        help='数据库文件路径'
    )

    args = parser.parse_args()

    # 检查目录是否存在
    if not Path(args.html_dir).exists():
        logger.error(f" HTML 目录不存在: {args.html_dir}")
        return 1

    # 执行批量导入
    batch_import(args.html_dir, args.db_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
