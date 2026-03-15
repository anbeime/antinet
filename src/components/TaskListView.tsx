import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Circle, Trash2 } from 'lucide-react';
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

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:8000/api/data/gtd/tasks';
      if (filter === 'today') {
        url = 'http://localhost:8000/api/data/gtd/tasks/today';
      } else if (filter === 'upcoming') {
        url = 'http://localhost:8000/api/data/gtd/tasks/upcoming?days=7';
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
        `http://localhost:8000/api/data/gtd/tasks/${taskId}/complete?is_completed=${!isCompleted}`,
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
      const response = await fetch(`http://localhost:8000/api/data/gtd/tasks/${taskId}`, {
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
                className={`flex items-center p-3 border rounded-lg ${task.is_completed ? 'bg-gray-50' : 'bg-white'}`}
              >
                <button
                  onClick={() => toggleComplete(task.id, task.is_completed)}
                  className="mr-3 text-gray-400 hover:text-green-500"
                >
                  {task.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className={`font-medium ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-gray-500">{task.description}</div>
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
                  onClick={() => deleteTask(task.id)}
                  className="ml-3 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskListView;
