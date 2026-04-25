import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Presentation, Download, FileText, Loader, CheckCircle, Sparkles, Type, Eye, FileSpreadsheet, Network, Brain, Layers, ChevronRight, Search, Film, Video } from 'lucide-react';
import { toast } from 'sonner';
import ThemeSelector from '@/components/ThemeSelector';
import KnowledgeGraph from '@/components/KnowledgeGraph';

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

type TabType = 'text' | 'cards' | 'project';
type ThemeType = 'professional' | 'creative' | 'minimal';

const PPTAnalysis: React.FC = () => {
  const navigate = useNavigate();
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
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('professional');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [narrativeTemplate, setNarrativeTemplate] = useState<string>('problem-analysis-solution');
  const [projectCards, setProjectCards] = useState<any[]>([]);
  const [projectCardsLoading, setProjectCardsLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  
  // 检查PPT服务状态
  useEffect(() => {
    checkPPTStatus();
    loadKnowledgeCards();
    loadProjects();
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
        // 兼容: 可能返回 {cards: [...]} 或 [...]
        const cardList = Array.isArray(data) ? data : (data.cards || data.data || []);
        setCards(cardList);
      }
    } catch (error) {
      console.error('加载知识卡片失败:', error);
      setCards([]);
    }
  };

  // 加载专题列表
  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/research/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data || []);
      }
    } catch (error) {
      console.error('加载专题失败:', error);
    }
  };

  // 加载专题下的卡片
  const loadProjectCards = async (projectId: number) => {
    setProjectCardsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/research/projects/${projectId}/cards`);
      if (response.ok) {
        const data = await response.json();
        setProjectCards(Array.isArray(data) ? data : []);
      } else {
        setProjectCards([]);
      }
    } catch (error) {
      console.error('加载专题卡片失败:', error);
      setProjectCards([]);
    } finally {
      setProjectCardsLoading(false);
    }
  };

  // 选择专题时加载卡片
  useEffect(() => {
    if (selectedProject) {
      loadProjectCards(selectedProject);
      setShowGraph(false);
    } else {
      setProjectCards([]);
    }
  }, [selectedProject]);

  // 过滤搜索卡片
  const filteredCards = cardSearchQuery.trim()
    ? cards.filter(card => 
        card.title.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        card.content.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        (card.category && card.category.toLowerCase().includes(cardSearchQuery.toLowerCase())) ||
        (card.tags && card.tags.toLowerCase().includes(cardSearchQuery.toLowerCase()))
      )
    : cards;

  // 从专题生成PPT
  const generatePPTFromProject = async () => {
    if (!selectedProject) {
      toast.error('请选择专题');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/ppt/export/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject,
          narrative_template: narrativeTemplate,
          title: projects.find(p => p.id === selectedProject)?.name || '专题报告'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.filename) {
          // 保存文件名
          sessionStorage.setItem('lastPPTFileName', data.filename);
          
          toast.success('PPT生成成功！');
          
          // 跳转到预览页面
          window.location.href = '/ppt-viewer';
        } else {
          toast.error(`生成失败: ${data.detail || '未知错误'}`);
        }
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

    // 清除旧的sessionStorage
    sessionStorage.removeItem('lastPPTFileName');
    
    setIsExporting(true);
    try {
      const response = await fetch(`${API_BASE}/api/ppt/generate/from-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textContent,
          title: pptTitle,
          theme: selectedTheme
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.filename) {
          // 保存文件名到 sessionStorage，跳转到预览页时读取
          console.log('[PPTAnalysis] 生成成功，文件名:', data.filename);
          sessionStorage.setItem('lastPPTFileName', data.filename);
          
          // 自动跳转到预览页面
          window.location.href = '/ppt-viewer';
        } else {
          const error = await response.json();
          toast.error(`生成失败: ${error.detail || '未知错误'}`);
        }
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
        const data = await response.json();
        
        if (data.success && data.filename) {
          // 保存文件名
          sessionStorage.setItem('lastPPTFileName', data.filename);
          
          // 提示下载（通过API获取文件）
          toast.success('PPT导出成功！', {
            action: {
              label: '下载',
              onClick: () => window.open(`${API_BASE}/api/ppt/file?filename=${data.filename}`, '_blank')
            }
          });
          
          // 自动跳转到预览页面
          window.location.href = '/ppt-viewer';
        } else {
          const error = await response.json();
          toast.error(`导出失败: ${error.detail || '未知错误'}`);
        }
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
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(c => c.id)));
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
            <button
              onClick={() => setActiveTab('project')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all ${
                activeTab === 'project'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>专题导出</span>
            </button>
          </div>
</motion.div>

        {/* Content based on active tab */}
        {activeTab === 'text' ? (
          // 文本转PPT面板
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

              {/* Theme Selection */}
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
              </div>

              <button
                onClick={generatePPTFromText}
                disabled={!textContent.trim() || isExporting || pptAvailable === false}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{isExporting ? '生成中...' : '生成 PPT'}</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-purple-500" />
                使用说明
              </h3>
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">✨ 智能生成</h4>
                  <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <li>• 输入内容即可生成完整PPT</li>
                    <li>• 支持Markdown语法</li>
                    <li>• 多种主题风格可选</li>
                    <li>• 秒级生成，即时下载</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">📝 Markdown 语法</h4>
                  <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <div className="flex items-start space-x-2"><code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">#</code><span>一级标题</span></div>
                    <div className="flex items-start space-x-2"><code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">##</code><span>二级标题</span></div>
                    <div className="flex items-start space-x-2"><code className="bg-white dark:bg-gray-700 px-2 py-1 rounded text-xs">-</code><span>无序列表</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : activeTab === 'project' ? (
          // 专题导出面板
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Presentation className="w-5 h-5 mr-2 text-purple-500" />选择专题</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {projects.length === 0 ? <p className="text-gray-500 text-center py-4">暂无专题</p> : projects.map(p => (
                    <div key={p.id} onClick={() => setSelectedProject(p.id)} className={`p-4 rounded-lg cursor-pointer border-2 ${selectedProject === p.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-center space-x-3"><span className="text-2xl">{p.icon || '📁'}</span><div><p className="font-medium">{p.name}</p><p className="text-sm text-gray-500">{p.description || '无描述'}</p></div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Sparkles className="w-5 h-5 mr-2 text-purple-500" />叙事模板</h3>
                <div className="space-y-2">
                  {[{id:'problem-analysis-solution',name:'问题-分析-方案'},{id:'timeline',name:'时间线'},{id:'compare-contrast',name:'对比分析'},{id:'swot-analysis',name:'SWOT分析'}].map(t => (
                    <label key={t.id} className={`flex items-center p-3 rounded-lg cursor-pointer ${narrativeTemplate === t.id ? 'bg-purple-50 border-2 border-purple-500' : 'bg-gray-50 border-2 border-transparent'}`}>
                      <input type="radio" name="nt" value={t.id} checked={narrativeTemplate === t.id} onChange={(e) => setNarrativeTemplate(e.target.value)} className="mr-3" />
                      <div><p className="font-medium">{t.name}</p></div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={generatePPTFromProject} disabled={!selectedProject || isExporting} className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg disabled:opacity-50">
                {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{isExporting ? '生成中...' : '从专题生成PPT'}</span>
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Eye className="w-5 h-5 mr-2 text-purple-500" />功能说明</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4"><h4 className="font-semibold text-blue-700 mb-2">📚 专题导出</h4><p className="text-sm">从专题一键生成完整PPT</p></div>
                  <div className="bg-green-50 rounded-lg p-4"><h4 className="font-semibold text-green-700 mb-2">🎯 叙事模板</h4><p className="text-sm">问题-分析-方案/时间线/对比/SWOT</p></div>
                  <div className="bg-purple-50 rounded-lg p-4"><h4 className="font-semibold text-purple-700 mb-2">✨ 自动生成</h4><p className="text-sm">封面→目录→章节→内容→总结</p></div>
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
                    已选择: {selectedCards.size} / {filteredCards.length}
                  </span>
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {selectedCards.size === filteredCards.length ? '取消全选' : '全选'}
                  </button>
                </div>

                {/* 搜索卡片 */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={cardSearchQuery}
                    onChange={(e) => setCardSearchQuery(e.target.value)}
                    placeholder="搜索卡片标题、内容、类型..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCards.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {cardSearchQuery ? '未找到匹配的卡片' : '暂无知识卡片'}
                      </p>
                    </div>
                  ) : (
                    filteredCards.slice(0, 50).map(card => (
                      <motion.div
                        key={card.id}
                        whileHover={{ x: 2 }}
                        onClick={() => toggleCardSelection(card.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedCards.has(card.id)
                            ? 'bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-500'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedCards.has(card.id)}
                            onChange={() => toggleCardSelection(card.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                card.category === '事实' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                card.category === '解释' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                card.category === '风险' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                              }`}>
                                {card.category}
                              </span>
                              <span className="font-medium truncate">{card.title}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{card.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={exportCardsToPPT}
                disabled={selectedCards.size === 0 || isExporting || pptAvailable === false}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{isExporting ? '导出中...' : `导出 ${selectedCards.size} 张卡片为PPT`}</span>
              </button>

              <button
                onClick={() => {
                  if (selectedCards.size === 0) {
                    alert('请先选择卡片');
                    return;
                  }
                  // TODO: 调用Remotion API生成视频
                  // 通过sessionStorage传递选中的卡片
                  const selectedCardsList = cards.filter(c => selectedCards.has(c.id));
                  sessionStorage.setItem('remotionCards', JSON.stringify(selectedCardsList));
                  window.open('/remotion', '_blank');
                }}
                disabled={selectedCards.size === 0}
                className="w-full flex items-center justify-center space-x-2 mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Film className="w-5 h-5" />
                <span>生成动态演示视频</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {/* Export Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  导出预览
                </h3>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">卡片统计</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedCards.size === 0 ? 0 : cards.filter(c => selectedCards.has(c.id) && c.category === '事实').length}
                        </div>
                        <div className="text-xs text-gray-500">事实卡片</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedCards.size === 0 ? 0 : cards.filter(c => selectedCards.has(c.id) && c.category === '解释').length}
                        </div>
                        <div className="text-xs text-gray-500">解释卡片</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-900/30 rounded">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedCards.size === 0 ? 0 : cards.filter(c => selectedCards.has(c.id) && c.category === '风险').length}
                        </div>
                        <div className="text-xs text-gray-500">风险卡片</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedCards.size === 0 ? 0 : cards.filter(c => selectedCards.has(c.id) && c.category === '行动').length}
                        </div>
                        <div className="text-xs text-gray-500">行动卡片</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">生成内容</h4>
                    <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                      <li>• 自动生成封面页和目录页</li>
                      <li>• 每张卡片生成独立页面</li>
                      <li>• 自动分类和颜色标注</li>
                      <li>• 包含总结页</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">选中卡片:</span>
                      <span className="font-medium">{selectedCards.size}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-600 dark:text-gray-400">幻灯片数:</span>
                      <span className="font-medium">{selectedCards.size + 2}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 其他在线查看入口 */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">其他在线查看</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => window.open('http://localhost:3000/office-docs', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400">在线表格</span>
            </button>
            <button
              onClick={() => window.open('http://localhost:3000/pdf-viewer', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span className="text-red-700 dark:text-red-400">PDF查看器</span>
            </button>
            <button
              onClick={() => window.open('http://localhost:3000/report-automation', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 dark:text-purple-400">报表生成</span>
            </button>
            <button
              onClick={() => window.open('http://localhost:3000/excel-analysis', '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-400">Excel分析</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPTAnalysis;
