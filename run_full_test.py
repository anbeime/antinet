# -*- coding: utf-8 -*-
"""
Antinet 完整功能自动化测试脚本
模拟真实用户操作，测试所有前后端功能
"""

import requests
import json
import time
from pathlib import Path

# 配置
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# 测试结果
test_results = []

def log_test(name, success, message=""):
    """记录测试结果"""
    status = "✅ PASS" if success else "❌ FAIL"
    result = f"{status} - {name}"
    if message:
        result += f": {message}"
    print(result)
    test_results.append({
        "name": name,
        "success": success,
        "message": message
    })

def test_backend_health():
    """测试后端健康检查"""
    try:
        response = requests.get(f"{BACKEND_URL}/")
        data = response.json()
        
        success = (
            response.status_code == 200 and
            data.get("status") == "running" and
            data.get("model_loaded") == True and
            data.get("device") == "NPU"
        )
        
        log_test(
            "后端健康检查",
            success,
            f"状态: {data.get('status')}, NPU: {data.get('model_loaded')}"
        )
        return success
    except Exception as e:
        log_test("后端健康检查", False, str(e))
        return False

def test_frontend_access():
    """测试前端访问"""
    try:
        response = requests.get(FRONTEND_URL)
        success = response.status_code == 200
        log_test("前端页面访问", success, f"状态码: {response.status_code}")
        return success
    except Exception as e:
        log_test("前端页面访问", False, str(e))
        return False

def test_api_docs():
    """测试 API 文档"""
    try:
        response = requests.get(f"{BACKEND_URL}/docs")
        success = response.status_code == 200
        log_test("API 文档访问", success)
        return success
    except Exception as e:
        log_test("API 文档访问", False, str(e))
        return False

def test_data_list():
    """测试数据列表"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/data/list")
        success = response.status_code == 200
        if success:
            data = response.json()
            log_test("数据列表查询", True, f"找到 {len(data)} 条数据")
        return success
    except Exception as e:
        log_test("数据列表查询", False, str(e))
        return False

def test_card_creation():
    """测试卡片创建"""
    try:
        card_data = {
            "title": "NPU 测试卡片",
            "content": "这是一个测试卡片，用于验证 NPU 推理功能",
            "type": "fact",
            "tags": ["测试", "NPU", "AI"]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/data/create",
            json=card_data
        )
        
        success = response.status_code == 200
        if success:
            data = response.json()
            log_test("卡片创建", True, f"卡片ID: {data.get('id')}")
            return data.get('id')
        else:
            log_test("卡片创建", False, f"状态码: {response.status_code}")
            return None
    except Exception as e:
        log_test("卡片创建", False, str(e))
        return None

def test_card_search(keyword="NPU"):
    """测试卡片搜索"""
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/data/search",
            params={"q": keyword}
        )
        
        success = response.status_code == 200
        if success:
            data = response.json()
            log_test("卡片搜索", True, f"找到 {len(data)} 个结果")
        return success
    except Exception as e:
        log_test("卡片搜索", False, str(e))
        return False

def test_file_upload():
    """测试文件上传"""
    try:
        # 准备测试文件
        test_file = Path("data/test_sales_data.csv")
        if not test_file.exists():
            log_test("文件上传", False, "测试文件不存在")
            return False
        
        with open(test_file, 'rb') as f:
            files = {'file': ('test_sales_data.csv', f, 'text/csv')}
            response = requests.post(
                f"{BACKEND_URL}/api/data/upload",
                files=files
            )
        
        success = response.status_code == 200
        if success:
            data = response.json()
            log_test("文件上传", True, f"上传成功: {data.get('filename')}")
        else:
            log_test("文件上传", False, f"状态码: {response.status_code}")
        return success
    except Exception as e:
        log_test("文件上传", False, str(e))
        return False

def test_npu_inference():
    """测试 NPU 推理"""
    try:
        inference_data = {
            "prompt": "请简要介绍 NPU 的优势",
            "max_tokens": 100
        }
        
        print("\n⏳ 正在执行 NPU 推理，请稍候...")
        start_time = time.time()
        
        response = requests.post(
            f"{BACKEND_URL}/api/npu/infer",
            json=inference_data,
            timeout=30
        )
        
        inference_time = (time.time() - start_time) * 1000
        
        success = response.status_code == 200
        if success:
            data = response.json()
            result_text = data.get('result', '')[:100]
            log_test(
                "NPU 推理",
                True,
                f"推理时间: {inference_time:.0f}ms, 结果: {result_text}..."
            )
        else:
            log_test("NPU 推理", False, f"状态码: {response.status_code}")
        return success
    except Exception as e:
        log_test("NPU 推理", False, str(e))
        return False

def test_analysis_routes():
    """测试分析路由"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/analysis/list-analyses")
        success = response.status_code == 200
        if success:
            data = response.json()
            log_test("分析路由", True, f"分析列表: {data.get('count')} 个")
        return success
    except Exception as e:
        log_test("分析路由", False, str(e))
        return False

def test_cors():
    """测试 CORS 配置"""
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET'
        }
        response = requests.options(
            f"{BACKEND_URL}/api/health",
            headers=headers
        )
        
        success = response.status_code == 200
        log_test("CORS 配置", success, f"OPTIONS 请求: {response.status_code}")
        return success
    except Exception as e:
        log_test("CORS 配置", False, str(e))
        return False

def print_summary():
    """打印测试摘要"""
    print("\n" + "=" * 60)
    print("📊 测试摘要")
    print("=" * 60)
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r['success'])
    failed = total - passed
    
    print(f"\n总测试数: {total}")
    print(f"✅ 通过: {passed}")
    print(f"❌ 失败: {failed}")
    print(f"通过率: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n失败的测试:")
        for result in test_results:
            if not result['success']:
                print(f"  ❌ {result['name']}: {result['message']}")
    
    print("\n" + "=" * 60)

def main():
    """主测试流程"""
    print("=" * 60)
    print("🚀 Antinet 完整功能自动化测试")
    print("=" * 60)
    print()
    
    # 1. 基础连接测试
    print("📡 第一部分：基础连接测试")
    print("-" * 60)
    test_backend_health()
    test_frontend_access()
    test_api_docs()
    print()
    
    # 2. 数据管理测试
    print("📊 第二部分：数据管理测试")
    print("-" * 60)
    test_data_list()
    card_id = test_card_creation()
    test_card_search()
    test_file_upload()
    print()
    
    # 3. NPU 功能测试
    print("🧠 第三部分：NPU 功能测试")
    print("-" * 60)
    test_npu_inference()
    print()
    
    # 4. 高级功能测试
    print("⚙️ 第四部分：高级功能测试")
    print("-" * 60)
    test_analysis_routes()
    test_cors()
    print()
    
    # 5. 打印摘要
    print_summary()
    
    # 6. 生成报告
    report_path = Path("test_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)
    print(f"\n📄 详细报告已保存到: {report_path}")

if __name__ == "__main__":
    main()
