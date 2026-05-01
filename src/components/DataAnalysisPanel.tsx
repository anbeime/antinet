// src/components/DataAnalysisPanel.tsx - 数据分析面板
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader,
  TrendingUp,
  Database,
  Zap,
  CheckCircle,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Target
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
  success: boolean;
  query: string;
  cards: Record<string, FourColorCard>;
  facts: Record<string, FourColorCard>;
  explanations: Record<string, FourColorCard>;
  risks: Record<string, FourColorCard>;
  actions: Record<string, FourColorCard>;
  execution_time?: number;
  generated_at?: string;
  raw_output?: string;
  performance: {
    total_time_ms: number;
    inference_time_ms: number;
    meets_target: number;
    device?: string;
  };
}

// 知识卡片类型
interface KnowledgeCard {
  id: number;
  type: string;
  title: string;
  content: string;
  source?: string;
  url?: string;
  category?: string;
  created_at?: string;
}

// 颜色配置
const colorConfig = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: <Lightbulb className="text-green-600 dark:text-green-400" size={24} />
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: <Target className="text-red-600 dark:text-red-400" size={24} />
  }
};

const DataAnalysisPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [showingKnowledge, setShowingKnowledge] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ model_loaded: boolean; device: string; model: string } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // 示例查询 - TODO: 从API加载示例查询或用户自定义
  const [exampleQueries] = useState<string[]>([]);

  // 检查服务健康状态
  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus({
          model_loaded: data.model_loaded,
          device: data.device,
          model: data.model
        });
      }
    } catch (error) {
      console.error('健康检查失败:', error);
      toast.error('服务健康检查失败');
    } finally {
      setCheckingHealth(false);
    }
  };

  // 初始化时检查健康状态
  useEffect(() => {
    checkHealth();
  }, []);

  // 处理分析请求
  const handleAnalyze = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setKnowledgeCards([]);
    setShowingKnowledge(false);

    try {
      // 第一阶段：立即进行知识搜索（秒级响应）
      const knowledgeSearch = async () => {
        try {
          // 使用查询关键词进行模糊搜索
          const searchResponse = await fetch(
            `${API_BASE_URL}/api/knowledge/cards?limit=5`
          );
          
          if (searchResponse.ok) {
            const data = await searchResponse.json();
            const cards: KnowledgeCard[] = data.cards || [];
            // 筛选与查询相关的卡片（简单的关键词匹配）
            const relevantCards = cards.filter(card =>
              card.title.toLowerCase().includes(query.toLowerCase()) ||
              card.content.toLowerCase().includes(query.toLowerCase())
            );
            
            if (relevantCards.length > 0) {
              setKnowledgeCards(relevantCards.slice(0, 3)); // 最多显示3张相关卡片
              setShowingKnowledge(true);
            }
          }
        } catch (error) {
          console.warn('知识搜索失败，继续进行大模型分析:', error);
        }
      };

      // 第二阶段：后台进行NPU大模型分析
      const npuAnalysis = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/generate/cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query.trim() })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          const data: AnalysisResult = await response.json();
          if (data.success) {
            setResult(data);
            setShowingKnowledge(false); // 分析完成后隐藏知识卡片
          } else {
            throw new Error('分析失败');
          }
        } catch (error) {
          console.error('NPU分析失败:', error);
          toast.error('分析失败，请稍后重试');
          setLoading(false);
          throw error;
        }
      };

      // 并行执行两个阶段
      await Promise.all([
        knowledgeSearch(),
        npuAnalysis()
      ]);

    } catch (error) {
      console.error('分析过程出错:', error);
    } finally {
      setLoading(false);
    }
  };

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

      {/* 流式知识卡片展示（第一阶段） */}
      {showingKnowledge && knowledgeCards.length > 0 && !result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2">
              <BookOpen size={20} />
              <div>
                <div className="text-sm opacity-90">相关知识</div>
                <div className="text-lg font-bold">找到 {knowledgeCards.length} 条相关信息</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeCards.map((card, idx) => {
              const config = colorConfig[card.type as keyof typeof colorConfig] || colorConfig.blue;
              return (
                <motion.div
                  key={card.id}
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
                        {card.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                            {card.category}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${config.text} opacity-90 line-clamp-3`}>
                        {card.content}
                      </p>
                      {card.source && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          来源: {card.source}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            正在进行深度分析...
          </div>
        </motion.div>
      )}

      {/* 四色卡片展示（第二阶段） */}
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
      {!result && !loading && !showingKnowledge && (
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