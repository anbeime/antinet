// src/components/FourColorCardPanel.tsx - 四色卡片知识库面板
// 集成到Hermes Agent系统

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Bot, FileText, Network, RefreshCw, Download, Trash2,
  ChevronDown, ChevronRight, Plus, Check, AlertCircle, Loader,
  Database, Link2, Eye, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface FourColorCard {
  card_id: string;
  card_type: string;
  card_type_cn: string;
  title: string;
  content: string;
  source: string;
  timestamp: string;
  confidence: number;
  tags: string[];
  explore_status: string;
  related_cards: string[];
  color_emoji?: string;
}

interface ExtractionResult {
  cards: FourColorCard[];
  statistics: {
    total: number;
    blue: number;
    green: number;
    yellow: number;
    red: number;
  };
  relations: Array<{
    from: string;
    to: string;
    relation: string;
  }>;
  system_prompt: string;
}

const API_BASE = getApiBaseUrl() + '/api/skill'

const FourColorCardPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'extract' | 'storage' | 'prompt'>('extract');
  const [inputText, setInputText] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [exportedCards, setExportedCards] = useState<FourColorCard[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');

  // 颜色映射
  const colorMap: Record<string, { bg: string; border: string; text: string; label: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-600 dark:text-blue-400', label: '事实' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-600 dark:text-green-400', label: '解释' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-600 dark:text-yellow-400', label: '风险' },
    red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', text: 'text-red-600 dark:text-red-400', label: '行动' }
  };

  // 提取四色卡片
  const handleExtract = async () => {
    if (!inputText.trim()) {
      toast.error('请输入要处理的文本');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/four-color-cards/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          source: source || '用户输入',
          build_relations: true
        })
      });

      if (!response.ok) throw new Error('提取失败');
      
      const data = await response.json();
      setResult(data);
      toast.success(`提取成功！共 ${data.statistics.total} 张卡片`);
      loadStorageStats();
    } catch (error) {
      console.error('提取失败:', error);
      toast.error('四色卡片提取失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载存储统计
  const loadStorageStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/four-color-cards/stats`);
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  // 导出卡片
  const handleExport = async (cardType?: string) => {
    try {
      const url = cardType 
        ? `${API_BASE}/four-color-cards/export?card_type=${cardType}`
        : `${API_BASE}/four-color-cards/export`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('导出失败');
      
      const data = await response.json();
      setExportedCards(data.cards);
      toast.success(`已导出 ${data.total} 张卡片`);
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 加载系统提示词
  const loadSystemPrompt = async () => {
    try {
      const response = await fetch(`${API_BASE}/four-color-cards/system-prompt`);
      if (response.ok) {
        const data = await response.json();
        setSystemPrompt(data.system_prompt);
      }
    } catch (error) {
      console.error('加载提示词失败:', error);
    }
  };

  // 清空存储
  const handleClear = async () => {
    if (!confirm('确定要清空所有四色卡片吗？')) return;
    
    try {
      const response = await fetch(`${API_BASE}/four-color-cards/clear`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('清空失败');
      
      toast.success('存储已清空');
      loadStorageStats();
      setResult(null);
      setExportedCards([]);
    } catch (error) {
      console.error('清空失败:', error);
      toast.error('清空失败');
    }
  };

  useEffect(() => {
    loadStorageStats();
  }, []);

  // 渲染提取面板
  const renderExtractTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">信息来源（可选）</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="如：会议记录、文档、聊天..."
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">待处理文本</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="输入要提取四色卡片的文本内容..."
          rows={8}
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>
      
      <button
        onClick={handleExtract}
        disabled={loading || !inputText.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
        {loading ? '处理中...' : '提取四色卡片'}
      </button>

      {/* 提取结果 */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {/* 统计 */}
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{result.statistics.blue}</div>
              <div className="text-xs text-blue-600">🔵 事实</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{result.statistics.green}</div>
              <div className="text-xs text-green-600">🟢 解释</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.statistics.yellow}</div>
              <div className="text-xs text-yellow-600">🟡 风险</div>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{result.statistics.red}</div>
              <div className="text-xs text-red-600">🔴 行动</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{result.relations.length}</div>
              <div className="text-xs text-gray-500">🔗 关联</div>
            </div>
          </div>

          {/* 卡片列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.cards.map((card, index) => {
              const colors = colorMap[card.card_type] || colorMap.blue;
              return (
                <motion.div
                  key={card.card_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${colors.bg} border ${colors.border} rounded-lg p-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{colors.label}</span>
                        <span className="text-xs text-gray-500">{card.card_id}</span>
                        {card.explore_status === '待探索' && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full">
                            待探索
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{card.content}</p>
                      {card.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {card.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-white/50 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );

  // 渲染存储面板
  const renderStorageTab = () => (
    <div className="space-y-4">
      {storageStats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <div className="text-3xl font-bold">{storageStats.total_cards}</div>
            <div className="text-sm text-gray-500">总卡片数</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <div className="text-3xl font-bold">{storageStats.total_relations}</div>
            <div className="text-sm text-gray-500">总关联数</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleExport()}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> 导出全部
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> 清空
        </button>
      </div>

      {/* 导出卡片列表 */}
      {exportedCards.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h3 className="font-semibold">已导出卡片 ({exportedCards.length})</h3>
          {exportedCards.map(card => {
            const colors = colorMap[card.card_type] || colorMap.blue;
            return (
              <div key={card.card_id} className={`${colors.bg} border ${colors.border} rounded-lg p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{colors.label}</span>
                  <span className="text-xs text-gray-500">{card.card_id}</span>
                </div>
                <p className="text-sm">{card.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 渲染提示词面板
  const renderPromptTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Hermes Agent 系统提示词</h3>
        <button
          onClick={loadSystemPrompt}
          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>
      
      {systemPrompt ? (
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm whitespace-pre-wrap overflow-x-auto">
          {systemPrompt}
        </pre>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>点击刷新加载系统提示词</p>
        </div>
      )}

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">💡 使用说明</h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• 此提示词用于配置 Hermes Agent 的四色卡片能力</li>
          <li>• 端侧模型建议使用精简版提示词（500字以内）</li>
          <li>• 详细规则请参考 knowledge_base/GUIDELINES.md</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">四色卡片知识库</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                集成到 Hermes Agent 的结构化知识管理
              </p>
            </div>
          </div>

          {/* 存储状态 */}
          {storageStats && (
            <div className="flex gap-4 text-sm">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                🔵 {storageStats.by_type?.blue || 0} 事实
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                🟢 {storageStats.by_type?.green || 0} 解释
              </span>
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full">
                🟡 {storageStats.by_type?.yellow || 0} 风险
              </span>
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                🔴 {storageStats.by_type?.red || 0} 行动
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {[
            { key: 'extract', label: '提取卡片', icon: Bot },
            { key: 'storage', label: '知识库', icon: Database },
            { key: 'prompt', label: '系统提示词', icon: FileText }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'storage') handleExport();
                if (tab.key === 'prompt') loadSystemPrompt();
              }}
              className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          {activeTab === 'extract' && renderExtractTab()}
          {activeTab === 'storage' && renderStorageTab()}
          {activeTab === 'prompt' && renderPromptTab()}
        </div>
      </div>
    </div>
  );
};

export default FourColorCardPanel;