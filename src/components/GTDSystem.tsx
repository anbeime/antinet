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
  X
} from 'lucide-react';
import { toast } from 'sonner';

// 定义任务类型
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

// 定义分类类型
type Category = 'inbox' | 'today' | 'later' | 'archive' | 'projects';

const GTDSystem: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
  }>({
    title: '',
    description: '',
    priority: 'medium'
  });

// GTD任务数据
  const [tasks, setTasks] = useState<Record<Category, Task[]>>({
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
        
        // TODO: 调用后端API获取真实GTD数据
        // const response = await fetch('/api/gtd/tasks');
        // const data = await response.json();

        // 初始为空状态
        setTasks({
          inbox: [],
          today: [],
          later: [],
          archive: [],
          projects: []
        });
      } catch (err) {
        setError('加载GTD数据失败，请检查后端连接');
        console.error('GTD data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGTDData();
  }, []);

  // 格式化日期
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
  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast('请输入任务标题', {
        className: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
      });
      return;
    }

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => ({
      ...prev,
      [activeCategory]: [task, ...prev[activeCategory]]
    }));

    // 重置表单
    setNewTask({
      title: '',
      description: '',
      priority: 'medium'
    });
    
    setShowCreateModal(false);
    
    toast('任务创建成功！', {
      className: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
    });
  };

  // 过滤任务
  const filteredTasks = tasks[activeCategory].filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  });

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
          <div className="text-4xl mb-4">⚠️</div>
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
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
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
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{task.title}</h3>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityStyle(task.priority)}`}></div>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">{task.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(task.createdAt)}</span>
                  {task.dueDate && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
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
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
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
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">任务描述</label>
                <textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
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
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GTDSystem;