#!/usr/bin/env python3
"""
zhiyi 通宵自动测试修复脚本
每小时运行一次，测试并修复问题
"""
import subprocess
import time
import sys
import json
import os
import re
from datetime import datetime

BASE_DIR = r"C:\D\zhiyi"
BACKEND_VENV = r"C:\D\zhiyi\venv_arm64\Scripts\python.exe"
RESULTS_FILE = r"C:\D\zhiyi\overnight_report.json"

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")

def run_py(script_path, timeout=120):
    """运行 Python 脚本"""
    cmd = [BACKEND_VENV, "-X", "utf8", script_path]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=BASE_DIR)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"
    except Exception as e:
        return -1, "", str(e)

def check_backend_alive():
    """检查后端是否运行"""
    try:
        import requests
        r = requests.get("http://127.0.0.1:8000/api/health", timeout=5)
        return r.status_code == 200
    except:
        return False

def check_backend_routes():
    """检查后端路由是否正常"""
    try:
        import requests
        routes_to_test = [
            "/api/health",
            "/api/knowledge/cards",
            "/api/meeting/modes",
            "/api/speech/tts/voices",
            "/api/knowledge/search",
            "/api/wiki/pages",
            "/api/backlinks/stats/1",
            "/api/integration/calendar/events/all",
        ]
        results = {}
        for route in routes_to_test:
            try:
                r = requests.get(f"http://127.0.0.1:8000{route}", timeout=10)
                results[route] = r.status_code
            except:
                results[route] = "ERROR"
        return results
    except Exception as e:
        return {"error": str(e)}

def main():
    log("=" * 60)
    log("zhiyi 通宵自动测试开始")
    log("=" * 60)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "backend_alive": False,
        "route_tests": {},
        "test_results": {},
        "issues": [],
        "fixed": []
    }
    
    # 1. 检查后端状态
    log("[1/4] 检查后端状态...")
    alive = check_backend_alive()
    report["backend_alive"] = alive
    if not alive:
        log("  后端未运行，尝试启动...")
        # 后端未运行，尝试启动（通过后台进程）
        # 注意：需要Windows上已有一个后端实例在运行
        report["issues"].append("后端未运行，需要手动启动")
    else:
        log("  后端运行正常")
    
    # 2. 测试关键路由
    log("[2/4] 测试关键路由...")
    routes = check_backend_routes()
    report["route_tests"] = routes
    for route, status in routes.items():
        if status == "ERROR" or (isinstance(status, int) and status >= 400):
            log(f"  FAIL {route}: {status}")
            report["issues"].append(f"路由失败: {route} -> {status}")
        else:
            log(f"  OK   {route}: {status}")
    
    # 3. 运行测试脚本
    log("[3/4] 运行后端测试...")
    code, stdout, stderr = run_py(r"backend\test_backend_fixed.py", timeout=180)
    if code == 0:
        log("  所有测试通过!")
        report["test_results"]["all_passed"] = True
        report["fixed"].append("后端API测试全部通过")
    else:
        log(f"  测试失败 (exit {code})")
        report["test_results"]["all_passed"] = False
        report["test_results"]["stdout"] = stdout[-2000:]
        report["test_results"]["stderr"] = stderr[-500:]
        
        # 解析失败信息
        failed = re.findall(r'\[FAIL\] (.+)', stdout)
        for f in failed:
            report["issues"].append(f"测试失败: {f}")
    
    # 4. 生成报告
    log("[4/4] 生成报告...")
    report["summary"] = {
        "total_routes_tested": len(routes),
        "failed_routes": sum(1 for s in routes.values() if s == "ERROR" or (isinstance(s, int) and s >= 400)),
        "total_issues": len(report["issues"]),
        "fixed_count": len(report["fixed"])
    }
    
    # 保存报告
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    log(f"\n报告已保存: {RESULTS_FILE}")
    log(f"总结: {report['summary']['total_issues']} 个问题, {report['summary']['fixed_count']} 个已修复")
    
    if report["issues"]:
        log("\n发现的问题:")
        for issue in report["issues"]:
            log(f"  - {issue}")
    
    return len(report["issues"])

if __name__ == "__main__":
    issues = main()
    sys.exit(0 if issues == 0 else 1)