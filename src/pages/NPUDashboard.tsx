import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { npuService, BenchmarkResponse } from '@/services/npuService';

export default function NPUDashboard() {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyHistory, setLatencyHistory] = useState<any[]>([]);

  const runBenchmark = async () => {
    setLoading(true);
    try {
      const result = await npuService.benchmark();
      setBenchmarkData(result);

      setLatencyHistory(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          latency: result.avg_latency_ms
        }
      ].slice(-20));

    } catch (error) {
      console.error('基准测试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBenchmark();
  }, []);

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
              {benchmarkData.memory_usage_mb < 2000 ? '[OK] 正常' : '[!] 偏高'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">吞吐量</div>
            <div className="text-3xl font-bold">{(1000 / benchmarkData.avg_latency_ms).toFixed(1)}</div>
            <div className="text-sm mt-1 text-gray-500">QPS</div>
          </div>
        </div>
      )}

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
