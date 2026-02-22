import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { gtdTaskService, GtdTask as GtdTaskType } from '@/services/dataService';

// 定义分类类型
type Category = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

const GTDSystem: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('inbox');
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
  }>({
    title: '',
    description: '',
    priority: 'medium'
  })
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

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '无截止日期';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

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
        due_date: newTask.due_date
      });

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
        priority: 'medium'
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
      due_date: task.due_date
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
      setNewTask({ title: '', description: '', priority: 'medium' });
      
      toast('任务已更新！', {
        className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
      });
    } catch (err) {
      toast('更新任务失败', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
    }
  };

  // 过滤任务 - 包含时间、优先级筛选
  const filteredTasks = tasks[activeCategory].filter(task => {
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
    
    // 时间过滤
    if (timeFilter !== 'all' && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (timeFilter === 'today') {
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        if (dueDate < today || dueDate > todayEnd) return false;
      } else if (timeFilter === 'week') {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (dueDate < today || dueDate > weekEnd) return false;
      } else if (timeFilter === 'month') {
        const monthEnd = new Date(today);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        if (dueDate < today || dueDate > monthEnd) return false;
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
        {/* GTD 流程提示 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 text-sm text-blue-700 dark:text-blue-300">
          <strong>GTD 流程：</strong>
          收集箱 → 判断 → 等待处理/将来可能/专题研究 → 完成 → 归档
        </div>
        
        <div className="flex overflow-x-auto">
          {(['inbox', 'today', 'later', 'archive', 'projects'] as Category[]).map(category => (
          <button 
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
              activeCategory === category 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <div className="flex items-center justify-center">
              {getCategoryIcon(category)}
              <span className="ml-2 capitalize">
                {category === 'inbox' ? '收集箱' : 
                 category === 'today' ? '等待处理' :
                 category === 'later' ? '将来可能' :
                 category === 'archive' ? '归档资料' : '专题研究'}
              </span>
            </div>
          </button>
        ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold capitalize">
            {activeCategory === 'inbox' ? '收集箱' : 
             activeCategory === 'today' ? '等待处理' :
             activeCategory === 'later' ? '将来可能' :
             activeCategory === 'archive' ? '归档资料' : '专题研究'}
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusCircle size={16} />
            <span>新建任务</span>
          </motion.button>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索任务..."
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

        {/* 任务列表 */}
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* 复选框 */}
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
                    className="mt-1 w-4 h-4 rounded border-gray-300 flex-shrink-0"
                  />
                  
                  {/* 内容区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`w-2 h-2 rounded-full ${getPriorityStyle(task.priority)}`}></span>
                        
                        {/* 快速归档按钮 */}
                        {task.category !== 'archive' && (
                          <button 
                            onClick={() => handleArchiveTask(task.id!)}
                            className="text-green-500 hover:text-green-700 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="完成并归档"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        
                        {/* 操作菜单按钮 */}
                        <div className="relative">
                          <button 
                            onClick={() => setShowActionMenu(showActionMenu === task.id ? null : task.id!)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          
                          {/* 操作菜单 */}
                          {showActionMenu === task.id && (
                            <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                              <button 
                                onClick={() => handleEditTask(task)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                              >
                                <Edit size={14} />
                                <span>编辑</span>
                              </button>
                              
                              {task.category !== 'inbox' && (
                                <button 
                                  onClick={() => { handleMoveTask(task.id!, 'inbox'); setShowActionMenu(null); }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                                >
                                  <ArrowRight size={14} />
                                  <span>移到收集箱</span>
                                </button>
                              )}
                              
                              {task.category !== 'today' && (
                                <button 
                                  onClick={() => { handleMoveTask(task.id!, 'today'); setShowActionMenu(null); }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                                >
                                  <ArrowRight size={14} />
                                  <span>移到等待处理</span>
                                </button>
                              )}
                              
                              {task.category !== 'later' && (
                                <button 
                                  onClick={() => { handleMoveTask(task.id!, 'later'); setShowActionMenu(null); }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                                >
                                  <ArrowRight size={14} />
                                  <span>移到将来可能</span>
                                </button>
                              )}
                              
                              {task.category !== 'archive' && (
                                <button 
                                  onClick={() => { handleMoveTask(task.id!, 'archive'); setShowActionMenu(null); }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                                >
                                  <Archive size={14} />
                                  <span>归档</span>
                                </button>
                              )}
                              
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                              
                              <button 
                                onClick={() => handleDeleteTask(task.id!)}
                                className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 text-sm"
                              >
                                <Trash2 size={14} />
                                <span>删除</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 描述 - 限制高度 */}
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 line-clamp-2">{task.description || '无描述'}</p>
                    
                    {/* 底部信息 */}
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>创建: {task.created_at ? new Date(task.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                      {task.due_date && (
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar size={10} />
                          截止: {new Date(task.due_date).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600">
              {getCategoryIcon(activeCategory)}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? '未找到匹配的任务' : '暂无任务'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery 
                ? '尝试调整搜索关键词或清除筛选条件' 
                : '点击"新建任务"开始添加任务'
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
                onClick={() => setShowCreateModal(true)}
              >
                新建任务
              </button>
            )}
          </div>
        )}
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">新建任务</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">任务标题 *</label>
                <input
                  id="title"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入任务标题"
                  autoFocus
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">任务描述</label>
                <textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="输入任务描述..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">优先级</label>
                <div className="flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, priority: 'low' }))}
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
        </div>
      )}

      {/* 编辑任务模态框 */}
      {showEditModal && editingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">编辑任务</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">任务标题 *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入任务标题"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">任务描述</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="输入任务描述..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none resize-none border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">优先级</label>
                <div className="flex space-x-2">
                  <button 
                    type="button"
                    onClick={() => setNewTask(prev => ({ ...prev, priority: 'low' }))}
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
                    className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center ${
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
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end space-x-3">
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
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GTDSystem;