import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Plus, 
  X, 
  Edit2, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  ArrowRight,
  Clock,
  Tag,
  Layers,
  PlusCircle,
  Copy,
  Maximize2,
  Link,
  Search,
  ExternalLink,
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Network
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  researchProjectService,
  ResearchProject,
  GtdTask
} from '@/services/dataService';
import CreateCardModal from './CreateCardModal';
import KnowledgeGraph from './KnowledgeGraph';

interface ProjectCard {
  id: number;
  card_type: string;
  title: string;
  content: string;
  category?: string;
  project_id?: number;
  created_at?: string;
  related_cards?: number[];
}

interface ResearchProjectManagerProps {
  onSelectProject?: (project: ResearchProject) => void;
  selectedProjectId?: number | null;
}

interface AllCardsResponse {
  cards: ProjectCard[];
}

const colorOptions = [
  { value: 'blue', label: '蓝色', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { value: 'green', label: '绿色', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { value: 'yellow', label: '黄色', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  { value: 'red', label: '红色', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  { value: 'purple', label: '紫色', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
];

const iconOptions = ['📚', '🔬', '💡', '📊', '🎯', '🚀', '🔧', '🎨', '📝', '⚙️'];

const cardTypeConfig: Record<string, { name: string; color: string; bgColor: string; borderColor: string; darkBgColor: string; darkBorderColor: string; icon: string; headerBg: string }> = {
  blue:   { name: '事实', color: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   darkBgColor: 'dark:bg-blue-950/40',   darkBorderColor: 'dark:border-blue-800',   icon: '📘', headerBg: 'bg-blue-500' },
  green:  { name: '解释', color: 'text-green-700',  bgColor: 'bg-green-50',  borderColor: 'border-green-200',  darkBgColor: 'dark:bg-green-950/40',  darkBorderColor: 'dark:border-green-800',  icon: '📗', headerBg: 'bg-green-500' },
  yellow: { name: '风险', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', darkBgColor: 'dark:bg-yellow-950/40', darkBorderColor: 'dark:border-yellow-800', icon: '📒', headerBg: 'bg-yellow-500' },
  red:    { name: '行动', color: 'text-red-700',    bgColor: 'bg-red-50',    borderColor: 'border-red-200',    darkBgColor: 'dark:bg-red-950/40',    darkBorderColor: 'dark:border-red-800',    icon: '📕', headerBg: 'bg-red-500' },
};

const RESEARCH_API_BASE = getApiBaseUrl() + '/api/research'

// ========== Portal 弹窗包装器 ==========
// 将弹窗渲染到 document.body，避免被任何父容器的 overflow:hidden 裁剪
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

// ========== 格式化日期 ==========
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  } catch { return dateStr; }
};

// ========== 卡片详情弹窗组件（全屏级别） ==========
const CardDetailModal: React.FC<{
  card: ProjectCard;
  onClose: () => void;
  onConvertToTask: (id: number) => void;
  onUpdate?: (cardId: number, updates: { title: string; content: string; card_type?: string; related_cards?: number[] }) => void;
  projectId?: number;
  allProjects?: ResearchProject[];
  onRelatedCardClick?: (cardId: number) => void;
  onSaveSuccess?: () => void;
}> = ({ card, onClose, onConvertToTask, onUpdate, projectId, allProjects = [], onRelatedCardClick, onSaveSuccess }) => {
  const typeConfig = cardTypeConfig[card.card_type] || cardTypeConfig.blue;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(card.project_id || projectId || null);
  
  // 关联卡片功能
  const [showRelatedCards, setShowRelatedCards] = useState(false);
  const [relatedCards, setRelatedCards] = useState<number[]>(card.related_cards || []);
  const [allCards, setAllCards] = useState<ProjectCard[]>([]);
  const [relatedSearch, setRelatedSearch] = useState('');
  const [suggestedCards, setSuggestedCards] = useState<{id: number; title: string; card_type: string; category?: string; reason: string; score: number}[]>([]);
  
  // 加载所有卡片 + backlink 数据 + 联想推荐
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载所有卡片
        const res = await fetch(getApiBaseUrl() + '/api/knowledge/cards?limit=10000');
        const data: AllCardsResponse = await res.json();
        setAllCards(data.cards || []);
        
        // 从 backlinks 表补充关联（确保关闭重开不丢）
        try {
          const blRes = await fetch(getApiBaseUrl() + `/api/backlinks/card/${card.id}/backlinks`);
          const backlinks = await blRes.json();
          const blIds = backlinks.map((b: any) => b.id);
          
          const flRes = await fetch(getApiBaseUrl() + `/api/backlinks/card/${card.id}/forwardlinks`);
          const forwardlinks = await flRes.json();
          const flIds = forwardlinks.map((f: any) => f.id);
          
          // 合并：related_cards字段 + backlinks + forwardlinks
          const allRelatedIds = new Set([...(card.related_cards || []), ...blIds, ...flIds]);
          setRelatedCards([...allRelatedIds]);
        } catch (e) {
          console.warn('加载backlink数据失败，使用原有related_cards:', e);
        }
        
        // 加载联想推荐
        try {
          const sugRes = await fetch(getApiBaseUrl() + `/api/research/cards/${card.id}/suggested-relations?limit=8`);
          const sugData = await sugRes.json();
          setSuggestedCards(sugData.suggestions || []);
        } catch (e) {
          console.warn('加载联想推荐失败:', e);
        }
      } catch (e) {
        console.error('加载卡片失败:', e);
      }
    };
    loadData();
  }, [card.id]);
  
  // 过滤可关联的卡片
  const availableCards = allCards.filter(c => 
    c.id !== card.id && 
    !relatedCards.includes(c.id) &&
    (c.title.toLowerCase().includes(relatedSearch.toLowerCase()) || 
     c.content.toLowerCase().includes(relatedSearch.toLowerCase()))
  ).slice(0, 20);
  
  // 添加关联
  const addRelatedCard = (targetId: number) => {
    if (!relatedCards.includes(targetId)) {
      setRelatedCards([...relatedCards, targetId]);
    }
  };
  
  // 移除关联
  const removeRelatedCard = (targetId: number) => {
    setRelatedCards(relatedCards.filter(id => id !== targetId));
  };
  
  // 保存关联（双写：knowledge_cards.related_cards + card_backlinks表）
  const saveRelatedCards = async () => {
    try {
      // 1. 更新 knowledge_cards 的 related_cards 字段
      const response = await fetch(getApiBaseUrl() + `/api/knowledge/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: card.card_type,
          title: editTitle,
          content: editContent,
          category: card.category,
          related_cards: relatedCards
        })
      });
      
      if (response.ok) {
        // 2. 同步到 card_backlinks 双向链接表（确保双向性）
        // 后端 update_card 已经会自动同步，这里额外确认
        try {
          // 获取已有的backlinks
          const blRes = await fetch(getApiBaseUrl() + `/api/backlinks/card/${card.id}/forwardlinks`);
          const existingForward = await blRes.json();
          const existingTargetIds = new Set(existingForward.map((f: any) => f.id));
          
          // 新增的关联需要写入backlinks
          for (const targetId of relatedCards) {
            if (!existingTargetIds.has(targetId)) {
              await fetch(getApiBaseUrl() + '/api/backlinks/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source_card_id: card.id,
                  target_card_id: targetId,
                  link_text: 'manual'
                })
              });
              // 双向
              await fetch(getApiBaseUrl() + '/api/backlinks/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source_card_id: targetId,
                  target_card_id: card.id,
                  link_text: 'manual'
                })
              });
            }
          }
        } catch (e) {
          console.warn('同步backlinks失败（非致命）:', e);
        }
        
        toast.success('关联已保存');
        setShowRelatedCards(false);
        // 从联想推荐中移除已关联的
        setSuggestedCards(prev => prev.filter(s => !relatedCards.includes(s.id)));
        onUpdate?.(card.id, { title: editTitle, content: editContent, related_cards: relatedCards });
      }
    } catch (e) {
      toast.error('保存关联失败');
    }
  };

  const handleCopy = () => {
    const text = `[${typeConfig.name}] ${card.title}\n\n${card.content}`;
    navigator.clipboard?.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error('标题不能为空');
      return;
    }
    try {
      const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          related_cards: relatedCards
        })
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('保存成功');
        setIsEditing(false);
        onUpdate?.(card.id, { title: editTitle, content: editContent, related_cards: relatedCards });
      } else {
        console.error('保存失败:', result);
        toast.error(`保存失败: ${result.detail || '未知错误'}`);
      }
    } catch (err: any) {
      console.error('保存失败:', err);
      toast.error(`保存失败: ${err.message || '网络错误'}`);
    }
  };

  const handleChangeProject = async (newProjectId: number | null) => {
    try {
      const response = await fetch(`${RESEARCH_API_BASE}/cards/${card.id}/link-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: newProjectId })
      });
      if (response.ok) {
        setSelectedProjectId(newProjectId);
        setShowProjectSelector(false);
        toast.success(newProjectId ? '已关联专题' : '已取消关联');
      }
    } catch (err) {
      toast.error('关联失败');
    }
  };

  const handleSaveCardEdit = async () => {
    try {
      const response = await fetch(`${RESEARCH_API_BASE}/projects/${projectId}/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          related_cards: relatedCards
        })
      });
      if (response.ok) {
        toast.success('保存成功');
        onSaveSuccess?.();
        onUpdate?.(card.id, { title: editTitle, content: editContent, related_cards: relatedCards });
        onClose(); // 保存成功后关闭弹窗
      } else {
        const data = await response.json();
        toast.error(data.message || '保存失败');
      }
    } catch (err) {
      toast.error('保存失败');
    }
  };

  const currentProject = allProjects.find(p => p.id === selectedProjectId);

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        style={{ margin: 0, padding: '24px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col"
          style={{ 
            width: '90vw', 
            maxWidth: '800px', 
            maxHeight: '85vh',
            minHeight: '400px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部颜色条 */}
          <div className={`h-2 rounded-t-2xl ${typeConfig.headerBg}`} />
          
          {/* 头部 */}
          <div className={`px-8 py-6 ${typeConfig.bgColor} ${typeConfig.darkBgColor} border-b ${typeConfig.borderColor} ${typeConfig.darkBorderColor}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1 min-w-0 pr-4">
                <span className="text-4xl mt-1 flex-shrink-0">{typeConfig.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${typeConfig.bgColor} ${typeConfig.color} border ${typeConfig.borderColor}`}>
                      {typeConfig.name}
                    </span>
                    {card.category && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        {card.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">ID: {card.id}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight break-words">
                    {card.title}
                  </h2>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                  title="复制内容"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 内容区域 - 可滚动 */}
          <div className="flex-1 overflow-y-auto px-8 py-6" style={{ minHeight: '200px' }}>
            {isEditing ? (
              <div className="space-y-4">
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-2xl font-bold px-3 py-2 border rounded-lg dark:bg-gray-700"
                  placeholder="卡片标题"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-64 px-3 py-2 border rounded-lg resize-none dark:bg-gray-700"
                  placeholder="卡片内容"
                />
              </div>
            ) : (
              <div className="text-base text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                {card.content || '暂无内容'}
              </div>
            )}
            
            {/* 关联卡片面板 */}
            {showRelatedCards && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <Link className="w-4 h-4 mr-2" />
                    关联卡片
                  </h4>
                  <button
                    onClick={saveRelatedCards}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    保存关联
                  </button>
                </div>
                
                {/* 已关联卡片列表 */}
                {relatedCards.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">已关联 ({relatedCards.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {relatedCards.map(relId => {
                        const relCard = allCards.find(c => c.id === relId);
                        return relCard ? (
                          <div key={relId} className="flex items-center px-2 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                            <button
                              onClick={() => onRelatedCardClick?.(relId)}
                              className="flex items-center hover:text-blue-600"
                            >
                              <span className={`w-2 h-2 rounded-full mr-1.5 ${
                                relCard.card_type === 'blue' ? 'bg-blue-500' :
                                relCard.card_type === 'green' ? 'bg-green-500' :
                                relCard.card_type === 'yellow' ? 'bg-yellow-500' :
                                relCard.card_type === 'red' ? 'bg-red-500' : 'bg-gray-400'
                              }`} />
                              <span className="truncate max-w-[150px]">{relCard.title}</span>
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </button>
                            <button
                              onClick={() => removeRelatedCard(relId)}
                              className="ml-2 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                
                {/* 联想推荐区 */}
                {suggestedCards.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      联想推荐
                    </p>
                    <div className="space-y-1">
                      {suggestedCards
                        .filter(s => !relatedCards.includes(s.id))
                        .slice(0, 6)
                        .map(s => (
                        <div key={s.id} className="flex items-center justify-between px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/40 text-sm">
                          <div className="flex items-center flex-1 min-w-0">
                            <span className={`w-2 h-2 rounded-full mr-1.5 flex-shrink-0 ${
                              s.card_type === 'blue' ? 'bg-blue-500' :
                              s.card_type === 'green' ? 'bg-green-500' :
                              s.card_type === 'yellow' ? 'bg-yellow-500' :
                              s.card_type === 'red' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <span className="truncate">{s.title}</span>
                            <span className="ml-2 text-xs text-amber-500 flex-shrink-0">{s.reason}</span>
                          </div>
                          <button
                            onClick={() => addRelatedCard(s.id)}
                            className="ml-2 text-blue-500 hover:text-blue-700 flex-shrink-0"
                            title="添加关联"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 手动搜索添加关联 */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">搜索添加</p>
                  <input
                    type="text"
                    value={relatedSearch}
                    onChange={e => setRelatedSearch(e.target.value)}
                    placeholder="搜索卡片标题或内容..."
                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableCards.map(c => (
                      <button
                        key={c.id}
                        onClick={() => addRelatedCard(c.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center min-w-0">
                          <span className={`w-2 h-2 rounded-full mr-1.5 flex-shrink-0 ${
                            c.card_type === 'blue' ? 'bg-blue-500' :
                            c.card_type === 'green' ? 'bg-green-500' :
                            c.card_type === 'yellow' ? 'bg-yellow-500' :
                            c.card_type === 'red' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                          <span className="truncate">{c.title}</span>
                        </div>
                        <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {card.created_at && (
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDate(card.created_at)}
                </span>
              )}
              <button
                onClick={() => setShowProjectSelector(true)}
                className="flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Tag className="w-3 h-3 mr-1" />
                {currentProject ? currentProject.name : '关联专题'}
              </button>
              <button
                onClick={() => setShowRelatedCards(!showRelatedCards)}
                className="flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                <Link className="w-3 h-3 mr-1" />
                关联卡片 ({relatedCards.length})
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => { setIsEditing(false); setEditTitle(card.title); setEditContent(card.content); }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveCardEdit}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    保存
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    编辑
                  </button>
                  {card.card_type === 'red' && (
                    <button
                      onClick={() => { onConvertToTask(card.id); onClose(); }}
                      className="flex items-center px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      <ArrowRight className="w-4 h-4 mr-1.5" />
                      转换为任务
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-5 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 专题选择弹窗 */}
          {showProjectSelector && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50" onClick={() => setShowProjectSelector(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-80 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4">选择专题</h3>
                <button
                  onClick={() => handleChangeProject(null)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mb-2"
                >
                  不关联专题
                </button>
                {allProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleChangeProject(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mb-1 ${selectedProjectId === p.id ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </Portal>
  );
};

// ========== 专题详情全屏面板 ==========
const ProjectDetailPanel: React.FC<{
  project: ResearchProject;
  onClose: () => void;
  onConvertCardToTask: (cardId: number) => void;
  allProjects?: ResearchProject[];
}> = ({ project, onClose, onConvertCardToTask, allProjects = [] }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'tasks' | 'workflow'>('cards');
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [tasks, setTasks] = useState<GtdTask[]>([]);
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<ProjectCard | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [projectStats, setProjectStats] = useState<{
    cards: Record<string, number>;
    total_cards: number;
    tasks: { total: number; completed: number; pending: number };
    task_progress: number;
    calendar_events: number;
    backlinks: number;
  } | null>(null);
  const [unconvertedCards, setUnconvertedCards] = useState<ProjectCard[]>([]);
  const [exportingPPT, setExportingPPT] = useState(false);
  const [showPPTDialog, setShowPPTDialog] = useState(false);

  const colorOpt = colorOptions.find(c => c.value === project.color) || colorOptions[0];

  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    if (!project.id) return;
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        researchProjectService.getTasks(project.id),
        researchProjectService.getCards(project.id),
      ]);
      setTasks(t);
      setCards(c);

      // 加载统计数据
      try {
        const { researchStatsService } = await import('../services/dataService');
        const stats = await researchStatsService.getStats(project.id);
        setProjectStats(stats);
      } catch {
        // 统计 API 可能不可用，使用本地计算
        const cardStats: Record<string, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
        c.forEach((card: ProjectCard) => { if (cardStats.hasOwnProperty(card.card_type)) cardStats[card.card_type]++; });
        const taskCompleted = t.filter((task: any) => task.is_completed).length;
        setProjectStats({
          cards: cardStats,
          total_cards: c.length,
          tasks: { total: t.length, completed: taskCompleted, pending: t.length - taskCompleted },
          task_progress: t.length > 0 ? Math.round(taskCompleted / t.length * 100) : 0,
          calendar_events: 0,
          backlinks: 0
        });
      }

      // 找出未转换的行动卡片
      const taskSourceIds = new Set(t.filter((task: any) => task.source_type === 'card').map((task: any) => task.source_id));
      setUnconvertedCards(c.filter((card: ProjectCard) => card.card_type === 'red' && !taskSourceIds.has(card.id)));
    } catch (err) {
      console.error('加载专题数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 刷新卡片数据
  const refreshCards = async () => {
    if (!project.id) return;
    try {
      const c = await researchProjectService.getCards(project.id);
      setCards(c);
    } catch (err) {
      console.error('刷新卡片失败:', err);
    }
  };

  // 导出专题为PPT
  const handleExportPPT = async () => {
    if (!project.id || cards.length === 0) {
      toast.error('该专题下没有卡片，无法导出');
      return;
    }
    setExportingPPT(true);
    try {
      const response = await fetch(getApiBaseUrl() + '/api/ppt/export/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          title: project.name,
          narrative: {
            template: 'problem-analysis-solution',
            generate_transitions: true,
            polish_language: true,
            generate_conclusions: true,
            extract_key_points: true,
          },
          theme: 'professional',
          include_summary: true,
          include_backlinks: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
throw new Error(err.detail || '导出失败');
      }

      const data = await response.json();
      if (data.success && data.filename) {
        // 存储文件名并跳转到预览
        sessionStorage.setItem('lastPPTFileName', data.filename);
        toast.success('PPT导出成功');
        window.location.href = '/ppt-viewer';
      } else {
        throw new Error(data.detail || '导出失败');
      }
    } catch (err: any) {
      toast.error(err.message || 'PPT导出失败');
    } finally {
      setExportingPPT(false);
    }
  };

  // 复用首页的创建卡片流程，创建后自动关联专题
  const handleCreateCardSave = async (cardData: any) => {
    try {
      // 使用专题专用API，会自动建立同专题双向链接
      const response = await fetch(getApiBaseUrl() + `/api/research/projects/${project.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cardData.color,
          title: cardData.title || undefined,
          content: cardData.content,
          category: cardData.color === 'blue' ? '事实' : 
                    cardData.color === 'green' ? '解释' : 
                    cardData.color === 'yellow' ? '风险' : '行动',
          related_cards: (cardData.relatedCards || []).map(Number).filter((id: number) => !isNaN(id))
        })
      });
      if (!response.ok) throw new Error('创建失败');
      toast.success('卡片创建成功并已关联专题');
      loadData();
    } catch (err) {
      toast.error('创建卡片失败');
    }
  };

  const handleConvertToTask = async (cardId: number) => {
    try {
      const response = await fetch(`${RESEARCH_API_BASE}/cards/${cardId}/to-task`, { method: 'POST' });
      if (response.ok) {
        toast.success('已转换为任务，可在「任务管理 → 收集箱」中查看');
        loadData();
        onConvertCardToTask(cardId);
      }
    } catch { toast.error('转换失败'); }
  };

  const cardStats = { blue: 0, green: 0, yellow: 0, red: 0 };
  cards.forEach(c => { if (cardStats.hasOwnProperty(c.card_type)) cardStats[c.card_type as keyof typeof cardStats]++; });

  return (
    <Portal>
      <div className="fixed inset-0 z-[9990] bg-gray-50 dark:bg-gray-900 flex flex-col overflow-y-auto" style={{ margin: 0 }}>
        {/* 顶部导航栏 */}
        <div className={`flex-shrink-0 ${colorOpt.bg} dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回列表
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{project.icon || '📚'}</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{project.description}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* 四色统计 */}
              <div className="hidden sm:flex items-center space-x-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
                {Object.entries(cardTypeConfig).map(([type, config]) => (
                  <span key={type} className="flex items-center space-x-1">
                    <span className="text-sm">{config.icon}</span>
                    <span className={`text-xs font-bold ${config.color}`}>{cardStats[type as keyof typeof cardStats]}</span>
                  </span>
                ))}
              </div>
              <button
                onClick={handleExportPPT}
                disabled={exportingPPT || cards.length === 0}
                className="flex items-center px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg transition-colors shadow-sm"
                title="将专题卡片导出为PPT"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {exportingPPT ? '导出中...' : '导出PPT'}
              </button>
              <button
                onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors shadow-sm ${
                  showKnowledgeGraph
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
                title="查看专题知识网络"
              >
                <Network className="w-4 h-4 mr-1" />
                {showKnowledgeGraph ? '关闭网络' : '知识网络'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('cards')}
                className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'cards'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Layers className="w-4 h-4 mr-2" />
                四色卡片 ({cards.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                关联任务 ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('workflow')}
                className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'workflow'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                工作流概览
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : (
              <>
                {/* ===== 四色卡片 Tab ===== */}
                {activeTab === 'cards' && (
                  <div>
                    {/* 操作栏 */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        研究卡片
                      </h2>
                      <button
                        onClick={() => setShowCreateCard(true)}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                      >
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        新建卡片
                      </button>
                    </div>

                    {cards.length === 0 ? (
                      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <Layers className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">该专题下暂无卡片</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">在研究过程中发现的事实、解释、风险、行动都可以保存为卡片</p>
                        <button
                          onClick={() => setShowCreateCard(true)}
                          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          创建第一张卡片
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {cards.map((card) => {
                          const tc = cardTypeConfig[card.card_type] || cardTypeConfig.blue;
                          return (
                            <motion.div
                              key={card.id}
                              whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                              onClick={() => setSelectedCard(card)}
                              className={`group relative p-5 rounded-xl border-2 cursor-pointer transition-all ${tc.bgColor} ${tc.borderColor} ${tc.darkBgColor} ${tc.darkBorderColor} hover:shadow-lg`}
                            >
                              {/* 类型标签 */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xl">{tc.icon}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tc.bgColor} ${tc.color} border ${tc.borderColor}`}>
                                    {tc.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {card.card_type === 'red' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleConvertToTask(card.id); }}
                                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                      title="转为任务"
                                    >
                                      转任务
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                                    className="p-1.5 hover:bg-white/60 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="查看详情"
                                  >
                                    <Maximize2 className="w-4 h-4 text-gray-500" />
                                  </button>
                                </div>
                              </div>

                              {/* 标题 */}
                              <h3 className={`font-bold text-base mb-2 ${tc.color} dark:text-white line-clamp-2 leading-snug`}>
                                {card.title}
                              </h3>

                              {/* 内容预览 */}
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 leading-relaxed mb-3">
                                {card.content || '暂无内容'}
                              </p>

                              {/* 底部 */}
                              {card.created_at && (
                                <div className="flex items-center pt-3 border-t border-black/5 dark:border-white/10">
                                  <Clock className="w-3 h-3 text-gray-400 mr-1" />
                                  <span className="text-xs text-gray-400">{formatDate(card.created_at)}</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* 知识网络视图 */}
                    {showKnowledgeGraph && cards.length > 0 && (
                      <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center text-gray-700 dark:text-gray-300">
                          <Network className="w-4 h-4 mr-2 text-indigo-500" />
                          专题知识网络
                        </h3>
                        <div className="h-80 rounded-lg overflow-hidden">
                          <KnowledgeGraph filterProjectId={project.id} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== 任务 Tab ===== */}
                {activeTab === 'tasks' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">关联任务</h2>
                    {tasks.length === 0 ? (
                      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                        <p className="text-gray-500 text-lg">该专题下暂无关联任务</p>
                        <p className="text-gray-400 text-sm mt-2">可以将行动卡片转换为任务</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                          >
                            <div className={`w-3 h-3 rounded-full mr-4 flex-shrink-0 ${
                              task.priority === 'high' ? 'bg-red-500' :
                              task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.description}</p>
                              )}
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${
                              task.priority === 'high' ? 'bg-red-100 text-red-700' :
                              task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== 工作流概览 Tab ===== */}
                {activeTab === 'workflow' && projectStats && (
                  <div className="space-y-6">
                    {/* 统计概览卡片 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600">{projectStats.total_cards}</div>
                        <div className="text-sm text-gray-500 mt-1">知识卡片</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{projectStats.tasks.completed}/{projectStats.tasks.total}</div>
                        <div className="text-sm text-gray-500 mt-1">任务完成</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600">{projectStats.backlinks}</div>
                        <div className="text-sm text-gray-500 mt-1">双向链接</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                        <div className="text-3xl font-bold text-amber-600">{projectStats.calendar_events}</div>
                        <div className="text-sm text-gray-500 mt-1">日历事件</div>
                      </div>
                    </div>

                    {/* 任务进度条 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                          任务进度
                        </h3>
                        <span className="text-sm text-gray-500">{projectStats.task_progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${projectStats.task_progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{projectStats.tasks.completed} 已完成</span>
                        <span>{projectStats.tasks.pending} 待处理</span>
                      </div>
                    </div>

                    {/* 四色卡片分布 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">卡片类型分布</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {Object.entries(projectStats.cards).map(([type, count]) => {
                          const config = cardTypeConfig[type];
                          if (!config) return null;
                          return (
                            <div key={type} className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} border text-center`}>
                              <div className="text-2xl mb-1">{config.icon}</div>
                              <div className={`text-xl font-bold ${config.color}`}>{count}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{config.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 待转换的行动卡片 */}
                    {unconvertedCards.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-5">
                        <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2" />
                          待执行的行动卡片
                          <span className="ml-2 text-sm font-normal">({unconvertedCards.length} 张红色卡片尚未转为任务)</span>
                        </h3>
                        <div className="space-y-2">
                          {unconvertedCards.map(card => (
                            <div key={card.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-100 dark:border-gray-700">
                              <div className="flex items-center min-w-0 flex-1">
                                <span className="text-lg mr-2">📕</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{card.title || card.content.slice(0, 50)}</span>
                              </div>
                              <button
                                onClick={() => handleConvertToTask(card.id)}
                                className="ml-3 flex-shrink-0 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                              >
                                转为任务
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 工作流提示 */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-5">
                      <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3 flex items-center">
                        <Layers className="w-5 h-5 mr-2" />
                        专题工作流
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">事实卡片</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded">解释分析</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 rounded">风险识别</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded">行动决策</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 rounded">GTD 任务</span>
                      </div>
                      <p className="mt-3 text-xs text-indigo-600/70 dark:text-indigo-400/70">
                        完整闭环：事实 → 解释 → 风险 → 行动 → 任务执行，通过双向链接和日历事件串联所有环节
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ===== 卡片详情弹窗 ===== */}
        <AnimatePresence>
          {selectedCard && (
            <CardDetailModal
              card={selectedCard}
              onClose={() => setSelectedCard(null)}
              onConvertToTask={handleConvertToTask}
              projectId={project.id}
              allProjects={allProjects}
              onRelatedCardClick={(cardId) => {
                const targetCard = cards.find(c => c.id === cardId);
                if (targetCard) setSelectedCard(targetCard);
              }}
              onUpdate={(cardId, updates) => {
                setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
              }}
              onSaveSuccess={() => {
                // 刷新卡片数据
                refreshCards();
              }}
            />
          )}
        </AnimatePresence>

        {/* ===== 创建卡片弹窗 - 复用首页 CreateCardModal ===== */}
        <CreateCardModal
          isOpen={showCreateCard}
          onClose={() => setShowCreateCard(false)}
          onSave={handleCreateCardSave}
          initialColor="blue"
          existingCards={cards.map(c => ({ id: String(c.id), title: c.title }))}
          projectId={project.id}
          projectName={project.name}
        />
      </div>
    </Portal>
  );
};


// ========== 主组件 ==========
const ResearchProjectManager: React.FC<ResearchProjectManagerProps> = ({
  onSelectProject,
  selectedProjectId
}) => {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ResearchProject | null>(null);
  const [openProject, setOpenProject] = useState<ResearchProject | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: 'blue', icon: '📚' });

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await researchProjectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('加载专题失败:', error);
      toast.error('加载专题失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) { toast.error('请输入专题名称'); return; }
    try {
      await researchProjectService.create({
        name: newProject.name, description: newProject.description,
        color: newProject.color, icon: newProject.icon, status: 'active'
      });
      
      // 同步到知识卡片库
      try {
        await fetch(getApiBaseUrl() + '/api/knowledge/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newProject.name,
            content: newProject.description,
            card_type: 'blue',
            address: '',
            related_cards: []
          })
        });
      } catch (e) { console.log('同步到知识卡片失败:', e); }
      
      toast.success('专题创建成功');
      setShowCreateModal(false);
      setNewProject({ name: '', description: '', color: 'blue', icon: '📚' });
      loadProjects();
    } catch { toast.error('创建专题失败'); }
  };

  const handleEditProject = async () => {
    if (!editingProject || !editingProject.name.trim()) return;
    try {
      await researchProjectService.update(editingProject.id!, {
        name: editingProject.name, description: editingProject.description,
        color: editingProject.color, icon: editingProject.icon
      });
      toast.success('专题更新成功');
      setShowEditModal(false);
      setEditingProject(null);
      loadProjects();
    } catch { toast.error('更新专题失败'); }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('确定要删除这个专题吗？')) return;
    try {
      await researchProjectService.delete(projectId);
      toast.success('专题已删除');
      loadProjects();
    } catch { toast.error('删除专题失败'); }
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Book className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold">专题研究</h2>
          <span className="text-sm text-gray-500">({projects.length})</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          新建专题
        </motion.button>
      </div>

      {/* 专题列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Book className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">暂无专题，点击上方按钮创建</p>
          <p className="text-sm text-gray-400">专题可以关联四色卡片和任务，帮助你系统化研究</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const colorOpt = colorOptions.find(c => c.value === project.color) || colorOptions[0];
            return (
              <motion.div
                key={project.id}
                whileHover={{ y: -1 }}
                className={`rounded-xl border-2 ${colorOpt.border} bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                onClick={() => setOpenProject(project)}
              >
                <div className={`flex items-center justify-between p-4 ${colorOpt.bg} dark:bg-gray-800`}>
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{project.icon || '📚'}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowEditModal(true); }}
                      className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id!); }}
                      className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== 专题详情全屏面板（Portal 渲染到 body） ===== */}
      <AnimatePresence>
        {openProject && (
          <ProjectDetailPanel
            project={openProject}
            onClose={() => setOpenProject(null)}
            onConvertCardToTask={() => {}}
            allProjects={projects}
          />
        )}
      </AnimatePresence>

      {/* ===== 创建专题弹窗（Portal） ===== */}
      {showCreateModal && (
        <Portal>
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 overflow-y-auto" style={{ margin: 0, padding: '24px' }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden my-8"
              style={{ width: '90vw', maxWidth: '480px' }}
            >
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold">新建专题</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">专题名称 *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-base"
                    placeholder="输入专题名称..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">描述</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 resize-none text-base"
                    placeholder="输入专题描述..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">图标</label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewProject({ ...newProject, icon })}
                        className={`w-11 h-11 flex items-center justify-center text-xl rounded-xl border-2 transition-all ${
                          newProject.icon === icon
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">颜色</label>
                  <div className="flex space-x-2">
                    {colorOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setNewProject({ ...newProject, color: opt.value })}
                        className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                          newProject.color === opt.value
                            ? `${opt.bg} ${opt.text} ${opt.border}`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-200 rounded-xl hover:bg-gray-300">
                  取消
                </button>
                <button onClick={handleCreateProject} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                  创建
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}

      {/* ===== 编辑专题弹窗（Portal） ===== */}
      {showEditModal && editingProject && (
        <Portal>
<div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 overflow-y-auto" style={{ margin: 0, padding: '24px' }}>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden my-8"
            style={{ width: '90vw', maxWidth: '480px' }}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">编辑专题</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">专题名称 *</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">描述</label>
                  <textarea
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 resize-none text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">图标</label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setEditingProject({ ...editingProject, icon })}
                        className={`w-11 h-11 flex items-center justify-center text-xl rounded-xl border-2 transition-all ${
                          editingProject.icon === icon
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">颜色</label>
                  <div className="flex space-x-2">
                    {colorOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setEditingProject({ ...editingProject, color: opt.value })}
                        className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                          editingProject.color === opt.value
                            ? `${opt.bg} ${opt.text} ${opt.border}`
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <button onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-200 rounded-xl hover:bg-gray-300">
                  取消
                </button>
                <button onClick={handleEditProject} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                  保存
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default ResearchProjectManager;
