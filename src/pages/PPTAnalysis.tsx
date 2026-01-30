import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Presentation, Download, FileText, Loader, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeCard {
  id: string;
  type: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  tags?: string;
}

const API_BASE = 'http://localhost:8000';

const PPTAnalysis: React.FC = () => {
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [pptAvailable, setPptAvailable] = useState<boolean | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // 检查PPT服务状态
  useEffect(() => {
    checkPPTStatus();
    loadKnowledgeCards();
  }, []);

  const checkPPTStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ppt/status`);
      if (response.ok) {
        const data = await response.json();
        setPptAvailable(data.available);
        if (!data.available) {
          toast.warning('PPT服务暂不可用，请安装依赖: pip install python-pptx');
        }
      }
    } catch (error) {
      console.error('检查PPT状态失败:', error);
      setPptAvailable(false);
      toast.error('无法连接到PPT服务');
    }
  };

  // 加载知识卡片
  const loadKnowledgeCards = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error('加载知识卡片失败:', error);
      toast.error('加载知识卡片失败');
    }
  };



  // 导出卡片到PPT
  const exportCardsToPPT = async () => {
    if (selectedCards.size === 0) {
      toast.warning('请至少选择一张卡片');
      return;
    }

    if (pptAvailable === false) {
      toast.error('PPT服务不可用，请先安装依赖');
      return;
    }

    setIsExporting(true);
    try {
      const selectedCardData = cards.filter(c => selectedCards.has(c.id));

      const exportData = {
        cards: selectedCardData.map(card => ({
          type: card.type || (card.category === '事实' ? 'fact' : card.category === '解释' ? 'interpret' : card.category === '风险' ? 'risk' : 'action'),
          title: card.title,
          content: card.content,
          tags: card.tags ? card.tags.split(',') : [],
          created_at: card.created_at
        })),
        title: 'Antinet 四色卡片分析报告',
        include_summary: true
      };

      const response = await fetch(`${API_BASE}/api/ppt/export/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        // 获取文件blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportData.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PPT导出成功！');
      } else {
        const error = await response.json();
        toast.error(`导出失败: ${error.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('导出PPT失败:', error);
      toast.error('导出PPT失败，请检查后端服务');
    } finally {
      setIsExporting(false);
    }
  };

  // 切换卡片选择
  const toggleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map(c => c.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                PPT生成
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                智能导出四色知识卡片为专业演示文稿
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* PPT Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-purple-500" />
                PPT服务状态
              </h3>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm">
                  {pptAvailable === null ? '检查中...' :
                   pptAvailable ? 'PPT功能可用' : 'PPT功能不可用'}
                </span>
                {pptAvailable === true && <CheckCircle className="w-5 h-5 text-green-500" />}

              </div>
            </div>

            {/* Card Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-500" />
                选择知识卡片
              </h3>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  已选择: {selectedCards.size} / {cards.length}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {selectedCards.size === cards.length ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cards.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">暂无知识卡片</p>
                  </div>
                ) : (
                  cards.slice(0, 10).map(card => (
                    <motion.div
                      key={card.id}
                      whileHover={{ x: 2 }}
                      onClick={() => toggleCardSelection(card.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCards.has(card.id)
                          ? 'bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={() => toggleCardSelection(card.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{card.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {card.content}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportCardsToPPT}
              disabled={selectedCards.size === 0 || isExporting || pptAvailable === false}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>{isExporting ? '导出中...' : '导出为PPT'}</span>
            </button>
          </motion.div>

          {/* Right Panel - Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Presentation className="w-5 h-5 mr-2 text-purple-500" />
              PPT预览
            </h3>

            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  模板样式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📊</div>
                      <div className="text-sm">商务简约</div>
                    </div>
                  </div>
                  <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                    <div className="text-center">
                      <div className="text-2xl mb-1">🎨</div>
                      <div className="text-sm">创意多彩</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Options */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  输出选项
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">包含总结页</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <span className="text-sm">自动调整布局</span>
                  </label>
                </div>
              </div>

              {/* Export Info */}
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">
                  导出信息
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">卡片数量:</span>
                    <span className="font-medium">{selectedCards.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">幻灯片数:</span>
                    <span className="font-medium">{selectedCards.size + 2}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PPTAnalysis;
