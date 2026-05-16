# -*- coding: utf-8 -*-
"""
zhiyi 知识库工具 - Hermes Agent 专用
提供对 zhiyi 知识库和锦衣卫 Agent 系统的查询能力

安装方式:
    1. 将此文件复制到 Hermes tools 目录
    2. 或在 skills 目录创建符号链接
"""

import json
import logging
import os
import requests
from typing import Optional

logger = logging.getLogger(__name__)

# 配置
ZHIYI_API_BASE = os.environ.get("ZHIYI_API_BASE", "http://localhost:8000")

# 注册信息
TOOLSET = "zhiyi_knowledge"
TOOL_NAME = "zhiyi_knowledge_base"


def _check_zhiyi_running() -> bool:
    """检查 zhiyi 后端是否运行"""
    try:
        response = requests.get(f"{ZHIYI_API_BASE}/docs", timeout=3)
        return response.status_code == 200
    except:
        return False


def search_zhiyi(query: str, limit: int = 10) -> str:
    """
    搜索 zhiyi 知识库中的卡片和文档
    
    参数:
        query: 搜索关键词
        limit: 返回结果数量限制 (默认10)
    
    返回:
        JSON 格式的搜索结果
    """
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/api/knowledge/search",
            json={"keyword": query, "limit": limit},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                return json.dumps({
                    "success": True,
                    "query": query,
                    "count": 0,
                    "message": "未找到相关结果"
                }, ensure_ascii=False)
            
            # 格式化输出
            output = []
            output.append(f"找到 {len(results)} 条相关结果:\n")
            
            for i, item in enumerate(results, 1):
                title = item.get("title", "无标题")
                content = item.get("content", "")[:200]
                card_type = item.get("type", "unknown")
                
                output.append(f"{i}. 【{card_type}】{title}")
                if content:
                    output.append(f"   {content}...")
                output.append("")
            
            return "\n".join(output)
            
        else:
            return json.dumps({
                "success": False,
                "error": f"API 返回错误: {response.status_code}"
            }, ensure_ascii=False)
            
    except requests.exceptions.ConnectionError:
        return json.dumps({
            "success": False,
            "error": f"无法连接到 zhiyi 后端 ({ZHIYI_API_BASE})，请确保后端服务已启动"
        }, ensure_ascii=False)
    except Exception as e:
        logger.exception("zhiyi 搜索失败")
        return json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False)


def ask_zhiyi(question: str, context: str = "") -> str:
    """
    向 zhiyi 锦衣卫系统提问
    
    参数:
        question: 用户问题
        context: 额外上下文 (可选)
    
    返回:
        JSON 格式的回答
    """
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/api/chat/enhanced/message",
            json={
                "message": question,
                "context": context,
                "history": [],
                "session_id": f"hermes_{id(question)}"
            },
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            reply = data.get("reply", "")
            cards = data.get("cards", [])
            
            output = []
            output.append(f"【锦衣卫回答】\n{reply}")
            
            if cards:
                output.append(f"\n📋 相关知识卡片 ({len(cards)}):")
                for i, card in enumerate(cards[:5], 1):
                    output.append(f"  {i}. {card.get('title', '无标题')}")
            
            return "\n".join(output)
            
        else:
            return json.dumps({
                "success": False,
                "error": f"API 返回错误: {response.status_code}"
            }, ensure_ascii=False)
            
    except requests.exceptions.ConnectionError:
        return "❌ 无法连接到 zhiyi 后端，请确保服务运行在 http://localhost:8000"
    except Exception as e:
        logger.exception("zhiyi 提问失败")
        return json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False)


def get_zhiyi_graph(layer: str = "all") -> str:
    """
    获取 zhiyi 知识图谱
    
    参数:
        layer: 图谱层级 (fact|analysis|creative|risk|all)
    
    返回:
        JSON 格式的图谱数据
    """
    try:
        response = requests.get(
            f"{ZHIYI_API_BASE}/api/knowledge/graph",
            params={"layer": layer, "limit": 100},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            
            return json.dumps({
                "success": True,
                "layer": layer,
                "nodes_count": len(nodes),
                "edges_count": len(edges),
                "nodes": nodes[:20],  # 限制显示
                "message": f"知识图谱包含 {len(nodes)} 个节点，{len(edges)} 条边"
            }, ensure_ascii=False, indent=2)
            
        else:
            return json.dumps({
                "success": False,
                "error": f"API 返回错误: {response.status_code}"
            }, ensure_ascii=False)
            
    except requests.exceptions.ConnectionError:
        return json.dumps({
            "success": False,
            "error": "无法连接到 zhiyi 后端"
        }, ensure_ascii=False)
    except Exception as e:
        logger.exception("zhiyi 图谱获取失败")
        return json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False)


def dispatch_zhiyi_task(agent: str, task: str) -> str:
    """
    向 zhiyi 的锦衣卫 Agent 下发任务
    
    参数:
        agent: Agent 名称 (orchestrator|taishige|tongzhengsi|jianchayuan|xingyusi|mijuanfang|canmousi)
        task: 任务描述
    
    返回:
        JSON 格式的任务结果
    """
    valid_agents = ["orchestrator", "taishige", "tongzhengsi", "jianchayuan", 
                   "xingyusi", "mijuanfang", "canmousi"]
    
    if agent not in valid_agents:
        return json.dumps({
            "success": False,
            "error": f"未知 Agent: {agent}",
            "valid_agents": valid_agents
        }, ensure_ascii=False)
    
    try:
        response = requests.post(
            f"{ZHIYI_API_BASE}/yichuansi/send_task",
            json={
                "task_instructions": {
                    "sub_tasks": [{
                        "agent": agent,
                        "task": task,
                        "material": {}
                    }]
                },
                "sender": "hermes"
            },
            timeout=300  # Agent 任务可能需要较长时间
        )
        
        if response.status_code == 200:
            return json.dumps({
                "success": True,
                "agent": agent,
                "task": task,
                "result": response.json()
            }, ensure_ascii=False, indent=2)
        else:
            return json.dumps({
                "success": False,
                "error": f"API 返回错误: {response.status_code}"
            }, ensure_ascii=False)
            
    except requests.exceptions.ConnectionError:
        return json.dumps({
            "success": False,
            "error": "无法连接到 zhiyi 后端"
        }, ensure_ascii=False)
    except Exception as e:
        logger.exception("zhiyi 任务下发失败")
        return json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False)


def list_zhiyi_agents() -> str:
    """列出可用的锦衣卫 Agent"""
    agents = [
        {"id": "orchestrator", "name": "总指挥使", "role": "任务分解与调度"},
        {"id": "taishige", "name": "太史阁", "role": "知识库管理"},
        {"id": "tongzhengsi", "name": "通政司", "role": "文档处理"},
        {"id": "jianchayuan", "name": "锦衣院", "role": "情报分析"},
        {"id": "xingyusi", "name": "行狱司", "role": "风险检测"},
        {"id": "mijuanfang", "name": "锦衣方", "role": "创意生成"},
        {"id": "canmousi", "name": "蚕业务", "role": "内容创作"},
    ]
    
    output = ["🏛️ 锦衣卫 Agent 系统\n"]
    output.append("=" * 40)
    
    for a in agents:
        output.append(f"\n【{a['name']}】({a['id']})")
        output.append(f"   职能: {a['role']}")
    
    output.append("\n" + "=" * 40)
    output.append("\n使用 dispatch 命令向指定 Agent 下发任务")
    
    return "\n".join(output)


# Hermite Agent 工具注册
TOOLS = [
    {
        "name": "search_zhiyi",
        "description": "搜索 zhiyi 知识库中的卡片和文档。适用于：查询知识库、查找相关内容、了解特定主题。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "搜索关键词"
                },
                "limit": {
                    "type": "integer",
                    "description": "返回结果数量 (默认10)",
                    "default": 10
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "ask_zhiyi",
        "description": "向 zhiyi 锦衣卫系统提问，获取综合分析和回答。适用于：复杂问题、需要 Agent 协同分析的场景。",
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "用户问题"
                },
                "context": {
                    "type": "string",
                    "description": "额外上下文 (可选)",
                    "default": ""
                }
            },
            "required": ["question"]
        }
    },
    {
        "name": "get_zhiyi_graph",
        "description": "获取 zhiyi 知识图谱数据。适用于：了解知识点之间的关系、可视化知识结构。",
        "parameters": {
            "type": "object",
            "properties": {
                "layer": {
                    "type": "string",
                    "enum": ["fact", "analysis", "creative", "risk", "all"],
                    "description": "图谱层级",
                    "default": "all"
                }
            }
        }
    },
    {
        "name": "dispatch_zhiyi_task",
        "description": "向 zhiyi 的锦衣卫 Agent 下发专门任务。适用于：需要特定 Agent 专业能力的任务。",
        "parameters": {
            "type": "object",
            "properties": {
                "agent": {
                    "type": "string",
                    "enum": ["orchestrator", "taishige", "tongzhengsi", "jianchayuan", "xingyusi", "mijuanfang", "canmousi"],
                    "description": "Agent 名称"
                },
                "task": {
                    "type": "string",
                    "description": "任务描述"
                }
            },
            "required": ["agent", "task"]
        }
    },
    {
        "name": "list_zhiyi_agents",
        "description": "列出所有可用的锦衣卫 Agent 及其职能。适用于：查询可用 Agent、了解系统能力。",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]


if __name__ == "__main__":
    # 测试
    print("=== zhiyi 知识库工具测试 ===\n")
    print("1. 列出 Agent:")
    print(list_zhiyi_agents())
    print("\n2. 搜索测试:")
    print(search_zhiyi("测试"))