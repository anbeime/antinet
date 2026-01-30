#!/usr/bin/env python3
"""
GTD 系统一键测试脚本
功能：启动后端 -> 等待服务就绪 -> 测试 GTD 接口 -> 自动关闭
"""
import subprocess
import time
import requests
import sys
import os
import signal
from pathlib import Path

def run_gtd_test():
    """一键测试 GTD 系统"""
    print("=== GTD 系统一键测试开始 ===")
    
    # 确保在项目根目录
    project_root = Path(__file__).parent.absolute()
    backend_dir = project_root / "backend"
    
    print(f"项目根目录: {project_root}")
    print(f"后端目录: {backend_dir}")
    
    # 检查关键文件是否存在
    gtd_routes = backend_dir / "routes" / "gtd_routes.py"
    main_py = backend_dir / "main.py"
    
    if not gtd_routes.exists():
        print(f"❌ ERROR: GTD 路由文件不存在: {gtd_routes}")
        return False
    
    if not main_py.exists():
        print(f"❌ ERROR: 主程序文件不存在: {main_py}")
        return False
    
    print("[OK] 关键文件检查通过")
    
    # 启动后端服务
    print("\n🚀 启动后端服务...")
    try:
        # 使用 Popen 启动后端，不阻塞
        proc = subprocess.Popen(
            ["uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        print(f"   后端进程 PID: {proc.pid}")
    except Exception as e:
        print(f"❌ 启动后端失败: {e}")
        return False
    
    # 等待服务启动
    print("\n⏳ 等待服务启动...")
    max_wait = 30  # 最大等待 30 秒
    start_time = time.time()
    backend_ready = False
    
    while time.time() - start_time < max_wait:
        try:
            # 检查进程是否还在运行
            if proc.poll() is not None:
                print(f"❌ 后端进程意外退出，返回码: {proc.returncode}")
                # 打印错误信息
                stdout, stderr = proc.communicate()
                print(f"STDOUT: {stdout}")
                print(f"STDERR: {stderr}")
                return False
            
            # 测试健康检查接口
            resp = requests.get("http://127.0.0.1:8000/docs", timeout=2)
            if resp.status_code == 200:
                print("✅ 后端服务已就绪")
                backend_ready = True
                break
                
        except requests.exceptions.ConnectionError:
            # 服务还没起来，继续等待
            pass
        except Exception as e:
            print(f"⚠️  检查服务状态时出错: {e}")
        
        print(".", end="", flush=True)
        time.sleep(1)
    
    if not backend_ready:
        print(f"\n❌ 后端服务在 {max_wait} 秒内未就绪")
        proc.terminate()
        proc.wait(timeout=5)
        return False
    
    # 测试 GTD 相关接口
    print("\n🔍 测试 GTD 接口...")
    
    test_results = []
    
    # 测试 1: GET /api/gtd-tasks (获取任务列表)
    print("\n   1️⃣ 测试 GET /api/gtd-tasks")
    try:
        resp = requests.get("http://127.0.0.1:8000/api/gtd-tasks", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"      ✅ 状态码: {resp.status_code}")
            print(f"      ✅ 返回数据: {len(data)} 条任务")
            test_results.append(("GET /api/gtd-tasks", True, f"返回 {len(data)} 条任务"))
        else:
            print(f"      ❌ 状态码: {resp.status_code}, 响应: {resp.text[:100]}")
            test_results.append(("GET /api/gtd-tasks", False, f"状态码 {resp.status_code}"))
    except Exception as e:
        print(f"      ❌ 请求失败: {e}")
        test_results.append(("GET /api/gtd-tasks", False, str(e)))
    
    # 测试 2: POST /api/gtd-tasks (创建任务)
    print("\n   2️⃣ 测试 POST /api/gtd-tasks")
    try:
        test_task = {
            "title": "测试任务 - 一键测试",
            "description": "这是由一键测试脚本创建的任务",
            "priority": "medium",
            "category": "test"
        }
        resp = requests.post(
            "http://127.0.0.1:8000/api/gtd-tasks",
            json=test_task,
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"      ✅ 状态码: {resp.status_code}")
            print(f"      ✅ 创建任务成功，任务ID: {data.get('id', 'N/A')}")
            task_id = data.get('id')
            test_results.append(("POST /api/gtd-tasks", True, f"创建任务ID: {task_id}"))
            
            # 测试 3: GET /api/gtd-tasks/{id} (获取单个任务)
            if task_id:
                print("\n   3️⃣ 测试 GET /api/gtd-tasks/{id}")
                try:
                    resp = requests.get(f"http://127.0.0.1:8000/api/gtd-tasks/{task_id}", timeout=5)
                    if resp.status_code == 200:
                        print(f"      ✅ 状态码: {resp.status_code}")
                        print(f"      ✅ 成功获取任务详情")
                        test_results.append(("GET /api/gtd-tasks/{id}", True, "获取详情成功"))
                        
                        # 测试 4: PUT /api/gtd-tasks/{id} (更新任务)
                        print("\n   4️⃣ 测试 PUT /api/gtd-tasks/{id}")
                        update_data = {"title": "测试任务 - 已更新", "priority": "high"}
                        resp = requests.put(
                            f"http://127.0.0.1:8000/api/gtd-tasks/{task_id}",
                            json=update_data,
                            timeout=5
                        )
                        if resp.status_code == 200:
                            print(f"      ✅ 状态码: {resp.status_code}")
                            print(f"      ✅ 任务更新成功")
                            test_results.append(("PUT /api/gtd-tasks/{id}", True, "更新成功"))
                            
                            # 测试 5: DELETE /api/gtd-tasks/{id} (删除任务)
                            print("\n   5️⃣ 测试 DELETE /api/gtd-tasks/{id}")
                            resp = requests.delete(f"http://127.0.0.1:8000/api/gtd-tasks/{task_id}", timeout=5)
                            if resp.status_code == 200:
                                print(f"      ✅ 状态码: {resp.status_code}")
                                print(f"      ✅ 任务删除成功")
                                test_results.append(("DELETE /api/gtd-tasks/{id}", True, "删除成功"))
                            else:
                                print(f"      ❌ 状态码: {resp.status_code}, 响应: {resp.text[:100]}")
                                test_results.append(("DELETE /api/gtd-tasks/{id}", False, f"状态码 {resp.status_code}"))
                        else:
                            print(f"      ❌ 状态码: {resp.status_code}, 响应: {resp.text[:100]}")
                            test_results.append(("PUT /api/gtd-tasks/{id}", False, f"状态码 {resp.status_code}"))
                    else:
                        print(f"      ❌ 状态码: {resp.status_code}, 响应: {resp.text[:100]}")
                        test_results.append(("GET /api/gtd-tasks/{id}", False, f"状态码 {resp.status_code}"))
                except Exception as e:
                    print(f"      ❌ 请求失败: {e}")
                    test_results.append(("GET /api/gtd-tasks/{id}", False, str(e)))
        else:
            print(f"      ❌ 状态码: {resp.status_code}, 响应: {resp.text[:100]}")
            test_results.append(("POST /api/gtd-tasks", False, f"状态码 {resp.status_code}"))
    except Exception as e:
        print(f"      ❌ 请求失败: {e}")
        test_results.append(("POST /api/gtd-tasks", False, str(e)))
    
    # 打印测试总结
    print("\n" + "="*50)
    print("📊 测试总结")
    print("="*50)
    
    passed = sum(1 for _, success, _ in test_results if success)
    total = len(test_results)
    
    for test_name, success, msg in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} | {test_name:<30} | {msg}")
    
    print("-"*50)
    print(f"   总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n🎉 GTD 系统完全可用！底座没坏，可以安全集成红色卡片功能！")
        overall_success = True
    else:
        print(f"\n⚠️  GTD 系统部分功能异常 ({passed}/{total} 通过)")
        overall_success = False
    
    # 关闭后端服务
    print("\n🛑 关闭后端服务...")
    try:
        proc.terminate()
        try:
            proc.wait(timeout=5)
            print("   ✅ 后端服务已正常关闭")
        except subprocess.TimeoutExpired:
            print("   ⚠️  强制终止后端服务")
            proc.kill()
            proc.wait()
    except Exception as e:
        print(f"   ❌ 关闭服务时出错: {e}")
    
    print("\n=== GTD 系统一键测试结束 ===\n")
    
    return overall_success

if __name__ == "__main__":
    try:
        success = run_gtd_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断测试")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ 测试过程中发生未预期错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)