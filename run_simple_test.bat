@echo off
chcp 65001 >nul
echo 简单测试: 导入 qai_appbuilder 和 GenieContext
echo.

cd /d C:\test\antinet

echo [1] 设置 PATH...
set "LIB_PATH=C:\ai-engine-direct-helper\samples\qai_libs"
echo 库路径: %LIB_PATH%
if exist "%LIB_PATH%" (
    echo ✅ 库目录存在
    set "PATH=%LIB_PATH%;%PATH%"
) else (
    echo ❌ 库目录不存在
)

echo.
echo [2] 测试导入...
python -c "import sys; sys.path.insert(0, 'C:/ai-engine-direct-helper/samples'); import qai_appbuilder; print('✅ qai_appbuilder 导入成功'); print('模块位置:', qai_appbuilder.__file__)"

echo.
echo [3] 测试 GenieContext 导入...
python -c "import sys; sys.path.insert(0, 'C:/ai-engine-direct-helper/samples'); from qai_appbuilder import GenieContext; print('✅ GenieContext 导入成功')"

echo.
echo [4] 检查模型文件...
python -c "import os; model_dir = 'C:/model/llama3.2-3b-8380-qnn2.37'; config = os.path.join(model_dir, 'config.json'); print('模型目录:', model_dir); print('目录存在:', os.path.exists(model_dir)); print('配置文件:', config); print('文件存在:', os.path.exists(config))"

echo.
echo [5] 尝试初始化 (3秒超时)...
python -c "
import sys
import os
import threading
import time

sys.path.insert(0, 'C:/ai-engine-direct-helper/samples')
os.environ['PATH'] = 'C:/ai-engine-direct-helper/samples/qai_libs;' + os.getenv('PATH', '')

from qai_appbuilder import GenieContext

result = {'done': False, 'dialog': None, 'error': None}

def init():
    try:
        config = 'C:/model/llama3.2-3b-8380-qnn2.37/config.json'
        result['dialog'] = GenieContext(config, False)
        result['done'] = True
    except Exception as e:
        result['error'] = e
        result['done'] = True

print('开始初始化...')
t = threading.Thread(target=init, daemon=True)
t.start()
t.join(timeout=3)

if result['done']:
    if result['error']:
        print('❌ 初始化失败:', result['error'])
    else:
        print('✅ 初始化成功!')
else:
    print('⚠️  初始化仍在进行中 (3秒超时)')
    print('这可能意味着:')
    print('  1. 模型正在加载 (2.3GB 可能需要时间)')
    print('  2. 缺少依赖库')
    print('  3. 硬件/NPU 问题')
"

echo.
echo 测试完成。
pause