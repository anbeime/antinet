#!/usr/bin/env python3
"""
zhiyi 知识库查询工具
供 Hermes Agent 调用，查询 zhiyi 的知识库和锦衣卫 Agent 系统

用法:
    python zhiyi_tools.py search "关键词"
    python zhiyi_tools.py ask "问题"
    python zhiyi_tools.py graph [--layer fact|analysis|creative|risk|all]
    python zhiyi_tools.py dispatch <agent> <任务>
"""

import argparse
import json
import sys
import requests
from typing import Optional

# zhiyi API 配置
ZHIYI_API_BASE = "http://localhost:8000"


def search_knowledge(query: str, limit: int = 10) -> dict:
    """搜索知识库"""
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/api/knowledge/search",
            json={"keyword": query, "limit": limit},
            timeout=30
        )
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"API返回 {response.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "无法连接到 zhiyi 后端，请确保服务运行在 http://localhost:8000"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def ask_jinYiwu(question: str, context: str = "") -> dict:
    """向锦衣卫系统提问"""
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/api/chat/enhanced/message",
            json={
                "message": question,
                "context": context,
                "session_id": f"hermes_{id(question)}"
            },
            timeout=60
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "answer": data.get("reply", "未获取到回复"),
                "cards": data.get("cards", []),
                "skill_result": data.get("skill_result")
            }
        else:
            return {"success": False, "error": f"API返回 {response.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "无法连接到 zhiyi 后端"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_knowledge_graph(layer: str = "all", limit: int = 100) -> dict:
    """获取知识图谱"""
    try:
        response = requests.get(
            f"{ZHIYI_API_BASE}/api/knowledge/graph",
            params={"layer": layer, "limit": limit},
            timeout=30
        )
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"API返回 {response.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "无法连接到 zhiyi 后端"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def dispatch_agent_task(agent: str, task: str) -> dict:
    """向指定 Agent 下发任务"""
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/yichuansi/send_task",
            json={
                "task_instructions": {
                    "sub_tasks": [{"agent": agent, "task": task}]
                },
                "sender": "hermes"
            },
            timeout=120
        )
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"API返回 {response.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "无法连接到 zhiyi 后端"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="zhiyi 知识库查询工具")
    subparsers = parser.add_subparsers(dest="command", help="命令")

    # search 命令
    search_parser = subparsers.add_parser("search", help="搜索知识库")
    search_parser.add_argument("query", help="搜索关键词")
    search_parser.add_argument("--limit", "-n", type=int, default=10, help="结果数量")

    # ask 命令
    ask_parser = subparsers.add_parser("ask", help="向锦衣卫提问")
    ask_parser.add_argument("question", help="问题")
    ask_parser.add_argument("--context", "-c", default="", help="上下文")

    # graph 命令
    graph_parser = subparsers.add_parser("graph", help="获取知识图谱")
    graph_parser.add_argument("--layer", "-l", default="all",
                              choices=["fact", "analysis", "creative", "risk", "all"],
                              help="图谱层级")

    # dispatch 命令
    dispatch_parser = subparsers.add_parser("dispatch", help="下发任务到 Agent")
    dispatch_parser.add_argument("agent", help="Agent 名称")
    dispatch_parser.add_argument("task", help="任务描述")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    result = None

    if args.command == "search":
        result = search_knowledge(args.query, args.limit)
    elif args.command == "ask":
        result = ask_jinYiwu(args.question, args.context)
    elif args.command == "graph":
        result = get_knowledge_graph(args.layer)
    elif args.command == "dispatch":
        result = dispatch_agent_task(args.agent, args.task)

    if result:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"success": False, "error": "未知命令"}, ensure_ascii=False))


if __name__ == "__main__":
    main()