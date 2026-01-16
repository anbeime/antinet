import time, sys
from qai_appbuilder import QNNContext, QNNConfig, Runtime, LogLevel, ProfilingLevel, PerfProfile

print('=== NPU 快速测试 ===')

# 配置
print('[1] 配置QNN...')
QNNConfig.Config(r'C:\ai-engine-direct-helper\samples\qai_libs', 'Htp', LogLevel.INFO, ProfilingLevel.BASIC, '')
print('✓ 配置成功')

# 加载
print('[2] 加载模型...')
start = time.time()
model = QNNContext('Qwen2.0-7B-SSD', r'C:\model\Qwen2.0-7B-SSD-8380-2.34')
load_time = (time.time() - start) * 1000
print(f'✓ 模型加载成功 ({load_time:.2f}ms)')

# 方法检查
print('[3] 检查可用方法:')
methods = [m for m in dir(model) if not m.startswith('_') and callable(getattr(model, m))]
for m in methods[:15]:
    print(f'  - {m}')

print('=== 测试完成 ===')
