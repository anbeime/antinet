import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Circle, Trash2, X, Calendar, Clock, Tag } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { toast } from 'sonner';

interface Task {
  id: number;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  remind_at?: string;
  reminder_enabled: boolean;
  is_completed: boolean;
  completed_at?: string;
}

const TaskListView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = `${getApiBaseUrl()}/api/data/gtd/tasks`;
      if (filter === 'today') {
        url = `${getApiBaseUrl()}/api/data/gtd/tasks/today`;
      } else if (filter === 'upcoming') {
        url = `${getApiBaseUrl()}/api/data/gtd/tasks/upcoming?days=7`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (filter === 'completed') {
          setTasks((data as Task[]).filter((t: Task) => t.is_completed));
        } else if (filter === 'today' || filter === 'upcoming') {
          setTasks(data.tasks || []);
        } else {
          setTasks(data as Task[]);
        }
      }
    } catch (error) {
      console.error('获取任务失败:', error);
      toast.error('获取任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const toggleComplete = async (taskId: number, isCompleted: boolean) => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/data/gtd/tasks/${taskId}/complete?is_completed=${!isCompleted}`,
        { method: 'PUT' }
      );
      if (response.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: !isCompleted } : t
        ));
        toast.success(isCompleted ? '任务已取消完成' : '任务已完成');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(getApiBaseUrl() + `/api/data/gtd/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
        toast.success('任务已删除');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      inbox: '收集箱',
      today: '今日',
      later: '待定',
      archive: '归档',
      projects: '项目'
    };
    return labels[category] || category;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1 rounded ${filter === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            今日
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded ${filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            即将到期
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded ${filter === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
          >
            已完成
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            暂无任务
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center p-3 border rounded-lg cursor-pointer active:scale-[0.98] transition-transform ${task.is_completed ? 'bg-gray-50' : 'bg-white'}`}
                onClick={() => setSelectedTask(task)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, task.is_completed); }}
                  className="mr-3 text-gray-400 hover:text-green-500 flex-shrink-0"
                >
                  {task.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-gray-500 truncate">{task.description}</div>
                  )}
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                    <span>{getCategoryLabel(task.category)}</span>
                    {task.due_date && <span>到期: {task.due_date}</span>}
                    {task.reminder_enabled && <Bell className="w-3 h-3" />}
                  </div>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                  className="ml-3 text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSelectedTask(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold truncate pr-2">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {selectedTask.description && (
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">描述</label>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">优先级</label>
                  <p className="text-sm font-medium mt-1">
                    <span className={`inline-flex items-center gap-1 ${getPriorityColor(selectedTask.priority)}`}>
                      <Tag className="w-3.5 h-3.5" />
                      {selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'medium' ? '中' : '低'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">分类</label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    {getCategoryLabel(selectedTask.category)}
                  </p>
                </div>
                {selectedTask.due_date && (
                  <div>
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">到期日期</label>
                    <p className="text-sm mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {selectedTask.due_date}
                    </p>
                  </div>
                )}
                {selectedTask.remind_at && (
                  <div>
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">提醒时间</label>
                    <p className="text-sm mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {selectedTask.remind_at}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t">
                <span className={selectedTask.is_completed ? 'text-green-500' : ''}>
                  {selectedTask.is_completed ? '✓ 已完成' : '○ 未完成'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t bg-gray-50">
              <button
                onClick={() => { toggleComplete(selectedTask.id, selectedTask.is_completed); setSelectedTask(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: selectedTask.is_completed ? '#f59e0b' : '#22c55e' }}
              >
                {selectedTask.is_completed ? '标记未完成' : '标记完成'}
              </button>
              <button
                onClick={() => { deleteTask(selectedTask.id); setSelectedTask(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
              >
                删除
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TaskListView;
