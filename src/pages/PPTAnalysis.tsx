import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Presentation, Download, FileText, Loader, CheckCircle, Sparkles, Type } from 'lucide-react';
import { toast } from 'sonner';
import ThemeSelector from '@/components/ThemeSelector';

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

type TabType = 'text' | 'cards';
type ThemeType = 'professional' | 'creative' | 'minimal';

const PPTAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [pptAvailable, setPptAvailable] = useState<boolean | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  
  // 文本转PPT状态
  const [textContent, setTextContent] = useState(`# 产品发布会

欢迎参加我们的新品发布

## 产品特点

### 创新设计
采用最新的设计理念

### 核心优势
- 高性能处理器
- 超长续航
- 轻薄便携
- 精美外观

## 技术参数

1. 处理器：最新一代芯片
2. 内存：16GB 起步
3. 存储：512GB 固态硬盘
4. 显示：高清视网膜屏幕

## 市场定位

面向追求品质的用户群体

## 总结

感谢大家的支持！`);
  const [pptTitle, setPptTitle] = useState('我的演示文稿');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('classic_blue');

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
    }
  };

  // 从文本生成PPT
  const generatePPTFromText = async () => {
    if (!textContent.trim()) {
      toast.warning('请输入内容');
      return;
    }

    if (pptAvailable === false) {
      toast.error('PPT服务不可用，请先安装依赖');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/ppt/generate/from-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textContent,
          title: pptTitle,
          theme: selectedTheme,
          filename: `${pptTitle}_${Date.now()}.pptx`
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pptTitle}.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PPT生成成功！');
      } else {
        const error = await response.json();
        toast.error(`生成失败: ${error.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('生成PPT失败:', error);
      toast.error('生成PPT失败，请检查后端服务');
    } finally {
      setIsExporting(false);
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

  const themes = [
    { id: 'professional', name: 'Professional', icon: '💼', desc: '专业商务', colors: ['#1C2833', '#3498DB', '#F1C40F'] },
    { id: 'creative', name: 'Creative', icon: '🎨', desc: '创意活泼', colors: ['#9B59B6', '#3498DB', '#E67E22'] },
    { id: 'minimal', name: 'Minimal', icon: '✨', desc: '简约现代', colors: ['#2C3E50', '#95A5A6', '#3498DB'] },
  ];

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
                智能生成专业演示文稿 - 支持文本转换和卡片导出
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
                activeTab === 'text'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>文本转PPT</span>
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
                activeTab === 'cards'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>卡片导出</span>
            </button>
          </div>
        </motion.div>

        {/* Content based on active tab */}
        {activeTab === 'text' ? (
          // 文本转PPT面板
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Title Input */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium mb-2">演示文稿标题</label>
                <input
                  type="text"
                  value={pptTitle}
                  onChange={(e) => setPptTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="输入标题..."
                />
              </div>

              {/* Theme Selection - 使用新的主题选择器 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <ThemeSelector
                  selectedTheme={selectedTheme}
                  onThemeSelect={(themeId) => setSelectedTheme(themeId as ThemeType)}
                />
              </div>

              {/* Content Input */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium mb-2">内容（支持 Markdown）</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm resize-none"
                  placeholder="输入内容，支持 Markdown 格式..."
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">#</code> 一级标题（标题页）</div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">##</code> 二级标题（新页面）</div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">-</code> 或 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">*</code> 无序列表</div>
                  <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">1.</code> 有序列表</div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generatePPTFromText}
                disabled={!textContent.trim() || isExporting || pptAvailable === false}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{isExporting ? '生成中...' : '生成 PPT'}</span>
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
                使用说明
              </h3>

              <div className="space-y-6">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">
                    ✨ 功能特点
                  </h4>
                  <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <li>• 支持 Markdown 语法，快速排版</li>
                    <li>• 三种精美主题，适应不同场景</li>
                    <li>• 自动生成专业布局</li>
                    <li>• 秒级生成，即时下载</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">
                    📝 Markdown 语法
                  </h4>
                  <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <div className="flex items-start space-x-2">
                      <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">#</code>
                      <span>一级标题 → 创建标题页</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">##</code>
                      <span>二级标题 → 创建新页面</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">###</code>
                      <span>三级标题 → 页面小标题</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">-</code>
                      <span>无序列表（项目符号）</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">1.</code>
                      <span>有序列表（编号）</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3">
                    🎯 主题说明
                  </h4>
                  <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <li><strong>Professional:</strong> 适合商务汇报、项目提案</li>
                    <li><strong>Creative:</strong> 适合产品发布、市场营销</li>
                    <li><strong>Minimal:</strong> 适合技术分享、学术报告</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // 卡片导出面板
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
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
        )}
      </div>
    </div>
  );
};

export default PPTAnalysis;
