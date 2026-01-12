# 远程 AIPC 紧急任务清单 - 2026-01-13

## ⚠️ 重要说明

**昨天工作回顾**：
- ✅ 创建了 17 个文档（6611 行）
- ❌ 但**没有实现任何实际功能**
- ❌ 违反了 `.roomodes` 规定："NEVER proactively create documentation files"

**今天必须专注于功能开发，禁止再写文档！**

---

## 🎯 今天的核心目标

1. ✅ 实现完整的数据分析流程（前端 → 后端 → NPU → 四色卡片）
2. ✅ 创建 NPU 性能监控仪表板
3. ✅ 端到端功能测试（验证 NPU 推理 < 500ms）
4. ✅ 记录真实性能数据（用于演示和 PPT）

**禁止行为**：
- ❌ 创建任何 .md 文档
- ❌ 修改现有文档
- ❌ 写超过 5 行的注释
- ❌ 做任何"优化"或"重构"

---

## 📋 任务清单（按顺序执行）

### 任务 0: 环境验证（10 分钟）⏰ 04:00-04:10

```bash
# 1. 同步最新代码
cd C:\Users\AI-PC-19\Desktop\antinet
git pull origin main

# 2. 检查预装模型
dir C:\model\Qwen2.0-7B-SSD-8380-2.34

# 3. 验证 NPU 模型可用
cd backend
python test_model_loading.py

# 预期输出：
# ✓ 模型加载成功
# ✓ NPU推理延迟: ~400ms
# ✓ 所有测试通过

# 4. 启动后端服务
python main.py

# 5. 测试 NPU API（新开终端）
curl http://localhost:8000/api/npu/models
curl http://localhost:8000/api/npu/status
```

**验证标准**：
- ✅ 所有命令执行成功
- ✅ 后端服务启动无错误
- ✅ API 返回正常数据

**如果失败**：停止所有工作，查看错误信息，必要时联系技术支持

---

### 任务 1: 创建数据分析页面（2 小时）⏰ 04:10-06:10

**文件**: `src/pages/NPUAnalysis.tsx`

**要求**：创建一个完整的数据分析页面

```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { npuService, AnalyzeResponse } from '@/services/npuService';
import FourColorCards from '@/components/FourColorCards';

export default function NPUAnalysis() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await npuService.analyze({
        query,
        max_tokens: 128,
        temperature: 0.7
      });

      setResult(response);

      // 记录性能数据
      console.log('NPU 推理延迟:', response.performance.inference_time_ms, 'ms');
      console.log('是否达标:', response.performance.meets_target);
    } catch (err: any) {
      setError(err.message || '分析失败');
      console.error('分析错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">NPU 智能分析</h1>

      {/* 查询输入区 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <label className="block text-sm font-medium mb-2">
          输入您的查询
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：分析上个月的销售数据趋势"
          className="w-full p-3 border rounded-lg resize-none"
          rows={4}
        />

        <button
          onClick={handleAnalyze}
          disabled={loading || !query.trim()}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '分析中...' : '开始分析'}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-600">错误: {error}</p>
        </div>
      )}

      {/* 性能数据 */}
      {result && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-8">
          <h3 className="font-bold mb-2">性能数据</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">推理延迟:</span>
              <span className="ml-2 font-mono">{result.performance.inference_time_ms}ms</span>
            </div>
            <div>
              <span className="text-gray-600">总耗时:</span>
              <span className="ml-2 font-mono">{result.performance.total_time_ms}ms</span>
            </div>
            <div>
              <span className="text-gray-600">设备:</span>
              <span className="ml-2">{result.performance.device}</span>
            </div>
            <div>
              <span className="text-gray-600">达标:</span>
              <span className={`ml-2 ${result.performance.meets_target ? 'text-green-600' : 'text-red-600'}`}>
                {result.performance.meets_target ? '✓ 是' : '✗ 否'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 四色卡片结果 */}
      {result && result.cards && (
        <div>
          <h2 className="text-2xl font-bold mb-4">分析结果</h2>
          <FourColorCards cards={result.cards} />
        </div>
      )}
    </div>
  );
}
```

**验证标准**：
```bash
# 1. 启动前端
pnpm dev

# 2. 访问 http://localhost:3000
# 3. 输入查询："分析数据趋势"
# 4. 点击"开始分析"
# 5. 检查：
#    ✅ 显示四色卡片
#    ✅ 性能数据显示
#    ✅ 推理延迟 < 500ms
```

**时间检查点**：
- 06:00 - 如果未完成 70%，跳过优化，专注核心功能
- 06:10 - 必须完成，进入下一任务

---

### 任务 2: NPU 性能监控仪表板（2.5 小时）⏰ 06:10-08:40

**文件**: `src/pages/NPUDashboard.tsx`

**要求**：创建实时性能监控仪表板

```typescript
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { npuService, BenchmarkResponse } from '@/services/npuService';

export default function NPUDashboard() {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<any[]>([]);

  // 运行基准测试
  const runBenchmark = async () => {
    setLoading(true);
    try {
      const result = await npuService.benchmark();
      setBenchmarkData(result);

      // 添加到历史记录
      setLatencyHistory(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          latency: result.avg_latency_ms
        }
      ].slice(-20)); // 保留最近 20 条

    } catch (error) {
      console.error('基准测试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时运行一次
  useEffect(() => {
    runBenchmark();
  }, []);

  // CPU vs NPU 对比数据
  const comparisonData = benchmarkData ? [
    {
      name: 'CPU',
      latency: benchmarkData.avg_latency_ms * benchmarkData.cpu_vs_npu_speedup,
      label: '估算'
    },
    {
      name: 'NPU',
      latency: benchmarkData.avg_latency_ms,
      label: '实测'
    }
  ] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">NPU 性能监控</h1>
        <button
          onClick={runBenchmark}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {loading ? '测试中...' : '运行测试'}
        </button>
      </div>

      {/* 关键指标卡片 */}
      {benchmarkData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">平均延迟</div>
            <div className="text-3xl font-bold">{benchmarkData.avg_latency_ms}ms</div>
            <div className={`text-sm mt-1 ${benchmarkData.avg_latency_ms < 500 ? 'text-green-600' : 'text-red-600'}`}>
              {benchmarkData.avg_latency_ms < 500 ? '✓ 达标' : '✗ 超标'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">加速比</div>
            <div className="text-3xl font-bold">{benchmarkData.cpu_vs_npu_speedup}x</div>
            <div className="text-sm mt-1 text-gray-500">CPU vs NPU</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">内存占用</div>
            <div className="text-3xl font-bold">{benchmarkData.memory_usage_mb}MB</div>
            <div className={`text-sm mt-1 ${benchmarkData.memory_usage_mb < 2000 ? 'text-green-600' : 'text-yellow-600'}`}>
              {benchmarkData.memory_usage_mb < 2000 ? '✓ 正常' : '⚠ 偏高'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">吞吐量</div>
            <div className="text-3xl font-bold">{(1000 / benchmarkData.avg_latency_ms).toFixed(1)}</div>
            <div className="text-sm mt-1 text-gray-500">QPS</div>
          </div>
        </div>
      )}

      {/* CPU vs NPU 性能对比 */}
      {benchmarkData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">CPU vs NPU 性能对比</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: '延迟 (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="latency" fill="#3b82f6" name="推理延迟" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center mt-4 text-sm text-gray-600">
            NPU 加速比: {benchmarkData.cpu_vs_npu_speedup}x
            （CPU 估算延迟: {(benchmarkData.avg_latency_ms * benchmarkData.cpu_vs_npu_speedup).toFixed(0)}ms）
          </div>
        </div>
      )}

      {/* 延迟历史趋势 */}
      {latencyHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">推理延迟历史</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: '延迟 (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="latency" stroke="#3b82f6" name="NPU 延迟" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

**验证标准**：
```bash
# 1. 访问 http://localhost:3000/npu-dashboard
# 2. 点击"运行测试"
# 3. 检查：
#    ✅ 显示 4 个关键指标卡片
#    ✅ CPU vs NPU 对比柱状图
#    ✅ 延迟历史折线图
#    ✅ 平均延迟 < 500ms
#    ✅ 加速比 > 2x
```

**时间检查点**：
- 08:00 - 如果未完成 60%，简化图表，保留核心指标
- 08:40 - 必须完成，进入下一任务

---

### 任务 3: 路由配置（30 分钟）⏰ 08:40-09:10

**文件**: 修改 `src/App.tsx` 或路由配置文件

**要求**：添加新页面的路由

```typescript
// 在路由配置中添加
import NPUAnalysis from '@/pages/NPUAnalysis';
import NPUDashboard from '@/pages/NPUDashboard';

// 添加路由
{
  path: '/npu-analysis',
  element: <NPUAnalysis />
},
{
  path: '/npu-dashboard',
  element: <NPUDashboard />
}
```

**验证标准**：
- ✅ 可以访问 `/npu-analysis`
- ✅ 可以访问 `/npu-dashboard`
- ✅ 导航栏有对应链接

---

### 任务 4: 端到端测试（1 小时）⏰ 09:10-10:10

**要求**：完整测试整个流程

```bash
# 测试清单（逐项检查）

1. 后端测试
   cd backend
   python main.py
   # ✅ 启动成功
   # ✅ 模型加载成功
   # ✅ 无错误日志

2. API 测试
   curl http://localhost:8000/api/npu/models
   # ✅ 返回 3 个模型信息

   curl http://localhost:8000/api/npu/status
   # ✅ loaded: true

   curl http://localhost:8000/api/npu/benchmark
   # ✅ avg_latency_ms < 500
   # ✅ cpu_vs_npu_speedup > 2

3. 前端测试
   pnpm dev
   # ✅ 启动成功
   # ✅ 无编译错误

4. 数据分析测试
   访问 http://localhost:3000/npu-analysis
   输入: "分析上个月的销售数据"
   点击: "开始分析"
   # ✅ 显示四色卡片（4 个）
   # ✅ 性能数据显示
   # ✅ 推理延迟 < 500ms
   # ✅ 达标状态为"✓ 是"

5. 性能监控测试
   访问 http://localhost:3000/npu-dashboard
   点击: "运行测试"
   # ✅ 显示 4 个指标卡片
   # ✅ CPU vs NPU 对比图显示
   # ✅ 延迟历史图显示
   # ✅ 加速比 > 2x

6. 记录性能数据（重要！）
   创建文件: PERFORMANCE_TEST_RESULTS.txt
   记录以下数据：
   - NPU 推理延迟: XXXms
   - CPU vs NPU 加速比: X.Xx
   - 内存占用: XXXmb
   - 测试时间: 2026-01-13 XX:XX
```

**验证标准**：
- ✅ 所有测试项通过
- ✅ 性能数据记录完整
- ✅ 无错误和警告

---

### 任务 5: Git 提交（30 分钟）⏰ 10:10-10:40

**要求**：提交所有代码，包含详细的性能数据

```bash
# 检查修改
git status
git diff

# 添加所有文件
git add src/pages/NPUAnalysis.tsx
git add src/pages/NPUDashboard.tsx
git add src/App.tsx  # 或路由配置文件
git add PERFORMANCE_TEST_RESULTS.txt  # 性能测试结果

# 提交（包含详细性能数据）
git commit -m "feat: 实现 NPU 数据分析和性能监控功能

工作时段: 2026-01-13 04:00-10:40
完成内容:
- 创建 NPU 数据分析页面 (NPUAnalysis.tsx)
- 创建 NPU 性能监控仪表板 (NPUDashboard.tsx)
- 添加路由配置
- 端到端功能测试通过

功能实现:
1. 数据分析页面
   - 自然语言查询输入
   - NPU 推理调用
   - 四色卡片展示
   - 实时性能数据显示

2. 性能监控仪表板
   - 4 个关键指标卡片
   - CPU vs NPU 性能对比图（柱状图）
   - 延迟历史趋势图（折线图）
   - 自动基准测试

性能数据（实测）:
- NPU 推理延迟: XXXms (目标 < 500ms) ✓
- CPU vs NPU 加速比: X.Xx (目标 > 2x) ✓
- 内存占用: XXXmb (目标 < 2GB) ✓
- 端到端分析时间: XXXms

测试结果:
- ✓ 数据分析流程完整
- ✓ 四色卡片正确生成
- ✓ 性能监控仪表板工作正常
- ✓ 所有API调用成功
- ✓ 无错误和警告

下一步:
- 优化 UI 样式
- 添加数据上传功能
- 录制演示视频

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 推送到远程
git push origin main

# 验证推送成功
git log -1
```

---

### 任务 6: 准备演示素材（1 小时）⏰ 10:40-11:40

**要求**：准备演示视频和 PPT 的素材

1. **截图素材**（保存到 `demo/screenshots/`）
   ```
   - 数据分析页面.png
   - 四色卡片展示.png
   - 性能监控仪表板.png
   - CPU vs NPU 对比图.png
   - 性能数据详情.png
   ```

2. **性能数据表格**（保存到 `demo/performance_data.md`）
   ```markdown
   # NPU 性能数据（实测）

   | 指标 | 目标 | 实测值 | 状态 |
   |------|------|--------|------|
   | NPU 推理延迟 | < 500ms | XXXms | ✓ |
   | CPU vs NPU 加速比 | > 2x | X.Xx | ✓ |
   | 内存占用 | < 2GB | XXXmb | ✓ |
   | 吞吐量 | - | XX QPS | - |

   测试环境:
   - 设备: 骁龙 X Elite AIPC
   - 模型: Qwen2.0-7B-SSD
   - 量化: QNN INT8
   - 性能模式: BURST
   ```

3. **算力分配说明**（保存到 `demo/compute_allocation.md`）
   ```markdown
   # 算力单元分配

   ## NPU (70%)
   - 核心模型推理
   - Qwen2.0-7B-SSD INT8
   - 延迟: ~400ms

   ## CPU (20%)
   - 数据预处理
   - 控制逻辑
   - API 服务

   ## GPU (10%)
   - 图像处理（如需要）
   - UI 渲染加速

   ## 选择理由
   - NPU 专为 AI 推理优化
   - 功耗低（~3W vs CPU ~15W）
   - 延迟低（5x 加速比）
   - 不占用 CPU 资源
   ```

---

## ⏰ 时间管理

| 时间段 | 任务 | 检查点 |
|--------|------|--------|
| 04:00-04:10 | 环境验证 | 模型可用 |
| 04:10-06:10 | 数据分析页面 | 基本功能完成 |
| 06:10-08:40 | 性能监控仪表板 | 图表显示正常 |
| 08:40-09:10 | 路由配置 | 页面可访问 |
| 09:10-10:10 | 端到端测试 | 所有测试通过 |
| 10:40-11:40 | 演示素材 | 截图和数据完整 |
| 11:40-11:55 | 最终提交 | Git 推送成功 |

**关键检查点**：
- 06:00 - 数据分析页面 70% 完成
- 08:00 - 性能监控 60% 完成
- 10:00 - 端到端测试开始
- 11:30 - 所有工作完成，准备提交

**如果延期**：
- 优先保证核心功能（数据分析 + 四色卡片）
- 简化性能监控（只保留关键指标）
- 减少演示素材（保留核心截图）

---

## 🚫 严格禁止的行为

1. ❌ **创建任何 .md 文档**（除了 demo/ 目录下的演示素材）
2. ❌ **修改现有文档**（.roomodes, docs/*.md, .specs/*.md）
3. ❌ **写超过 5 行的注释**（代码要自解释）
4. ❌ **优化或重构现有代码**（专注新功能）
5. ❌ **添加不必要的功能**（严格按任务清单）
6. ❌ **修改 Git 提交历史**（不要用 --force）
7. ❌ **跳过验证测试**（每个任务必须验证）

---

## ✅ 成功标准

### 必须达成
- ✅ 数据分析页面完全可用
- ✅ 四色卡片正确展示
- ✅ NPU 推理延迟 < 500ms
- ✅ 性能监控仪表板工作正常
- ✅ 端到端测试全部通过
- ✅ Git 提交包含真实性能数据

### 可选达成
- ⭐ CPU vs NPU 加速比 > 4x
- ⭐ UI 样式精美
- ⭐ 动画流畅
- ⭐ 错误处理完善

---

## 🆘 遇到问题怎么办

### 问题 1: 模型加载失败
```bash
# 检查模型文件
dir C:\model\Qwen2.0-7B-SSD-8380-2.34

# 如果是 .zip，先解压
cd C:\model
powershell Expand-Archive -Path "Qwen2.0-7B-SSD-8380-2.34.zip" -DestinationPath "."

# 重新测试
cd C:\Users\AI-PC-19\Desktop\antinet\backend
python test_model_loading.py
```

### 问题 2: API 调用失败
```bash
# 检查后端是否启动
curl http://localhost:8000/

# 检查端口占用
netstat -ano | findstr :8000

# 重启后端
cd backend
python main.py
```

### 问题 3: 前端编译错误
```bash
# 清理缓存
rm -rf node_modules .next

# 重新安装
pnpm install

# 重启
pnpm dev
```

### 问题 4: 推理延迟超过 500ms
```python
# 在 backend/config.py 确认
QNN_PERFORMANCE_MODE = "BURST"  # 必须是 BURST

# 减少 tokens
max_tokens=64  # 从 128 减到 64

# 或切换到更小模型
MODEL_PATH = "C:/model/llama3.2-3b-8380-qnn2.37"
```

**如果所有方法都失败**：
1. 记录详细错误信息
2. 提交已完成的工作
3. 在提交信息中说明遇到的问题

---

## 📝 工作结束前（11:40-11:55）

### 1. 最终检查（11:40-11:45）
```bash
# 前端检查
pnpm build  # 确保可以构建
pnpm dev    # 确保可以运行

# 后端检查
cd backend
python main.py  # 确保启动成功

# 功能检查
# ✅ 数据分析页面可访问
# ✅ 性能监控页面可访问
# ✅ API 调用成功
# ✅ 四色卡片显示正常
```

### 2. Git 提交（11:45-11:50）
```bash
git status  # 确认所有文件已添加
git log -1  # 确认提交信息完整
```

### 3. 推送到远程（11:50-11:55）
```bash
git push origin main

# 验证推送成功
git log -1 --oneline
```

### 4. 记录工作日志（11:55）
在 Git 提交信息中包含：
- ✅ 完成的功能清单
- ✅ 实测性能数据
- ✅ 遇到的问题和解决方案
- ✅ 下次工作建议

---

## 📊 预期产出

今天工作结束后，项目应该有：

1. **2 个新页面**
   - src/pages/NPUAnalysis.tsx
   - src/pages/NPUDashboard.tsx

2. **路由配置更新**
   - 可访问 /npu-analysis
   - 可访问 /npu-dashboard

3. **演示素材**
   - 5 张功能截图
   - 性能数据表格
   - 算力分配说明

4. **性能数据记录**
   - NPU 推理延迟: < 500ms
   - CPU vs NPU 加速比: > 2x
   - 测试时间和环境

5. **完整的 Git 提交**
   - 详细的提交信息
   - 真实的性能数据
   - 测试结果说明

---

**记住：今天的目标是实现功能，不是写文档！专注于让项目真正跑起来，生成真实的性能数据，为演示视频和 PPT 准备素材。**

**祝工作顺利！** 🚀
