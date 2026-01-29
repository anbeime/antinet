"""
Antinet 后端 API 完整测试脚本
测试所有 API 端点是否正常工作
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_api(name, url, method="GET", data=None):
    """测试单个 API"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        
        if response.status_code == 200:
            print(f"✓ {name:40s} - 成功 ({response.status_code})")
            return True, response.json()
        else:
            print(f"✗ {name:40s} - 失败 ({response.status_code})")
            return False, None
    except requests.exceptions.Timeout:
        print(f"✗ {name:40s} - 超时")
        return False, None
    except requests.exceptions.ConnectionError:
        print(f"✗ {name:40s} - 连接失败")
        return False, None
    except Exception as e:
        print(f"✗ {name:40s} - 错误: {str(e)[:30]}")
        return False, None

def main():
    print("=" * 70)
    print("Antinet 后端 API 完整测试")
    print("=" * 70)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"后端地址: {BASE_URL}")
    print("=" * 70)
    print()
    
    results = {}
    
    # 1. 健康检查
    print("[1/10] 健康检查 API")
    print("-" * 70)
    success, data = test_api("后端健康检查", f"{BASE_URL}/api/health")
    results["health"] = success
    print()
    
    # 2. 知识卡片 API
    print("[2/10] 知识卡片 API")
    print("-" * 70)
    success, data = test_api("获取所有卡片", f"{BASE_URL}/api/knowledge/cards")
    results["knowledge_cards"] = success
    if success and data:
        print(f"      → 卡片数量: {len(data)} 张")
    print()
    
    # 3. GTD 任务 API
    print("[3/10] GTD 任务管理 API")
    print("-" * 70)
    success, data = test_api("获取所有任务", f"{BASE_URL}/api/gtd/tasks")
    results["gtd_tasks"] = success
    if success and data:
        print(f"      → 任务数量: {len(data)} 个")
    
    success, data = test_api("获取任务统计", f"{BASE_URL}/api/gtd/stats")
    results["gtd_stats"] = success
    if success and data:
        print(f"      → 总任务数: {data.get('total', 0)}")
    
    success, data = test_api("GTD 健康检查", f"{BASE_URL}/api/gtd/health")
    results["gtd_health"] = success
    print()
    
    # 4. PDF 处理 API
    print("[4/10] PDF 处理 API")
    print("-" * 70)
    success, data = test_api("PDF 功能状态", f"{BASE_URL}/api/pdf/status")
    results["pdf_status"] = success
    if success and data:
        print(f"      → PDF 可用: {data.get('available', False)}")
    
    success, data = test_api("PDF 健康检查", f"{BASE_URL}/api/pdf/health")
    results["pdf_health"] = success
    print()
    
    # 5. NPU 状态 API
    print("[5/10] NPU 状态 API")
    print("-" * 70)
    success, data = test_api("NPU 状态", f"{BASE_URL}/api/npu/status")
    results["npu_status"] = success
    if success and data:
        print(f"      → NPU 可用: {data.get('available', False)}")
    print()
    
    # 6. Agent 系统 API
    print("[6/10] Agent 系统 API")
    print("-" * 70)
    success, data = test_api("Agent 列表", f"{BASE_URL}/api/agent/agents")
    results["agent_list"] = success
    if success and data:
        print(f"      → Agent 数量: {len(data) if isinstance(data, list) else '未知'}")
    print()
    
    # 7. 技能系统 API
    print("[7/10] 技能系统 API")
    print("-" * 70)
    success, data = test_api("技能列表", f"{BASE_URL}/api/skill/skills")
    results["skill_list"] = success
    if success and data:
        print(f"      → 技能数量: {len(data) if isinstance(data, list) else '未知'}")
    print()
    
    # 8. 数据分析 API
    print("[8/10] 数据分析 API")
    print("-" * 70)
    success, data = test_api("数据源列表", f"{BASE_URL}/api/data/sources")
    results["data_sources"] = success
    print()
    
    # 9. Excel 导出 API
    print("[9/10] Excel 导出 API")
    print("-" * 70)
    success, data = test_api("Excel 状态", f"{BASE_URL}/api/excel/status")
    results["excel_status"] = success
    print()
    
    # 10. PPT 生成 API
    print("[10/10] PPT 生成 API")
    print("-" * 70)
    success, data = test_api("PPT 状态", f"{BASE_URL}/api/ppt/status")
    results["ppt_status"] = success
    print()
    
    # 总结
    print("=" * 70)
    print("测试总结")
    print("=" * 70)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"总测试数: {total}")
    print(f"通过: {passed} ({passed/total*100:.1f}%)")
    print(f"失败: {failed} ({failed/total*100:.1f}%)")
    print()
    
    # 详细结果
    print("详细结果:")
    print("-" * 70)
    for name, success in results.items():
        status = "✓ 通过" if success else "✗ 失败"
        print(f"{status:10s} {name}")
    
    print()
    print("=" * 70)
    
    if failed == 0:
        print("✓ 所有 API 测试通过！后端功能正常")
    else:
        print(f"[!] {failed} 个 API 测试失败，请检查后端服务")
    
    print("=" * 70)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
