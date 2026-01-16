"""
GenieContext 完整推理测试
包含性能测量
"""
import os
import time
from qai_appbuilder import GenieContext

print("=" * 60)
print("GenieContext 完整推理测试")
print("=" * 60)

# 1. 设置PATH
lib_path = r'C:\ai-engine-direct-helper\samples\qai_libs'
os.environ['PATH'] = lib_path + ';' + os.getenv('PATH', '')
print(f'\n[1] 环境配置完成')

# 2. 创建 GenieContext
config_path = r'C:\model\Qwen2.0-7B-SSD-8380-2.34\config.json'
print(f'[2] 创建 GenieContext')

try:
    dialog = GenieContext(config_path, False)
    print('  ✅ GenieContext 创建成功')
except Exception as e:
    print(f'  ❌ 创建失败: {e}')
    import traceback
    traceback.print_exc()
    exit(1)

# 3. 测试推理
print(f'\n[3] 执行推理测试')
prompt = "分析销售数据，给出关键趋势"
print(f'  输入提示词: {prompt}')

result = []

def callback(text):
    """回调函数，收集生成的文本"""
    result.append(text)
    print(text, end='', flush=True)
    return True

print(f'\n  生成内容: ', end='', flush=True)
start_time = time.time()

try:
    dialog.Query(prompt, callback)
    latency = (time.time() - start_time) * 1000
    print(f'\n\n  ✅ 推理完成')
except Exception as e:
    print(f'\n  ❌ 推理失败: {e}')
    import traceback
    traceback.print_exc()
    exit(1)

# 4. 性能报告
full_result = ''.join(result)
print(f'\n[4] 性能报告')
print(f'  推理延迟: {latency:.2f}ms')

if latency > 500:
    print(f'  ⚠️  延迟超标！目标 < 500ms')
else:
    print(f'  ✅ 延迟达标！符合目标')

print(f'  生成内容长度: {len(full_result)} 字符')
print(f'  生成内容: {full_result}')

print('\n' + '=' * 60)
print('✅ 测试完成')
print('=' * 60)
