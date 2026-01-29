// src/components/DataAnalysisPanel.tsx - 数据分析面板
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader,
  TrendingUp,
  Database,
  Zap,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// API配置
const API_BASE_URL = 'http://localhost:8000';

// 类型定义（匹配8-Agent后端 /api/generate/cards 返回格式）
interface FourColorCard {
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  category: '事实' | '解释' | '风险' | '行动';
}

interface AnalysisResult {
  query: string;
  cards: Record<string, FourColorCard>;
  facts: Record<string, FourColorCard>;
  explanations: Record<string, FourColorCard>;
  risks: Record<string, FourColorCard>;
  actions: Record<string, FourColorCard>;
  execution_time: number;
  performance: {
    inference_time_ms: number;
    total_time_ms: number;
    model: string;
    device: string;
    tokens_generated: number;
    meets_target: boolean;
  };
  visualizations?: any[];
}

interface HealthStatus {
  status: string;
  model: string;
  model_loaded: boolean;
  device: string;
  data_stays_local: boolean;
}

const DataAnalysisPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // 检查后端健康状态
  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error('后端服务未响应');
      }
      const data = await response.json();
      setHealthStatus(data);

      toast(data.model_loaded ? '[OK] 后端服务正常,NPU模型已加载' : '[!] 后端服务运行中,但模型未加载', {
        className: data.model_loaded
          ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
    } catch (error) {
      toast('✗ 后端服务连接失败,请检查服务是否启动', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      setHealthStatus(null);
    } finally {
      setCheckingHealth(false);
    }
  };

  // 执行数据分析（8-Agent协作）
  const handleAnalyze = async () => {
    if (!query.trim()) {
      toast('请输入查询内容', {
        className: 'bg-amber-50 text-amber-800'
      });
      return;
    }

    setLoading(true);
    try {
      // 调用8-Agent后端API（增加60秒超时）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      const response = await fetch(`${API_BASE_URL}/api/generate/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          data_source: null,  // 可选：数据源路径
          analysis_type: null  // 可选：分析类型
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 503) {
        // 模型未加载
        const errorData = await response.json();
        toast(`模型加载失败: ${errorData.detail}`, {
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100',
          duration: 5000
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '分析请求失败');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      // 显示性能指标
      const perfMsg = `8-Agent协作: ${(data.execution_time * 1000).toFixed(0)}ms`;

      toast(`✓ 8-Agent分析完成! ${perfMsg}`, {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });

      // 自动滚动到结果区域
      setTimeout(() => {
        document.getElementById('analysis-result')?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 300);

    } catch (error) {
      console.error('分析失败:', error);
      
      // 区分不同类型的错误
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast('[超时] 分析超时（60秒），NPU推理时间过长。建议：1) 缩短查询内容 2) 检查NPU状态', {
            className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
            duration: 8000
          });
        } else {
          toast(`✗ 分析失败: ${error.message}`, {
            className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100',
            duration: 5000
          });
        }
      } else {
        toast('✗ 分析失败,请检查后端服务', {
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 卡片颜色配置
  const colorConfig = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: '[数]'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950/40',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: ''
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/40',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: ''
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '[动]'
    }
  };

  // 示例查询 - TODO: 从API加载示例查询或用户自定义
  const [exampleQueries, setExampleQueries] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      {/* 头部状态栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
              <h2 className="text-lg font-bold">智能数据分析</h2>
            </div>
            {healthStatus && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${healthStatus.model_loaded ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                <span className="text-gray-600 dark:text-gray-300">
                  {healthStatus.device} · {healthStatus.model}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={checkHealth}
            disabled={checkingHealth}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {checkingHealth ? <Loader className="animate-spin" size={14} /> : <Zap size={14} />}
            检测服务
          </button>
        </div>
      </div>

      {/* 查询输入区 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="输入您的问题,例如: 分析上个月的销售数据趋势..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  分析中...
                </>
              ) : (
                <>
                  <Search size={16} />
                  开始分析
                </>
              )}
            </button>
          </div>

          {/* 示例查询 */}
          {exampleQueries.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">示例查询:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(example)}
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 分析结果 */}
      {result && (
        <motion.div
          id="analysis-result"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* 性能指标 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90">分析完成</div>
                <div className="text-2xl font-bold mt-1">{Object.keys(result.cards).length} 张卡片</div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">
                  {result.performance.device || 'NPU加速'}
                </div>
                <div className="text-lg font-semibold mt-1">
                  {result.performance.inference_time_ms > 0
                    ? `${result.performance.inference_time_ms.toFixed(0)}ms`
                    : `${result.performance.total_time_ms.toFixed(0)}ms`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* 四色卡片展示 - 8-Agent结果 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(result.cards).map(([key, card], idx) => {
              const config = colorConfig[card.color];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className={`p-4 rounded-xl border-2 ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold ${config.text}`}>
                          {card.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                          {card.category}
                        </span>
                      </div>
                      <p className={`text-sm ${config.text} opacity-90`}>
                        {card.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 无结果提示 */}
      {!result && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Database className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold mb-2">开始您的数据分析</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            输入自然语言查询,AI将为您生成四色卡片分析结果
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={16} />
              <span>NPU加速推理</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={16} />
              <span>数据不出域</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={16} />
              <span>四色卡片沉淀</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalysisPanel;
