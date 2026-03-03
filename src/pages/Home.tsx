import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Network,
  Database,
  Search,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  Lightbulb,
  Briefcase,
  Upload,
  X,
  TrendingUp,
  AlertCircle,
  Presentation,
  Table,
  FolderOpen,
  Cpu,
  Sparkles,
  FileText,
  Eye,
  Trash2,
  Layers,
  ListTodo,
  Bot,
  Users
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import CreateCardModal from '@/components/CreateCardModal';
import CardDetailModal from '@/components/CardDetailModal';
import ImportModal from '@/components/ImportModal';
import DataAnalysisPanel from '@/components/DataAnalysisPanel';
import PPTAnalysis from '@/pages/PPTAnalysis';
import ExcelAnalysis from '@/pages/ExcelAnalysis';
import DataManagement from '@/pages/DataManagement';
import AgentSystem from '@/pages/AgentSystem';
import SkillCenter from '@/pages/SkillCenter';
import PDFAnalysis from '@/pages/PDFAnalysis';
import BatchProcess from '@/pages/BatchProcess';
import MultiModel from '@/pages/MultiModel';
import FormatConverter from '@/pages/FormatConverter';
import TeamCollaboration from '@/components/TeamCollaboration';
import VirtualOfficeMeeting from '@/pages/VirtualOfficeMeeting';


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
  // 主菜单和子菜单状态
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cards' | 'cards-management' | 'data-management' | 'pdf-analysis' | 'ppt-analysis' | 'excel-analysis' | 'batch-process' | 'data-analysis' | 'agent-system' | 'skill-center' | 'multi-model' | 'format-converter' | 'team-collaboration' | 'virtual-office-meeting'>('dashboard');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedCardColor, setSelectedCardColor] = useState<CardColor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [managementSearchQuery, setManagementSearchQuery] = useState('');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [createModalColor, setCreateModalColor] = useState<CardColor>('blue');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAllCardsModal, setShowAllCardsModal] = useState(false);
  
  // 卡片管理筛选和分页
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CardColor>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Mock数据状态管理
  const [featureHighlights, setFeatureHighlights] = useState<any[]>([]);
  const [applicationScenarios, setApplicationScenarios] = useState<any[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<any[]>([]);
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
  const handleCreateCard = async (cardData: CardFormData) => {
    // 检查是否存在内容完全相同的卡片
    const isDuplicate = cards.some(
      card => card.title.toLowerCase().trim() === cardData.title.toLowerCase().trim() && 
              card.content.toLowerCase().trim() === cardData.content.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      toast.warning('警告：已存在相同内容的卡片，请勿重复创建！', {
        className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      });
      return;
    }
    
    try {
      // 调用后端API创建卡片
      const response = await fetch('http://localhost:8000/api/knowledge/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: cardData.color,
          title: cardData.title,
          content: cardData.content,
          category: cardData.color === 'blue' ? '事实' : 
                    cardData.color === 'green' ? '解释' : 
                    cardData.color === 'yellow' ? '风险' : '行动'
        })
      });

      if (!response.ok) {
        throw new Error('创建失败');
      }

      const newCard = await response.json();
      
      // 转换为前端格式并添加到列表
      const formattedCard: KnowledgeCard = {
        id: String(newCard.id),
        title: newCard.title,
        content: newCard.content,
        color: newCard.card_type || cardData.color,
        address: newCard.address || cardData.address,
        createdAt: newCard.created_at || new Date().toISOString(),
        relatedCards: []
      };
      
      setCards(prevCards => [formattedCard, ...prevCards]);
      
      // 如果是风险或行动卡片，自动同步到GTD
      if (newCard.card_type === 'yellow' || newCard.card_type === 'red' || cardData.color === 'yellow' || cardData.color === 'red') {
        try {
          await fetch(`http://localhost:8000/api/data/gtd-tasks/sync-card/${newCard.id}`, { method: 'POST' });
          toast.success(`卡片创建成功！已自动添加到任务管理`, {
            className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
          });
        } catch {
          toast.success('卡片创建成功！', {
            className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
          });
        }
      } else {
        toast.success('卡片创建成功！', {
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      }
      
    } catch (error) {
      console.error('创建卡片失败:', error);
      toast.error('创建失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };
  
  // 处理导入卡片
  const handleImportCards = async (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
  }>) => {
    try {
      let savedCount = 0;
      let duplicateCount = 0;
      
      // 逐个保存到后端数据库
      for (const card of importedCards) {
        // 检查是否重复
        const isDuplicate = cards.some(
          existingCard => 
            existingCard.title.toLowerCase().trim() === card.title.toLowerCase().trim() && 
            existingCard.content.toLowerCase().trim() === card.content.toLowerCase().trim()
        );
        
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }
        
        // 调用后端API保存
        const response = await fetch('http://localhost:8000/api/knowledge/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: card.color,
            title: card.title,
            content: card.content,
            category: card.color === 'blue' ? '事实' : 
                      card.color === 'green' ? '解释' : 
                      card.color === 'yellow' ? '风险' : '行动'
          })
        });
        
        if (response.ok) {
          savedCount++;
        }
      }
      
      // 重新从后端加载卡片列表
      const cardsResponse = await fetch('http://localhost:8000/api/knowledge/cards?limit=10000');
      if (cardsResponse.ok) {
        const apiCards = await cardsResponse.json();
        const formattedCards = apiCards.map((card: any) => ({
          id: String(card.id),
          title: card.title,
          content: card.content,
          color: card.card_type || card.type,
          address: card.address || '',
          createdAt: card.created_at,
          relatedCards: []
        }));
        setCards(formattedCards);
        
        // 自动同步风险和行动卡片到GTD
        const actionCards = importedCards.filter(c => c.color === 'red' || c.color === 'yellow');
        if (actionCards.length > 0) {
          try {
            await fetch('http://localhost:8000/api/data/gtd-tasks/sync-all-cards', { method: 'POST' });
          } catch (e) {
            console.log('同步到GTD失败:', e);
          }
        }
      }
      
      // 显示结果
      const actionCards = importedCards.filter(c => c.color === 'red' || c.color === 'yellow');
      const actionMsg = actionCards.length > 0 ? `，${actionCards.length} 条已同步到任务管理` : '';
      
      if (savedCount > 0 && duplicateCount > 0) {
        toast(`已跳过 ${duplicateCount} 条重复，成功导入 ${savedCount} 条新记录${actionMsg}！`, {
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (savedCount > 0) {
        toast(`${savedCount} 条知识记录已成功导入并分类${actionMsg}！`, {
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (duplicateCount > 0) {
        toast(`导入的所有内容均已存在，未添加新卡片！`, {
          className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
        });
      }
      
      // 切换到卡片视图
      setActiveTab('cards');
      
    } catch (error) {
      console.error('导入卡片失败:', error);
      toast.error('导入失败，请检查后端服务');
    }
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
  const handleDeleteCard = async (cardId: string) => {
    try {
      // 调用后端API删除卡片
      const response = await fetch(`http://localhost:8000/api/knowledge/cards/${cardId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 从列表中移除卡片
      setCards(prevCards => prevCards.filter(card => card.id !== cardId));
      
      toast.success('卡片删除成功！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
      
    } catch (error) {
      console.error('删除卡片失败:', error);
      toast.error('删除失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 从后端API加载卡片
  React.useEffect(() => {
    const loadCardsFromAPI = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/knowledge/cards?limit=10000');
        if (response.ok) {
          const apiCards = await response.json();
          // 转换后端数据格式到前端格式
          const formattedCards = apiCards.map((card: any) => ({
            id: String(card.id),
            title: card.title,
            content: card.content,
            color: card.card_type || (card.category === '事实' ? 'blue' : card.category === '解释' ? 'green' : card.category === '风险' ? 'yellow' : 'red'),
            address: card.address || '',
            createdAt: card.created_at,
            relatedCards: []
          }));
          setCards(formattedCards);
          console.log('从API加载卡片:', formattedCards.length);
        }
      } catch (error) {
        console.error('从API加载卡片失败:', error);
        // 降级到localStorage
        const savedCards = localStorage.getItem('antinet_cards');
        if (savedCards) {
          try {
            setCards(JSON.parse(savedCards));
          } catch (e) {
            console.error('Failed to load cards from localStorage:', e);
          }
        }
      }
    };
    
    loadCardsFromAPI();
  }, []);



// 加载仪表板数据
  useEffect(() => {
    const loadDashboardData = async () => {
      if (activeTab !== 'dashboard') return;
      
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        // 从知识卡片API获取真实数据
        const response = await fetch('http://localhost:8000/api/knowledge/cards?limit=10000');
        if (!response.ok) throw new Error('API请求失败');
        const rawCards = await response.json();
        
        // 转换数据格式
        const cards = rawCards.map((c: any) => ({
          ...c,
          color: c.card_type || (c.category === '事实' ? 'blue' : c.category === '解释' ? 'green' : c.category === '风险' ? 'yellow' : 'red')
        }));
        
        // 统计卡片类型
        const typeCount = {
          blue: cards.filter((c: any) => c.color === 'blue' || c.card_type === 'blue' || c.category === '事实').length,
          green: cards.filter((c: any) => c.color === 'green' || c.card_type === 'green' || c.category === '解释').length,
          yellow: cards.filter((c: any) => c.color === 'yellow' || c.card_type === 'yellow' || c.category === '风险').length,
          red: cards.filter((c: any) => c.color === 'red' || c.card_type === 'red' || c.category === '行动').length,
        };
        
        setKnowledgeStats([
          { label: '事实卡片', count: typeCount.blue, color: 'blue' },
          { label: '解释卡片', count: typeCount.green, color: 'green' },
          { label: '风险卡片', count: typeCount.yellow, color: 'yellow' },
          { label: '行动卡片', count: typeCount.red, color: 'red' },
        ]);
        
        // 设置功能亮点
        setFeatureHighlights([
          { icon: '>>', title: 'NPU加速推理', description: '使用骁龙X Elite NPU，推理延迟<500ms' },
          { icon: '##', title: '四色卡片系统', description: '事实/解释/风险/行动四色知识管理' },
          { icon: '8x', title: '8-Agent智能体', description: '8个智能Agent协同分析' },
          { icon: '[]', title: '智能报告生成', description: '一键生成PPT/Excel报告' },
        ]);
        
        // 设置应用场景
        setApplicationScenarios([
          { icon: 'Co', title: '企业知识管理', description: '构建企业知识库，支持团队协作' },
          { icon: 'An', title: '数据分析报告', description: '智能分析数据，生成可视化报告' },
          { icon: 'Lo', title: '端侧隐私保护', description: '数据完全本地处理，不出域' },
        ]);
        
        console.log('仪表板数据加载完成:', { cards: cards.length, typeCount });
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
  const handleUpdateCard = async (updatedCard: KnowledgeCard) => {
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
    
    // 更新选中的卡片
    setSelectedCard(cardWithValidRelations);
    
    // 调试信息 - 可以帮助确认关联卡片是否被正确保存
    console.log('Updated card with relations:', cardWithValidRelations.relatedCards);
  };

  // 防止 TS6133 警告 - 实际使用 knowledgeStats
  if (knowledgeStats.length === 0 && statsLoading === false) {
    // knowledgeStats 已设置但未在UI中显示，这里只是为了避免TS警告
  }
  
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
              知易智能知识管家
            </h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            {/* 概览 */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
              <Database size={18} />
              <span>概览</span>
            </button>

            {/* 知识管理下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['cards', 'cards-management'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <Briefcase size={18} />
                <span>知识管理</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'cards' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Layers size={16} />
                  <span>知识卡片</span>
                </button>
                <button
                  onClick={() => setActiveTab('cards-management')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'cards-management' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <FolderOpen size={16} />
                  <span>卡片管理</span>
                </button>
              </div>
            </div>

            {/* 任务管理 */}
            <button
              onClick={() => setActiveTab('data-management')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'data-management' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
            <ListTodo size={18} />
              <span>任务管理</span>
            </button>

            {/* 团队协作 */}
            <button
              onClick={() => setActiveTab('virtual-office-meeting')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'virtual-office-meeting' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
              <Users size={18} />
              <span>八府巡按 · 虚拟会议</span>
            </button>

            {/* 文档中心下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['pdf-analysis', 'ppt-analysis', 'excel-analysis', 'batch-process'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <FileText size={18} />
                <span>文档中心</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('pdf-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <FileText size={16} />
                  <span>PDF分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('ppt-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Presentation size={16} />
                  <span>PPT生成</span>
                </button>
                <button
                  onClick={() => setActiveTab('excel-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Table size={16} />
                  <span>Excel分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('batch-process')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'batch-process' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Upload size={16} />
                  <span>批量处理</span>
                </button>
              </div>
            </div>

            {/* AI工具下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['data-analysis', 'agent-system', 'skill-center', 'multi-model', 'virtual-office-meeting'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <Cpu size={18} />
                <span>AI工具</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('data-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'data-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <TrendingUp size={16} />
                  <span>智能分析</span>
                </button>
                <button
                  onClick={() => setActiveTab('agent-system')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'agent-system' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Bot size={16} />
                  <span>Agent系统</span>
                </button>
                <button
                  onClick={() => setActiveTab('skill-center')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'skill-center' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Sparkles size={16} />
                  <span>技能中心</span>
                </button>
                <button
                  onClick={() => setActiveTab('multi-model')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'multi-model' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Layers size={16} />
                  <span>多模型</span>
                </button>
                <button
                  onClick={() => setActiveTab('virtual-office-meeting')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg flex items-center space-x-2 ${activeTab === 'virtual-office-meeting' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <Users size={16} />
                  <span>八府巡按会议</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
              <button 
                onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="切换主题"
            >
              {theme === 'light' ? '[暗]' : '[亮]'}
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">知识概览</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={18} />
                    <span>导入知识记录</span>
                  </motion.button>
                </div>
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
                  <button 
                    onClick={() => setShowAllCardsModal(true)}
                    className="text-blue-600 dark:text-blue-400 text-sm flex items-center hover:underline"
                  >
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      知识卡片库
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      管理和浏览所有知识卡片
                    </p>
                  </div>
                </div>
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
                          <h3 
                            className="font-semibold cursor-pointer hover:underline"
                            onClick={() => openDetailModal(card)}
                          >{card.title}</h3>
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

        {/* 智能问答视图 */}
        {activeTab === 'data-analysis' && (
          <DataAnalysisPanel />
        )}

        {/* PPT生成视图 */}
        {activeTab === 'ppt-analysis' && (
          <PPTAnalysis />
        )}

        {/* Excel导出视图 */}
        {activeTab === 'excel-analysis' && (
          <ExcelAnalysis />
        )}

        {/* 数据管理视图 */}
        {activeTab === 'cards-management' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    卡片管理
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理所有知识卡片，支持批量操作
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle size={20} />
                  <span>新建卡片</span>
                </button>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{cards.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">总卡片数</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600">{cards.filter(c => c.color === 'blue').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">事实类</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600">{cards.filter(c => c.color === 'green').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">解释类</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-yellow-600">{cards.filter(c => c.color === 'yellow').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">风险类</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-red-600">{cards.filter(c => c.color === 'red').length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">行动类</div>
              </div>
            </div>

            {/* 筛选工具栏 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* 时间筛选 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间:</span>
                  <select
                    value={timeFilter}
                    onChange={(e) => { setTimeFilter(e.target.value as any); setCurrentPage(1); }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                  >
                    <option value="all">全部</option>
                    <option value="today">今天</option>
                    <option value="week">本周</option>
                    <option value="month">本月</option>
                    <option value="year">本年</option>
                  </select>
                </div>
                
                {/* 类型筛选 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">类型:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                  >
                    <option value="all">全部</option>
                    <option value="blue">事实</option>
                    <option value="green">解释</option>
                    <option value="yellow">风险</option>
                    <option value="red">行动</option>
                  </select>
                </div>
                
                {/* 搜索框 */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="搜索卡片..."
                    value={managementSearchQuery}
                    onChange={(e) => { setManagementSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
                
                {/* 批量操作 */}
                {selectedCardIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-600">已选 {selectedCardIds.size} 项</span>
                    <button
                      onClick={() => setSelectedCardIds(new Set())}
                      className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`确定删除 ${selectedCardIds.size} 张卡片？`)) {
                          for (const cardId of selectedCardIds) {
                            await handleDeleteCard(cardId);
                          }
                          setSelectedCardIds(new Set());
                        }
                      }}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                    >
                      批量删除
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 卡片列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedCardIds.size === (() => {
                      const now = new Date();
                      return cards.filter(card => {
                        const cardDate = new Date(card.createdAt);
                        const matchTime = timeFilter === 'all' ? true :
                          timeFilter === 'today' ? cardDate.toDateString() === now.toDateString() :
                          timeFilter === 'week' ? (now.getTime() - cardDate.getTime()) < 7 * 24 * 60 * 60 * 1000 :
                          timeFilter === 'month' ? cardDate.getMonth() === now.getMonth() && cardDate.getFullYear() === now.getFullYear() :
                          cardDate.getFullYear() === now.getFullYear();
                        const matchType = typeFilter === 'all' || card.color === typeFilter;
                        const matchSearch = !managementSearchQuery || 
                          card.title.toLowerCase().includes(managementSearchQuery.toLowerCase()) ||
                          card.content.toLowerCase().includes(managementSearchQuery.toLowerCase());
                        return matchTime && matchType && matchSearch;
                      }).length;
                    })()}
                    onChange={(e) => {
                      const now = new Date();
                      const filteredIds = cards.filter(card => {
                        const cardDate = new Date(card.createdAt);
                        const matchTime = timeFilter === 'all' ? true :
                          timeFilter === 'today' ? cardDate.toDateString() === now.toDateString() :
                          timeFilter === 'week' ? (now.getTime() - cardDate.getTime()) < 7 * 24 * 60 * 60 * 1000 :
                          timeFilter === 'month' ? cardDate.getMonth() === now.getMonth() && cardDate.getFullYear() === now.getFullYear() :
                          cardDate.getFullYear() === now.getFullYear();
                        const matchType = typeFilter === 'all' || card.color === typeFilter;
                        const matchSearch = !managementSearchQuery || 
                          card.title.toLowerCase().includes(managementSearchQuery.toLowerCase()) ||
                          card.content.toLowerCase().includes(managementSearchQuery.toLowerCase());
                        return matchTime && matchType && matchSearch;
                      }).map(c => c.id);
                      if (e.target.checked) {
                        setSelectedCardIds(new Set(filteredIds));
                      } else {
                        setSelectedCardIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <h2 className="text-lg font-semibold">卡片列表</h2>
                  <span className="text-sm text-gray-500">
                    共 {(() => {
                      const now = new Date();
                      return cards.filter(card => {
                        const cardDate = new Date(card.createdAt);
                        const matchTime = timeFilter === 'all' ? true :
                          timeFilter === 'today' ? cardDate.toDateString() === now.toDateString() :
                          timeFilter === 'week' ? (now.getTime() - cardDate.getTime()) < 7 * 24 * 60 * 60 * 1000 :
                          timeFilter === 'month' ? cardDate.getMonth() === now.getMonth() && cardDate.getFullYear() === now.getFullYear() :
                          cardDate.getFullYear() === now.getFullYear();
                        const matchType = typeFilter === 'all' || card.color === typeFilter;
                        const matchSearch = !managementSearchQuery || 
                          card.title.toLowerCase().includes(managementSearchQuery.toLowerCase()) ||
                          card.content.toLowerCase().includes(managementSearchQuery.toLowerCase());
                        return matchTime && matchType && matchSearch;
                      }).length;
                    })()} 张
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">每页:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  const now = new Date();
                  const filtered = cards.filter(card => {
                    const cardDate = new Date(card.createdAt);
                    const matchTime = timeFilter === 'all' ? true :
                      timeFilter === 'today' ? cardDate.toDateString() === now.toDateString() :
                      timeFilter === 'week' ? (now.getTime() - cardDate.getTime()) < 7 * 24 * 60 * 60 * 1000 :
                      timeFilter === 'month' ? cardDate.getMonth() === now.getMonth() && cardDate.getFullYear() === now.getFullYear() :
                      cardDate.getFullYear() === now.getFullYear();
                    const matchType = typeFilter === 'all' || card.color === typeFilter;
                    const matchSearch = !managementSearchQuery || 
                      card.title.toLowerCase().includes(managementSearchQuery.toLowerCase()) ||
                      card.content.toLowerCase().includes(managementSearchQuery.toLowerCase());
                    return matchTime && matchType && matchSearch;
                  });
                  
                  const startIndex = (currentPage - 1) * pageSize;
                  const paginatedCards = filtered.slice(startIndex, startIndex + pageSize);
                  const totalPages = Math.ceil(filtered.length / pageSize);
                  
                  return paginatedCards.length > 0 ? (
                    <>
                      {paginatedCards.map((card) => (
                        <div
                          key={card.id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedCardIds.has(card.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedCardIds);
                                  if (e.target.checked) {
                                    newSet.add(card.id);
                                  } else {
                                    newSet.delete(card.id);
                                  }
                                  setSelectedCardIds(newSet);
                                }}
                                className="mt-1 w-4 h-4 rounded border-gray-300"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium text-gray-900 dark:text-white">{card.title}</h3>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    card.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                    card.color === 'green' ? 'bg-green-100 text-green-800' :
                                    card.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {cardTypeMap[card.color].name}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{card.content}</p>
                                <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                                  <span>ID: {card.address}</span>
                                  <span>创建于: {new Date(card.createdAt).toLocaleDateString('zh-CN')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => {
                                  setSelectedCard(card);
                                  setShowDetailModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="查看详情"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* 分页 */}
                      {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                          >
                            上一页
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page;
                            if (totalPages <= 5) {
                              page = i + 1;
                            } else if (currentPage <= 3) {
                              page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              page = totalPages - 4 + i;
                            } else {
                              page = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 border rounded ${currentPage === page ? 'bg-blue-500 text-white' : ''}`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                          >
                            下一页
                          </button>
                          <span className="text-sm text-gray-500 ml-2">
                            第 {currentPage}/{totalPages} 页
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      没有找到匹配的卡片
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'data-management' && (
          <DataManagement />
        )}

        {/* Agent系统视图 */}
        {activeTab === 'agent-system' && (
          <AgentSystem />
        )}

        {/* 技能中心视图 */}
        {activeTab === 'skill-center' && (
          <SkillCenter />
        )}

        {/* PDF分析视图 */}
        {activeTab === 'pdf-analysis' && (
          <PDFAnalysis />
        )}

        {/* 批量处理视图 */}
        {activeTab === 'batch-process' && (
          <BatchProcess />
        )}

        {/* 多模型API视图 */}
        {activeTab === 'multi-model' && (
          <MultiModel />
        )}

        {/* 格式转换视图 */}
        {activeTab === 'format-converter' && (
          <FormatConverter />
        )}

        {/* 团队协作视图 */}
        {activeTab === 'team-collaboration' && (
          <TeamCollaboration />
        )}

        {/* 虚拟办公室会议视图 */}
        {activeTab === 'virtual-office-meeting' && (
          <VirtualOfficeMeeting />
        )}
       </main>

      {/* 页脚 */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold">知易智能知识管家</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 知易企业AI知识管理系统. 四色卡片+锦衣卫多智能体的智能解决方案.
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
          onCreateRecommendedCard={(title) => {
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

         {/* 查看全部卡片模态框 */}
         {showAllCardsModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden m-4">
               <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                 <h2 className="text-xl font-bold">全部知识卡片 ({cards.length})</h2>
                 <button 
                   onClick={() => setShowAllCardsModal(false)}
                   className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                 >
                   <X size={20} />
                 </button>
               </div>
               <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                 {cards.length === 0 ? (
                   <div className="text-center py-12 text-gray-500">
                     <Database size={48} className="mx-auto mb-4 opacity-50" />
                     <p>暂无知识卡片</p>
                     <p className="text-sm mt-2">点击右上角"新建卡片"开始创建</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {cards.map(card => (
                       <motion.div
                         key={card.id}
                         whileHover={{ scale: 1.02 }}
                         className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                         onClick={() => {
                           setSelectedCard(card);
                           setShowDetailModal(true);
                           setShowAllCardsModal(false);
                         }}
                       >
                         <div className="flex items-start justify-between mb-2">
                           <h3 className="font-medium line-clamp-1">{card.title}</h3>
                           <span className={`text-xs px-2 py-0.5 rounded-full ${cardTypeMap[card.color].bgColor} ${cardTypeMap[card.color].textColor}`}>
                             {cardTypeMap[card.color].name}
                           </span>
                         </div>
                         <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-2">{card.content}</p>
                         <div className="flex items-center justify-between text-xs text-gray-500">
                           <span>ID: {card.id}</span>
                           <span>{formatDate(card.createdAt)}</span>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           </div>
         )}



      </div>
  );
};

export default Home;


