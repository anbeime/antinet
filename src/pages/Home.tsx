import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Brain,
  Home as HomeIcon,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  PlusCircle,
  X,
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
  Users,
  Clapperboard,
  FileSpreadsheet,
  FileType,
  BookOpen,
  GitBranch,
  BarChart3,
  LayoutDashboard,
  Database,
  CheckSquare,
  Video,
  Briefcase,
  Upload,
  Download,
  Settings,
  Network,
  Lightbulb,
  Copy,
  ZoomIn,
  Menu
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import CreateCardModal from '@/components/CreateCardModal';
import CardDetailModal from '@/components/CardDetailModal';
import ImportModal from '@/components/ImportModal';
import PPTAnalysis from '@/pages/PPTAnalysis';
import ExcelAnalysis from '@/pages/ExcelAnalysis';
import ResearchProjectManager from '@/components/ResearchProjectManager';
import DataManagement from '@/pages/DataManagement';
import AgentSystem from '@/pages/AgentSystem';
import SkillCenter from '@/pages/SkillCenter';
import PDFAnalysis from '@/pages/PDFAnalysis';
import BatchProcess from '@/pages/BatchProcess';
import MultiModel from '@/pages/MultiModel';
import GeniePlayground from '@/pages/GeniePlayground';
import GenieNPUTest from '@/pages/GenieNPUTest';
import FormatConverter from '@/pages/FormatConverter';
import VirtualOfficeMeeting from '@/pages/VirtualOfficeMeeting';
import ChatButton from '@/components/ChatButton';
import WikiEditor from '@/components/WikiEditor';
import KnowledgeGraphView from '@/pages/KnowledgeGraphView';
import MindMap from '@/pages/MindMap';
import RemotionGenerator from '@/components/remotion/RemotionGenerator';
import PDFViewer from '@/pages/PDFViewer';
import PPTViewer from '@/pages/PPTViewer';
import ReportAutomation from '@/pages/ReportAutomation';
import OfficeDocs from '@/pages/OfficeDocs';



// 定义卡片类型

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
  projectId?: number | null;
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



interface HomeProps {
  initialTab?: string;
}

const Home: React.FC<HomeProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  
  // 从URL参数获取tab
  const urlTab = searchParams.get('tab');
  
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'cards' | 'research' | 'knowledge-graph' | 'mindmap'>('cards');
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab) return urlTab;
    if (initialTab === 'remotion') return 'remotion';
    return 'dashboard';
  });
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 同步activeTab到URL参数
  useEffect(() => {
    if (activeTab && activeTab !== 'dashboard') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', activeTab);
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  }, [activeTab]);
  
  // 卡片管理筛选和分页
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CardColor>('all');
  const [projectFilter, setProjectFilter] = useState<number | 'all'>('all');
  const [projects, setProjects] = useState<{id: number; name: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // 卡片复制和放大功能
  const [zoomedCard, setZoomedCard] = useState<KnowledgeCard | null>(null);
  
  // 复制卡片内容
  const handleCopyCard = (card: KnowledgeCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const copyText = `${card.title}\n\n${card.content}`;
    navigator.clipboard?.writeText(copyText);
    toast.success('已复制卡片内容', { className: 'bg-blue-50 text-blue-800' });
  };
  
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
    
    // 时间过滤
    const cardDate = new Date(card.createdAt);
    const now = new Date();
    let timeMatch = true;
    if (timeFilter !== 'all') {
      if (timeFilter === 'today') {
        timeMatch = cardDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        timeMatch = cardDate >= weekAgo;
      } else if (timeFilter === 'month') {
        timeMatch = cardDate.getMonth() === now.getMonth() && cardDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'year') {
        timeMatch = cardDate.getFullYear() === now.getFullYear();
      }
    }
    
    // 搜索过滤
    const searchMatch = !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      card.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.address.toLowerCase().includes(searchQuery.toLowerCase());
       
    return colorMatch && timeMatch && searchMatch;
  });

  // 计算总页数
  const totalPages = Math.ceil(filteredCards.length / pageSize);

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
      const response = await fetch(getApiBaseUrl() + '/api/knowledge/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: cardData.color,
          title: cardData.title || undefined,
          content: cardData.content,
          category: cardData.color === 'blue' ? '事实' : 
                    cardData.color === 'green' ? '解释' : 
                    cardData.color === 'yellow' ? '风险' : '行动',
          address: cardData.address || undefined,
          project_id: cardData.projectId || undefined,
          related_cards: (cardData.relatedCards || []).map(Number).filter((id: number) => !isNaN(id))
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
        relatedCards: Array.isArray(newCard.related_cards) ? newCard.related_cards.map(String) : [],
        projectId: newCard.project_id ?? cardData.projectId ?? null
      };
      
      setCards(prevCards => [formattedCard, ...prevCards]);
      
      toast.success('卡片创建成功！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
      
    } catch (error) {
      console.error('创建卡片失败:', error);
      toast.error('创建失败，请检查后端服务', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };
   
  // 导入卡片处理函数
  const handleImportCards = async (importedCards: Array<{
    title: string;
    content: string;
    color: CardColor;
    address: string;
  }>, syncToGTD: boolean = false) => {
    try {
      if (importedCards.length === 0) {
        toast('没有可导入的卡片', {
          className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
        });
        return;
      }
      
      let savedCount = 0;
      let errorCount = 0;
      
      // 逐个保存到后端数据库（移除重复检查以避免批量导入问题）
      for (const card of importedCards) {
        // 调用后端API保存
        try {
          const requestBody = {
            type: card.color,
            title: card.title,
            content: card.content,
            category: card.color === 'blue' ? '事实' : 
                      card.color === 'green' ? '解释' : 
                      card.color === 'yellow' ? '风险' : '行动'
          };
          console.log('[IMPORT] 发送请求:', requestBody);
          
          const response = await fetch(getApiBaseUrl() + '/api/knowledge/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          console.log('[IMPORT] 响应状态:', response.status, 'ok:', response.ok);
          
          if (response.ok || response.status === 200) {
            savedCount++;
          } else {
            const errorText = await response.text();
            console.error(`保存卡片失败: ${card.title}`, response.status, errorText);
            errorCount++;
          }
        } catch (apiError) {
          console.error(`API调用失败: ${card.title}`, apiError);
          errorCount++;
        }
      }
      
      console.log('[IMPORT] 保存结果: 成功=', savedCount, '失败=', errorCount);
      
      // 重新从后端加载卡片列表
      const cardsResponse = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=10000');
      if (cardsResponse.ok) {
        const apiCards = await cardsResponse.json();
        const formattedCards = apiCards.map((card: any) => ({
          id: String(card.id),
          title: card.title,
          content: card.content,
          color: card.card_type || card.type,
          address: card.address || '',
          createdAt: card.created_at,
          relatedCards: Array.isArray(card.related_cards) ? card.related_cards.map(String) : [],
          projectId: card.project_id ?? null
        }));
        setCards(formattedCards);
        
        // 如果用户选择同步到GTD
        if (syncToGTD && savedCount > 0) {
          try {
            await fetch(getApiBaseUrl() + '/api/data/gtd-tasks/sync-all-cards', { method: 'POST' });
          } catch (e) {
            console.log('同步到GTD失败:', e);
          }
        }
      }
      
      // 显示结果
      let message = '';
      if (savedCount > 0) {
        message = `${savedCount} 条知识记录已成功导入`;
        if (errorCount > 0) {
          message += `，${errorCount} 条失败`;
        }
        message += '！';
        toast(message, {
          className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        });
      } else if (errorCount > 0) {
        toast(`导入失败：${errorCount} 条记录保存失败，请检查后端服务`, {
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
      } else {
        toast('导入完成，但没有新卡片被保存', {
          className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
        });
      }
      
      // 切换到卡片视图
      setActiveTab('cards-management');
      
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
    setActiveTab('cards-management');
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
      const response = await fetch(getApiBaseUrl() + `/api/knowledge/cards/${cardId}`, {
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
    let isMounted = true;
    const loadCardsFromAPI = async () => {
      try {
        const response = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=10000');
        if (!isMounted) return;
        if (response.ok) {
          const data = await response.json();
          const apiCards = data.cards || data || [];
          if (!Array.isArray(apiCards)) {
            console.error('API返回格式错误:', data);
            return;
          }
          const formattedCards = apiCards.map((card: any) => ({
            id: String(card.id),
            title: card.title,
            content: card.content,
            color: card.card_type || (card.category === '事实' ? 'blue' : card.category === '解释' ? 'green' : card.category === '风险' ? 'yellow' : 'red'),
            address: card.address || '',
            createdAt: card.created_at,
            relatedCards: Array.isArray(card.related_cards) ? card.related_cards.map(String) : [],
            projectId: card.project_id ?? null,
            images: card.images || []
          }));
          setCards(formattedCards);
          
          // 加载专题列表
          try {
            const projRes = await fetch(getApiBaseUrl() + '/api/research/projects');
            if (projRes.ok) {
              const projData = await projRes.json();
              setProjects(projData.value || projData || []);
            }
          } catch (e) {
            console.error('加载专题失败:', e);
          }
          
          console.log('从API加载卡片:', formattedCards.length);
        }
      } catch (error) {
        console.error('从API加载卡片失败:', error);
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
    return () => { isMounted = false; };
  }, []);



  // 加载仪表板数据
  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      if (activeTab !== 'dashboard') return;
      
      setStatsLoading(true);
      setStatsError(null);
      
      try {
        // 从知识卡片API获取真实数据
        const response = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=50');
        if (!isMounted) return;
        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();
        const rawCards = data.cards || data || [];
        
        if (!Array.isArray(rawCards)) {
          console.error('API返回格式错误:', data);
          throw new Error('数据格式错误');
        }
        
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
          { icon: '>>', title: 'NPU加速推理', description: '使用骁龙X Elite NPU，推理延迟<500ms', link: '/genie-playground' },
          { icon: '##', title: '四色卡片系统', description: '事实/解释/风险/行动四色知识管理', link: 'tab:cards-management' },
          { icon: '8x', title: '8-Agent智能体', description: '8个智能Agent协同分析', link: '/agent-system' },
          { icon: '[]', title: '智能报告生成', description: '一键生成PPT/PDF/Excel报告', link: 'tab:ppt-analysis' },
        ]);
        
        // 设置应用场景
        setApplicationScenarios([
          { icon: 'Lo', title: '端侧隐私保护', description: '数据完全本地处理，不出域', link: 'tab:data-management' },
          { icon: 'Pr', title: '专题项目管理', description: '企业级专题任务协同管理', link: 'tab:cards-management|research' },
          { icon: 'Tm', title: '局域网团队协作', description: '团队智能协作，本地知识共享', link: 'tab:virtual-office-meeting' },
        ]);

    
        
        console.log('仪表板数据加载完成:', { cards: cards.length, typeCount });
      } catch (error) {
        console.error('加载仪表板数据失败:', error);
        if (!isMounted) return;
        setStatsError('加载统计数据失败');
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };

    loadDashboardData();
    return () => { isMounted = false; };
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
    
    // 持久化到后端API
    try {
      const cardId = parseInt(updatedCard.id);
      if (!isNaN(cardId)) {
        const categoryMap: Record<string, string> = {
          blue: '事实', green: '解释', yellow: '风险', red: '行动'
        };
        await fetch(getApiBaseUrl() + `/api/knowledge/cards/${cardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: updatedCard.color,
            title: updatedCard.title,
            content: updatedCard.content,
            category: categoryMap[updatedCard.color] || '事实',
            project_id: updatedCard.projectId ?? undefined,
            related_cards: cardWithValidRelations.relatedCards.map(Number).filter(id => !isNaN(id))
          })
        });
      }
    } catch (err) {
      console.error('同步关联卡片到后端失败:', err);
    }
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
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* 概览 */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
            >
              <Database size={18} />
              <span>概览</span>
            </button>

            {/* 知识管理（卡片管理） */}
            <button
              onClick={() => setActiveTab('cards-management')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${activeTab === 'cards-management' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
>
              <Briefcase size={18} />
              <span>知识管理</span>
            </button>

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
              <span>智能协作会议</span>
            </button>

            {/* 文档处理下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['pdf-analysis', 'ppt-analysis', 'excel-analysis'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <FolderOpen size={18} />
                <span>文档处理</span>
                <ChevronDown size={14} className="ml-1" />
              </button>

<div className="absolute top-full left-0 mt-0 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('pdf-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <FileText size={16} />
                  <span>PDF分析器</span>
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
                  <span>Excel/在线表格</span>
                </button>

              </div>
            </div>

            

            

            {/* AI工具下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 ${['agent-system', 'skill-center'].includes(activeTab) ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent hover:text-blue-500'}`}
              >
                <Cpu size={18} />
                <span>AI工具</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('agent-system')}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg flex items-center space-x-2 ${activeTab === 'agent-system' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
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
              </div>
            </div>
          </div>

          {/* Hamburger - mobile only */}
          <button
            className="flex md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="打开菜单"
          >
            <Menu size={24} />
          </button>

          {/* Right side buttons - always visible */}
          <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-sm"
                aria-label="切换主题"
              >
                {theme === 'light' ? '[暗]' : '[亮]'}
              </button>
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center space-x-1 text-sm font-medium transition-colors"
                onClick={() => setActiveTab('batch-process')}
              >
                <Upload size={16} />
                <span>批量处理</span>
              </motion.button>
            </div>
          </div>
        </div>
       </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-[60px] left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 md:hidden overflow-y-auto max-h-[calc(100vh-60px)]">
            <div className="p-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                导航菜单
              </div>
              <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Database size={16} /><span>概览</span>
              </button>
              <button onClick={() => { setActiveTab('cards-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'cards-management' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Briefcase size={16} /><span>知识管理</span>
              </button>
              <button onClick={() => { setActiveTab('data-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'data-management' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <ListTodo size={16} /><span>任务管理</span>
              </button>
              <button onClick={() => { setActiveTab('virtual-office-meeting'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'virtual-office-meeting' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Users size={16} /><span>团队会议</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
                文档处理
              </div>
<button onClick={() => { setActiveTab('pdf-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <FileText size={16} /><span>PDF分析器</span>
              </button>
              <button onClick={() => { setActiveTab('ppt-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Presentation size={16} /><span>PPT生成</span>
              </button>
<button onClick={() => { setActiveTab('excel-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Table size={16} /><span>Excel/在线表格</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
                AI工具
              </div>
              <button onClick={() => { setActiveTab('agent-system'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'agent-system' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Bot size={16} /><span>Agent系统</span>
              </button>
              <button onClick={() => { setActiveTab('skill-center'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'skill-center' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <Sparkles size={16} /><span>技能中心</span>
              </button>
            </div>
          </div>
        </>
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
                        setActiveTab('cards-management');
                        setSelectedCardColor(color as CardColor);
                        setTimeout(() => {
                          document.getElementById(`card-stat-${color}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
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
                          <h3 className="font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors" onClick={() => openDetailModal(card)}>{card.title}</h3>
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
                         className="flex items-start p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => feature.link.startsWith('tab:') ? setActiveTab(feature.link.slice(4) as any) : navigate(feature.link)}
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
                          { name: '蓝色卡片', color: '#3b82f6', cardColor: 'blue' },
                          { name: '绿色卡片', color: '#22c55e', cardColor: 'green' },
                          { name: '黄色卡片', color: '#eab308', cardColor: 'yellow' },
                          { name: '红色卡片', color: '#ef4444', cardColor: 'red' },
                        ].map((stat, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                            onClick={() => setActiveTab('cards-management')}
                          >
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
                         className="flex items-start cursor-pointer"
                         onClick={() => {
                           if (scenario.link.startsWith('tab:')) {
                             const tabTarget = scenario.link.slice(4);
                             const [mainTab, subTab] = tabTarget.split('|');
                             setActiveTab(mainTab as any);
                             if (subTab) setKnowledgeSubTab(subTab as any);
                           } else {
                             navigate(scenario.link);
                           }
                         }}
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

        {/* 知识管理（卡片管理）视图 */}
        {activeTab === 'cards-management' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* 子导航标签 */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setKnowledgeSubTab('cards')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  knowledgeSubTab === 'cards'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Layers size={16} className="inline mr-1.5" />
                卡片管理
              </button>
              <button
                onClick={() => setKnowledgeSubTab('research')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  knowledgeSubTab === 'research'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <BookOpen size={16} className="inline mr-1.5" />
                专题研究
              </button>
              <button
                onClick={() => setKnowledgeSubTab('knowledge-graph')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  knowledgeSubTab === 'knowledge-graph'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Network size={16} className="inline mr-1.5" />
                知识网络
              </button>
              <button
                onClick={() => setKnowledgeSubTab('mindmap')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  knowledgeSubTab === 'mindmap'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <GitBranch size={16} className="inline mr-1.5" />
                思维导图
              </button>
            </div>

            {knowledgeSubTab === 'cards' && (
            <>
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">卡片管理</h1>
              <button onClick={() => openCreateModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                <PlusCircle size={18} className="mr-2" /> 新建卡片
              </button>
            </div>
            
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div 
                onClick={() => { setSelectedCardColor(null); setSearchQuery(''); setTimeFilter('all'); }}
                className="bg-white dark:bg-gray-800 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{cards.length}</div>
                <div className="text-sm text-gray-500">总卡片数</div>
              </div>
              {Object.entries(cardTypeMap).map(([color, type]) => (
                <div 
                  key={color} 
                  id={`card-stat-${color}`}
                  onClick={() => setSelectedCardColor(color as CardColor)}
                  className={`${type.bgColor} p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all hover:scale-105 ${selectedCardColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                >
                  <div className={`text-2xl font-bold ${type.textColor}`}>{cards.filter(c => c.color === color).length}</div>
                  <div className={`text-sm font-medium ${type.textColor}`}>{type.name}</div>
                </div>
              ))}
            </div>

            {/* 搜索和筛选 */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl border">
              <input
                type="checkbox"
                checked={filteredCards.length > 0 && selectedCardIds.size === filteredCards.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
                  } else {
                    setSelectedCardIds(new Set());
                  }
                }}
                className="w-4 h-4 rounded"
              />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-1.5 text-sm border rounded-lg"
              />
              <select 
                value={selectedCardColor || ''} 
                onChange={(e) => setSelectedCardColor(e.target.value as CardColor || null)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                <option value="">全部类型</option>
                {Object.entries(cardTypeMap).map(([color, type]) => (
                  <option key={color} value={color}>{type.name}</option>
                ))}
              </select>
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="year">本年</option>
              </select>
            </div>

            {/* 批量操作 */}
            {selectedCardIds.size > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between">
                <span className="text-blue-600">已选择 {selectedCardIds.size} 张卡片</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      selectedCardIds.forEach(id => handleDeleteCard(id));
                      setSelectedCardIds(new Set());
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    批量删除
                  </button>
                  <button 
                    onClick={() => setSelectedCardIds(new Set())}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}

            {/* 卡片列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(card => (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -5 }}
                  className={`border rounded-xl overflow-hidden ${cardTypeMap[card.color].borderColor} ${selectedCardIds.has(card.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`${cardTypeMap[card.color].bgColor} p-3 border-b`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedCardIds.has(card.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedCardIds);
                            if (e.target.checked) {
                              newSelected.add(card.id);
                            } else {
                              newSelected.delete(card.id);
                            }
                            setSelectedCardIds(newSelected);
                          }}
                          className="mr-2 w-4 h-4"
                        />
                        <div className={`${cardTypeMap[card.color].color} p-1.5 rounded mr-2`}>
                          {cardTypeMap[card.color].icon}
                        </div>
                        <h3 
                          className="font-semibold truncate cursor-pointer hover:text-blue-600"
                          onClick={() => openDetailModal(card)}
                        >
                          {card.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{card.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{formatDate(card.createdAt)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleCopyCard(card, e)}
                          className="text-gray-500 hover:text-blue-600 p-1"
                          title="复制内容"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setZoomedCard(card); }}
                          className="text-gray-500 hover:text-purple-600 p-1"
                          title="放大查看"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          onClick={() => openDetailModal(card)}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-red-500 text-sm hover:underline ml-2"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredCards.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Layers size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无卡片</p>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-500">每页:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                  const page = i + 1;
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
                  第 {currentPage}/{totalPages} 页 (共 {filteredCards.length} 张)
                </span>
              </div>
            )}
            </>
          )}


          {knowledgeSubTab === 'research' && (
            <ResearchProjectManager />
          )}

          {knowledgeSubTab === 'knowledge-graph' && (
            <div className="-mx-6 -mb-6" style={{ height: 'calc(100vh - 200px)' }}>
              <KnowledgeGraphView />
            </div>
          )}

          {knowledgeSubTab === 'mindmap' && (
            <div className="-mx-6 -mb-6" style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
              <MindMap />
            </div>
          )}
          </motion.div>
        )}

        {/* 任务管理视图 */}
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

        {/* 批量处理视图 */}
        {activeTab === 'batch-process' && (
          <BatchProcess />
        )}

        {/* 多模型API视图 */}
        {activeTab === 'multi-model' && (
          <MultiModel />
        )}

        {/* Genie 模型测试场视图 */}
        {activeTab === 'genie-playground' && (
          <GeniePlayground />
        )}

        {/* Genie NPU模型测试视图 */}
        {activeTab === 'genie-npu-test' && (
          <GenieNPUTest />
        )}

        {/* 格式转换视图 */}
        {activeTab === 'format-converter' && (
          <FormatConverter />
        )}

        {/* Remotion 动态演示视图 */}
        {activeTab === 'remotion' && (
          <div className="flex h-full p-4">
            <div className="flex-1">
              <RemotionGenerator 
                cards={cards.filter(c => c.color).map(c => ({
                  id: c.id,
                  type: c.color as any,
                  title: c.title,
                  content: c.content
                }))}
                topic="智能分析报告"
                showSelector={true}
              />
            </div>
          </div>
        )}

        

        {/* 虚拟办公室会议视图 */}
        {activeTab === 'virtual-office-meeting' && (
          <VirtualOfficeMeeting />
        )}

{/* 知识网络视图 —— 使用 WikiEditor（含编辑/图谱/搜索/智能） */}
{activeTab === 'knowledge-network' && (
<WikiEditor />
)}

        {/* 预留：以后可以整合到PPT生成中 */}

        {/* 文档中心首页 */}
        {activeTab === 'document-center' && (
          <div className="flex h-full p-8">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-500" />
                文档中心
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <button onClick={() => setActiveTab('pdf-analysis')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <FileText className="w-10 h-10 text-red-500 mb-3" />
                  <h3 className="font-semibold">PDF分析器</h3>
                  <p className="text-sm text-gray-500">智能解析PDF文档</p>
                </button>
                <button onClick={() => setActiveTab('pdf-viewer')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <FileText className="w-10 h-10 text-red-400 mb-3" />
                  <h3 className="font-semibold">PDF查看器</h3>
                  <p className="text-sm text-gray-500">在线查看PDF文件</p>
                </button>
                <button onClick={() => setActiveTab('ppt-analysis')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Presentation className="w-10 h-10 text-orange-500 mb-3" />
                  <h3 className="font-semibold">PPT生成</h3>
                  <p className="text-sm text-gray-500">从卡片生成演示文稿</p>
                </button>
                <button onClick={() => setActiveTab('ppt-viewer')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Presentation className="w-10 h-10 text-orange-400 mb-3" />
                  <h3 className="font-semibold">PPT演示</h3>
                  <p className="text-sm text-gray-500">在线演示PPT文件</p>
                </button>
<button onClick={() => setActiveTab('excel-analysis')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Table className="w-10 h-10 text-green-500 mb-3" />
                  <h3 className="font-semibold">Excel/在线表格</h3>
                  <p className="text-sm text-gray-500">数据分析与可视化</p>
                </button>
                <button onClick={() => { setActiveTab('cards-management'); setKnowledgeSubTab('mindmap'); }} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Brain className="w-10 h-10 text-pink-500 mb-3" />
                  <h3 className="font-semibold">思维导图</h3>
                  <p className="text-sm text-gray-500">结构化思维整理</p>
                </button>
{/* <button onClick={() => setActiveTab('knowledge-network')} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Network className="w-10 h-10 text-indigo-500 mb-3" />
                  <h3 className="font-semibold">知识网络</h3>
                  <p className="text-sm text-gray-500">在线知识协作</p>
                </button> */}
              </div>
            </div>
          </div>
        )}

        {/* PDF分析器 */}
        {activeTab === 'pdf-analysis' && (
          <PDFAnalysis />
        )}

        {/* PPT生成 */}
        {activeTab === 'ppt-analysis' && (
          <PPTAnalysis />
        )}

        {/* Excel分析 */}
        {activeTab === 'excel-analysis' && (
          <ExcelAnalysis />
        )}

        {/* 报表生成 */}
        {activeTab === 'report-automation' && (
          <ReportAutomation />
        )}

        {/* PDF查看器 */}
        {activeTab === 'pdf-viewer' && (
          <PDFViewer />
        )}

        {/* PPT演示 */}
        {activeTab === 'ppt-viewer' && (
          <PPTViewer />
        )}

        {/* 在线表格 */}
        {activeTab === 'excel-viewer' && (
          <OfficeDocs />
        )}
        </main>

      {/* 聊天机器人按钮 - 可拖拽 */}
      <ChatButton onCardClick={(cardRef) => {
        const found = cards.find(c => c.id === cardRef.id);
        if (found) {
          openDetailModal(found);
        }
      }} />

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
              setActiveTab('cards-management');
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
                         whileHover={{ scale: 1.02, y: -2 }}
                         className={`rounded-xl overflow-hidden border cursor-pointer hover:shadow-lg transition-all ${cardTypeMap[card.color].borderColor}`}
                         onClick={() => {
                           setSelectedCard(card);
                           setShowDetailModal(true);
                           setShowAllCardsModal(false);
                         }}
                       >
                         <div className={`${cardTypeMap[card.color].bgColor} p-3 border-b ${cardTypeMap[card.color].borderColor}`}>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center flex-1 min-w-0">
                               <div className={`${cardTypeMap[card.color].color} p-1.5 rounded mr-2`}>
                                 {cardTypeMap[card.color].icon}
                               </div>
                               <h3 className="font-semibold truncate">{card.title}</h3>
                             </div>
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleCopyCard(card, e as any); }}
                                 className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                 title="复制内容"
                               >
                                 <Copy size={14} />
                               </button>
                               <button
                                 onClick={(e) => { e.stopPropagation(); setZoomedCard(card); }}
                                 className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                 title="放大查看"
                               >
                                 <ZoomIn size={14} />
                               </button>
                               <span className={`text-xs px-2 py-0.5 rounded-full ${cardTypeMap[card.color].color} text-white ml-1`}>
                                 {cardTypeMap[card.color].name}
                               </span>
                             </div>
                           </div>
                         </div>
                         <div className="p-3 bg-white dark:bg-gray-800">
                           <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-2">{card.content}</p>
                           <div className="flex items-center justify-between text-xs text-gray-500">
                             <span>ID: {card.id}</span>
                             <span>{formatDate(card.createdAt)}</span>
                           </div>
                         </div>
                       </motion.div>
))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 卡片放大查看模态框 */}
          {zoomedCard && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
              onClick={() => setZoomedCard(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* 放大模态框头部 */}
                <div className={`${cardTypeMap[zoomedCard.color].bgColor} p-4 border-b ${cardTypeMap[zoomedCard.color].borderColor}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`${cardTypeMap[zoomedCard.color].color} p-2 rounded-lg mr-3`}>
                        {cardTypeMap[zoomedCard.color].icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{zoomedCard.title}</h2>
                        <span className={`text-xs ${cardTypeMap[zoomedCard.color].textColor}`}>
                          {cardTypeMap[zoomedCard.color].name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyCard(zoomedCard, e as any)}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                        title="复制内容"
                      >
                        <Copy size={20} />
                      </button>
                      <button
                        onClick={() => setZoomedCard(null)}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 放大后的卡片内容 */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className={`${cardTypeMap[zoomedCard.color].bgColor} border ${cardTypeMap[zoomedCard.color].borderColor} rounded-xl p-6`}>
                    <div className="text-lg leading-relaxed whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap' }}>
                      {zoomedCard.content}
                    </div>
                  </div>
                  
                  {/* 元信息 */}
                  <div className="mt-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <span>ID: {zoomedCard.id}</span>
                      <span className="mx-2">·</span>
                      <span>创建于 {formatDate(zoomedCard.createdAt)}</span>
                    </div>
                    <div className={`${cardTypeMap[zoomedCard.color].color} text-white px-3 py-1 rounded-full`}>
                      {zoomedCard.address}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
  );
};

export default Home;

