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
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  researchProjectService, 
  ResearchProject, 
  GtdTask
} from '@/services/dataService';
import CreateCardModal from './CreateCardModal';

interface ProjectCard {
  id: number;
  card_type: string;
  title: string;
  content: string;
  category?: string;
  project_id?: number;
  created_at?: string;
}

interface ResearchProjectManagerProps {
  onSelectProject?: (project: ResearchProject) => void;
  selectedProjectId?: number | null;
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

const RESEARCH_API_BASE = 'http://localhost:8000/api/research';

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
}> = ({ card, onClose, onConvertToTask }) => {
  const typeConfig = cardTypeConfig[card.card_type] || cardTypeConfig.blue;

  const handleCopy = () => {
    const text = `[${typeConfig.name}] ${card.title}\n\n${card.content}`;
    navigator.clipboard?.writeText(text);
    toast.success('已复制到剪贴板');
  };

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
            <div className="text-base text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
              {card.content || '暂无内容'}
            </div>
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
            </div>
            <div className="flex items-center space-x-3">
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
            </div>
          </div>
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
}> = ({ project, onClose, onConvertCardToTask }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'tasks'>('cards');
  const [tasks, setTasks] = useState<GtdTask[]>([]);
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<ProjectCard | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);

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
    } catch (err) {
      console.error('加载专题数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 复用首页的创建卡片流程，创建后自动关联专题
  const handleCreateCardSave = async (cardData: any) => {
    try {
      const response = await fetch('http://localhost:8000/api/knowledge/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: cardData.color,
          title: cardData.title,
          content: cardData.content,
          category: cardData.color === 'blue' ? '事实' : 
                    cardData.color === 'green' ? '解释' : 
                    cardData.color === 'yellow' ? '风险' : '行动',
          project_id: project.id,
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
      <div className="fixed inset-0 z-[9990] bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ margin: 0 }}>
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
          />
        )}
      </AnimatePresence>

      {/* ===== 创建专题弹窗（Portal） ===== */}
      {showCreateModal && (
        <Portal>
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50" style={{ margin: 0, padding: '24px' }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
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
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50" style={{ margin: 0, padding: '24px' }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
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
