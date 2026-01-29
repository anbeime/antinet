import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, FileText, CheckCircle, Clock, Zap, Download, Settings, Play, Pause, RotateCcw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Task {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'excel' | 'image';
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
}

const BatchProcess: React.FC = () => {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 从后端加载分析任务列表
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/analysis/list-analyses');
        if (response.ok) {
          const analyses = await response.json();
          // 转换为任务格式
          const tasksFromAPI = analyses.map((analysis: any) => ({
            id: String(analysis.id || Math.random()),
            name: analysis.filename || '未命名任务',
            type: 'pdf' as const,
            status: analysis.status === 'completed' ? 'completed' as const : 
                   analysis.status === 'processing' ? 'processing' as const : 
                   analysis.status === 'failed' ? 'failed' as const : 'waiting' as const,
            progress: analysis.status === 'completed' ? 100 : 
                     analysis.status === 'processing' ? 50 : 0,
            startTime: analysis.created_at,
            endTime: analysis.updated_at
          }));
          setTasks(tasksFromAPI);
        }
      } catch (error) {
        console.error('加载任务列表失败:', error);
        setTasks([]);
      }
    };
    
    loadTasks();
  }, []);

  const getStatusIcon = (status: string) => {
    const icons = {
      waiting: <Clock className="w-5 h-5 text-gray-400" />,
      processing: <Loader className="w-5 h-5 text-blue-500 animate-spin" />,
      completed: <CheckCircle className="w-5 h-5 text-green-500" />,
      failed: <AlertTriangle className="w-5 h-5 text-red-500" />
    };
    return icons[status as keyof typeof icons] || icons.waiting;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return badges[status as keyof typeof badges] || badges.waiting;
  };

  const startProcessing = () => {
    setIsProcessing(true);
    // Simulate processing
    const interval = setInterval(() => {
      setTasks(prev => {
        const waitingTask = prev.find(t => t.status === 'waiting');
        if (!waitingTask) {
          clearInterval(interval);
          setIsProcessing(false);
          return prev;
        }
        
        return prev.map(t => 
          t.id === waitingTask.id ? { ...t, status: 'processing', progress: 0, startTime: new Date().toLocaleTimeString() } : t
        );
      });
    }, 2000);
  };

  const overallProgress = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                批量处理中心
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                NPU加速的批量文档智能处理与转换
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Process Config */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-teal-500" />
                处理配置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">NPU加速</label>
                  <div className="mt-2 flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <span className="text-green-700 dark:text-green-300">已启用</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">并发数量</label>
                  <select className="mt-2 w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <option>1 (高质量)</option>
                    <option selected>2 (平衡)</option>
                    <option>4 (快速)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">输出格式</label>
                  <select className="mt-2 w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <option>JSON + 摘要</option>
                    <option>纯文本</option>
                    <option>结构化数据</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={startProcessing}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 bg-teal-500 text-white py-3 px-4 rounded-lg hover:bg-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isProcessing ? '处理中...' : '开始批量处理'}</span>
              </button>
              <button className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                <RotateCcw className="w-4 h-4" />
                <span>重置队列</span>
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-teal-500" />
                处理统计
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">总任务</span>
                  <span className="font-medium">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">已完成</span>
                  <span className="font-medium text-green-600">{tasks.filter(t => t.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">处理中</span>
                  <span className="font-medium text-blue-600">{tasks.filter(t => t.status === 'processing').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">失败</span>
                  <span className="font-medium text-red-600">{tasks.filter(t => t.status === 'failed').length}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Task List */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Overall Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-teal-500" />
                  总体进度
                </h3>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <motion.div 
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>

            {/* Task List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-teal-500" />
                  任务队列 ({tasks.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(task.status)}`}>
                            {task.status === 'waiting' && '等待中'}
                            {task.status === 'processing' && '处理中'}
                            {task.status === 'completed' && '已完成'}
                            {task.status === 'failed' && '失败'}
                          </span>
                        </div>
                        {task.status === 'processing' && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                            <motion.div 
                              className="bg-teal-500 h-1.5 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{task.type.toUpperCase()}</span>
                          {task.startTime && <span>开始: {task.startTime}</span>}
                          {task.endTime && <span>结束: {task.endTime}</span>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {task.status === 'completed' && (
                          <button className="p-1 text-gray-400 hover:text-teal-500">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {task.status === 'failed' && (
                          <button className="p-1 text-gray-400 hover:text-red-500">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NPU Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Gauge className="w-5 h-5 mr-2 text-teal-500" />
                NPU性能监控
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xl font-bold text-teal-600">2.3x</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">加速比</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xl font-bold text-cyan-600">340ms</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">平均延迟</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">94%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">成功率</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BatchProcess;