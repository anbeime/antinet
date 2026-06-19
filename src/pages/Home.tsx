import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiConfig';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Search,
  PlusCircle,
  X,
  AlertCircle,
  Presentation,
  Table,
  FolderOpen,
  Cpu,
  Sparkles,
  FileText,
  Layers,
  ListTodo,
  Bot,
  Users,
  BookOpen,
  GitBranch,
  Database,
  Briefcase,
  Upload,
  Network,
  Copy,
  ZoomIn,
  Menu,
  Calendar,
  BarChart3,
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
import TeamCollaboration from '@/components/TeamCollaboration';
import ErrorBoundary from '@/components/ErrorBoundary';
import ChatButton from '@/components/ChatButton';
import WikiEditor from '@/components/WikiEditor';
import KnowledgeGraphView from '@/pages/KnowledgeGraphView';
import MindMap from '@/pages/MindMap';
import RemotionGenerator from '@/components/remotion/RemotionGenerator';
import PDFViewer from '@/pages/PDFViewer';
import PPTViewer from '@/pages/PPTViewer';
import OfficeDocs from '@/pages/OfficeDocs';
import { GtdTask } from '@/types/card';



// 定义卡片颜色类型
type CardColor = 'blue' | 'green' | 'yellow' | 'red';

// 定义表单数据类型
interface CardFormData {
  title: string;
  content: string;
  color: CardColor;
  address: string;
  relatedCards: string[];
  projectId?: number;
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
const getCardType = (color: string) => cardTypeMap[color as CardColor] ?? cardTypeMap.blue;

const cardTypeMap: Record<CardColor, { 
  name: string; 
  description: string;
  icon: React.ReactNode;
  color: string;        // 图标圆圈背景色（保持原高饱和色）
  hoverColor: string;   // hover 图标圆圈背景色
  textColor: string;    // 文字颜色
  bgColor: string;      // 卡片背景色（低饱和）
  borderColor: string;  // 边框色
}> = {
  blue: { 
    name: '核心概念', 
    description: '记录重要的想法、理论和主要观点',
    icon: <Brain size={20} />,
    color: 'bg-blue-500',
    hoverColor: 'bg-blue-600',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  green: { 
    name: '关联链接', 
    description: '连接不同概念，发现隐性知识联系',
    icon: <Network size={20} />,
    color: 'bg-green-500',
    hoverColor: 'bg-green-600',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  yellow: { 
    name: '参考来源', 
    description: '保存资料、文档和外部资源链接',
    icon: <Database size={20} />,
    color: 'bg-yellow-500',
    hoverColor: 'bg-yellow-600',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  red: { 
    name: '索引关键词', 
    description: '标记重要术语，便于快速检索和导航',
    icon: <Search size={20} />,
    color: 'bg-red-500',
    hoverColor: 'bg-red-600',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
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
  const urlProjectId = searchParams.get('project');
  
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'cards' | 'research' | 'knowledge-graph' | 'mindmap'>(() => {
    if (urlTab === 'research') return 'research';
    return 'cards';
  });
  const [cardViewMode, setCardViewMode] = useState<'grid' | 'timeline'>('grid');
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab === 'research') return 'cards-management';
    if (urlTab) return urlTab;
    if (initialTab === 'remotion') return 'remotion';
    return 'dashboard';
  });
  const [selectedCardColor, setSelectedCardColor] = useState<CardColor | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [createModalColor, setCreateModalColor] = useState<CardColor>('blue');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAllCardsModal, setShowAllCardsModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [gtdTasks, setGtdTasks] = useState<GtdTask[]>([]);
  
  const toggleExpandCard = (id: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  
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
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 提取内容摘要（首句或前60字）
  const extractSummary = (content: string, maxLen = 60): string => {
    const cleaned = content.replace(/!\[.*?]\(.*?\)/g, '').replace(/[][#*>\-]/g, '').trim();
    const match = cleaned.match(/^.*?[。！？.!?]/);
    if (match && match[0].length <= maxLen) return match[0].trim();
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
  };

  // 格式化日期时间
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
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
    const cardDate = card.createdAt ? new Date(card.createdAt) : null;
    const now = new Date();
    let timeMatch = true;
    if (timeFilter !== 'all' && cardDate && !isNaN(cardDate.getTime())) {
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
      (card.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (card.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.address || '').toLowerCase().includes(searchQuery.toLowerCase());
       
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
        toast.error('创建失败，请检查后端服务', {
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
        return;
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
  }>, syncToGTD: boolean = false, rawText?: string) => {
    try {
      if (importedCards.length === 0 && rawText !== '__FILE_SAVED__') {
        toast('没有可导入的卡片', {
          className: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
        });
        return;
      }

      // 文件导入：后端已通过 /import/file 保存（含源文件追溯 + 自动建链），仅需刷新卡片列表
      if (rawText === '__FILE_SAVED__') {
        try {
          const cardsResponse = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=10000');
          if (cardsResponse.ok) {
            const responseData = await cardsResponse.json();
            const apiCards = responseData.cards || responseData;
            const formattedCards = apiCards.map((card: any) => ({
              id: String(card.id || card.ID),
              title: card.title || '',
              content: card.content || '',
              color: card.card_type || card.type || 'blue',
              address: card.address || '',
              createdAt: card.created_at || null,
              relatedCards: Array.isArray(card.related_cards) ? card.related_cards.map(String) : [],
            }));
            setCards(formattedCards);
          }
        } catch (refreshErr) {
          console.error('刷新卡片列表失败:', refreshErr);
        }

        if (syncToGTD) {
          try { await fetch(getApiBaseUrl() + '/api/data/gtd-tasks/sync-all-cards', { method: 'POST' }); } catch (e) {}
        }

        setActiveTab('cards-management');
        return;
      }
      
      // 粘贴文本导入：使用增强版 /import/text 端点（锦衣卫全线：安全检查 + 密卷房提取 + 四司分类 + 自动保存源文件 + 同批次关联）
      if (rawText && rawText.trim()) {
        let textSavedCount = 0;
        try {
          const response = await fetch(getApiBaseUrl() + '/api/knowledge/import/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: rawText, auto_save: true })
          });
          if (response.ok) {
            const result = await response.json();
            textSavedCount = result.saved || 0;

            // 安全检查提示
            let toastDesc = `已保存源文件可溯源，四司分类完成`;
            if (result.security_issues && result.security_issues.length > 0) {
              toastDesc += ` | 锦衣卫过滤 ${result.security_issues.length} 个安全问题`;
            }

            toast(`成功导入 ${textSavedCount} 张卡片`, {
              description: toastDesc,
              className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
            });
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error('文本导入失败:', errData.detail || '文本导入服务异常');
            toast(`文本导入失败: ${errData.detail || '文本导入服务异常'}`, {
              className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
            });
            return;
          }
        } catch (e: any) {
          console.error('文本导入失败:', e);
          toast(`文本导入失败: ${e.message}`, {
            className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
          });
          return;
        }
        
        // 重新从后端加载卡片列表
        try {
          const cardsResponse = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=10000');
          if (cardsResponse.ok) {
            const responseData = await cardsResponse.json();
            const apiCards = responseData.cards || responseData;
            const formattedCards = apiCards.map((card: any) => ({
              id: String(card.id || card.ID),
              title: card.title || '',
              content: card.content || '',
              color: card.card_type || card.type || 'blue',
              address: card.address || '',
              createdAt: card.created_at || null,
              relatedCards: Array.isArray(card.related_cards) ? card.related_cards.map(String) : [],
            }));
            setCards(formattedCards);
          }
        } catch (refreshErr) {
          console.error('刷新卡片列表失败:', refreshErr);
        }
        
        if (syncToGTD && textSavedCount > 0) {
          try { await fetch(getApiBaseUrl() + '/api/data/gtd-tasks/sync-all-cards', { method: 'POST' }); } catch (e) {}
        }
        
        // import/text 已保存卡片到数据库，不再走逐条 POST /api/knowledge/cards 避免重复
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
        const responseData = await cardsResponse.json();
        const apiCards = responseData.cards || responseData;  // 兼容 {cards:[], total:N} 和纯数组
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
        toast.error('删除失败，请检查后端服务', {
          className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        });
        return;
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
    
    void loadCardsFromAPI();
    return () => { isMounted = false; };
  }, []);

  // 加载 GTD 任务
  React.useEffect(() => {
    let isMounted = true;
    const loadGtdTasks = async () => {
      try {
        const resp = await fetch(getApiBaseUrl() + '/api/data/gtd/tasks');
        if (!isMounted) return;
        if (resp.ok) {
          const data = await resp.json();
          setGtdTasks(data.tasks || data || []);
        }
      } catch {
        // 静默失败，不影响主页使用
      }
    };
    void loadGtdTasks();
    return () => { isMounted = false; };
  }, []);



  // 加载仪表板数据
  const loadDashboardData = useCallback(async () => {
    let isMounted = true;
    setStatsLoading(true);
    setStatsError(null);
    
    try {
      // 从知识卡片API获取真实数据
      const response = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=50');
      if (!isMounted) return;
      if (!response.ok) {
        if (isMounted) setStatsError('API请求失败');
        setStatsLoading(false);
        return;
      }
      const data = await response.json();
      const rawCards = data.cards || data || [];
      
      if (!Array.isArray(rawCards)) {
        console.error('API返回格式错误:', data);
        if (isMounted) setStatsError('数据格式错误');
        setStatsLoading(false);
        return;
      }
      
      const fetchedCards = rawCards.map((c: any) => ({
        ...c,
        color: c.card_type || (c.category === '事实' ? 'blue' : c.category === '解释' ? 'green' : c.category === '风险' ? 'yellow' : 'red')
      }));
      
      // 统计卡片类型
      const typeCount = {
        blue: fetchedCards.filter((c: any) => c.color === 'blue' || c.card_type === 'blue' || c.category === '事实').length,
        green: fetchedCards.filter((c: any) => c.color === 'green' || c.card_type === 'green' || c.category === '解释').length,
        yellow: fetchedCards.filter((c: any) => c.color === 'yellow' || c.card_type === 'yellow' || c.category === '风险').length,
        red: fetchedCards.filter((c: any) => c.color === 'red' || c.card_type === 'red' || c.category === '行动').length,
      };
      
      console.log('仪表板数据加载完成:', { cards: fetchedCards.length, typeCount });
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      if (!isMounted) return;
      setStatsError('加载统计数据失败');
    } finally {
      if (isMounted) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      void loadDashboardData();
    }
  }, [activeTab, loadDashboardData]);

  // 更新卡片
  const handleUpdateCard = async (updatedCard: KnowledgeCard) => {
    const cardWithValidRelations = {
      ...updatedCard,
      relatedCards: updatedCard.relatedCards || []
    };
    const prevCards = cards;
    const prevSelected = selectedCard;
    const updatedCards = cards.map(card => 
      card.id === updatedCard.id ? cardWithValidRelations : card
    );
    setCards(updatedCards);
    setSelectedCard(cardWithValidRelations);
    try {
      const cardId = parseInt(updatedCard.id);
      if (!isNaN(cardId)) {
        const categoryMap: Record<string, string> = {
          blue: '事实', green: '解释', yellow: '风险', red: '行动'
        };
        const res = await fetch(getApiBaseUrl() + `/api/knowledge/cards/${cardId}`, {
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
        if (!res.ok) throw new Error('同步失败');
      }
    } catch (err) {
      console.error('同步关联卡片到后端失败:', err);
      setCards(prevCards);
      setSelectedCard(prevSelected);
      throw err;
    }
  };

  
  return (
    <div className={`flex flex-col min-h-screen bg-paper dark:bg-dark-bg text-ink-main dark:text-dark-text transition-colors duration-300`}>
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-wood/95 dark:bg-dark-soft border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div 
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-wood to-wood-dark flex items-center justify-center"
            >
              <Brain className="w-5 h-5 text-ink-main" />
            </motion.div>
              <h1 className="text-xl font-bold text-ink-main">
              知易智能知识管家
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* 概览 */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
            >
              <Database size={18} />
              <span>概览</span>
            </button>

            {/* 知识管理（卡片管理） */}
            <button
              onClick={() => setActiveTab('cards-management')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${activeTab === 'cards-management' ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
>
              <Briefcase size={18} />
              <span>知识管理</span>
            </button>

            {/* 任务管理 */}
            <button
              onClick={() => setActiveTab('data-management')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${activeTab === 'data-management' ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
            >
            <ListTodo size={18} />
              <span>任务管理</span>
            </button>

            {/* 团队协作 */}
            <button
              onClick={() => setActiveTab('virtual-office-meeting')}
              className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${activeTab === 'virtual-office-meeting' ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
            >
              <Users size={18} />
              <span>智能协作会议</span>
            </button>

            {/* 文档处理下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${['pdf-analysis', 'ppt-analysis', 'excel-analysis'].includes(activeTab) ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
              >
                <FolderOpen size={18} />
                <span>文档处理</span>
                <ChevronDown size={14} className="ml-1" />
              </button>

<div className="absolute top-full left-0 mt-0 w-56 bg-paper dark:bg-dark-soft rounded-card shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('pdf-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                  <FileText size={16} />
                  <span>PDF分析器</span>
                </button>
                <button
                  onClick={() => setActiveTab('ppt-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                  <Presentation size={16} />
                  <span>PPT生成</span>
                </button>
                <button
                  onClick={() => setActiveTab('excel-analysis')}
                  className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                  <Table size={16} />
                  <span>Excel/在线表格</span>
                </button>
                <button
                  onClick={() => navigate('/invoice')}
                  className="w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 text-gray-700"
                >
                  <FileText size={16} />
                  <span>发票管理</span>
                </button>
              </div>
            </div>

            {/* AI工具下拉菜单 */}
            <div className="relative group">
              <button
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${['agent-system', 'skill-center'].includes(activeTab) ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}
              >
                <Cpu size={18} />
                <span>AI 工具</span>
                <ChevronDown size={14} className="ml-1" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-paper dark:bg-dark-soft rounded-card shadow-lg border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setActiveTab('agent-system')}
                  className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 first:rounded-t-lg ${activeTab === 'agent-system' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                  <Bot size={16} />
                  <span>Agent 系统</span>
                </button>
                <button
                  onClick={() => setActiveTab('skill-center')}
                  className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'skill-center' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                >
                  <Sparkles size={16} />
                  <span>技能中心</span>
                </button>
                <button
                  onClick={() => navigate('/hermes-manager')}
                  className="w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 text-gray-700"
                >
                  <Bot size={16} />
                  <span>Hermes 管理</span>
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
                className="bg-wood hover:bg-wood-soft text-ink-main px-4 py-2 rounded-full flex items-center space-x-1 text-sm font-medium transition-colors"
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
          <div className="fixed top-[60px] left-0 w-64 bg-paper dark:bg-dark-soft shadow-xl z-50 md:hidden overflow-y-auto max-h-[calc(100vh-60px)]">
            <div className="p-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                导航菜单
              </div>
              <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <Database size={16} /><span>概览</span>
              </button>
              <button onClick={() => { setActiveTab('cards-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'cards-management' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <Briefcase size={16} /><span>知识管理</span>
              </button>
              <button onClick={() => { setActiveTab('data-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'data-management' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <ListTodo size={16} /><span>任务管理</span>
              </button>
              <button onClick={() => { setActiveTab('virtual-office-meeting'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'virtual-office-meeting' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <Users size={16} /><span>团队协作</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                文档处理
              </div>
<button onClick={() => { setActiveTab('pdf-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <FileText size={16} /><span>PDF分析器</span>
              </button>
              <button onClick={() => { setActiveTab('ppt-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <Presentation size={16} /><span>PPT生成</span>
              </button>
<button onClick={() => { setActiveTab('excel-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-gray-700'}`}>
                <Table size={16} /><span>Excel/在线表格</span>
              </button>
              <button onClick={() => { navigate('/invoice'); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-700">
                <FileText size={16} /><span>发票管理</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                AI 工具
              </div>
              <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'dashboard' ? 'text-ink-main bg-card-blue' : ''}`}>
                <Database size={16} /><span>概览</span>
              </button>
              <button onClick={() => { setActiveTab('cards-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'cards-management' ? 'text-ink-main bg-card-blue' : ''}`}>
                <Briefcase size={16} /><span>知识管理</span>
              </button>
              <button onClick={() => { setActiveTab('data-management'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'data-management' ? 'text-ink-main bg-card-blue' : ''}`}>
                <ListTodo size={16} /><span>任务管理</span>
              </button>
              <button onClick={() => { setActiveTab('virtual-office-meeting'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'virtual-office-meeting' ? 'text-ink-main bg-card-blue' : ''}`}>
                <Users size={16} /><span>团队协作</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-ink-desc uppercase tracking-wider mt-2">
                文档处理
              </div>
<button onClick={() => { setActiveTab('pdf-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'pdf-analysis' ? 'text-ink-main bg-card-blue' : ''}`}>
                <FileText size={16} /><span>PDF分析器</span>
              </button>
              <button onClick={() => { setActiveTab('ppt-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'ppt-analysis' ? 'text-ink-main bg-card-yellow' : ''}`}>
                <Presentation size={16} /><span>PPT生成</span>
              </button>
<button onClick={() => { setActiveTab('excel-analysis'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'excel-analysis' ? 'text-ink-main bg-card-green' : ''}`}>
                <Table size={16} /><span>Excel/在线表格</span>
              </button>
              <div className="px-4 py-2 text-xs font-semibold text-ink-desc uppercase tracking-wider mt-2">
                AI工具
              </div>
              <button onClick={() => { setActiveTab('agent-system'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'agent-system' ? 'text-ink-main bg-card-blue' : ''}`}>
                <Bot size={16} /><span>Agent系统</span>
              </button>
              <button onClick={() => { setActiveTab('skill-center'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 hover:bg-soft dark:hover:bg-dark-mute flex items-center space-x-2 ${activeTab === 'skill-center' ? 'text-ink-main bg-card-blue' : ''}`}>
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
                className="bg-paper dark:bg-dark-soft rounded-card shadow-sm border border-border p-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-ink-main">知识概览</h2>
                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-desc" />
                      <input
                        type="text"
                        placeholder="搜索知识卡片/任务..."
                        value={dashboardSearchQuery}
                        onChange={e => setDashboardSearchQuery(e.target.value)}
                        className="w-full sm:w-52 pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-soft dark:bg-dark-soft focus:outline-none focus:ring-2 focus:ring-wood focus:border-transparent transition-all"
                      />
                      {dashboardSearchQuery && (
                        <button
                          onClick={() => setDashboardSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-desc hover:text-ink-main"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-wood hover:bg-wood-soft text-ink-main px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors"
                      onClick={() => setShowImportModal(true)}
                    >
                      <Upload size={18} />
                      <span>导入知识记录</span>
                    </motion.button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(cardTypeMap).map(([color, type]) => (
                    <div 
                      key={color}
                      className={`${type.bgColor} border ${type.borderColor} rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow`}
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
                      <p className="text-2xl font-bold text-ink-main">{cards.filter(c => c.color === color).length}</p>
                      <p className="text-sm text-ink-desc">{type.description}</p>
                    </div>
                  ))}
                </div>
                {/* 全局搜索结果 */}
                {dashboardSearchQuery.trim() && (() => {
                  const q = dashboardSearchQuery.toLowerCase();
                  const matchedCards = cards.filter(c =>
                    c.title.toLowerCase().includes(q) ||
                    c.content.toLowerCase().includes(q) ||
                    c.address.toLowerCase().includes(q)
                  );
                  const matchedTasks = gtdTasks.filter(t =>
                    t.title.toLowerCase().includes(q) ||
                    (t.description || '').toLowerCase().includes(q)
                  );
                  const total = matchedCards.length + matchedTasks.length;
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-ink-desc">
                          搜索结果 ({total} 条) — 知识卡片 {matchedCards.length} · 任务 {matchedTasks.length}
                        </span>
                        <button
                          onClick={() => setDashboardSearchQuery('')}
                          className="text-xs text-wood hover:underline"
                        >
                          清除
                        </button>
                      </div>
                      {total === 0 ? (
                        <p className="text-sm text-ink-desc py-4 text-center">没有找到匹配的结果</p>
                      ) : (
                        <div className="space-y-1.5">
                          {matchedCards.slice(0, 10).map(card => (
                            <div
                              key={`card-${card.id}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-soft dark:hover:bg-dark-mute cursor-pointer transition-colors border border-transparent hover:border-border"
                              onClick={() => {
                                setSelectedCard(card);
                                setShowDetailModal(true);
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs font-medium text-wood/80 bg-wood/10 px-1.5 py-0.5 rounded">卡片</span>
                                <span className="text-sm text-ink-main truncate">{card.title}</span>
                              </div>
                              <ChevronRight size={14} className="text-ink-desc flex-shrink-0" />
                            </div>
                          ))}
                          {matchedTasks.slice(0, 10).map(task => (
                            <div
                              key={`task-${task.id}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-soft dark:hover:bg-dark-mute cursor-pointer transition-colors border border-transparent hover:border-border"
                              onClick={() => setActiveTab('data-management')}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  task.is_completed
                                    ? 'text-green-700 bg-green-50'
                                    : 'text-purple-700 bg-purple-50'
                                }`}>
                                  {task.is_completed ? '已完成' : '任务'}
                                </span>
                                <span className={`text-sm truncate ${task.is_completed ? 'line-through text-ink-desc' : 'text-ink-main'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <ChevronRight size={14} className="text-ink-desc flex-shrink-0" />
                            </div>
                          ))}
                          {total > 10 && (
                            <p className="text-xs text-ink-desc text-center pt-1">
                              显示前 10 条，更多结果请精确搜索词
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>

              {/* 平台功能入口 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-paper dark:bg-dark-soft rounded-card shadow-sm border border-border p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-ink-main">平台功能</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { icon: <Briefcase size={20} />, title: '知识管理', desc: '四色卡片知识记录与检索', link: 'tab:cards-management', gradient: 'from-sky-500 to-indigo-400' },
                    { icon: <FileText size={20} />, title: 'PDF智能解析', desc: 'word,excel,PDF,ppt文档提取、分析、转换', link: 'tab:pdf-analysis', gradient: 'from-blue-500 to-cyan-400' },
                    { icon: <BookOpen size={20} />, title: 'PDF查看器', desc: 'PDF文档在线阅读与标注', link: 'tab:pdf-viewer', gradient: 'from-amber-500 to-yellow-400' },
                    { icon: <BookOpen size={20} />, title: '书籍技能', desc: '从书籍提取方法论，构建知识图谱', link: '/book-skill', gradient: 'from-indigo-500 to-purple-400' },
                    { icon: <Layers size={20} />, title: 'PPT演示', desc: 'PPT演示文稿在线播放', link: 'tab:ppt-viewer', gradient: 'from-pink-500 to-rose-400' },
                    { icon: <Presentation size={20} />, title: 'PPT生成', desc: 'AI驱动一键生成演示文稿', link: 'tab:ppt-analysis', gradient: 'from-orange-500 to-pink-400' },
                    { icon: <Table size={20} />, title: 'Excel表格', desc: '数据分析与在线表格处理,发票提取', link: 'tab:excel-analysis', gradient: 'from-green-500 to-emerald-400' },
                    { icon: <Table size={20} />, title: '发票识别', desc: '发票OCR提取', link: 'tab:excel-analysis', subFeature: 'invoice', gradient: 'from-green-500 to-emerald-400' },
                    { icon: <ListTodo size={20} />, title: '任务管理', desc: 'GTD任务管理', link: 'tab:data-management', gradient: 'from-purple-500 to-violet-400' },
                    { icon: <ListTodo size={20} />, title: '日历日程', desc: '日历与日程规划提醒', link: '/gtd-tasks', subFeature: 'calendar', gradient: 'from-purple-500 to-violet-400' },
                    { icon: <BarChart3 size={20} />, title: '投研工作台', desc: '行业/公司研究、机会与风险、四色研究卡片', link: '/investment-research', gradient: 'from-indigo-500 to-blue-400' },
                    { icon: <Users size={20} />, title: '虚拟会议', desc: '8智能体像素虚拟智能协作会议', link: 'tab:virtual-office-meeting', gradient: 'from-red-500 to-rose-400' },
                    { icon: <Users size={20} />, title: '团队协作', desc: '局域网团队协作与任务协同工作台', link: 'tab:team-collaboration', subFeature: 'tasks', gradient: 'from-red-500 to-rose-400' },
                    { icon: <FolderOpen size={20} />, title: '文件浏览', desc: '文件浏览器与卡片索引联动', link: '/knowledge-graph?tab=files', gradient: 'from-teal-500 to-emerald-400' },

                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(105,78,51,0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-4 rounded-card border border-border cursor-pointer hover:border-wood transition-all bg-paper dark:bg-dark-mute"
                      onClick={() => {
                        if ((item as any).subFeature === 'invoice') {
                          localStorage.setItem('openInvoiceManager', 'true');
                        } else if ((item as any).subFeature === 'calendar') {
                          localStorage.setItem('openCalendarFullscreen', 'true');
                        } else if ((item as any).subFeature === 'tasks') {
                          localStorage.setItem('virtualOfficeActiveTab', 'tasks');
                        }
                        item.link.startsWith('tab:') ? setActiveTab(item.link.slice(4) as any) : navigate(item.link);
                      }}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{item.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
               </motion.div>

                {/* 企业应用场景 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h2 className="text-xl font-bold mb-4">企业应用场景</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: 'Lo', title: '端侧隐私保护', desc: 'NPU推理<500ms，数据不出域', link: 'tab:data-management' },
                      { icon: 'Pr', title: '专题项目管理', desc: '企业级专题任务协同管理', link: 'tab:cards-management|research' },
                      { icon: 'Tm', title: '局域网团队协作', desc: '团队智能协作，本地知识共享', link: 'tab:team-collaboration' },
                    ].map((scenario, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-all bg-white dark:bg-gray-700/50"
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center text-white flex-shrink-0 text-sm font-bold">
                          {scenario.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{scenario.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{scenario.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>


            </div>

             {/* 右侧区域：统计图表和特性 */}
             <div className="space-y-6">
               {/* 知识分布图表 */}
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-paper dark:bg-dark-soft rounded-card shadow-sm border border-border p-6"
                >
                  <h2 className="text-xl font-bold text-ink-main mb-4">知识分布</h2>
                  {statsLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-wood"></div>
                      <p className="mt-2 text-ink-desc">加载中...</p>
                    </div>
                   ) : statsError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-task-red dark:text-task-red mx-auto mb-2 opacity-50" />
                      <p className="text-task-red dark:text-task-red">{statsError}</p>
                      <button
                        onClick={() => { void loadDashboardData(); }}
                        className="mt-3 px-4 py-2 bg-wood/20 dark:bg-wood/10 text-ink-main rounded-lg text-sm hover:bg-wood/30 transition-colors"
                      >
                        重试加载
                      </button>
                    </div>
                   ) : cards.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-12 h-12 text-ink-desc dark:text-ink-desc mx-auto mb-2" />
                      <p className="text-ink-desc dark:text-ink-desc">暂无卡片数据</p>
                    </div>
                   ) : (
                    <>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                               { name: '核心概念', value: cards.filter(c => c.color === 'blue').length },
                               { name: '关联链接', value: cards.filter(c => c.color === 'green').length },
                               { name: '参考来源', value: cards.filter(c => c.color === 'yellow').length },
                               { name: '索引关键词', value: cards.filter(c => c.color === 'red').length },
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
                               { name: '核心概念', color: '#3b82f6' },
                               { name: '关联链接', color: '#22c55e' },
                               { name: '参考来源', color: '#eab308' },
                               { name: '索引关键词', color: '#ef4444' },
                             ].map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
<div className="grid grid-cols-2 gap-2 mt-4">
                        {[
                          { name: '核心概念', color: '#3b82f6', cardColor: 'blue' },
                          { name: '关联链接', color: '#22c55e', cardColor: 'green' },
                          { name: '参考来源', color: '#eab308', cardColor: 'yellow' },
                          { name: '索引关键词', color: '#ef4444', cardColor: 'red' },
                        ].map((stat, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-soft dark:hover:bg-dark-mute rounded p-1 transition-colors"
                            onClick={() => setActiveTab('cards-management')}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                            <span className="text-sm text-ink-desc">{stat.name}</span>
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
                  className="bg-wood rounded-card shadow-md p-6 text-ink-main"
                >
                  <h2 className="text-xl font-bold mb-2">提升知识管理效率</h2>
                  <p className="text-ink-desc mb-4 text-sm">开始使用AI增强的卢曼卡片系统，加速团队知识发展</p>
<div className="space-y-2">
                    {Object.entries(cardTypeMap).map(([color, type]) => (
                      <motion.button
                        key={color}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-paper/50 hover:bg-paper backdrop-blur-sm transition-colors rounded-lg p-3 text-left flex items-center justify-between"
                        onClick={() => openCreateModal(color as CardColor)}
                      >
                        <div className="flex items-center">
                          <div className={`${type.color} p-1.5 rounded-lg mr-3`}>
                            {type.icon}
                          </div>
                          <span className="text-ink-main">创建{type.name}卡片</span>
                        </div>
                        <ChevronRight size={16} className="text-ink-main" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>


              </div>
           </div>
)}

        {/* 知识管理（卡片管理）视图 */}
        {activeTab === 'cards-management' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
{/* 子导航标签 */}
            <div className="flex items-center border-b border-border overflow-x-auto">
              <button
                onClick={() => setKnowledgeSubTab('cards')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  knowledgeSubTab === 'cards'
                    ? 'border-wood text-ink-main'
                    : 'border-transparent text-ink-desc hover:text-ink-main'
                }`}
              >
                <Layers size={16} className="inline mr-1.5" />
                卡片管理
              </button>
              <button
                onClick={() => setKnowledgeSubTab('research')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  knowledgeSubTab === 'research'
                    ? 'border-wood text-ink-main'
                    : 'border-transparent text-ink-desc hover:text-ink-main'
                }`}
              >
                <BookOpen size={16} className="inline mr-1.5" />
                专题研究
              </button>
              <button
                onClick={() => setKnowledgeSubTab('knowledge-graph')}
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap hidden md:block ${
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
                className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap hidden md:block ${
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
              <h1 className="text-2xl font-bold text-ink-main">卡片管理</h1>
              <button onClick={() => openCreateModal()} className="bg-wood hover:bg-wood-soft text-ink-main px-4 py-2 rounded-lg flex items-center">
                <PlusCircle size={18} className="mr-2 text-ink-main" /> 新建卡片
              </button>
            </div>
            
            {/* 统计卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div 
                onClick={() => { setSelectedCardColor(null); setSearchQuery(''); setTimeFilter('all'); }}
                className="bg-paper dark:bg-dark-soft p-3 sm:p-4 rounded-card border border-border cursor-pointer hover:shadow-md transition-shadow">
                <div className="text-xl sm:text-2xl font-bold text-ink-main">{cards.length}</div>
                <div className="text-xs sm:text-sm text-ink-desc">总卡片数</div>
              </div>
              {Object.entries(cardTypeMap).map(([color, type]) => (
                <div 
                  key={color} 
                  id={`card-stat-${color}`}
                  onClick={() => setSelectedCardColor(color as CardColor)}
                  className={`${type.bgColor} p-3 sm:p-4 rounded-card border border-border cursor-pointer hover:shadow-lg transition-all hover:scale-105 ${selectedCardColor === color ? 'ring-2 ring-offset-2 ring-wood' : ''}`}
                >
                  <div className={`text-xl sm:text-2xl font-bold text-ink-main`}>{cards.filter(c => c.color === color).length}</div>
                  <div className={`text-xs sm:text-sm font-medium text-ink-main`}>{type.name}</div>
                </div>
              ))}
</div>

            {/* 搜索和筛选 */}
            <div className="flex flex-wrap items-center gap-2 bg-paper dark:bg-dark-soft p-3 rounded-card border border-border">
              <input
                type="checkbox"
                checked={filteredCards.length > 0 && selectedCardIds.size === filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize).length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCardIds(new Set(filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(c => c.id)));
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
                className="flex-1 min-w-[150px] px-3 py-1.5 text-sm border border-border rounded-lg bg-paper dark:bg-dark-mute text-ink-main"
              />
              <select 
                value={selectedCardColor || ''} 
                onChange={(e) => setSelectedCardColor(e.target.value as CardColor || null)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-paper dark:bg-dark-mute text-ink-main"
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
              <button
                onClick={() => setCardViewMode(prev => prev === 'grid' ? 'timeline' : 'grid')}
                className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1 transition-colors ${cardViewMode === 'timeline' ? 'bg-blue-50 border-blue-300 text-blue-600' : 'hover:bg-gray-50'}`}
                title={cardViewMode === 'timeline' ? '切换网格视图' : '切换时间线视图'}
              >
                <Calendar size={14} />
                {cardViewMode === 'timeline' ? '网格' : '时间线'}
              </button>
            </div>

            {/* 批量操作 */}
            {selectedCardIds.size > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between">
                <span className="text-blue-600">已选择 {selectedCardIds.size} 张卡片</span>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      const ids = Array.from(selectedCardIds);
                      try {
                        const resp = await fetch(getApiBaseUrl() + '/api/knowledge/batch-delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ card_ids: ids.map(Number) }),
                        });
                        if (resp.ok) {
                          const result = await resp.json();
                          setCards(prev => prev.filter(c => !ids.includes(c.id)));
                          toast.success(`成功删除 ${result.deleted}/${result.total} 张卡片`);
                        } else {
                          toast.error('批量删除失败，请检查后端服务');
                        }
                      } catch {
                        toast.error('批量删除失败，请检查后端服务');
                      }
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

            {/* 卡片列表：网格模式 */}
            {cardViewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(card => (
                  <motion.div
                    key={card.id}
                    whileHover={{ y: -5 }}
                    className={`border rounded-xl overflow-hidden ${getCardType(card.color).borderColor} ${selectedCardIds.has(card.id) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`${getCardType(card.color).bgColor} p-3 border-b`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedCardIds.has(card.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedCardIds);
                              if (e.target.checked) { newSelected.add(card.id); } else { newSelected.delete(card.id); }
                              setSelectedCardIds(newSelected);
                            }}
                            className="mr-2 w-4 h-4"
                          />
                          <div className={`${getCardType(card.color).color} p-1.5 rounded mr-2`}>
                            {getCardType(card.color).icon}
                          </div>
                          <h3 className="font-semibold truncate cursor-pointer hover:text-blue-600" onClick={() => openDetailModal(card)}>
                            {card.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800">
                      <div className={`text-sm text-gray-600 mb-1 prose prose-gray dark:prose-invert max-w-none [&_p]:mb-1 [&_ul]:mb-1 [&_ol]:mb-1 ${!expandedCardIds.has(card.id) ? 'line-clamp-3' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{card.content}</ReactMarkdown>
                      </div>
                      {card.content.length > 120 && (
                        <button onClick={() => toggleExpandCard(card.id)} className="text-xs text-blue-500 hover:text-blue-700">
                          {expandedCardIds.has(card.id) ? '收起' : '展开全文'}
                        </button>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{formatDate(card.createdAt)}</span>
                        <div className="flex gap-1">
                          <button onClick={(e) => handleCopyCard(card, e)} className="text-gray-500 hover:text-blue-600 p-1" title="复制内容"><Copy size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setZoomedCard(card); }} className="text-gray-500 hover:text-purple-600 p-1" title="放大查看"><ZoomIn size={14} /></button>
                          <button onClick={() => openDetailModal(card)} className="text-blue-600 text-sm hover:underline whitespace-nowrap">编辑</button>
                          <button onClick={() => handleDeleteCard(card.id)} className="text-red-500 text-sm hover:underline ml-2 whitespace-nowrap">删除</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 卡片列表：时间线模式 */}
            {cardViewMode === 'timeline' && (
              <div className="space-y-6">
                {(() => {
                  const grouped: Record<string, typeof filteredCards> = {};
                  const pageCards = filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                  pageCards.forEach(card => {
                    const day = new Date(card.createdAt).toLocaleDateString('zh-CN');
                    if (!grouped[day]) grouped[day] = [];
                    grouped[day].push(card);
                  });
                  return Object.entries(grouped).map(([day, dayCards]) => (
                    <div key={day}>
                      <div className="flex items-center gap-3 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{day}</span>
                        <span className="text-xs text-gray-400">({dayCards.length} 条)</span>
                        <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {dayCards.map(card => (
                          <motion.div
                            key={card.id}
                            whileHover={{ y: -3 }}
                            className={`border rounded-lg overflow-hidden cursor-pointer ${getCardType(card.color).borderColor} bg-white dark:bg-gray-800`}
                            onClick={() => openDetailModal(card)}
                          >
                            <div className={`${getCardType(card.color).bgColor} px-3 py-2 flex items-center gap-2`}>
                              <div className={`${getCardType(card.color).color} p-1 rounded`}>{getCardType(card.color).icon}</div>
                              <span className="font-medium text-sm truncate">{card.title}</span>
                            </div>
                            <div className="p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{extractSummary(card.content, 80)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

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
            <ResearchProjectManager selectedProjectId={urlProjectId ? Number(urlProjectId) : null} />
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
          <ErrorBoundary>
            <VirtualOfficeMeeting />
          </ErrorBoundary>
        )}

        {/* 团队协作视图 */}
        {activeTab === 'team-collaboration' && (
          <ErrorBoundary>
            <TeamCollaboration />
          </ErrorBoundary>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => setActiveTab('pdf-analysis')} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">PDF分析器</h3>
                  <p className="text-xs sm:text-sm text-gray-500">智能解析PDF文档</p>
                </button>
                <button onClick={() => setActiveTab('pdf-viewer')} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-red-400 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">PDF查看器</h3>
                  <p className="text-xs sm:text-sm text-gray-500">在线查看PDF文件</p>
                </button>
                <button onClick={() => setActiveTab('ppt-analysis')} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Presentation className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">PPT生成</h3>
                  <p className="text-xs sm:text-sm text-gray-500">从卡片生成演示文稿</p>
                </button>
                <button onClick={() => setActiveTab('ppt-viewer')} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Presentation className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">PPT演示</h3>
                  <p className="text-xs sm:text-sm text-gray-500">在线演示PPT文件</p>
                </button>
<button onClick={() => setActiveTab('excel-analysis')} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Table className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">Excel/在线表格</h3>
                  <p className="text-xs sm:text-sm text-gray-500">数据分析与可视化</p>
                </button>
                <button onClick={() => { setActiveTab('cards-management'); setKnowledgeSubTab('mindmap'); }} className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left">
                  <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-pink-500 mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-sm sm:text-base">思维导图</h3>
                  <p className="text-xs sm:text-sm text-gray-500">结构化思维整理</p>
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

        {/* 报表生成 → 重定向到 PPT 演示 */}
        {activeTab === 'report-automation' && (
          <PPTViewer />
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
      <footer className="bg-soft dark:bg-dark-mute border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="w-5 h-5 text-wood" />
              <span className="font-semibold text-ink-main">知易智能知识管家</span>
            </div>
            <div className="text-sm text-ink-desc">
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
         existingCards={cards.map(card => ({ id: card.id, title: card.title, content: card.content }))}
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
             <div className="bg-paper dark:bg-dark-soft rounded-card shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden m-4">
               <div className="flex justify-between items-center p-4 border-b border-border">
                 <h2 className="text-xl font-bold text-ink-main">全部知识卡片 ({cards.length})</h2>
                 <button 
                   onClick={() => setShowAllCardsModal(false)}
                   className="p-2 hover:bg-soft dark:hover:bg-dark-mute rounded-lg text-ink-main"
                 >
                   <X size={20} className="text-ink-main" />
                 </button>
               </div>
               <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                 {cards.length === 0 ? (
                   <div className="text-center py-12 text-ink-desc">
                     <Database size={48} className="mx-auto mb-4 opacity-50 text-ink-desc" />
                     <p>暂无知识卡片</p>
                     <p className="text-sm mt-2 text-ink-desc">点击右上角"新建卡片"开始创建</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {cards.map(card => (
                       <motion.div
                         key={card.id}
                         whileHover={{ scale: 1.02, y: -2 }}
                         className={`rounded-card overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-all ${getCardType(card.color).borderColor}`}
                         onClick={() => {
                           setSelectedCard(card);
                           setShowDetailModal(true);
                           setShowAllCardsModal(false);
                         }}
                       >
                         <div className={`${getCardType(card.color).bgColor} p-3 border-b border-border`}>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center flex-1 min-w-0">
                               <div className={`${getCardType(card.color).color} p-1.5 rounded mr-2`}>
                                 {getCardType(card.color).icon}
                               </div>
                               <h3 className="font-semibold truncate text-ink-main">{card.title}</h3>
                             </div>
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={(e) => { e.stopPropagation(); handleCopyCard(card, e as any); }}
                                 className="p-1.5 text-ink-desc hover:text-ink-main hover:bg-soft rounded transition-colors"
                                 title="复制内容"
                               >
                                 <Copy size={14} className="text-ink-desc" />
                               </button>
                               <button
                                 onClick={(e) => { e.stopPropagation(); setZoomedCard(card); }}
                                 className="p-1.5 text-ink-desc hover:text-wood hover:bg-soft rounded transition-colors"
                                 title="放大查看"
                               >
                                 <ZoomIn size={14} className="text-ink-desc" />
                               </button>
                               <span className={`text-xs px-2 py-0.5 rounded-full bg-wood text-ink-main ml-1`}>
                                 {getCardType(card.color).name}
                               </span>
                             </div>
                           </div>
                         </div>
                          <div className="p-3 bg-paper dark:bg-dark-mute">
                            <div className="text-sm text-ink-desc dark:text-ink-desc line-clamp-3 mb-2 prose prose-gray dark:prose-invert max-w-none [&_p]:mb-1"><ReactMarkdown remarkPlugins={[remarkBreaks]}>{card.content}</ReactMarkdown></div>
                           <div className="flex items-center justify-between text-xs text-ink-desc">
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
                className="bg-paper dark:bg-dark-soft rounded-card shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* 放大模态框头部 */}
                <div className={`${getCardType(zoomedCard.color).bgColor} p-4 border-b border-border`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`${getCardType(zoomedCard.color).color} p-2 rounded-lg mr-3`}>
                        {getCardType(zoomedCard.color).icon}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-ink-main">{zoomedCard.title}</h2>
                        <span className={`text-xs text-ink-desc`}>
                          {getCardType(zoomedCard.color).name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyCard(zoomedCard, e as any)}
                        className="p-2 text-ink-desc hover:text-ink-main rounded-full hover:bg-soft transition-colors"
                        title="复制内容"
                      >
                        <Copy size={20} className="text-ink-desc" />
                      </button>
                      <button
                        onClick={() => setZoomedCard(null)}
                        className="p-2 rounded-full hover:bg-soft dark:hover:bg-dark-mute transition-colors"
                      >
                        <X size={24} className="text-ink-main" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 放大后的卡片内容 */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className={`${getCardType(zoomedCard.color).bgColor} border border-border rounded-card p-6`}>
                    <div className="text-lg leading-relaxed prose prose-gray dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{zoomedCard.content}</ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* 元信息 */}
                  <div className="mt-6 flex items-center justify-between text-sm text-ink-desc dark:text-ink-desc">
                    <div className="flex items-center">
                      <span>ID: {zoomedCard.id}</span>
                      <span className="mx-2">·</span>
                      <span>创建于 {formatDate(zoomedCard.createdAt)}</span>
                    </div>
                    <div className={`bg-wood text-ink-main px-3 py-1 rounded-full text-sm`}>
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

