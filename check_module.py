import subprocess
import sys

# 使用 subprocess 运行 Python 命令
cmd = [
    sys.executable,
    "-c",
    """
import sys
sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')
try:
    import qai_appbuilder
    print('IMPORT_SUCCESS')
    print('module_file:', qai_appbuilder.__file__)
    # Check for GenieContext
    if hasattr(qai_appbuilder, 'GenieContext'):
        print('HAS_GENIECONTEXT')
    # List all attributes
    attrs = [attr for attr in dir(qai_appbuilder) if not attr.startswith('_')]
    print('ATTR_COUNT:', len(attrs))
    print('ATTRS:', attrs)
except ImportError as e:
    print('IMPORT_FAILED')
    print('error:', e)
    import traceback
    traceback.print_exc()
"""
]

print("检查 qai_appbuilder 模块...")
try:
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    print("STDOUT:")
    print(result.stdout)
    print("\nSTDERR:")
    print(result.stderr)
    print("\nReturn code:", result.returncode)
except Exception as e:
    print("运行失败:", e)