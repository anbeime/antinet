#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试脚本 - 验证数据库查询和API端点修复
"""
import sqlite3
import requests
import sys
from pathlib import Path
import io

# 设置标准输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_database_query():
    """测试数据库查询是否正常"""
    print("=" * 60)
    print("测试 1: 数据库查询")
    print("=" * 60)

    db_path = Path("data/antinet.db")
    if not db_path.exists():
        print("❌ 数据库文件不存在")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 测试查询 type 列
        cursor.execute("SELECT type, COUNT(*) as count FROM knowledge_cards GROUP BY type")
        rows = cursor.fetchall()

        print(f"✓ 数据库查询成功")
        print(f"卡片类型统计:")
        for row in rows:
            print(f"  - {row[0]}: {row[1]} 张")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ 数据库查询失败: {e}")
        return False


def test_backend_health():
    """测试后端健康状态"""
    print("\n" + "=" * 60)
    print("测试 2: 后端健康检查")
    print("=" * 60)

    try:
        response = requests.get("http://localhost:8000/docs", timeout=2)
        if response.status_code == 200:
            print("✓ 后端服务运行正常")
            return True
        else:
            print(f"❌ 后端响应异常: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ 后端连接失败: {e}")
        return False


def test_gtd_endpoint():
    """测试 GTD API 端点"""
    print("\n" + "=" * 60)
    print("测试 3: GTD API 端点")
    print("=" * 60)

    # 测试旧端点（应该 404）
    try:
        response = requests.get("http://localhost:8000/api/data/gtd-tasks", timeout=2)
        if response.status_code == 404:
            print("✓ 旧端点 /api/data/gtd-tasks 正确返回 404")
        else:
            print(f"⚠  旧端点状态码: {response.status_code}")
    except Exception as e:
        print(f"⚠  旧端点测试失败: {e}")

    # 测试新端点（应该 200 或 405）
    try:
        response = requests.get("http://localhost:8000/api/data/gtd/tasks", timeout=2)
        if response.status_code in [200, 405]:
            print(f"✓ 新端点 /api/data/gtd/tasks 正常 (状态码: {response.status_code})")
            return True
        else:
            print(f"❌ 新端点异常: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ 新端点连接失败: {e}")
        return False


def test_knowledge_cards():
    """测试知识卡片 API"""
    print("\n" + "=" * 60)
    print("测试 4: 知识卡片 API")
    print("=" * 60)

    try:
        response = requests.get("http://localhost:8000/api/knowledge/cards", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 获取卡片成功，共 {len(data.get('cards', []))} 张")
            return True
        else:
            print(f"❌ 获取卡片失败: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ 卡片 API 连接失败: {e}")
        return False


def test_chat_query():
    """测试聊天查询 API"""
    print("\n" + "=" * 60)
    print("测试 5: 聊天查询 API")
    print("=" * 60)

    try:
        response = requests.post(
            "http://localhost:8000/api/chat/query",
            json={"query": "测试"},
            timeout=10
        )
        if response.status_code == 200:
            print("✓ 聊天查询成功")
            return True
        else:
            print(f"❌ 聊天查询失败: {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ 聊天 API 连接失败: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Antinet 修复验证测试")
    print("=" * 60)

    results = []

    # 依次执行测试
    results.append(("数据库查询", test_database_query()))
    results.append(("后端健康", test_backend_health()))
    results.append(("GTD 端点", test_gtd_endpoint()))
    results.append(("知识卡片", test_knowledge_cards()))
    results.append(("聊天查询", test_chat_query()))

    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)

    passed = 0
    failed = 0

    for name, result in results:
        status = "✓ 通过" if result else "❌ 失败"
        print(f"{name:12s} {status}")
        if result:
            passed += 1
        else:
            failed += 1

    print("-" * 60)
    print(f"总计: {passed} 通过, {failed} 失败")

    if failed == 0:
        print("\n🎉 所有测试通过！")
        sys.exit(0)
    else:
        print(f"\n⚠️  有 {failed} 个测试失败")
        sys.exit(1)
