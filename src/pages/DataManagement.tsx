import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, FolderOpen, Search, Trash2, Edit, HardDrive, Clock, FileText, Presentation, FileSpreadsheet, Image, Loader, CheckCircle, Download } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

interface KnowledgeCard {
  id: string;
  type: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  source?: string;
  tags?: string;
  url?: string;
}

const API_BASE = 'http://localhost:8000';

const DataManagement: React.FC = () => {
  const { theme } = useTheme();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // 从后端加载知识卡片
  useEffect(() => {
    loadKnowledgeCards();
  }, []);

  const loadKnowledgeCards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/knowledge/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
        console.log('已加载卡片:', data.length);
      } else {
        console.error('加载卡片失败');
        toast.error('加载知识卡片失败');
      }
    } catch (error) {
      console.error('加载卡片异常:', error);
      toast.error('加载知识卡片失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除卡片
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('确定要删除这张卡片吗？')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/knowledge/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('卡片已删除');
        loadKnowledgeCards();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('删除卡片失败:', error);
      toast.error('删除卡片失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedCards.size === 0) {
      toast.warning('请先选择要删除的卡片');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedCards.size} 张卡片吗？`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedCards).map(cardId =>
          fetch(`${API_BASE}/api/knowledge/cards/${cardId}`, { method: 'DELETE' })
        )
      );
      toast.success(`已删除 ${selectedCards.size} 张卡片`);
      setSelectedCards(new Set());
      loadKnowledgeCards();
    } catch (error) {
      console.error('批量删除失败:', error);
      toast.error('批量删除失败');
    }
  };

  // 编辑卡片
  const handleEditCard = (card: KnowledgeCard) => {
    toast.info('编辑功能开发中');
  };

  // 导出卡片
  const handleExportCards = async () => {
    if (selectedCards.size === 0) {
      toast.warning('请先选择要导出的卡片');
      return;
    }

    try {
      const exportData = cards
        .filter(c => selectedCards.has(c.id))
        .map(card => ({
          id: card.id,
          title: card.title,
          content: card.content,
          type: card.type,
          category: card.category,
          created_at: card.created_at
        }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge_cards_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('卡片导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出卡片失败');
    }
  };

  // 过滤卡片
  const filteredCards = cards.filter(card => {
    const matchesSearch = !searchTerm || 
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      card.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || card.category === filterType;
    return matchesSearch && matchesFilter;
  });

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
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(c => c.id)));
    }
  };

  // 获取卡片类型统计
  const cardStats = {
    total: cards.length,
    fact: cards.filter(c => c.category === '事实').length,
    interpret: cards.filter(c => c.category === '解释').length,
    risk: cards.filter(c => c.category === '风险').length,
    action: cards.filter(c => c.category === '行动').length
  };

  // 获取卡片类型图标
  const getCardIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      '事实': <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-500" /></div>,
      '解释': <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><FileText className="w-4 h-4 text-green-500" /></div>,
      '风险': <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"><FileText className="w-4 h-4 text-yellow-500" /></div>,
      '行动': <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><FileText className="w-4 h-4 text-red-500" /></div>
    };
    return iconMap[category] || iconMap['事实'];
  };

  // 获取卡片类型颜色
  const getCardColor = (category: string) => {
    const colorMap: Record<string, string> = {
      '事实': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      '解释': 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      '风险': 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      '行动': 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    };
    return colorMap[category] || colorMap['事实'];
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  数据管理
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  管理知识卡片和数据文件
                </p>
              </div>
            </div>

            <button
              onClick={loadKnowledgeCards}
              className="flex items-center space-x-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Clock className="w-4 h-4" />
              刷新
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Filters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2 text-indigo-500" />
                搜索卡片
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索标题或内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">类型筛选</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    filterType === 'all' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  全部 ({cards.length})
                </button>
                <button
                  onClick={() => setFilterType('事实')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    filterType === '事实' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  事实 ({cardStats.fact})
                </button>
                <button
                  onClick={() => setFilterType('解释')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    filterType === '解释' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  解释 ({cardStats.interpret})
                </button>
                <button
                  onClick={() => setFilterType('风险')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    filterType === '风险' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  风险 ({cardStats.risk})
                </button>
                <button
                  onClick={() => setFilterType('行动')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    filterType === '行动' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  行动 ({cardStats.action})
                </button>
              </div>
            </div>

            {/* Storage Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-indigo-500" />
                存储统计
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">总卡片</span>
                  <span className="font-bold text-xl text-indigo-600">{cards.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">已选</span>
                  <span className="font-bold text-xl text-indigo-600">{selectedCards.size}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Card List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Actions Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedCards.size === filteredCards.length ? '取消全选' : '全选'}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  已选 {selectedCards.size} / {filteredCards.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedCards.size === 0}
                  className="flex items-center space-x-1 text-sm bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  批量删除
                </button>
                <button
                  onClick={handleExportCards}
                  disabled={selectedCards.size === 0}
                  className="flex items-center space-x-1 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  导出JSON
                </button>
              </div>
            </div>

            {/* Card Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  知识卡片 ({filteredCards.length})
                </h3>
                {isLoading && <Loader className="w-5 h-5 animate-spin text-indigo-500" />}
              </div>

              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredCards.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">暂无卡片数据</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredCards.map(card => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => toggleCardSelection(card.id)}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedCards.has(card.id)
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedCards.has(card.id)}
                            onChange={() => toggleCardSelection(card.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start space-x-3 mb-2">
                              {getCardIcon(card.category)}
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{card.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {card.content}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCard(card);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
