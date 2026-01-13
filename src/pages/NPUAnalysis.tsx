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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-600">错误: {error}</p>
        </div>
      )}

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

      {result && result.cards && (
        <div>
          <h2 className="text-2xl font-bold mb-4">分析结果</h2>
          <FourColorCards cards={result.cards} />
        </div>
      )}
    </div>
  );
}
