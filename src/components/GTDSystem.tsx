import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Inbox,
  Clock,
  Calendar,
  Archive,
  Book,
  PlusCircle,
  MoreHorizontal,
  Search,
  Flag,
  X,
  Check,
  Trash2,
  Edit,
  ArrowRight,
  Share2,
  ExternalLink,
  FileText,
  Copy,
  ZoomIn,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { gtdTaskService, GtdTask as GtdTaskType } from '@/services/dataService';
import ResearchProjectManager from './ResearchProjectManager';
import CalendarView from './CalendarView';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

// 注册中文字体
Font.register({
  family: 'Noto Sans SC',
  src: 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.woff2',
});

// GTD任务PDF样式
const gtdStyles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2pt solid #3b82f6',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    fontFamily: 'Noto Sans SC',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Noto Sans SC',
  },
  taskContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Noto Sans SC',
  },
  priorityBadge: {
    padding: '3 8',
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Noto Sans SC',
  },
  taskDescription: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151',
    fontFamily: 'Noto Sans SC',
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 8,
  },
  taskMeta: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'Noto Sans SC',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'Noto Sans SC',
  },
});

// 优先级颜色配置
const priorityColors = {
  high: { border: '#ef4444', bg: '#fef2f2', badge: '#dc2626', name: '高优先级' },
  medium: { border: '#f59e0b', bg: '#fffbeb', badge: '#d97706', name: '中优先级' },
  low: { border: '#10b981', bg: '#ecfdf5', badge: '#047857', name: '低优先级' },
};

// 分类名称映射
const categoryNames: Record<string, string> = {
  inbox: '收集箱',
  today: '等待处理',
  later: '将来可能',
  archive: '归档资料',
  projects: '专题研究',
};

// GTD任务PDF文档组件
interface GTDTaskPDFProps {
  tasks: GtdTaskType[];
  category?: string;
}

const GTDTaskPDF: React.FC<GTDTaskPDFProps> = ({ tasks, category }) => {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={gtdStyles.page}>
        <View style={gtdStyles.header}>
          <Text style={gtdStyles.title}>
            {category ? `${categoryNames[category] || category} - GTD任务` : 'GTD任务导出'}
          </Text>
          <Text style={gtdStyles.subtitle}>
            导出日期: {currentDate} | 任务数量: {tasks.length}
          </Text>
        </View>

        {tasks.map((task, index) => {
          const colorConfig = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium;
          return (
            <View
              key={task.id}
              style={[
                gtdStyles.taskContainer,
                { borderColor: colorConfig.border, backgroundColor: colorConfig.bg },
              ]}
            >
              <View style={gtdStyles.taskHeader}>
                <Text style={[gtdStyles.taskTitle, { color: colorConfig.badge }]}>
                  {index + 1}. {task.title}
                </Text>
                <View style={[gtdStyles.priorityBadge, { backgroundColor: colorConfig.badge }]}>
                  <Text style={{ color: '#ffffff', fontSize: 9 }}>{colorConfig.name}</Text>
                </View>
              </View>
              <Text style={gtdStyles.taskDescription}>
                {task.description || '无描述'}
              </Text>
              <View style={gtdStyles.taskFooter}>
                <Text style={gtdStyles.taskMeta}>
                  分类: {categoryNames[task.category] || task.category}
                </Text>
                <Text style={gtdStyles.taskMeta}>
                  创建: {task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN') : '-'}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={gtdStyles.footer}>
          由 Antinet GTD 系统生成 | 骁龙 AIPC 平台
        </Text>
      </Page>
    </Document>
  );
};

// 定义分类类型
type Category = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

const GTDSystem: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('inbox');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<GtdTaskType | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    remind_at?: string;
    reminder_enabled: boolean;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    remind_at: '',
    reminder_enabled: false
  });
  const [zoomedTask, setZoomedTask] = useState<GtdTaskType | null>(null);
  const [projects, setProjects] = useState<Array<{id: number; name: string}>>([]);
  
  // 加载专题列表
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(getApiBaseUrl() + '/api/research/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || data || []);
        }
      } catch (e) {
        console.error('加载专题失败:', e);
      }
    };
    loadProjects();
  }, []);
  
  // 复制任务内容
  const handleCopyTask = (task: GtdTaskType, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `任务: ${task.title}\n描述: ${task.description || '无'}\n优先级: ${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}`;
    navigator.clipboard?.writeText(text);
    toast('任务内容已复制', { className: 'bg-green-50 text-green-800' });
  };
  // 自动从描述提取标题
  const extractTitleFromDesc = (description: string): string => {
    if (!description.trim()) return '';
    
    // 1. 尝试提取第一行作为标题
    const firstLine = description.split('\n')[0].trim();
    if (firstLine && firstLine.length <= 50) {
      return firstLine;
    }
    
    // 2. 尝试提取第一个句子
    const sentenceMatch = description.match(/^[^。！？.!?]{5,50}[。！？.!?]?/);
    if (sentenceMatch) {
      return sentenceMatch[0].trim();
    }
    
    // 3. 提取前50个字符
    return description.substring(0, 50).trim() + (description.length > 50 ? '...' : '');
  };

  // 处理描述变化，自动更新标题
  const handleDescriptionChange = (value: string) => {
    setNewTask(prev => {
      // 如果标题为空或是自动生成的，则自动更新
      const shouldAutoTitle = !prev.title || prev.title === extractTitleFromDesc(prev.description);
      return {
        ...prev,
        description: value,
        title: shouldAutoTitle ? extractTitleFromDesc(value) : prev.title
      };
    });
  };
;

  // GTD任务数据
  const [tasks, setTasks] = useState<Record<Category, GtdTaskType[]>>({
    inbox: [],
    today: [],
    later: [],
    archive: [],
    projects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从后端API加载GTD数据
  useEffect(() => {
    const loadGTDData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 调用后端API获取真实GTD数据
        const allTasks = await gtdTaskService.getAll();
        
        // 按分类组织任务
        const organizedTasks: Record<Category, GtdTaskType[]> = {
          inbox: allTasks.filter(task => task.category === 'inbox'),
          today: allTasks.filter(task => task.category === 'today'),
          later: allTasks.filter(task => task.category === 'later'),
          archive: allTasks.filter(task => task.category === 'archive'),
          projects: allTasks.filter(task => task.category === 'projects')
        };
        
        setTasks(organizedTasks);
        
        // 如果数据为空，显示提示
        if (allTasks.length === 0) {
          setError('暂无GTD任务，请添加一些任务');
        }
      } catch (err) {
        setError('加载GTD数据失败，请检查后端服务是否启动');
        console.error('GTD data load error:', err);
        toast.error('GTD数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadGTDData();
  }, []);

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // 获取分类图标
  const getCategoryIcon = (category: Category) => {
    switch(category) {
      case 'inbox':
        return <Inbox size={20} />;
      case 'today':
        return <Clock size={20} />;
      case 'later':
        return <Calendar size={20} />;
      case 'archive':
        return <Archive size={20} />;
      case 'projects':
        return <Book size={20} />;
    }
  };

  // 创建新任务
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast('请输入任务标题', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      return;
    }

    try {
      // 新任务默认添加到收集箱
      await gtdTaskService.add({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority as 'low' | 'medium' | 'high',
        category: 'inbox',
        due_date: newTask.due_date,
        remind_at: newTask.remind_at || undefined,
        reminder_enabled: newTask.reminder_enabled
      });

      // 同步到知识卡片库
      try {
        await fetch(getApiBaseUrl() + '/api/knowledge/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTask.title,
            content: newTask.description || '',
            card_type: 'green',
            address: '',
            related_cards: []
          })
        });
      } catch (e) {
        console.log('同步到知识卡片失败:', e);
      }

      // 重新加载数据确保同步
      const allTasks = await gtdTaskService.getAll();
      const organizedTasks: Record<Category, GtdTaskType[]> = {
        inbox: allTasks.filter(task => task.category === 'inbox'),
        today: allTasks.filter(task => task.category === 'today'),
        later: allTasks.filter(task => task.category === 'later'),
        archive: allTasks.filter(task => task.category === 'archive'),
        projects: allTasks.filter(task => task.category === 'projects')
      };
      setTasks(organizedTasks);

      // 重置表单
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        remind_at: '',
        reminder_enabled: false
      });
      
      setShowCreateModal(false);
      
      // 切换到收集箱显示新任务
      setActiveCategory('inbox');
      
      toast('任务已添加到收集箱！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (err) {
      toast('创建任务失败，请重试', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      console.error('Create task error:', err);
    }
  };

  // 移动任务到其他分类
  const handleMoveTask = async (taskId: number, targetCategory: Category) => {
    try {
      await gtdTaskService.update(taskId, { category: targetCategory });
      
      // 重新加载数据
      const allTasks = await gtdTaskService.getAll();
      const organizedTasks: Record<Category, GtdTaskType[]> = {
        inbox: allTasks.filter(task => task.category === 'inbox'),
        today: allTasks.filter(task => task.category === 'today'),
        later: allTasks.filter(task => task.category === 'later'),
        archive: allTasks.filter(task => task.category === 'archive'),
        projects: allTasks.filter(task => task.category === 'projects')
      };
      setTasks(organizedTasks);
      setShowActionMenu(null);
      
      toast('任务已移动！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (err) {
      toast('移动任务失败', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 完成并归档任务
  const handleArchiveTask = async (taskId: number) => {
    await handleMoveTask(taskId, 'archive');
  };

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    try {
      await gtdTaskService.delete(taskId);
      
      // 重新加载数据
      const allTasks = await gtdTaskService.getAll();
      const organizedTasks: Record<Category, GtdTaskType[]> = {
        inbox: allTasks.filter(task => task.category === 'inbox'),
        today: allTasks.filter(task => task.category === 'today'),
        later: allTasks.filter(task => task.category === 'later'),
        archive: allTasks.filter(task => task.category === 'archive'),
        projects: allTasks.filter(task => task.category === 'projects')
      };
      setTasks(organizedTasks);
      setShowActionMenu(null);
      
      toast('任务已删除', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (err) {
      toast('删除任务失败', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 打开编辑模态框
  const handleEditTask = (task: GtdTaskType) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority as 'low' | 'medium' | 'high',
      due_date: task.due_date || '',
      remind_at: (task as any).remind_at || '',
      reminder_enabled: (task as any).reminder_enabled || false
    });
    setShowEditModal(true);
    setShowActionMenu(null);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTask || !editingTask.id || !newTask.title.trim()) return;
    
    try {
      await gtdTaskService.update(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date
      });
      
      // 重新加载数据
      const allTasks = await gtdTaskService.getAll();
      const organizedTasks: Record<Category, GtdTaskType[]> = {
        inbox: allTasks.filter(task => task.category === 'inbox'),
        today: allTasks.filter(task => task.category === 'today'),
        later: allTasks.filter(task => task.category === 'later'),
        archive: allTasks.filter(task => task.category === 'archive'),
        projects: allTasks.filter(task => task.category === 'projects')
      };
      setTasks(organizedTasks);
      
      setShowEditModal(false);
      setEditingTask(null);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', remind_at: '', reminder_enabled: false });
      
      toast('任务已更新！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (err) {
      toast('更新任务失败', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 获取当前分类的任务或全部任务
  const getCurrentTasks = () => {
    if (activeCategory === 'all') {
      return Object.values(tasks).flat();
    }
    return tasks[activeCategory as Category] || [];
  };

  // 按创建时间倒序（最新的在最前面）
  const sortedTasks = [...getCurrentTasks()].sort((a, b) => {
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 过滤任务 - 包含时间、优先级筛选
  const filteredTasks = sortedTasks.filter(task => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query) &&
          !(task.description || '').toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // 优先级过滤
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    
    // 时间过滤 - 使用创建日期
    if (timeFilter !== 'all') {
      if (task.created_at) {
        const taskDate = new Date(task.created_at);
        const today = new Date();
        
        // 获取今天的日期字符串（只比较日期部分）
        const todayStr = today.toISOString().split('T')[0];
        const taskDateStr = taskDate.toISOString().split('T')[0];
        
        if (timeFilter === 'today') {
          if (taskDateStr !== todayStr) return false;
        } else if (timeFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (taskDate < weekAgo) return false;
        } else if (timeFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (taskDate < monthAgo) return false;
        }
      } else {
        return false;
      }
    }
    
    return true;
  });
  
  // 分页处理
  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 渲染加载状态
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">加载GTD数据中...</p>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-red-600 dark:text-red-400">
          <div className="text-4xl mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">GTD数据加载失败</h3>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 头部导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {/* 分类标签 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 via-green-50 to-yellow-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {(['all', 'inbox', 'today', 'later', 'archive', 'projects'] as (Category | 'all')[]).map(category => {
              const isActive = category === 'all' ? activeCategory === 'all' : (activeCategory === category && viewMode === 'list');
              const categoryColors: Record<string, {active: string, inactive: string}> = {
                all: { active: 'bg-purple-600 text-white shadow-purple-200 dark:shadow-purple-900', inactive: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700' },
                inbox: { active: 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900', inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
                today: { active: 'bg-red-600 text-white shadow-red-200 dark:shadow-red-900', inactive: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' },
                later: { active: 'bg-yellow-500 text-white shadow-yellow-200 dark:shadow-yellow-900', inactive: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' },
                archive: { active: 'bg-gray-600 text-white shadow-gray-200 dark:shadow-gray-900', inactive: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600' },
                projects: { active: 'bg-green-600 text-white shadow-green-200 dark:shadow-green-900', inactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
              };
              const icons: Record<string, string> = {
                all: '📋',
                inbox: '📥',
                today: '⏰',
                later: '📅',
                archive: '📁',
                projects: '📚',
              };
              const labels: Record<string, string> = {
                all: '全部',
                inbox: '收集箱',
                today: '等待处理',
                later: '将来可能',
                archive: '归档资料',
                projects: '专题研究',
              };
              return (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category as any);
                    setViewMode('list');
                  }}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 border-2 flex items-center gap-2 ${
                    isActive
                      ? `${categoryColors[category].active} shadow-lg transform scale-105`
                      : `${categoryColors[category].inactive} hover:shadow-md`
                  }`}
                >
                  <span className="text-base">{icons[category]}</span>
                  <span>{labels[category]}</span>
                  {isActive && category !== 'all' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {tasks[category as Category]?.length || 0}
                    </span>
                  )}
                  {isActive && category === 'all' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {Object.values(tasks).flat().length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        
        </div>
      </div>

{/* 内容区域 - 左右布局 */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* 左侧：任务列表 */}
        <div className="flex-1 overflow-auto p-4 border-r">
          {activeCategory === 'projects' ? (
            <ResearchProjectManager />
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {activeCategory === 'all' ? '全部任务' : 
                   activeCategory === 'inbox' ? '收集箱' : 
                   activeCategory === 'today' ? '等待处理' :
                   activeCategory === 'later' ? '将来可能' :
                   activeCategory === 'archive' ? '归档资料' : '专题研究'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm"
                >
                  <PlusCircle size={16} /> 新建任务
                </button>
              </div>

            {/* 搜索框和筛选 */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索任务..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high'); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="all">全部优先级</option>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              
              <select
                value={timeFilter}
                onChange={(e) => { setTimeFilter(e.target.value as 'all' | 'today' | 'week' | 'month'); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="all">全部时间</option>
                <option value="today">今天</option>
                <option value="week">本周</option>
                <option value="month">本月</option>
              </select>
            </div>

            {/* 批量操作工具栏 */}
            {selectedTaskIds.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-600 dark:text-blue-400">已选 {selectedTaskIds.size} 项</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedTaskIds(new Set())}
                    className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                  >
                    取消选择
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`确定删除 ${selectedTaskIds.size} 个任务？`)) {
                        for (const taskId of selectedTaskIds) {
                          await gtdTaskService.delete(taskId);
                        }
                        setSelectedTaskIds(new Set());
                        const allTasks = await gtdTaskService.getAll();
                        const organizedTasks: Record<Category, GtdTaskType[]> = {
                          inbox: allTasks.filter(task => task.category === 'inbox'),
                          today: allTasks.filter(task => task.category === 'today'),
                          later: allTasks.filter(task => task.category === 'later'),
                          archive: allTasks.filter(task => task.category === 'archive'),
                          projects: allTasks.filter(task => task.category === 'projects')
                        };
                        setTasks(organizedTasks);
                        toast('批量删除成功！', { className: 'bg-green-50 text-green-800' });
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                  >
                    批量删除
                  </button>
                </div>
              </div>
            )}

              
            {/* 任务列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filteredTasks.length > 0 && selectedTaskIds.size === filteredTasks.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTaskIds(new Set(filteredTasks.map(t => t.id!)));
                      } else {
                        setSelectedTaskIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <h2 className="text-lg font-semibold">任务列表</h2>
                  <span className="text-sm text-gray-500">共 {filteredTasks.length} 个</span>
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
                  {selectedTaskIds.size > 0 && (
                    <PDFDownloadLink
                      document={<GTDTaskPDF tasks={filteredTasks.filter(t => selectedTaskIds.has(t.id!))} category={activeCategory === 'all' ? undefined : activeCategory} />}
                      fileName={`gtd-tasks-selected-${new Date().toISOString().split('T')[0]}.pdf`}
                    >
                      {({ loading }) => (
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                          disabled={loading}
                        >
                          <Download size={14} />
                          {loading ? '生成中...' : `导出选中(${selectedTaskIds.size})`}
                        </button>
                      )}
                    </PDFDownloadLink>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {paginatedTasks.map(task => (
                  <motion.div
                    key={task.id}
                    whileHover={{ y: -5 }}
                    className={`border rounded-xl overflow-hidden ${
                      task.priority === 'high' ? 'border-red-200 dark:border-red-800' :
                      task.priority === 'medium' ? 'border-amber-200 dark:border-amber-800' :
                      'border-green-200 dark:border-green-800'
                    } ${selectedTaskIds.has(task.id!) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className={`p-3 border-b ${
                      task.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
                      task.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20' :
                      'bg-green-50 dark:bg-green-900/20'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.has(task.id!)}
                            onChange={(e) => {
                              const newSet = new Set(selectedTaskIds);
                              if (e.target.checked) {
                                newSet.add(task.id!);
                              } else {
                                newSet.delete(task.id!);
                              }
                              setSelectedTaskIds(newSet);
                            }}
                            className="mr-2 w-4 h-4 rounded"
                          />
                          <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityStyle(task.priority)}`}></div>
                          <h3
                            className="font-semibold truncate cursor-pointer hover:text-blue-600"
                            onClick={() => handleEditTask(task)}
                          >{task.title}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{task.description || '无描述'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleCopyTask(task, e as any)}
                            className="text-gray-500 hover:text-blue-600 p-1"
                            title="复制内容"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setZoomedTask(task); }}
                            className="text-gray-500 hover:text-purple-600 p-1"
                            title="放大查看"
                          >
                            <ZoomIn size={14} />
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            编辑
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
            </div>
          </>
        )}
        </div>

        {/* 右侧：日历面板 */}
        {calendarFullscreen ? (
          <div className="fixed inset-0 z-50 bg-white dark:bg-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg font-bold">日历视图</h3>
              <button
                onClick={() => setCalendarFullscreen(false)}
                className="px-3 py-1.5 text-sm text-white bg-gray-600 rounded hover:bg-gray-700"
              >
                退出全屏
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CalendarView key={tasks.inbox.length + tasks.today.length + tasks.later.length + tasks.archive.length + tasks.projects.length} />
            </div>
          </div>
        ) : (
          <div className="w-[500px] border-l flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 dark:bg-gray-700">
              <h3 className="text-sm font-medium">日历</h3>
              <button
                onClick={() => setCalendarFullscreen(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                全屏
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <CalendarView key={tasks.inbox.length + tasks.today.length + tasks.later.length + tasks.archive.length + tasks.projects.length} />
            </div>
          </div>
        )}
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden my-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold">新建任务</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">任务标题 *</label>
                <input
                  id="title"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入任务标题"
                  autoFocus
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">任务描述</label>
                <textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="输入任务描述..."
                  rows={6}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium mb-2">到期日期</label>
                <input
                  id="due_date"
                  type="date"
                  value={newTask.due_date || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="remind_at" className="block text-sm font-medium mb-2">提醒时间</label>
                <input
                  id="remind_at"
                  type="datetime-local"
                  value={newTask.remind_at || ''}
                  onChange={(e) => setNewTask(prev => ({ ...prev, remind_at: e.target.value, reminder_enabled: !!e.target.value }))}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">优先级</label>
                <div className="flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, priority: 'low' }))}
                    className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      newTask.priority === 'low' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Flag size={16} className="mr-1" />
                    <span>低</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, priority: 'medium' }))}
                    className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      newTask.priority === 'medium' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Flag size={16} className="mr-1" />
                    <span>中</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, priority: 'high' }))}
                    className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      newTask.priority === 'high' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Flag size={16} className="mr-1" />
                    <span>高</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <div className="flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  type="button"
                  onClick={handleCreateTask}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  创建任务
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑任务模态框 */}
      {showEditModal && editingTask && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowEditModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-4"
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  editingTask.priority === 'high' ? 'bg-red-500' :
                  editingTask.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`}></div>
                <h2 className="text-xl font-bold">{editingTask.title}</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label="分享"
                  onClick={() => {
                    const shareText = `任务: ${editingTask.title}\n描述: ${editingTask.description || '无'}\n优先级: ${editingTask.priority === 'high' ? '高' : editingTask.priority === 'medium' ? '中' : '低'}`;
                    navigator.clipboard?.writeText(shareText);
                    toast('任务信息已复制到剪贴板', { className: 'bg-green-50 text-green-800' });
                  }}
                >
                  <Share2 size={18} />
                </button>
                <button 
                  className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  aria-label="删除"
                  onClick={() => {
                    if (confirm('确定删除此任务？')) {
                      handleDeleteTask(editingTask.id!);
                      setShowEditModal(false);
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 任务基本信息 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
                  <div className="flex items-center">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${
                      editingTask.priority === 'high' ? 'bg-red-500' :
                      editingTask.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                    }`}>
                      {editingTask.priority === 'high' ? '高优先级' : editingTask.priority === 'medium' ? '中优先级' : '低优先级'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm ml-3 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      创建于 {editingTask.created_at ? new Date(editingTask.created_at).toLocaleDateString('zh-CN') : '-'}
                    </span>
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {editingTask.category === 'inbox' ? '收集箱' : 
                     editingTask.category === 'today' ? '等待处理' :
                     editingTask.category === 'later' ? '将来可能' :
                     editingTask.category === 'archive' ? '归档' : '专题研究'}
                  </span>
                </div>
              </div>
              
              {/* 编辑表单 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">任务标题 *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="输入任务标题"
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">任务描述</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="输入任务描述..."
                    rows={8}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none resize-none border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">优先级</label>
                  <div className="flex space-x-2">
                    <button 
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, priority: 'low' }))}
                      className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                        newTask.priority === 'low' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Flag size={16} className="mr-1" />
                      <span>低</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, priority: 'medium' }))}
                      className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                        newTask.priority === 'medium' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Flag size={16} className="mr-1" />
                      <span>中</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewTask(prev => ({ ...prev, priority: 'high' }))}
                      className={`flex-1 py-3 rounded-lg transition-colors flex items-center justify-center ${
                        newTask.priority === 'high' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Flag size={16} className="mr-1" />
                      <span>高</span>
                    </button>
                  </div>
                </div>

                {/* 任务操作 */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium mb-2">任务操作</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        handleArchiveTask(editingTask.id!);
                        setShowEditModal(false);
                      }}
                      className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded-lg transition-colors"
                    >
                      归档
                    </button>
                    <button
                      onClick={() => {
                        handleMoveTask(editingTask.id!, 'today');
                        setShowEditModal(false);
                      }}
                      className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg transition-colors"
                    >
                      移至待处理
                    </button>
                    <button
                      onClick={() => {
                        handleMoveTask(editingTask.id!, 'later');
                        setShowEditModal(false);
                      }}
                      className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg transition-colors"
                    >
                      移至将来可能
                    </button>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveTask(editingTask.id!, 'projects');
                          toast('任务已加入专题', { className: 'bg-purple-50 text-purple-800' });
                          setShowEditModal(false);
                        }
                      }}
                      className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg border-0 cursor-pointer"
                      defaultValue=""
                    >
                      <option value="">加入专题...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        // 将任务内容转换为Markdown并导出PDF
                        const markdownContent = `# ${editingTask.title}\n\n${editingTask.description || ''}\n\n---\n*任务优先级: ${editingTask.priority} | 分类: ${editingTask.category}*`;
                        const formData = new FormData();
                        const blob = new Blob([markdownContent], { type: 'text/markdown' });
                        formData.append('file', blob, 'task.md');
                        
                        try {
                          const response = await fetch(`${getApiBaseUrl()}/api/md2pdf/convert`, {
                            method: 'POST',
                            body: formData
                          });
                          if (!response.ok) throw new Error('导出PDF失败');
                          const pdfBlob = await response.blob();
                          const url = window.URL.createObjectURL(pdfBlob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${editingTask.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                          toast.success('PDF导出成功');
                        } catch (err) {
                          toast.error('导出PDF失败');
                        }
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-lg transition-colors"
                    >
                      导出PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  ID: {editingTask.id} | {editingTask.category}
                </div>
                <div className="flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 任务放大查看模态框 */}
      {zoomedTask && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8"
          onClick={() => setZoomedTask(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  zoomedTask.priority === 'high' ? 'bg-red-500' :
                  zoomedTask.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                }`}></div>
                <h2 className="text-xl font-bold">{zoomedTask.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopyTask(zoomedTask, e as any)}
                  className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                  title="复制内容"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => setZoomedTask(null)}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full text-white ${
                    zoomedTask.priority === 'high' ? 'bg-red-500' :
                    zoomedTask.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`}>
                    {zoomedTask.priority === 'high' ? '高优先级' : zoomedTask.priority === 'medium' ? '中优先级' : '低优先级'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {zoomedTask.category === 'inbox' ? '收集箱' :
                     zoomedTask.category === 'today' ? '等待处理' :
                     zoomedTask.category === 'later' ? '将来可能' :
                     zoomedTask.category === 'archive' ? '归档资料' : '专题研究'}
                  </span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">描述</h3>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{zoomedTask.description || '无描述'}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>创建: {zoomedTask.created_at ? new Date(zoomedTask.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                  {zoomedTask.due_date && (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar size={12} />
                      截止: {new Date(zoomedTask.due_date).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
                
                {zoomedTask.source_type && zoomedTask.source_id && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        if (zoomedTask.source_type === 'card') {
                          window.location.hash = `/?highlightCard=${zoomedTask.source_id}`;
                        } else if (zoomedTask.source_type === 'meeting') {
                          window.location.hash = `/virtual-office-meeting?meetingId=${zoomedTask.source_id}`;
                        } else if (zoomedTask.source_type === 'project') {
                          window.location.hash = `/?projectId=${zoomedTask.source_id}`;
                        }
                      }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      <FileText size={12} />
                      {zoomedTask.source_type === 'card' ? '来源卡片' : zoomedTask.source_type === 'meeting' ? '来源会议' : '来源专题'}
                      <ExternalLink size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GTDSystem;