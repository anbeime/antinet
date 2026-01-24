import { useState } from 'react';
import { motion } from 'framer-motion';
import { npuService, AnalyzeResponse } from '@/services/npuService';
import FourColorCards from '@/components/FourColorCards';
import { Brain, Clock, Gauge, CheckCircle2, AlertTriangle } from 'lucide-react';

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
      });

      setResult(response);

      if (response.performance) {
        console.log('8-Agent 协作完成');
        console.log('推理延迟:', response.performance.inference_time_ms, 'ms');
        console.log('总耗时:', response.performance.total_time_ms, 'ms');
        console.log('是否达标:', response.performance.meets_target);
      }
    } catch (err: any) {
      setError(err.message || '分析失败');
      console.error('分析错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          NPU 智能分析
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          基于 8-Agent 协作架构的智能数据分析系统
        </p>
      </div>

      {/* 查询输入框 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          输入您的查询
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：分析最近一个月的销售数据趋势，识别潜在风险并给出改进建议"
          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          rows={4}
          disabled={loading}
        />

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                分析中...
              </>
            ) : (
              <>
                <Brain size={20} />
                开始分析
              </>
            )}
          </button>

          {loading && (
            <button
              onClick={() => setLoading(false)}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-red-800 mb-1">分析失败</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 性能数据 */}
      {result && result.performance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-6 mb-8 border border-blue-200 dark:border-gray-700"
        >
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gauge size={20} />
            性能数据
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                <Clock size={16} />
                推理延迟
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.performance.inference_time_ms}ms
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
              <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                总耗时
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.performance.total_time_ms}ms
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
              <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                设备
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {result.performance.device}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm">
              <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                性能达标
              </div>
              <div className={`text-lg font-bold flex items-center gap-2 ${result.performance.meets_target ? 'text-green-600' : 'text-red-600'}`}>
                {result.performance.meets_target ? (
                  <>
                    <CheckCircle2 size={20} />
                    是
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} />
                    否
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 分析结果 */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain size={24} />
            8-Agent 协作分析结果
          </h2>

          <FourColorCards />

          {result.generated_at && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              生成时间: {new Date(result.generated_at).toLocaleString('zh-CN')}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
