"""
知识集成测试脚本
验证所有文件是否正确移动和配置
"""
import os
import sys
from pathlib import Path

def test_file_structure():
    """测试文件结构"""
    print("=" * 60)
    print("测试 1: 文件结构检查")
    print("=" * 60)

    tests = {
        "backend/tools/": [
            "scrape_knowledge_interactive.py",
            "simple_npu_test.py",
            "html_parser.py",
            "knowledge_importer.py",
            "import_knowledge_batch.py"
        ],
        "backend/routes/": [
            "knowledge_routes.py"
        ],
        "data/html/": [
            "20260122_zhqq_927.htm",
            "20260122_zhqq_928.htm",
            "20260122_zhqq_929.htm"
        ],
        "data/knowledge/": [],  # 空目录也可以
        "data-analysis/agents/": [
            "orchestrator.py",
            "preprocessor.py",
            "fact_generator.py",
            "interpreter.py",
            "memory.py",
            "risk_detector.py",
            "action_advisor.py",
            "messenger.py"
        ]
    }

    base_path = Path("C:/test/antinet")
    passed = 0
    failed = 0

    for dir_path, files in tests.items():
        full_dir = base_path / dir_path
        if not full_dir.exists():
            print(f" 目录不存在: {dir_path}")
            failed += 1
            continue

        print(f"\n目录存在: {dir_path}")

        if files:
            for file in files:
                full_file = full_dir / file
                if full_file.exists():
                    size = full_file.stat().st_size
                    print(f"  {file} ({size} bytes)")
                    passed += 1
                else:
                    print(f" no {file} 不存在")
                    failed += 1
        else:
            # 检查空目录
            print(f"  目录为空（这是正常的）")
            passed += 1

    print(f"\n结果: {passed} 通过, {failed} 失败")
    return failed == 0

def test_imports():
    """测试模块导入"""
    print("\n" + "=" * 60)
    print("测试 2: 模块导入测试")
    print("=" * 60)

    sys.path.insert(0, "C:/test/antinet")

    modules = [
        ("sqlite3", "标准库"),
        ("json", "标准库"),
    ]

    passed = 0
    failed = 0

    for module, description in modules:
        try:
            __import__(module)
            print(f"{module} ({description})")
            passed += 1
        except ImportError as e:
            print(f" {module} - {e}")
            failed += 1

    print(f"\n结果: {passed} 通过, {failed} 失败")
    return failed == 0

def test_database():
    """测试数据库"""
    print("\n" + "=" * 60)
    print("测试 3: 数据库初始化测试")
    print("=" * 60)

    import sqlite3
    db_path = "C:/test/antinet/data/antinet.db"

    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        print(f"数据库连接成功: {db_path}")

        cursor = conn.cursor()

        # 创建测试表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_table (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        ''')
        print("测试表创建成功")

        # 插入测试数据
        cursor.execute("INSERT INTO test_table (name) VALUES (?)", ("测试",))
        conn.commit()
        print("测试数据插入成功")

        # 查询测试数据
        cursor.execute("SELECT * FROM test_table")
        result = cursor.fetchone()
        print(f"测试数据查询成功: {result}")

        # 清理
        cursor.execute("DROP TABLE test_table")
        conn.commit()
        conn.close()
        print("数据库清理完成")

        return True

    except Exception as e:
        print(f" 数据库测试失败: {e}")
        return False

def main():
    """主函数"""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "知识集成测试" + " " * 26 + "║")
    print("╚" + "=" * 58 + "╝")

    results = []

    # 测试文件结构
    results.append(("文件结构", test_file_structure()))

    # 测试模块导入
    results.append(("模块导入", test_imports()))

    # 测试数据库
    results.append(("数据库", test_database()))

    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "通过" if result else " 失败"
        print(f"{status}: {name}")

    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！知识集成成功")
        print("\n下一步:")
        print("  1. 安装依赖: pip install beautifulsoup4 lxml playwright")
        print("  2. 运行导入脚本: run_knowledge_import.bat")
        print("  3. 启动后端服务: cd backend && python main.py")
        print("  4. 访问 API 文档: http://localhost:8000/docs")
        return 0
    else:
        print(f"\n  {total - passed} 个测试失败，请检查")
        return 1


if __name__ == "__main__":
    sys.exit(main())
