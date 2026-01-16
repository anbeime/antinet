"""
GenieContext 最简单测试
直接运行，验证模型加载
"""
import os
from qai_appbuilder import GenieContext, QNNConfig

print("=" * 60)
print("GenieContext 简单测试")
print("=" * 60)

# 1. 设置PATH（绝对路径）
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')

print(f'\n[1] PATH设置')
print(f'  库路径: {lib_path}')
print(f'  PATH已设置: {lib_path in os.getenv("PATH")}')

# 2. 配置QNN
print(f'\n[2] 配置QNN')
try:
    QNNConfig.Config(
        lib_path,
        'Htp',
        2,  # INFO
        0,  # BASIC profiling
        ''
    )
    print('  ✅ QNN配置成功')
except Exception as e:
    print(f'  ❌ QNN配置失败: {e}')
    exit(1)

# 3. 检查文件存在
config_path = r'C:\test\antinet\config.json'  # 使用项目中的修改版config.json
dll_path = r'C:\ai-engine-direct-helper\samples\qai_libs\QnnHtp.dll'

print(f'\n[3] 文件检查')
print(f'  Config.json: {os.path.exists(config_path)}')
print(f'  QnnHtp.dll: {os.path.exists(dll_path)}')

if not os.path.exists(config_path):
    print(f'❌ 配置文件不存在: {config_path}')
    exit(1)

if not os.path.exists(dll_path):
    print(f'❌ DLL文件不存在: {dll_path}')
    exit(1)

# 4. 创建 GenieContext（只传入config路径）
print(f'\n[4] 创建 GenieContext')
print(f'  配置路径: {config_path}')

try:
    dialog = GenieContext(config_path)  # 只传入config路径
    print('  ✅ GenieContext 创建成功！')
    print(f'  类型: {type(dialog)}')
    print(f'  可用方法: {[m for m in dir(dialog) if not m.startswith("_")][:10]}')
except Exception as e:
    print(f'  ❌ 创建失败: {type(e).__name__}')
    print(f'  错误信息: {e}')
    print(f'\n  详细错误追踪:')
    import traceback
    traceback.print_exc()
    exit(1)

print('\n' + '=' * 60)
print('✅ 测试完成')
print('=' * 60)
