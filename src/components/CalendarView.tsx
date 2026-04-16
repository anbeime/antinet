import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, CheckCircle2, Circle, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { getLunarDate, getTraditionalFestivalsData } from '@/utils/calendar/calendar';

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

  // 农历和节日数据
  const traditionalFestivals = getTraditionalFestivalsData(year);

  const getLunarForDate = (day: number) => {
    const d = dayjs(new Date(year, month, day));
    return getLunarDate(d);
  };

  const getFestivalForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return traditionalFestivals[dateStr] || null;
  };

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
    return tasks.filter(t => {
      if (t.due_date === dateStr) return true;
      if (!t.due_date && t.created_at && t.created_at.startsWith(dateStr)) return true;
      return false;
    });
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
    days.push(<div key={`empty-${i}`} className="h-28 border" style={{ backgroundColor: '#faf8f5', borderColor: '#e8ddd0' }}></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDate(day);
    const hasTasks = dayTasks.length > 0;
    const lunarStr = getLunarForDate(day);
    const festival = getFestivalForDate(day);
    const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
    days.push(
      <div 
        key={day} 
        className={`h-28 border p-1 cursor-pointer transition-colors ${isToday(day) ? 'border-amber-400' : ''}`}
        style={{ 
          backgroundColor: isToday(day) ? '#fef3e2' : '#fffdf9',
          borderColor: isToday(day) ? '#d4a574' : '#e8ddd0'
        }}
        onClick={() => handleDateClick(day)}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${isToday(day) ? 'text-amber-700' : isWeekend ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </span>
          {hasTasks && (
            <span className="text-xs text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#d4a574' }}>
              {dayTasks.length}
            </span>
          )}
        </div>
        
        {/* 农历日期 */}
        <div className={`text-[10px] mt-0.5 ${festival ? 'font-medium' : ''}`} style={{ color: festival ? '#d4a574' : '#b8a090' }}>
          {festival || lunarStr}
        </div>
        
        {hasTasks && (
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayTasks.slice(0, 3).map(task => (
              <div 
                key={task.id}
                className={`text-xs px-1.5 py-1 rounded truncate text-white flex items-center space-x-1 ${getPriorityColor(task.priority)} ${task.is_completed ? 'opacity-50 line-through' : ''}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`}></span>
                <span className="truncate">{task.title}</span>
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-xs text-center" style={{ color: '#b8a090' }}>+{dayTasks.length - 3} 更多</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedTasks = getSelectedDateTasks();
  const selectedLunar = selectedDate ? getLunarDate(dayjs(selectedDate)) : '';
  const selectedFestival = selectedDate ? getFestivalForDate(selectedDate.getDate()) : null;

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#faf8f5' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#fff9f3', borderColor: '#e8ddd0' }}>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-amber-100 rounded transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: '#8b7355' }} />
          </button>
          <h2 className="text-xl font-bold" style={{ color: '#8b4513' }}>{year}年 {monthNames[month]}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-amber-100 rounded transition-colors">
            <ChevronRight className="w-5 h-5" style={{ color: '#8b7355' }} />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-white rounded hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#d4a574' }}
          >
            今天
          </button>
          <div className="flex space-x-3" style={{ color: '#8b7355' }}>
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span>高</span>
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-yellow-500 rounded mr-1"></span>中</span>
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span>低</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b" style={{ backgroundColor: '#d4a574' }}>
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center font-medium text-white text-sm">
              {day}
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 overflow-auto">
            {days}
        </div>
      </div>

      {showTaskPanel && selectedDate && (
        <div className="absolute inset-y-0 right-0 w-[520px] shadow-2xl flex flex-col z-10" style={{ backgroundColor: '#fff9f3', borderLeft: '2px solid #d4a574' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#fef3e2', borderColor: '#e8ddd0' }}>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#8b4513' }}>
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
              </h3>
              <p className="text-sm" style={{ color: '#d4a574' }}>
                {selectedFestival ? `${selectedFestival} · ` : ''}{selectedLunar}
                <span style={{ color: '#8b7355' }}> · {selectedTasks.length} 个任务</span>
              </p>
            </div>
            <button 
              onClick={() => setShowTaskPanel(false)}
              className="p-2 hover:bg-amber-100 rounded transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#8b7355' }} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {selectedTasks.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#b8a090' }}>
                <p className="text-lg">暂无任务</p>
                <button 
                  className="mt-4 flex items-center justify-center w-full px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#d4a574' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加任务
                </button>
              </div>
            ) : (
              selectedTasks.map(task => (
                <div 
                  key={task.id}
                  className={`p-4 border rounded-xl transition-colors ${task.is_completed ? 'opacity-60' : 'hover:shadow-md'}`}
                  style={{ 
                    borderColor: '#e8ddd0',
                    backgroundColor: task.is_completed ? '#faf5f0' : '#ffffff'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => handleToggleComplete(task.id, task.is_completed)}
                      className="mt-1 flex-shrink-0"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className={`text-base font-semibold leading-relaxed ${task.is_completed ? 'line-through text-gray-400' : ''}`} style={{ color: task.is_completed ? undefined : '#8b4513' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-2 leading-relaxed whitespace-pre-wrap break-words">{task.description}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`px-2.5 py-0.5 text-xs rounded-full ${getPriorityColor(task.priority)} text-white`}>
                          {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full border" style={{ color: '#8b7355', borderColor: '#e8ddd0' }}>
                          {task.category === 'inbox' ? '收集箱' : task.category === 'today' ? '今日' : task.category === 'later' ? '待定' : task.category === 'projects' ? '项目' : task.category === 'archive' ? '归档' : task.category}
                        </span>
                        {task.due_date && (
                          <span className="text-xs" style={{ color: '#8b7355' }}>截止: {task.due_date}</span>
                        )}
                        {task.reminder_enabled && (
                          <span className="flex items-center text-xs text-gray-400">
                            <Bell className="w-3 h-3 mr-1" />
                            已设提醒
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors"
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
