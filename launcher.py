#!/usr/bin/env python3
"""
知易智能知识管家 - 桌面启动器
自动启动前后端，跳过视觉模型
"""

import subprocess
import sys
import os
import time
import webbrowser
import signal
from pathlib import Path

class AntinetLauncher:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.project_root = Path(__file__).parent
        
    def print_banner(self):
        print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          知易智能知识管家 - 桌面启动器 (无视觉模型版)          ║
║                                                              ║
║  ✓ 知识卡片管理    ✓ PDF/Word/PPT/Excel分析                   ║
║  ✓ 智能对话        ✓ Agent系统                              ║
║  ✓ 批量处理        ✓ 团队协作                               ║
╚══════════════════════════════════════════════════════════════╝
        """)
        
    def check_venv(self):
        """检查并激活虚拟环境"""
        venv_path = self.project_root / "venv_arm64"
        if not venv_path.exists():
            venv_path = self.project_root / "venv"
            
        if venv_path.exists():
            python_exe = venv_path / "Scripts" / "python.exe"
            if python_exe.exists():
                print(f"[✓] 检测到虚拟环境: {venv_path}")
                return str(python_exe)
        
        print("[!] 未检测到虚拟环境，使用系统Python")
        return sys.executable
        
    def start_backend(self, python_exe):
        """启动后端服务"""
        print("\n[1/3] 启动后端服务...")
        print("      - 跳过视觉模型加载")
        print("      - 仅启用文本模型服务")
        
        backend_dir = self.project_root / "backend"
        main_py = backend_dir / "main.py"
        
        # 设置环境变量，禁用视觉模型
        env = os.environ.copy()
        env["DISABLE_VISION_MODEL"] = "1"
        env["SKIP_GENIE_VL"] = "true"
        env["QNN_LOG_LEVEL"] = "ERROR"
        
        if main_py.exists():
            self.backend_process = subprocess.Popen(
                [python_exe, str(main_py)],
                cwd=str(backend_dir),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
            print(f"[✓] 后端进程已启动 (PID: {self.backend_process.pid})")
            time.sleep(2)
        else:
            print(f"[!] 未找到后端入口: {main_py}")
            print("[!] 尝试启动简化版后端...")
            
            # 创建简化后端
            simple_backend = self.project_root / "simple_backend.py"
            if simple_backend.exists():
                self.backend_process = subprocess.Popen(
                    [python_exe, str(simple_backend)],
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
                print(f"[✓] 简化后端进程已启动 (PID: {self.backend_process.pid})")
                time.sleep(2)
            
    def start_frontend(self):
        """启动前端服务"""
        print("\n[2/3] 启动前端服务...")
        
        node_modules = self.project_root / "node_modules" / ".bin"
        
        if not node_modules.exists():
            # 检查 antinet-lite
            lite_dir = self.project_root / "antinet-lite"
            if lite_dir.exists():
                print("      - 使用精简版前端")
                node_modules = lite_dir / "node_modules" / ".bin"
                cwd = str(lite_dir)
            else:
                print("[!] 未找到 node_modules，请运行 npm install")
                return False
        else:
            cwd = str(self.project_root)
            
        npm_exe = "npm.cmd"
        
        # 优先使用 serve 直接服务
        if (self.project_root / "dist" / "static").exists():
            print("      - 使用已构建的静态文件")
            self.frontend_process = subprocess.Popen(
                [npm_exe, "run", "serve:static"],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        elif (self.project_root / "dist").exists():
            print("      - 使用已构建的静态文件")
            self.frontend_process = subprocess.Popen(
                ["npx", "serve", "dist", "-p", "3000", "--single"],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            print("      - 启动开发服务器")
            self.frontend_process = subprocess.Popen(
                [npm_exe, "run", "dev"],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
            
        print(f"[✓] 前端进程已启动 (PID: {self.frontend_process.pid})")
        time.sleep(2)
        return True
        
    def open_browser(self):
        """打开浏览器"""
        print("\n[3/3] 正在打开浏览器...")
        time.sleep(1)
        webbrowser.open("http://localhost:3000")
        print("[✓] 浏览器已打开 http://localhost:3000")
        print("\n" + "="*60)
        print("✓ 所有服务已启动！")
        print("="*60)
        print("\n可按 Ctrl+C 停止所有服务")
        
    def run(self):
        """运行完整启动流程"""
        self.print_banner()
        
        try:
            python_exe = self.check_venv()
            self.start_backend(python_exe)
            self.start_frontend()
            self.open_browser()
            
            # 等待用户中断
            if self.backend_process:
                self.backend_process.wait()
            if self.frontend_process:
                self.frontend_process.wait()
                
        except KeyboardInterrupt:
            print("\n\n[!] 收到中断信号，正在停止服务...")
            self.stop_services()
            print("[✓] 所有服务已停止")
            
    def stop_services(self):
        """停止所有服务"""
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
                print("  - 后端已停止")
            except:
                self.backend_process.kill()
                
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=5)
                print("  - 前端已停止")
            except:
                self.frontend_process.kill()

def main():
    launcher = AntinetLauncher()
    launcher.run()

if __name__ == "__main__":
    main()
