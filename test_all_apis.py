#!/usr/bin/env python3
"""测试所有后端 API 端点"""

import requests
import json
from typing import Dict, Any

API_BASE = "http://localhost:8000"

def test_api(endpoint: str, method: str = "GET", data: Dict[str, Any] = None) -> None:
    """测试单个 API 端点"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print(f"  ❌ 不支持的方法: {method}")
            return
        
        print(f"\n{'='*80}")
        print(f"API: {method} {endpoint}")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ 成功")
                print(f"返回数据类型: {type(result)}")
                
                if isinstance(result, list):
                    print(f"返回数组长度: {len(result)}")
                    if len(result) > 0:
                        print(f"第一项示例:")
                        print(json.dumps(result[0], ensure_ascii=False, indent=2))
                elif isinstance(result, dict):
                    print(f"返回对象键: {list(result.keys())}")
                    print(f"返回数据:")
                    print(json.dumps(result, ensure_ascii=False, indent=2))
                else:
                    print(f"返回数据: {result}")
                    
            except json.JSONDecodeError:
                print(f"⚠️  返回数据不是 JSON 格式")
                print(f"原始返回: {response.text[:200]}")
        else:
            print(f"❌ 失败")
            print(f"错误信息: {response.text}")
            
    except requests.exceptions.Timeout:
        print(f"❌ 请求超时")
    except requests.exceptions.ConnectionError:
        print(f"❌ 连接失败，后端可能未启动")
    except Exception as e:
        print(f"❌ 异常: {e}")


def main():
    """测试所有关键 API"""
    print("=" * 80)
    print("后端 API 测试")
    print("=" * 80)
    
    # 测试健康检查
    test_api("/api/health")
    
    # 测试知识管理 API
    test_api("/api/knowledge/cards")
    test_api("/api/knowledge/stats")
    test_api("/api/knowledge/sources")
    
    # 测试数据管理 API
    test_api("/api/data/activities")
    test_api("/api/data/gtd-tasks")
    test_api("/api/data/checklist")
    
    # 测试 Agent 系统 API
    test_api("/api/agent/status")
    test_api("/api/agent/stats")
    
    # 测试 NPU API
    test_api("/api/npu/status")
    
    # 测试技能系统 API
    test_api("/api/skill/list")
    test_api("/api/skill/categories")
    
    # 测试聊天 API
    test_api("/api/chat/health")
    test_api("/api/chat/cards")
    
    # 测试 PDF API
    test_api("/api/pdf/health")
    test_api("/api/pdf/status")
    
    # 测试 PPT API
    test_api("/api/ppt/health")
    test_api("/api/ppt/status")
    
    # 测试 Excel API
    test_api("/api/excel/list")
    
    # 测试分析 API
    test_api("/api/analysis/list-analyses")
    test_api("/api/analysis/demo-data")
    
    print("\n" + "=" * 80)
    print("测试完成")
    print("=" * 80)


if __name__ == "__main__":
    main()
