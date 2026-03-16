import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, CheckCircle2, Circle, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface GTDTask {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  created_at?: string;
  remind_at?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  is_completed: boolean;
  reminder_enabled: boolean;
}

interface CalendarViewProps {
  onRefresh?: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<GTDTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/data/gtd/tasks');
        if (response.ok) {
          const data = await response.json();
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('获取任务失败:', error);
      }
    };
    fetchTasks();
  }, [onRefresh]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => {
      if (t.due_date === dateStr) return true;
      if (!t.due_date && t.created_at && t.created_at.startsWith(dateStr)) return true;
      return false;
    });
  };

  const getSelectedDateTasks = () => {
    if (!selectedDate) return [];
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return tasks.filter(t => t.due_date === dateStr);
  };

  const isToday = (day: number) => {
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate();
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const handleDateClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setShowTaskPanel(true);
  };

  const handleToggleComplete = async (taskId: number, isCompleted: boolean) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/data/gtd/tasks/${taskId}/complete?is_completed=${!isCompleted}`,
        { method: 'PUT' }
      );
      if (response.ok) {
        toast.success(isCompleted ? '任务已取消完成' : '任务已完成');
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/data/gtd/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('任务已删除');
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700"></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDate(day);
    const hasTasks = dayTasks.length > 0;
    days.push(
      <div 
        key={day} 
        className={`h-28 border p-1 cursor-pointer transition-colors ${isToday(day) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        onClick={() => handleDateClick(day)}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {day}
          </span>
          {hasTasks && (
            <span className="text-xs bg-blue-500 text-white dark:bg-blue-600 px-1.5 py-0.5 rounded-full">
              {dayTasks.length}
            </span>
          )}
        </div>
        
        {hasTasks && (
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayTasks.slice(0, 4).map(task => (
              <div 
                key={task.id}
                className={`text-xs px-1.5 py-1 rounded truncate text-white flex items-center space-x-1 ${getPriorityColor(task.priority)} ${task.is_completed ? 'opacity-50 line-through' : ''}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`}></span>
                <span className="truncate">{task.title}</span>
              </div>
            ))}
            {dayTasks.length > 4 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">+{dayTasks.length - 4} 更多</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedTasks = getSelectedDateTasks();

  return (
    <div className="h-full flex flex-col relative dark:bg-gray-800">
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeft className="w-5 h-5 dark:text-gray-300" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">{year}年 {monthNames[month]}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRight className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            今天
          </button>
          <div className="flex space-x-3 dark:text-gray-300">
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span>高</span>
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-yellow-500 rounded mr-1"></span>中</span>
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span>低</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-gray-100 dark:bg-gray-700">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 dark:text-gray-300">
              {day}
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 overflow-auto">
            {days}
        </div>
      </div>

      {showTaskPanel && selectedDate && (
        <div className="absolute inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl border-l dark:border-gray-700 flex flex-col z-10">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-700">
            <div>
              <h3 className="font-bold text-lg dark:text-white">
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedTasks.length} 个任务</p>
            </div>
            <button 
              onClick={() => setShowTaskPanel(false)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="w-5 h-5 dark:text-gray-300" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {selectedTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p>暂无任务</p>
                <button className="mt-4 flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  添加任务
                </button>
              </div>
            ) : (
              selectedTasks.map(task => (
                <div 
                  key={task.id}
                  className={`p-3 border rounded-lg dark:border-gray-600 ${task.is_completed ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-700'}`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => handleToggleComplete(task.id, task.is_completed)}
                      className="mt-0.5"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium dark:text-white ${task.is_completed ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${getPriorityColor(task.priority)} text-white`}>
                          {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{task.category}</span>
                        {task.reminder_enabled && (
                          <Bell className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
