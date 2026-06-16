import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { safeErrorDetail } from '@/lib/utils';
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
  Layers,
  PlusCircle,
  Search,
  Maximize2,
  ExternalLink,
  TrendingUp,
  Network,
  AlertTriangle,
  Circle,
  CheckCircle2,
  UserPlus,
  ListTodo,
  Loader2,
  FileText,
  Presentation,
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  researchProjectService,
  ResearchProject,
  GtdTask
} from '@/services/dataService';
import CreateCardModal from './CreateCardModal';
import CardDetailModal from '@/components/CardDetailModal';
import KanbanBoard from './KanbanBoard';

// 类型转换：将ProjectCard转换为KnowledgeCard格式
interface KnowledgeCardForDetail {
  id: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  address: string;
  createdAt: string;
  relatedCards: string[];
  projectId?: number | null;
}

const convertProjectCardToKnowledgeCard = (card: ProjectCard): KnowledgeCardForDetail => ({
  id: String(card.id),
  color: (card.card_type === 'blue' || card.card_type === 'green' || card.card_type === 'yellow' || card.card_type === 'red') 
    ? card.card_type as 'blue' | 'green' | 'yellow' | 'red' 
    : 'blue',
  title: card.title,
  content: card.content,
  address: String(card.id),
  createdAt: card.created_at || new Date().toISOString(),
  relatedCards: (card.related_cards || []).map(String),
  projectId: card.project_id
});

const convertKnowledgeCardToProjectCard = (card: KnowledgeCardForDetail): Partial<ProjectCard> => ({
  id: Number(card.id),
  card_type: card.color,
  title: card.title,
  content: card.content,
  project_id: card.projectId ?? undefined,
  related_cards: card.relatedCards.map(Number)
});

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
  showDeepLinkButton?: boolean;
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

const RESEARCH_API_BASE = () => getApiBaseUrl() + '/api/research'

// ========== 内容渲染组件 ==========
const RenderContent: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none text-sm [&_p]:mb-1 [&_ul]:mb-1 [&_ol]:mb-1">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

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

// ========== 专题卡片详情弹窗组件（全屏级别）- 用于ProjectDetailPanel内部 ==========
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// ResearchCardDetailModal 已移除，改用标准 CardDetailModal

// ========== 专题详情全屏面板 ==========
const ProjectDetailPanel: React.FC<{
  project: ResearchProject;
  onClose: () => void;
  onConvertCardToTask: (cardId: number) => void;
  allProjects?: ResearchProject[];
}> = React.memo(({ project, onClose, onConvertCardToTask, allProjects = [] }) => {
  const allProjectsList = allProjects;
  const [activeTab, setActiveTab] = useState<'cards' | 'tasks' | 'workflow' | 'kanban' | 'network'>('cards');
  const [networkTabOpened, setNetworkTabOpened] = useState(false);
  const [tasks, setTasks] = useState<GtdTask[]>([]);
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<ProjectCard | null>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showMoveCard, setShowMoveCard] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [previewCard, setPreviewCard] = useState<ProjectCard | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editTaskCategory, setEditTaskCategory] = useState('inbox');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
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
  const [pptResult, setPptResult] = useState<{ filename: string; success: boolean; message: string } | null>(null);
  const loadIdRef = useRef(0);

  // 添加已有卡片弹窗状态
  const [showLinkCard, setShowLinkCard] = useState(false);
  const [linkableCards, setLinkableCards] = useState<Array<{id: number; card_type: string; title: string; content: string; is_linked: boolean; created_at: string}>>([]);
  const [selectedLinkCardIds, setSelectedLinkCardIds] = useState<Set<number>>(new Set());
  const [linkableLoading, setLinkableLoading] = useState(false);
  const [linkingCards, setLinkingCards] = useState(false);
  const [linkCardSearchQuery, setLinkCardSearchQuery] = useState('');

  const colorOpt = colorOptions.find(c => c.value === project.color) || colorOptions[0];

  useEffect(() => {
    loadData();
  }, [project.id]);

  // 外部任务刷新触发卡片重载
  useEffect(() => {
    if (taskRefreshTrigger > 0) loadData();
  }, [taskRefreshTrigger]);

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

  // 刷新项目统计（任务完成/重置后调用）
  const loadProjectStats = async () => {
    if (!project.id) return;
    try {
      try {
        const { researchStatsService } = await import('../services/dataService');
        const stats = await researchStatsService.getStats(project.id);
        setProjectStats(stats);
        return;
      } catch { /* 回退到本地计算 */ }
      const t = tasks;
      const taskCompleted = t.filter((task: any) => task.is_completed).length;
      setProjectStats(prev => prev ? {
        ...prev,
        tasks: { total: t.length, completed: taskCompleted, pending: t.length - taskCompleted },
        task_progress: t.length > 0 ? Math.round(taskCompleted / t.length * 100) : 0,
      } : null);
    } catch {}
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

  const loadLinkableCards = async () => {
    if (!project.id) return;
    setLinkableLoading(true);
    try {
      const res = await fetch(`${RESEARCH_API_BASE()}/projects/${project.id}/linkable-cards`);
      if (res.ok) {
        const data = await res.json();
        setLinkableCards(data);
      }
    } catch (err) {
      console.error('加载可关联卡片失败:', err);
    } finally {
      setLinkableLoading(false);
    }
  };

  const handleLinkCards = async () => {
    if (!project.id || selectedLinkCardIds.size === 0) return;
    setLinkingCards(true);
    try {
      const res = await fetch(`${RESEARCH_API_BASE()}/projects/${project.id}/link-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_ids: Array.from(selectedLinkCardIds) })
      });
      if (res.ok) {
        toast.success(`已关联 ${selectedLinkCardIds.size} 张卡片到专题`);
        setShowLinkCard(false);
        setSelectedLinkCardIds(new Set());
        refreshCards();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(safeErrorDetail(err.detail, '关联卡片失败'));
      }
    } catch {
      toast.error('关联卡片失败');
    } finally {
      setLinkingCards(false);
    }
  };

  // 按需导出单张卡片为PDF
  const handleExportCardPDF = async (card: ProjectCard) => {
    try {
      const blob = await pdf(<ProjectPDF cards={[card]} projectName={card.title} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${card.title || '卡片'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF 已导出');
    } catch {
      toast.error('PDF 导出失败');
    }
  };

  // 导出专题为PPT
  const handleExportPPT = async () => {
    if (!project.id || cards.length === 0) {
      toast.error('该专题下没有卡片，无法导出');
      return;
    }
    setExportingPPT(true);
    setPptResult(null);
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
        const err = await response.json().catch(() => ({ detail: '导出失败' }));
        throw new Error(err.detail || '导出失败');
      }

      const data = await response.json();
      if (data.success && data.filename) {
        const filename = data.filename as string;
        sessionStorage.setItem('lastPPTFileName', filename);
        setPptResult({
          filename,
          success: true,
          message: data.message || 'PPT 导出成功！',
        });
      } else {
        throw new Error(data.detail || '导出失败');
      }
    } catch (err: any) {
      setPptResult({
        filename: '',
        success: false,
        message: err.message || 'PPT导出失败，请检查后端服务',
      });
    } finally {
      setExportingPPT(false);
    }
  };

  // 下载 PPT 文件
  const handleDownloadPPT = async (filename: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/ppt/file?filename=${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/^.*[\\/]/, '') || 'export.pptx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PPT 文件下载完成');
    } catch (err) {
      toast.error('下载失败，请检查后端连接');
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

  // 删除专题卡片
  const handleDeleteCard = async (cardId: number) => {
    if (!confirm('确定要删除这张卡片吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(getApiBaseUrl() + `/api/research/cards/${cardId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('卡片已删除');
        refreshCards();
      } else {
        const data = await response.json();
        toast.error(data.detail || '删除失败');
      }
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleConvertToTask = async (cardId: number, onComplete?: () => void) => {
    try {
      // 1. 先将卡片转换为任务
      const response = await fetch(`${RESEARCH_API_BASE()}/cards/${cardId}/to-task`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        const taskId = data.task_id || data.id;
        
        // 2. 如果任务创建成功，将任务关联到当前专题
        if (taskId && project.id) {
          try {
            await researchProjectService.addTask(project.id, taskId);
          } catch (linkErr) {
            console.warn('关联任务到专题失败:', linkErr);
          }
        }
        
        toast.success('已转换为任务并关联到专题');
        await loadData();  // 等待数据刷新完成
        onConvertCardToTask(cardId);
        setTaskRefreshTrigger(prev => prev + 1);
        onComplete?.();  // 通知完成，可用于关闭弹窗
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.detail || '转换失败，请确认后端已重启');
      }
    } catch { toast.error('转换请求失败，请检查后端是否运行'); }
  };

  // 保存编辑后的任务
  const handleSaveTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/data/gtd/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc,
          priority: editTaskPriority,
          category: editTaskCategory,
          due_date: editTaskDueDate || null,
        }),
      });
      if (res.ok) {
        toast.success('任务已更新');
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: editTaskTitle, description: editTaskDesc, priority: editTaskPriority, category: editTaskCategory, due_date: editTaskDueDate } as GtdTask : t));
        setEditingTask(null);
        loadProjectStats();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(safeErrorDetail(err.detail, '更新失败'));
      }
    } catch { toast.error('更新失败'); }
    finally { setSavingTask(false); }
  };

  const cardStats = useMemo(() => {
    const stats = { blue: 0, green: 0, yellow: 0, red: 0 };
    cards.forEach(c => { if (stats.hasOwnProperty(c.card_type)) stats[c.card_type as keyof typeof stats]++; });
    return stats;
  }, [cards]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[9990] bg-gray-50 dark:bg-gray-900 flex flex-col overflow-y-auto" style={{ margin: 0 }}>
        {/* 顶部导航栏 */}
        <div className={`flex-shrink-0 ${colorOpt.bg} dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={onClose}
                className="flex items-center px-2 sm:px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-sm flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">返回列表</span>
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <span className="text-2xl sm:text-3xl flex-shrink-0">{project.icon || '📚'}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h1>
                  {project.description && (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{project.description}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-3 flex-wrap gap-1">
              {/* 四色统计 */}
              <div className="hidden md:flex items-center space-x-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 shadow-sm">
                {Object.entries(cardTypeConfig).map(([type, config]) => (
                  <span key={type} className="flex items-center space-x-1">
                    <span className="text-sm">{config.icon}</span>
                    <span className={`text-xs font-bold ${config.color}`}>{cardStats[type as keyof typeof cardStats]}</span>
                  </span>
                ))}
              </div>
              
              

              <button
                onClick={() => { setActiveTab('network'); setNetworkTabOpened(true); }}
                className={`flex items-center px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors shadow-sm ${
                  activeTab === 'network'
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
                title="查看专题知识网络"
              >
                <Network className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">知识网络</span>
              </button>
              <button
                onClick={handleExportPPT}
                disabled={exportingPPT}
                className="flex items-center px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                title="导出为PPT"
              >
                {exportingPPT ? <span className="hidden sm:inline">生成中...</span> : <><Presentation className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">导出PPT</span></>}
              </button>
              {pptResult && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded ${pptResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {pptResult.success ? '✅' : '❌'}
                    <span className="hidden sm:inline ml-1">{pptResult.message}</span>
                  </span>
                  {pptResult.success && pptResult.filename && (
                    <button
                      onClick={() => handleDownloadPPT(pptResult.filename)}
                      className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="下载PPT文件"
                    >
                      下载
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/research?project=${project.id}`;
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success('分享链接已复制');
                }}
                className="flex items-center px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
                title="分享专题"
              >
                <UserPlus className="w-4 h-4" />
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex space-x-1 overflow-x-auto whitespace-nowrap scrollbar-thin">
              <button
                onClick={() => setActiveTab('cards')}
                className={`flex items-center px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
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
                className={`flex items-center px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
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
                className={`flex items-center px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === 'workflow'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                工作流概览
              </button>
              <button
                onClick={() => setActiveTab('kanban')}
                className={`flex items-center px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === 'kanban'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListTodo className="w-4 h-4 mr-2" />
                看板视图
              </button>
              <button
                onClick={() => { setActiveTab('network'); setNetworkTabOpened(true); }}
                className={`flex items-center px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === 'network'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Network className="w-4 h-4 mr-2" />
                知识网络
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { loadLinkableCards(); setShowLinkCard(true); }}
                          className="flex items-center px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm font-medium"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          添加已有卡片
                        </button>
                        <button
                          onClick={() => setShowCreateCard(true)}
                          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                        >
                          <PlusCircle className="w-4 h-4 mr-1.5" />
                          新建卡片
                        </button>
                      </div>
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
                        <div className="mt-3">
                          <button
                            onClick={() => { loadLinkableCards(); setShowLinkCard(true); }}
                            className="px-6 py-2.5 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium"
                          >
                            从知识库添加已有卡片
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {cards.map((card) => {
                          const tc = cardTypeConfig[card.card_type] || cardTypeConfig.blue;
                          return (
                            <motion.div
                              key={card.id}
                              whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                              onClick={() => { setSelectedCard(card); setShowCardDetail(true); }}
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
                                <div className="flex items-center space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                                    onClick={(e) => { e.stopPropagation(); setSelectedCard(card); setShowCardDetail(true); }}
                                    className="p-1.5 hover:bg-white/60 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="查看详情"
                                  >
                                    <Maximize2 className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleExportCardPDF(card); }}
                                    className="p-1.5 hover:bg-white/60 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="导出 PDF"
                                  >
                                    <FileText className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
                                    className="p-1.5 hover:bg-white/60 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="知识卡片预览"
                                  >
                                    {convertProjectCardToKnowledgeCard(card).color === 'blue' ? '📘' : convertProjectCardToKnowledgeCard(card).color === 'green' ? '📗' : convertProjectCardToKnowledgeCard(card).color === 'yellow' ? '📒' : '📕'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="删除卡片"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>

                              {/* 标题 */}
                              <h3 className={`font-bold text-base mb-2 ${tc.color} dark:text-white line-clamp-2 leading-snug`}>
                                {card.title}
                              </h3>

                              {/* 内容预览 */}
                              <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 leading-relaxed mb-3">
                                {card.content ? (
                                  <RenderContent content={card.content} />
                                ) : '暂无内容'}
                              </div>

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
                  </div>
                )}

                {/* ===== 任务 Tab ===== */}
                {activeTab === 'tasks' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">关联任务</h2>
                    </div>
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
                            onClick={() => {
                              setEditingTask(task);
                              setEditTaskTitle(task.title || '');
                              setEditTaskDesc(task.description || '');
                              setEditTaskPriority(task.priority as any || 'medium');
                              setEditTaskCategory(task.category || 'inbox');
                              setEditTaskDueDate(task.due_date || '');
                            }}
                            className={`flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                              task.is_completed
                                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {/* 完成状态切换按钮 */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await fetch(`${getApiBaseUrl()}/api/data/gtd/tasks/${task.id}/complete?is_completed=${!task.is_completed}`, { method: 'PUT' });
                                  if (res.ok) {
                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !task.is_completed } : t));
                                    loadProjectStats();
                                    toast.success(task.is_completed ? '任务已取消完成' : '任务已完成 ✓');
                                  }
                                } catch { toast.error('操作失败'); }
                              }}
                              className="mr-3 flex-shrink-0 text-gray-400 hover:text-green-500 transition-colors"
                              title={task.is_completed ? '取消完成' : '标记完成'}
                            >
                              {task.is_completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0 mr-2 sm:mr-3">
                              <h4 className={`font-medium text-sm sm:text-base ${task.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              {task.assigned_to_name && (
                                <span className="hidden sm:inline text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                                  {task.assigned_to_name}
                                </span>
                              )}
                              <span className={`text-xs px-2 sm:px-2.5 py-1 rounded-full ${
                                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                              </span>
                              {/* 删除/归档按钮 */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm('确定要删除这个任务吗？')) return;
                                  try {
                                    const res = await fetch(`${getApiBaseUrl()}/api/data/gtd/tasks/${task.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      setTasks(prev => prev.filter(t => t.id !== task.id));
                                      loadProjectStats();
                                      toast.success('任务已删除');
                                    } else throw new Error();
                                  } catch { toast.error('删除失败'); }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                title="删除任务"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded text-xs sm:text-sm">事实卡片</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 rounded text-xs sm:text-sm">解释分析</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 rounded text-xs sm:text-sm">风险识别</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 rounded text-xs sm:text-sm">行动决策</span>
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 rounded text-xs sm:text-sm">GTD 任务</span>
                      </div>
                      <p className="mt-3 text-xs text-indigo-600/70 dark:text-indigo-400/70">
                        完整闭环：事实 → 解释 → 风险 → 行动 → 任务执行，通过双向链接和日历事件串联所有环节
                      </p>
                    </div>
                  </div>
                )}

                {/* ===== 看板视图 Tab ===== */}
                {activeTab === 'kanban' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">看板视图</h2>
                    </div>
                    {tasks.length === 0 ? (
                      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">暂无任务</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">创建任务或将红色卡片转换为任务后将显示在看板中</p>
                      </div>
                    ) : (
                      <KanbanBoard
                        tasks={tasks}
                        projectId={project.id!}
                        onTasksChange={() => loadData()}
                        onTaskStatusUpdate={(taskId, newStatus) => {
                          // 乐观更新：立即修改本地任务状态，无需等待 refetch
                          setTasks(prev => prev.map(t =>
                            t.id === taskId ? { ...t, kanban_status: newStatus as GtdTask['kanban_status'] } : t
                          ));
                        }}
                      />
                    )}
                  </div>
                )}

                {/* ===== 知识网络 Tab ===== */}
                {activeTab === 'network' && networkTabOpened && (
                  <div className="min-h-[300px]" style={{ height: 'calc(100vh - 160px)', maxHeight: '80dvh' }}>
                    {cards.length > 0 ? (
                      <iframe
                        src={`/knowledge-graph?card=${cards[0]?.id || ''}`}
                        className="w-full h-full border-0 rounded-xl"
                        title="专题知识网络"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">暂无卡片</p>
                          <p className="text-sm mt-2">添加卡片后可查看知识网络</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ===== 卡片详情弹窗 - 使用标准 CardDetailModal ===== */}
        {showCardDetail && selectedCard && (
          <CardDetailModal
            isOpen={true}
            card={convertProjectCardToKnowledgeCard(selectedCard)}
            allCards={cards.map(convertProjectCardToKnowledgeCard)}
            onClose={() => { setShowCardDetail(false); setSelectedCard(null); }}
            onDelete={async (id: string) => {
              await fetch(`${RESEARCH_API_BASE()}/cards/${id}`, { method: 'DELETE' });
              setCards(prev => prev.filter(c => String(c.id) !== id));
              setShowCardDetail(false);
              setSelectedCard(null);
              toast.success('卡片已删除');
              refreshCards();
            }}
            onRelatedCardClick={(id: string) => {
              const target = cards.find(c => String(c.id) === id);
              if (target) { setSelectedCard(target); }
            }}
            onUpdateCard={async (updatedCard) => {
              try {
                const res = await fetch(`${RESEARCH_API_BASE()}/projects/${project.id}/cards/${updatedCard.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: updatedCard.title,
                    content: updatedCard.content,
                    card_type: updatedCard.color,
                    related_cards: updatedCard.relatedCards?.map(Number),
                  })
                });
                if (!res.ok) throw new Error('更新失败');
                const updated = convertKnowledgeCardToProjectCard(updatedCard);
                setCards(prev => prev.map(c => String(c.id) === updatedCard.id ? { ...c, ...updated } : c));
                toast.success('卡片已更新');
                refreshCards();
              } catch {
                toast.error('卡片更新失败');
              }
            }}
            onCreateRecommendedCard={(title: string) => toast.info(`推荐: ${title}`)}
          />
        )}

        {/* ===== 创建卡片弹窗 - 复用首页 CreateCardModal ===== */}
        <CreateCardModal
          isOpen={showCreateCard}
          onClose={() => setShowCreateCard(false)}
          onSave={handleCreateCardSave}
          initialColor="blue"
          existingCards={cards.map(c => ({ id: String(c.id), title: c.title, content: c.content }))}
          projectId={project.id}
          projectName={project.name}
        />

        {/* 移动到其他专题弹窗 */}
        {showMoveCard && selectedCard && allProjectsList.length > 0 && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowMoveCard(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-4 sm:p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">移动卡片到其他专题</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 truncate">
                将《{selectedCard.title}》移动到：
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {allProjectsList.filter(p => p.id !== project.id).map(p => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      try {
                        await fetch(`${RESEARCH_API_BASE()}/cards/${selectedCard.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ project_id: p.id })
                        });
                        toast.success(`已移动到《${p.name}》`);
                        setShowMoveCard(false);
                        refreshCards();
                      } catch {
                        toast.error('移动失败');
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                  >
                    <span>{p.icon || '📚'}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 添加已有卡片弹窗 */}
        {showLinkCard && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowLinkCard(false); setSelectedLinkCardIds(new Set()); setLinkCardSearchQuery(''); }}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold">添加已有卡片到专题</h3>
                <button onClick={() => { setShowLinkCard(false); setSelectedLinkCardIds(new Set()); setLinkCardSearchQuery(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* 搜索框 */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={linkCardSearchQuery}
                    onChange={e => setLinkCardSearchQuery(e.target.value)}
                    placeholder="搜索卡片标题或内容..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                {linkableLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                  </div>
                ) : linkableCards.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>没有可添加的卡片</p>
                    <p className="text-sm mt-1">知识库中所有卡片都已加入专题</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const q = linkCardSearchQuery.toLowerCase().trim();
                      const filtered = q
                        ? linkableCards.filter(c => c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q))
                        : linkableCards;
                      return filtered.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>未找到匹配的卡片</p>
                            <p className="text-sm mt-1">请尝试其他关键词</p>
                          </div>
                      ) : filtered.map(card => {
                        const isSelected = selectedLinkCardIds.has(card.id);
                        const tc = cardTypeConfig[card.card_type] || cardTypeConfig.blue;
                        const isLinked = card.is_linked;
                        return (
                          <div
                            key={card.id}
                            onClick={() => {
                              if (isLinked) return;
                              const next = new Set(selectedLinkCardIds);
                              if (isSelected) next.delete(card.id); else next.add(card.id);
                              setSelectedLinkCardIds(next);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              isLinked
                                ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75 cursor-default'
                                : isSelected
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 cursor-pointer'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                              isLinked ? 'bg-green-500 border-green-500' : isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 dark:border-gray-500'
                            }`}>
                              {isLinked ? <CheckCircle2 className="w-4 h-4 text-white" /> : isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tc.color.replace('text-', 'bg-')}`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{card.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{card.content}</div>
                            </div>
                            {isLinked ? (
                              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-600">
                                已加入
                              </span>
                            ) : (
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${tc.bgColor} ${tc.color} border ${tc.borderColor}`}>
                                {tc.name}
                              </span>
                            )}
                          </div>
                        );
                      });})()}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedLinkCardIds.size > 0 ? `已选择 ${selectedLinkCardIds.size} 张卡片` : '请选择要加入专题的卡片'}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowLinkCard(false); setSelectedLinkCardIds(new Set()); setLinkCardSearchQuery(''); }}
                    className="px-5 py-2.5 text-gray-600 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleLinkCards}
                    disabled={selectedLinkCardIds.size === 0 || linkingCards}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {linkingCards ? '关联中...' : `加入专题 (${selectedLinkCardIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 知识卡片预览弹窗 (CardDetailModal) */}
        {previewCard && (
          <CardDetailModal
            isOpen={true}
            card={convertProjectCardToKnowledgeCard(previewCard)}
            allCards={cards.map(convertProjectCardToKnowledgeCard)}
            onClose={() => setPreviewCard(null)}
            onDelete={async (id: string) => {
              await fetch(`${RESEARCH_API_BASE()}/cards/${id}`, { method: 'DELETE' });
              setCards(prev => prev.filter(c => String(c.id) !== id));
              setPreviewCard(null);
              toast.success('卡片已删除');
            }}
            onRelatedCardClick={(id: string) => {
              const target = cards.find(c => String(c.id) === id);
              if (target) setPreviewCard(target);
            }}
            onUpdateCard={async (updatedCard: KnowledgeCardForDetail) => {
              try {
                const res = await fetch(`${RESEARCH_API_BASE()}/projects/${project.id}/cards/${updatedCard.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: updatedCard.title,
                    content: updatedCard.content,
                    card_type: updatedCard.color,
                    related_cards: updatedCard.relatedCards?.map(Number),
                  })
                });
                if (!res.ok) throw new Error('更新失败');
                const updated = convertKnowledgeCardToProjectCard(updatedCard);
                setCards(prev => prev.map(c => String(c.id) === updatedCard.id ? { ...c, ...updated } : c));
                toast.success('卡片已更新');
              } catch {
                toast.error('卡片更新失败');
              }
            }}
            onCreateRecommendedCard={(title: string) => toast.info(`推荐: ${title}`)}
          />
        )}

        {/* 任务编辑弹窗 */}
        {editingTask && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setEditingTask(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ListTodo size={18} className="text-green-500" />
                  编辑任务
                </h3>
                <button onClick={() => setEditingTask(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">任务标题 *</label>
                  <input value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">任务描述</label>
                  <textarea value={editTaskDesc} onChange={e => setEditTaskDesc(e.target.value)} rows={4}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1">优先级</label>
                    <select value={editTaskPriority} onChange={e => setEditTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                      <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">分类</label>
                    <select value={editTaskCategory} onChange={e => setEditTaskCategory(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                      <option value="inbox">收集箱</option><option value="today">今日待办</option>
                      <option value="later">将来可能</option><option value="archive">归档</option><option value="projects">项目</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">截止日期</label>
                  <input type="date" value={editTaskDueDate} onChange={e => setEditTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
                <button onClick={handleSaveTask} disabled={savingTask || !editTaskTitle.trim()}
                  className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                  {savingTask ? <Loader2 size={14} className="animate-spin" /> : null}保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Portal>
  );
});

// 注册中文字体（本地文件，不依赖外部CDN）
const FONT_URL_REGULAR = new URL('/fonts/NotoSansSC-Regular.ttf', import.meta.url).href;
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: FONT_URL_REGULAR, fontWeight: 'normal' },
    { src: FONT_URL_REGULAR, fontWeight: 'bold' },
  ],
});

// ========== 专题卡片PDF导出组件 ==========
interface ProjectPDFProps {
  cards: ProjectCard[];
  projectName: string;
}

const projectStyles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Noto Sans SC' },
  header: { marginBottom: 20, borderBottom: '2px solid #6366f1', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', fontFamily: 'Noto Sans SC' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 5, fontFamily: 'Noto Sans SC' },
  cardContainer: { marginBottom: 15, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  cardHeader: { padding: 10, backgroundColor: '#f3f4f6' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1f2937', fontFamily: 'Noto Sans SC' },
  cardBadge: { fontSize: 10, color: '#6b7280', marginTop: 2, fontFamily: 'Noto Sans SC' },
  cardBody: { padding: 12 },
  cardContent: { fontSize: 11, color: '#374151', lineHeight: 1.5, fontFamily: 'Noto Sans SC' },
  cardFooter: { padding: 8, backgroundColor: '#f9fafb', borderTopWidth: 1, borderColor: '#e5e7eb' },
  cardMeta: { fontSize: 9, color: '#9ca3af', fontFamily: 'Noto Sans SC' },
  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderColor: '#e5e7eb', fontSize: 10, color: '#9ca3af', textAlign: 'center', fontFamily: 'Noto Sans SC' },
});

const cardTypeLabels: Record<string, string> = {
  blue: '事实', green: '解释', yellow: '风险', red: '行动'
};

const ProjectPDF: React.FC<ProjectPDFProps> = ({ cards, projectName }) => (
  <Document>
    <Page size="A4" style={projectStyles.page}>
      <View style={projectStyles.header}>
        <Text style={projectStyles.title}>{projectName}</Text>
        <Text style={projectStyles.subtitle}>专题卡片导出 | 共 {cards.length} 张</Text>
      </View>
      {cards.map((card, index) => (
        <View key={card.id} style={projectStyles.cardContainer}>
          <View style={projectStyles.cardHeader}>
            <Text style={projectStyles.cardTitle}>{index + 1}. {card.title}</Text>
            <Text style={projectStyles.cardBadge}>{cardTypeLabels[card.card_type] || card.card_type}</Text>
          </View>
          <View style={projectStyles.cardBody}>
            <Text style={projectStyles.cardContent}>{card.content || '无内容'}</Text>
          </View>
          <View style={projectStyles.cardFooter}>
            <Text style={projectStyles.cardMeta}>创建: {card.created_at ? new Date(card.created_at).toLocaleDateString('zh-CN') : '-'}</Text>
          </View>
        </View>
      ))}
      <Text style={projectStyles.footer}>由 Antinet 专题研究系统生成</Text>
    </Page>
  </Document>
);


// ========== 主组件 ==========
const ResearchProjectManager: React.FC<ResearchProjectManagerProps> = ({
  onSelectProject,
  selectedProjectId,
  showDeepLinkButton = false
}) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ResearchProject | null>(null);
  const [openProject, setOpenProject] = useState<ResearchProject | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: 'blue', icon: '📚' });

  const autoOpened = useRef(false);

  useEffect(() => { loadProjects(); }, []);

  // 当从URL传入selectedProjectId时，自动打开对应专题（仅首次）
  useEffect(() => {
    if (autoOpened.current) return;
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setOpenProject(project);
        autoOpened.current = true;
      }
    }
  }, [selectedProjectId, projects]);

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
          className="flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">新建专题</span>
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
            const isSelected = selectedProjectId === project.id;
            return (
              <motion.div
                key={project.id}
                whileHover={{ y: -1 }}
                className={`rounded-xl border-2 ${isSelected ? `${colorOpt.border} ring-2 ring-blue-400` : colorOpt.border} bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                onClick={() => {
                  onSelectProject?.(project);
                  setOpenProject(project);
                }}
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
                  {showDeepLinkButton && project.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/research?project=${project.id}`); }}
                      className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="深链接"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-1 sm:ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowEditModal(true); }}
                      className="p-1.5 sm:p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id!); }}
                      className="p-1.5 sm:p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                    </button>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
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
