#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试所有后端 API 端点 - 简化版"""

import requests
import json
import sys

# 设置输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

API_BASE = "http://localhost:8000"

def test_api(endpoint, method="GET", data=None):
    """测试单个 API 端点"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print(f"  [ERROR] Unsupported method: {method}")
            return None
        
        print(f"\n{'='*80}")
        print(f"API: {method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"[OK] Success")
                print(f"Type: {type(result).__name__}")
                
                if isinstance(result, list):
                    print(f"Array length: {len(result)}")
                    if len(result) > 0:
                        print(f"First item:")
                        print(json.dumps(result[0], ensure_ascii=False, indent=2))
                elif isinstance(result, dict):
                    print(f"Keys: {list(result.keys())}")
                    print(f"Data:")
                    print(json.dumps(result, ensure_ascii=False, indent=2))
                else:
                    print(f"Data: {result}")
                
                return result
                    
            except json.JSONDecodeError:
                print(f"[WARN] Response is not JSON")
                print(f"Raw: {response.text[:200]}")
                return None
        else:
            print(f"[ERROR] Failed")
            print(f"Error: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"[ERROR] Timeout")
        return None
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Connection failed, backend may not be running")
        return None
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        return None


def main():
    """测试所有关键 API"""
    print("=" * 80)
    print("Backend API Test")
    print("=" * 80)
    
    results = {}
    
    # 测试健康检查
    results['health'] = test_api("/api/health")
    
    # 测试知识管理 API
    results['knowledge_cards'] = test_api("/api/knowledge/cards")
    results['knowledge_stats'] = test_api("/api/knowledge/stats")
    
    # 测试数据管理 API
    results['data_activities'] = test_api("/api/data/activities")
    results['gtd_tasks'] = test_api("/api/data/gtd-tasks")
    
    # 测试 Agent 系统 API
    results['agent_status'] = test_api("/api/agent/status")
    
    # 测试 NPU API
    results['npu_status'] = test_api("/api/npu/status")
    
    # 测试技能系统 API
    results['skill_list'] = test_api("/api/skill/list")
    
    # 测试聊天 API
    results['chat_health'] = test_api("/api/chat/health")
    
    # 测试 PDF API
    results['pdf_health'] = test_api("/api/pdf/health")
    
    # 测试 PPT API
    results['ppt_health'] = test_api("/api/ppt/health")
    
    # 测试 Excel API
    results['excel_list'] = test_api("/api/excel/list")
    
    # 测试分析 API
    results['analysis_list'] = test_api("/api/analysis/list-analyses")
    
    print("\n" + "=" * 80)
    print("Test Summary")
    print("=" * 80)
    
    success_count = sum(1 for v in results.values() if v is not None)
    total_count = len(results)
    
    print(f"Total APIs tested: {total_count}")
    print(f"Successful: {success_count}")
    print(f"Failed: {total_count - success_count}")
    print(f"Success rate: {success_count/total_count*100:.1f}%")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
