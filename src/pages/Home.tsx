import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Users,
  Network,
  Database,
  Search,
  ChevronRight,
  PlusCircle,
  BarChart3,
  Calendar,
  Lightbulb,
  Briefcase,
  Upload,
  X,
  CheckCircle2,
  Users as UsersIcon,
  TrendingUp,
  Gauge,
  AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import TeamCollaboration from '@/components/TeamCollaboration';
import AnalyticsReport from '@/components/AnalyticsReport';
import CreateCardModal from '@/components/CreateCardModal';
import CardDetailModal from '@/components/CardDetailModal';
import ImportModal from '@/components/ImportModal';
import GTDSystem from '@/components/GTDSystem';
import LuhmannSystemChecklist from '@/components/LuhmannSystemChecklist';
import TeamKnowledgeManagement from '@/components/TeamKnowledgeManagement';
import AttachSprite from '@/components/AttachSprite';
import ChatBotModal from '@/components/ChatBotModal';
import DataAnalysisPanel from '@/components/DataAnalysisPanel';
import NPUPerformanceDashboard from '@/components/NPUPerformanceDashboard';

// 定义卡片类型
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

// 定义表单数据类型
interface CardFormData {
  title: string;
  content: string;
  color: CardColor;
  address: string;
  relatedCards: string[];
}

interface KnowledgeCard {
  id: string;
  color: CardColor;
  title: string;
  content: string;
  address: string;
  createdAt: string;
  relatedCards: string[];
}

// 卡片类型映射
const cardTypeMap = {
  blue: { 
    name: '核心概念', 
    description: '记录重要的想法、理论和主要观点',
    icon: <Brain size={20} />,
    color: 'bg-blue-500',
    hoverColor: 'bg-blue-600',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  green: { 
    name: '关联链接', 
    description: '连接不同概念，发现隐性知识联系',
    icon: <Network size={20} />,
    color: 'bg-green-500',
    hoverColor: 'bg-green-600',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50 dark:bg-green-950/40',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  yellow: { 
    name: '参考来源', 
    description: '保存资料、文档和外部资源链接',
    icon: <Database size={20} />,
    color: 'bg-yellow-500',
    hoverColor: 'bg-yellow-600',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  red: { 
    name: '索引关键词', 
    description: '标记重要术语，便于快速检索和导航',
    icon: <Search size={20} />,
    color: 'bg-red-500',
    hoverColor: 'bg-red-600',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};



const Home: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cards' | 'team' | 'analytics' | 'gtd' | 'checklist' | 'team-knowledge' | 'data-analysis' | 'npu-performance'>('dashboard');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedCardColor, setSelectedCardColor] = useState<CardColor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [createModalColor, setCreateModalColor] = useState<CardColor>('blue');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isChatServiceAvailable, setIsChatServiceAvailable] = useState<boolean>(false);
  
  // Mock数据状态管理
  const [knowledgeStats, setKnowledgeStats] = useState<any[]>([]);
  const [featureHighlights, setFeatureHighlights] = useState<any[]>([]);
  const [applicationScenarios, setApplicationScenarios] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 格式化日期时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // 过滤卡片
  const filteredCards = cards.filter(card => {
    // 颜色过滤
    const colorMatch = !selectedCardColor || card.color === selectedCardColor;
    
     // 搜索过滤
    const searchMatch = !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      card.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.address.toLowerCase().includes(searchQuery.toLowerCase());
      
    return colorMatch && searchMatch;
  });

  // 处理创建卡片
  const handleCreateCard = (cardData: CardFormData) => {
    // 检查是否存在内容完全相同的卡片
    const isDuplicate = cards.some(
      card => card.title.toLowerCase().trim() === cardData.title.toLowerCase().trim() && 
              card.content.toLowerCase().trim() === cardData.content.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      toast('警告：已存在相同内容的卡片，请勿重复创建！', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    // 确保relatedCards数组存在
    const validRelatedCards = cardData.relatedCards || [];
    
    const newCard: KnowledgeCard = {
      id: `card-${Date.now()}`,
      title: cardData.title,
      content: cardData.content,
      color: cardData.color,
      address: cardData.address,
      createdAt: new Date().toISOString(),
      relatedCards: validRelatedCards
    };
    
    // 添加新卡片到卡片列表
    setCards(prevCards => [newCard, ...prevCards]);
    
     // 保存到localStorage
     localStorage.setItem('antinet_cards', JSON.stringify([newCard, ...cards]));
     
     // 显示成功提示
     toast('卡片创建成功！', {
       className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
     });
  };
  
  // 定义GTD类别类型
  type GTDCategory = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

  // 处理导入卡片
  const handleImportCards = (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
    gtdCategory: GTDCategory;
  }>) => {
    // 创建知识卡片
    const newCards: KnowledgeCard[] = importedCards.map(card => ({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: card.title,
      content: card.content,
      color: card.color,
      address: card.address,
      createdAt: new Date().toISOString(),
      relatedCards: []
    }));
    
     // 过滤掉重复的卡片
    const uniqueNewCards = newCards.filter(newCard => 
      !cards.some(
        existingCard => 
          existingCard.title.toLowerCase().trim() === newCard.title.toLowerCase().trim() && 
          existingCard.content.toLowerCase().trim() === newCard.content.toLowerCase().trim()
      )
    );
    
    if (uniqueNewCards.length === 0) {
      toast('导入的所有内容均已存在，未添加新卡片！', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    if (uniqueNewCards.length < newCards.length) {
      const duplicateCount = newCards.length - uniqueNewCards.length;
      toast(`已跳过 ${duplicateCount} 条重复内容，成功导入 ${uniqueNewCards.length} 条新记录！`, {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } else {
      toast(`${uniqueNewCards.length} 条知识记录已成功导入并分类！`, {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    }
    
    // 添加新卡片到卡片列表
    const updatedCards = [...uniqueNewCards, ...cards];
    setCards(updatedCards);
    
    // 保存到localStorage
    localStorage.setItem('antinet_cards', JSON.stringify(updatedCards));
    
    // 切换到GTD系统视图，让用户可以在相应类别下看到导入的记录
    setActiveTab('gtd');
  };

  // 打开创建卡片模态框
  const openCreateModal = (color?: CardColor) => {
    if (color) {
      setCreateModalColor(color);
    }
    setShowCreateModal(true);
    setActiveTab('cards');
  };

  // 打开卡片详情模态框
  const openDetailModal = (card: KnowledgeCard) => {
    setSelectedCard(card);
    setShowDetailModal(true);
  };

  // 处理关联卡片点击
  const handleRelatedCardClick = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
    }
  };

  // 删除卡片
  const handleDeleteCard = (cardId: string) => {
    // 从列表中移除卡片
    setCards(prevCards => prevCards.filter(card => card.id !== cardId));
    
    // 更新localStorage
    const updatedCards = cards.filter(card => card.id !== cardId);
    localStorage.setItem('antinet_cards', JSON.stringify(updatedCards));
  };

  // 从localStorage加载卡片
  React.useEffect(() => {
    const savedCards = localStorage.getItem('antinet_cards');
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (error) {
        console.error('Failed to load cards from localStorage:', error);
      }
    }
  }, []);

  // 检查答疑服务是否可用
  useEffect(() => {
    const checkChatService = async () => {
      try {
        // 尝试连接GenieAPIService (端口8910)
        const response = await fetch('http://localhost:8910/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'Qwen2.0-7B-SSD',
            messages: [{ role: 'system', content: 'test' }],
            max_tokens: 1,
            temperature: 0.1,
          }),
        });
        // 即使返回错误状态码（如400），也说明服务在运行
        // 只有网络错误或连接拒绝才表示服务不可用
        setIsChatServiceAvailable(true);
      } catch (error) {
        console.error('答疑服务不可用:', error);
        setIsChatServiceAvailable(false);
      }
    };

    checkChatService();
    // 每30秒检查一次
    const interval = setInterval(checkChatService, 30000);
    return () => clearInterval(interval);
  }, []);

  // 加载仪表板数据
  useEffect(() => {
    const loadDashboardData = async () => {
      if (activeTab !== 'dashboard') return;
      
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        // TODO: 替换为真实的API端点
        // const response = await fetch('/api/dashboard/stats');
        // const data = await response.json();
        
        // 临时使用空数组，等待后端API实现
        setKnowledgeStats([]);
        setFeatureHighlights([]);
        setApplicationScenarios([]);
        
        console.log('仪表板数据加载完成（待接入真实API）');
      } catch (error) {
        console.error('加载仪表板数据失败:', error);
        setStatsError('加载统计数据失败');
      } finally {
        setStatsLoading(false);
      }
    };

    loadDashboardData();
  }, [activeTab]);

  // 更新卡片
  const handleUpdateCard = (updatedCard: KnowledgeCard) => {
    // 确保关联卡片数组存在
    const cardWithValidRelations = {
      ...updatedCard,
      relatedCards: updatedCard.relatedCards || []
    };
    
    // 更新卡片列表
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? cardWithValidRelations : card
    );
    
    // 设置更新后的卡片列表
    setCards(updatedCards);
    
    // 更新localStorage
    localStorage.setItem('antinet_cards', JSON.stringify(updatedCards));
    
    // 更新选中的卡片
    setSelectedCard(cardWithValidRelations);
    
    // 调试信息 - 可以帮助确认关联卡片是否被正确保存
    console.log('Updated card with relations:', cardWithValidRelations.relatedCards);
  };

  return (
    <div className={`flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div 
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center"
            >
              <Brain className="w-5 h-5 text-white" />
            </motion.div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Antinet智能知识管家
            </h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <Database size={18} />
              <span>概览</span>
            </button>
            <button 
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'cards' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <Briefcase size={18} />
              <span>知识卡片</span>
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'team' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <Users size={18} />
              <span>团队协作</span>
            </button>
            <button 
              onClick={() => setActiveTab('team-knowledge')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'team-knowledge' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <UsersIcon size={18} />
              <span>团队知识管理</span>
            </button>
               <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <BarChart3 size={18} />
              <span>分析报告</span>
            </button>
            <button 
              onClick={() => setActiveTab('gtd')}
              className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'gtd' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
            >
              <Calendar size={18} />
               <span>GTD系统</span>
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'checklist' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
              >
                <CheckCircle2 size={18} />
                <span>功能检查</span>
              </button>
              <button 
                onClick={() => setActiveTab('data-analysis')}
                className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'data-analysis' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
              >
                <TrendingUp size={18} />
                <span>数据分析</span>
              </button>
              <button
                onClick={() => setActiveTab('npu-performance')}
                className={`flex items-center space-x-1 py-2 border-b-2 ${activeTab === 'npu-performance' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent'}`}
              >
                <Gauge size={18} />
                <span>NPU性能</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="切换主题"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center space-x-1 text-sm font-medium transition-colors"
                onClick={() => openCreateModal()}
              >
                <PlusCircle size={16} />
                <span>新建卡片</span>
              </motion.button>
            </div>
          </div>
        </div>
       </header>

      {/* 导入模态框按钮 - 仅在卡片视图显示 */}
      {activeTab === 'cards' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 mb-6"
        >
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={16} />
              <span>导入知识记录</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* 主内容区域 */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* 仪表板视图 */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧区域：统计信息 */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <h2 className="text-xl font-bold mb-4">知识概览</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(cardTypeMap).map(([color, type]) => (
                    <div 
                      key={color}
                      className={`${type.bgColor} border ${type.borderColor} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => {
                        setActiveTab('cards');
                        setSelectedCardColor(color as CardColor);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`${type.textColor} font-semibold`}>{type.name}</span>
                        <div className={`${type.color} p-2 rounded-full`}>
                          {type.icon}
                        </div>
                      </div>
                      <p className="text-2xl font-bold">{cards.filter(c => c.color === color).length}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* 最近活动卡片 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">最近知识活动</h2>
                  <button className="text-blue-600 dark:text-blue-400 text-sm flex items-center hover:underline">
                    查看全部 <ChevronRight size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {cards.slice(0, 3).map(card => (
                    <motion.div 
                      key={card.id}
                      whileHover={{ x: 5 }}
                      className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className={`${cardTypeMap[card.color].color} w-2 h-2 rounded-full mt-2 mr-3`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">{card.title}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(card.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{card.content}</p>
                        <div className="mt-2 flex items-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cardTypeMap[card.color].bgColor} ${cardTypeMap[card.color].textColor} flex items-center`}>
                            {cardTypeMap[card.color].icon}
                            <span className="ml-1">{cardTypeMap[card.color].name}</span>
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-3">地址: {card.address}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

               {/* 特性亮点 */}
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.4 }}
                 className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
               >
                 <h2 className="text-xl font-bold mb-4">特性亮点</h2>
                 {statsLoading ? (
                   <div className="text-center py-8">
                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
                   </div>
                 ) : statsError ? (
                   <div className="text-center py-8">
                     <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                     <p className="text-red-600 dark:text-red-400">{statsError}</p>
                   </div>
                 ) : featureHighlights.length === 0 ? (
                   <div className="text-center py-8">
                     <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                     <p className="text-gray-500 dark:text-gray-400">暂无特性亮点数据</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {featureHighlights.map((feature, index) => (
                       <motion.div 
                         key={index}
                         whileHover={{ x: 5 }}
                         className="flex items-start p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                       >
                         <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                           {feature.icon}
                         </div>
                         <div>
                           <h3 className="font-medium">{feature.title}</h3>
                           <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </motion.div>
            </div>

             {/* 右侧区域：统计图表和特性 */}
             <div className="space-y-6">
               {/* 知识分布图表 */}
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.3 }}
                 className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
               >
                 <h2 className="text-xl font-bold mb-4">知识分布</h2>
                 {statsLoading ? (
                   <div className="text-center py-8">
                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
                   </div>
                 ) : cards.length === 0 ? (
                   <div className="text-center py-8">
                     <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                     <p className="text-gray-500 dark:text-gray-400">暂无卡片数据</p>
                   </div>
                 ) : (
                   <>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                               { name: '蓝色卡片', value: cards.filter(c => c.color === 'blue').length, color: '#3b82f6' },
                               { name: '绿色卡片', value: cards.filter(c => c.color === 'green').length, color: '#22c55e' },
                               { name: '黄色卡片', value: cards.filter(c => c.color === 'yellow').length, color: '#eab308' },
                               { name: '红色卡片', value: cards.filter(c => c.color === 'red').length, color: '#ef4444' },
                             ]}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             fill="#8884d8"
                             paddingAngle={5}
                             dataKey="value"
                             label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                             labelLine={false}
                           >
                             {[
                               { name: '蓝色卡片', value: cards.filter(c => c.color === 'blue').length, color: '#3b82f6' },
                               { name: '绿色卡片', value: cards.filter(c => c.color === 'green').length, color: '#22c55e' },
                               { name: '黄色卡片', value: cards.filter(c => c.color === 'yellow').length, color: '#eab308' },
                               { name: '红色卡片', value: cards.filter(c => c.color === 'red').length, color: '#ef4444' },
                             ].map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="grid grid-cols-2 gap-2 mt-4">
                       {[
                         { name: '蓝色卡片', color: '#3b82f6' },
                         { name: '绿色卡片', color: '#22c55e' },
                         { name: '黄色卡片', color: '#eab308' },
                         { name: '红色卡片', color: '#ef4444' },
                       ].map((stat, index) => (
                         <div key={index} className="flex items-center space-x-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                           <span className="text-sm">{stat.name}</span>
                         </div>
                       ))}
                     </div>
                   </>
                 )}
               </motion.div>

               {/* 提升知识管理效率 */}
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.5 }}
                 className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-md p-6 text-white"
               >
                 <h2 className="text-xl font-bold mb-2">提升知识管理效率</h2>
                 <p className="text-blue-100 mb-4 text-sm">开始使用AI增强的卢曼卡片系统，加速团队知识发展</p>
                 <div className="space-y-2">
                   {Object.entries(cardTypeMap).map(([color, type]) => (
                     <motion.button
                       key={color}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       className="w-full bg-white/20 hover:bg-white/30 rounded-lg p-3 text-left flex items-center justify-between backdrop-blur-sm transition-colors"
                       onClick={() => openCreateModal(color as CardColor)}
                     >
                       <div className="flex items-center">
                         <div className={`${type.color} p-1.5 rounded-lg mr-3`}>
                           {type.icon}
                         </div>
                         <span>创建{type.name}卡片</span>
                       </div>
                       <ChevronRight size={16} />
                     </motion.button>
                   ))}
                 </div>
               </motion.div>

               {/* 企业应用场景 */}
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.7 }}
                 className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
               >
                 <h2 className="text-xl font-bold mb-4">企业应用场景</h2>
                 {statsLoading ? (
                   <div className="text-center py-8">
                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">加载中...</p>
                   </div>
                 ) : statsError ? (
                   <div className="text-center py-8">
                     <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                     <p className="text-red-600 dark:text-red-400">{statsError}</p>
                   </div>
                 ) : applicationScenarios.length === 0 ? (
                   <div className="text-center py-8">
                     <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                     <p className="text-gray-500 dark:text-gray-400">暂无应用场景数据</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {applicationScenarios.map((scenario, index) => (
                       <motion.div 
                         key={index}
                         whileHover={{ x: 5 }}
                         className="flex items-start"
                       >
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0">
                           {scenario.icon}
                         </div>
                         <div>
                           <h3 className="font-medium">{scenario.title}</h3>
                           <p className="text-sm text-gray-600 dark:text-gray-300">{scenario.description}</p>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </motion.div>
             </div>
          </div>
        )}

        {/* 知识卡片视图 */}
        {activeTab === 'cards' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">知识卡片库</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
                  onClick={() => openCreateModal()}
                >
                  <PlusCircle size={16} />
                  <span>新建卡片</span>
                </motion.button>
               </div>
               <div className="mb-6 relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                 <input
                   type="text"
                   placeholder="搜索卡片标题或内容..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                 />
                 {searchQuery && (
                   <button 
                     onClick={() => setSearchQuery('')}
                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                   >
                     <X size={16} />
                   </button>
                 )}
               </div>
               <div className="flex flex-wrap gap-2 mb-6">
                 <button 
                   onClick={() => setSelectedCardColor(null)}
                   className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCardColor === null ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                 >
                   全部卡片
                 </button>
                 {Object.entries(cardTypeMap).map(([color, type]) => (
                   <button 
                     key={color}
                     onClick={() => setSelectedCardColor(color as CardColor)}
                     className={`px-4 py-2 rounded-full text-sm font-medium flex items-center transition-colors ${selectedCardColor === color ? `${type.bgColor} ${type.textColor} font-semibold` : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                   >
                     <div className={`${type.color} w-2 h-2 rounded-full mr-2`}></div>
                     {type.name}
                   </button>
                 ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCards.map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    className={`border rounded-xl overflow-hidden transition-all ${cardTypeMap[card.color].borderColor}`}
                  >
                    <div className={`${cardTypeMap[card.color].bgColor} p-4 border-b ${cardTypeMap[card.color].borderColor}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className={`${cardTypeMap[card.color].color} p-2 rounded-full mr-3`}>
                            {cardTypeMap[card.color].icon}
                          </div>
                          <h3 className="font-semibold">{card.title}</h3>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${cardTypeMap[card.color].color} text-white`}>{card.address}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800">
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{card.content}</p>
                       <div className="flex justify-between items-center">
                         <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(card.createdAt)}</span>
                         <motion.div 
                           whileHover={{ x: 3 }}
                           className="flex items-center text-blue-600 dark:text-blue-400 text-sm cursor-pointer hover:underline"
                           onClick={() => openDetailModal(card)}
                         >
                           查看详情 <ChevronRight size={14} />
                         </motion.div>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
               {filteredCards.length === 0 && (
                 <div className="text-center py-16">
                   <div className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                     {searchQuery ? <Search size={80} /> : <Database size={80} />}
                   </div>
                   <h3 className="text-xl font-semibold mb-2">
                     {searchQuery ? '未找到匹配的卡片' : '暂无卡片'}
                   </h3>
                   <p className="text-gray-500 dark:text-gray-400 mb-6">
                     {searchQuery 
                       ? '尝试调整搜索关键词或清除筛选条件' 
                       : '点击"新建卡片"开始创建您的第一张知识卡片'
                     }
                   </p>
                   {searchQuery ? (
                     <button 
                       className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-2 rounded-full text-sm font-medium transition-colors"
                       onClick={() => setSearchQuery('')}
                     >
                       清除搜索
                     </button>
                   ) : (
                     <button 
                       className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
                       onClick={() => openCreateModal()}
                     >
                       新建卡片
                     </button>
                   )}
                 </div>
               )}
            </div>
          </motion.div>
        )}

        {/* 团队协作视图 */}
        {activeTab === 'team' && (
          <TeamCollaboration />
        )}

        {/* 团队知识管理视图 */}
        {activeTab === 'team-knowledge' && (
          <TeamKnowledgeManagement />
        )}

        {/* 分析报告视图 */}
        {activeTab === 'analytics' && (
          <AnalyticsReport />
        )}

         {/* GTD系统视图 */}
         {activeTab === 'gtd' && (
           <GTDSystem />
         )}
         
         {/* 功能检查清单视图 */}
         {activeTab === 'checklist' && (
           <LuhmannSystemChecklist />
         )}

         {/* 数据分析视图 */}
         {activeTab === 'data-analysis' && (
           <DataAnalysisPanel />
         )}

         {/* NPU性能监控视图 */}
         {activeTab === 'npu-performance' && (
           <NPUPerformanceDashboard />
         )}
       </main>

      {/* 页脚 */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold">Antinet智能知识管家</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 企业AI知识管理系统. 基于卢曼卡片盒方法的智能解决方案.
            </div>
          </div>
        </div>
      </footer>

       {/* 新建卡片模态框 */}
       <CreateCardModal
         isOpen={showCreateModal}
         onClose={() => setShowCreateModal(false)}
         onSave={handleCreateCard}
         initialColor={createModalColor}
         existingCards={cards.map(card => ({ id: card.id, title: card.title }))}
       />

         {/* 卡片详情模态框 */}
         <CardDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          card={selectedCard}
          allCards={cards}
          onDelete={handleDeleteCard}
          onRelatedCardClick={handleRelatedCardClick}
          onUpdateCard={handleUpdateCard}
          onCreateRecommendedCard={(title, reason) => {
            // 关闭当前模态框
            setShowDetailModal(false);
            // 短暂延迟后打开创建卡片模态框，确保动画流畅
            setTimeout(() => {
              setCreateModalColor('blue'); // 默认使用蓝色卡片（核心概念）
              setActiveTab('cards');
              // 在实际应用中，这里可以预填充创建卡片的表单
              toast(`准备创建新卡片：${title}`, {
                className: 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
              });
              // 打开创建卡片模态框
              setShowCreateModal(true);
            }, 300);
          }}
        />
        
        {/* 导入模态框 */}
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportCards}
        />
        
        {/* 聊天机器人模态框 */}
        <ChatBotModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
        />
        
        <AttachSprite onClick={() => setShowChatModal(true)} serviceAvailable={isChatServiceAvailable} />
      </div>
  );
};

export default Home;