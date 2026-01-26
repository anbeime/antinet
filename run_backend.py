"""
直接启动后端服务（用于调试）
"""
import sys
import os

# 切换到项目目录
os.chdir(r'C:\test\antinet')

# 添加backend到路径
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

print("=" * 60)
print("启动 Antinet 后端服务")
print("=" * 60)
print()

try:
    # 导入并运行main
    print("[INFO] 导入 backend.main...")
    from backend import main
    
    print("[INFO] 启动服务...")
    # 这会启动uvicorn服务器
    
except Exception as e:
    print(f"[ERROR] 启动失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
