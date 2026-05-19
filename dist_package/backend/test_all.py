"""
zhiyi 全功能测试脚本
自动测试所有 API 接口、前端页面、外部服务
用法: python test_all.py [--skip-frontend]
"""
import requests
import time
import sys
import json
from datetime import datetime

# 配置
BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
RESULTS = {"passed": [], "failed": [], "warnings": []}

def log(msg, level="INFO"):
    prefix = {"INFO": "✅", "FAIL": "❌", "WARN": "⚠️", "PASS": "✅"}[level]
    print(f"{prefix} {msg}")

def test_endpoint(method, path, expected_status=200, data=None, timeout=10, description=""):
    """测试单个接口"""
    url = f"{BASE_URL}{path}"
    desc = description or f"{method} {path}"
    try:
        if method == "GET":
            r = requests.get(url, timeout=timeout)
        elif method == "POST":
            r = requests.post(url, json=data, timeout=timeout)
        elif method == "DELETE":
            r = requests.delete(url, timeout=timeout)
        
        if r.status_code == expected_status:
            log(f"{desc} -> {r.status_code}", "PASS")
            RESULTS["passed"].append(desc)
            return True, r.json() if r.content else {}
        else:
            log(f"{desc} -> 期望{expected_status} 实际{r.status_code}", "FAIL")
            RESULTS["failed"].append({"test": desc, "expected": expected_status, "actual": r.status_code, "response": r.text[:200]})
            return False, {}
    except requests.exceptions.Timeout:
        log(f"{desc} -> 超时({timeout}s)", "FAIL")
        RESULTS["failed"].append({"test": desc, "error": "timeout"})
        return False, {}
    except Exception as e:
        log(f"{desc} -> 异常: {e}", "FAIL")
        RESULTS["failed"].append({"test": desc, "error": str(e)})
        return False, {}

def check_service(name, url, timeout=3):
    """检查外部服务是否可用"""
    try:
        r = requests.get(url, timeout=timeout)
        log(f"{name} -> {r.status_code}", "PASS")
        RESULTS["passed"].append(f"service:{name}")
        return True
    except:
        log(f"{name} -> 不可用", "WARN")
        RESULTS["warnings"].append(f"service:{name}")
        return False

def test_backend_health():
    """后端健康检查"""
    log("\n=== 后端服务健康检查 ===", "INFO")
    test_endpoint("GET", "/", description="后端根路径")
    test_endpoint("GET", "/health", description="健康检查端点")
    test_endpoint("GET", "/docs", description="API文档")

def test_knowledge_routes():
    """知识管理路由"""
    log("\n=== 知识管理路由 ===", "INFO")
    test_endpoint("GET", "/api/knowledge/cards", description="获取知识卡片列表")
    test_endpoint("GET", "/api/knowledge/projects", description="获取项目列表")
    test_endpoint("POST", "/api/knowledge/cards", data={"title": "测试", "content": "测试内容", "color": "blue"}, description="创建知识卡片")

def test_chat_routes():
    """聊天路由"""
    log("\n=== 聊天路由 ===", "INFO")
    test_endpoint("GET", "/api/chat/sessions", description="获取会话列表")
    # 聊天消息需要已存在的 session，这里先测试基础端点
    test_endpoint("GET", "/api/chat/enhanced/message", description="增强聊天端点(GET)")

def test_enhanced_chat():
    """增强聊天/知识问答"""
    log("\n=== 增强聊天/知识问答 ===", "INFO")
    # 测试流式响应端点
    test_endpoint("POST", "/api/evolving-chat/chat", 
                  data={"message": "你好", "scene": "general"},
                  timeout=30,
                  description="Evolving聊天")

def test_meeting_routes():
    """会议/8-Agent路由"""
    log("\n=== 会议路由 ===", "INFO")
    test_endpoint("GET", "/api/meeting/modes", description="获取讨论模式")
    test_endpoint("GET", "/api/meeting/history", description="获取会议历史")
    test_endpoint("GET", "/api/meeting/agents", description="获取Agent列表")
    test_endpoint("GET", "/api/meeting/tasks", description="获取任务列表")

def test_speech_routes():
    """语音路由"""
    log("\n=== 语音路由 ===", "INFO")
    test_endpoint("GET", "/api/speech/tts/voices", description="获取语音列表")
    test_endpoint("POST", "/api/speech/tts/speak-bytes", 
                  data={"text": "测试", "voice": "default"},
                  timeout=30,
                  description="TTS语音合成")

def test_document_routes():
    """文档处理路由"""
    log("\n=== 文档处理路由 ===", "INFO")
    test_endpoint("GET", "/api/pdf/list", description="PDF列表")
    test_endpoint("GET", "/api/excel/list", description="Excel列表")
    test_endpoint("GET", "/api/ppt/list", description="PPT列表")

def test_vector_search():
    """向量搜索"""
    log("\n=== 向量搜索 ===", "INFO")
    test_endpoint("POST", "/api/search/cards",
                  data={"query": "测试查询", "top_k": 5},
                  timeout=30,
                  description="知识库搜索")
    test_endpoint("POST", "/api/search/geos",
                  data={"query": "测试", "top_k": 3},
                  timeout=30,
                  description="GEO地理搜索")

def test_analysis_routes():
    """分析路由"""
    log("\n=== 分析路由 ===", "INFO")
    test_endpoint("GET", "/api/analysis/overview", description="分析概览")
    test_endpoint("GET", "/api/analysis/stats", description="统计数据")

def test_hermes_chat():
    """Hermes聊天"""
    log("\n=== Hermes聊天 ===", "INFO")
    # Hermes 可能需要额外配置，先测试基础端点
    test_endpoint("GET", "/api/hermes/health", description="Hermes健康检查")

def test_external_services():
    """外部服务检查"""
    log("\n=== 外部服务检查 ===", "INFO")
    # Ollama 已禁用（打包时移除）
    # check_service("Ollama", "http://localhost:11434/api/tags")
    check_service("Genie API", "http://localhost:8910/health")
    check_service("Hermes Gateway", "http://localhost:8000/api/hermes/health")

def test_frontend_pages(skip_frontend=False):
    """前端页面检查"""
    if skip_frontend:
        log("\n=== 前端页面 (跳过)", "INFO")
        return
    
    log("\n=== 前端页面检查 ===", "INFO")
    pages = [
        ("/", "首页"),
        ("/?tab=cards-management", "知识管理"),
        ("/?tab=data-management", "任务管理"),
        ("/?tab=document-center", "文档中心"),
        ("/?tab=virtual-office-meeting", "八府巡按"),
        ("/?tab=pdf-analysis", "PDF分析"),
        ("/?tab=excel-analysis", "Excel分析"),
        ("/?tab=agent-system", "Agent系统"),
    ]
    
    for path, name in pages:
        url = f"{FRONTEND_URL}{path}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                log(f"前端 {name} -> 200", "PASS")
                RESULTS["passed"].append(f"frontend:{name}")
            else:
                log(f"前端 {name} -> {r.status_code}", "FAIL")
                RESULTS["failed"].append({"test": f"frontend:{name}", "status": r.status_code})
        except Exception as e:
            log(f"前端 {name} -> 异常: {e}", "WARN")
            RESULTS["warnings"].append(f"frontend:{name}")

def test_database():
    """数据库连接检查"""
    log("\n=== 数据库检查 ===", "INFO")
    test_endpoint("GET", "/api/knowledge/stats", description="数据库统计")

def print_summary():
    """打印测试摘要"""
    log("\n" + "="*60, "INFO")
    log(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "INFO")
    log(f"通过: {len(RESULTS['passed'])}", "PASS")
    log(f"失败: {len(RESULTS['failed'])}", "FAIL")
    log(f"警告: {len(RESULTS['warnings'])}", "WARN")
    log("="*60, "INFO")
    
    if RESULTS["failed"]:
        log("\n失败详情:", "FAIL")
        for item in RESULTS["failed"]:
            print(f"  - {item}")
    
    # 保存详细报告
    report = {
        "timestamp": datetime.now().isoformat(),
        "passed": RESULTS["passed"],
        "failed": RESULTS["failed"],
        "warnings": RESULTS["warnings"]
    }
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    log(f"\n详细报告已保存: {report_file}", "INFO")
    
    return len(RESULTS["failed"]) == 0

def main():
    skip_frontend = "--skip-frontend" in sys.argv
    
    log("zhiyi 全功能测试开始", "INFO")
    log(f"后端: {BASE_URL}", "INFO")
    log(f"前端: {FRONTEND_URL}", "INFO")
    
    # 按依赖顺序测试
    test_backend_health()
    test_external_services()
    test_database()
    test_knowledge_routes()
    test_chat_routes()
    test_enhanced_chat()
    test_meeting_routes()
    test_speech_routes()
    test_document_routes()
    test_vector_search()
    test_analysis_routes()
    test_hermes_chat()
    test_frontend_pages(skip_frontend)
    
    success = print_summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()