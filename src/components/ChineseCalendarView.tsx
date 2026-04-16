import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { useCalendar } from '@/hooks/useCalendar';
import { toast } from 'sonner';

dayjs.locale('zh-cn');

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

interface ChineseCalendarViewProps {
  onRefresh?: () => void;
}

const ChineseCalendarView: React.FC<ChineseCalendarViewProps> = ({ onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [tasks, setTasks] = useState<GTDTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);

  const {
    calendarData,
    getLunarDate,
    getTraditionalFestivalsData,
  } = useCalendar(currentDate);

  const traditionalFestivals = getTraditionalFestivalsData(currentDate.year());

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

  const getTasksForDate = (date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return tasks.filter(t => {
      if (t.due_date === dateStr) return true;
      if (!t.due_date && t.created_at && t.created_at.startsWith(dateStr)) return true;
      return false;
    });
  };

  const handleDateSelect = (date: dayjs.Dayjs) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setShowTaskPanel(true);
  };

  const getSelectedDateTasks = () => {
    if (!selectedDate) return [];
    return getTasksForDate(selectedDate);
  };

  const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/data/gtd/tasks/${taskId}/complete?is_completed=${!currentStatus}`, {
        method: 'PUT'
      });
      if (response.ok) {
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, is_completed: !currentStatus } : t
        ));
        toast.success(currentStatus ? '任务已恢复' : '任务已完成');
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

  // 日历网格计算
  const firstDayOfMonth = currentDate.startOf('month').day();
  const daysInMonth = currentDate.daysInMonth();
  const today = dayjs();

  const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  // 构建日历格子
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 border border-gray-100"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = currentDate.date(day);
    const dateStr = date.format('YYYY-MM-DD');
    const dayTasks = getTasksForDate(date);
    const hasTasks = dayTasks.length > 0;
    const isToday = date.isSame(today, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const isSelected = selectedDate ? date.isSame(selectedDate, 'day') : false;
    const festival = traditionalFestivals[dateStr];
    const lunarStr = getLunarDate(date);

    calendarDays.push(
      <div
        key={day}
        className={`h-24 border p-1 cursor-pointer transition-all duration-200 relative ${
          isToday ? 'bg-amber-50 border-amber-300' :
          isSelected ? 'bg-blue-50 border-blue-300' :
          'bg-white border-gray-100 hover:bg-amber-50/30'
        }`}
        onClick={() => handleDateSelect(date)}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${
            isToday ? 'text-amber-700' :
            isWeekend ? 'text-blue-600' :
            'text-gray-700'
          }`}>
            {day}
          </span>
          {hasTasks && (
            <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
              {dayTasks.length}
            </span>
          )}
        </div>

        {/* 农历日期 */}
        <div className={`text-[10px] mt-0.5 ${
          festival ? 'text-amber-600 font-medium' : 'text-gray-400'
        }`}>
          {festival || lunarStr}
        </div>

        {/* 任务条目 */}
        {hasTasks && (
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayTasks.slice(0, 3).map(task => (
              <div
                key={task.id}
                className={`text-xs px-1 py-0.5 rounded truncate text-white ${getPriorityColor(task.priority)} ${task.is_completed ? 'opacity-50 line-through' : ''}`}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-[10px] text-gray-500 text-center">+{dayTasks.length - 3} 更多</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedTasks = getSelectedDateTasks();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#faf8f5' }}>
      {/* 国风日历头部 */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e8ddd0', backgroundColor: '#fff9f3' }}>
        <div className="flex items-center space-x-4">
          <button onClick={prevMonth} className="p-2 hover:bg-amber-100 rounded transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: '#8b7355' }} />
          </button>
          <h2 className="text-xl font-bold" style={{ color: '#8b4513' }}>
            {currentDate.format('YYYY年MM月')}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-amber-100 rounded transition-colors">
            <ChevronRight className="w-5 h-5" style={{ color: '#8b7355' }} />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentDate(dayjs())}
            className="px-3 py-1 text-white rounded hover:opacity-90 transition-opacity text-sm"
            style={{ backgroundColor: '#d4a574' }}
          >
            今天
          </button>
          <div className="flex space-x-3 text-sm" style={{ color: '#8b7355' }}>
            <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span>高</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded mr-1"></span>中</span>
            <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span>低</span>
          </div>

          {/* 今日信息卡片 */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#fef3e2' }}>
            <div className="text-right">
              <div className="text-xs" style={{ color: '#8b7355' }}>{calendarData.lunarDate}</div>
              <div className="text-xs" style={{ color: '#d4a574' }}>{calendarData.holidayStatus} · {calendarData.daysToHoliday}</div>
            </div>
            <div className="text-3xl font-bold" style={{ color: '#d4a574', fontFamily: 'KaiTi, STKaiti, serif' }}>
              {calendarData.solarDate}
            </div>
          </div>
        </div>
      </div>

      {/* 日历主体 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 星期头 - 国风色调 */}
        <div className="grid grid-cols-7 border-b" style={{ backgroundColor: '#d4a574' }}>
          {weekdays.map(day => (
            <div key={day} className="p-2 text-center font-medium text-white text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="flex-1 grid grid-cols-7 overflow-auto">
          {calendarDays}
        </div>
      </div>

      {/* 右侧任务面板 */}
      {showTaskPanel && selectedDate && (
        <div className="absolute inset-y-0 right-0 w-96 shadow-2xl flex flex-col z-10" style={{ backgroundColor: '#fff9f3', borderLeft: '2px solid #d4a574' }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#fef3e2', borderColor: '#e8ddd0' }}>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#8b4513' }}>
                {selectedDate.format('YYYY年MM月DD日')}
              </h3>
              <p className="text-sm" style={{ color: '#8b7355' }}>
                {getLunarDate(selectedDate)} · {selectedTasks.length} 个任务
              </p>
            </div>
            <button
              onClick={() => setShowTaskPanel(false)}
              className="p-2 hover:bg-amber-100 rounded transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#8b7355' }} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {selectedTasks.length === 0 ? (
              <div className="text-center py-8" style={{ color: '#b8a090' }}>
                <p className="text-lg" style={{ fontFamily: 'KaiTi, STKaiti, serif' }}>暂无任务</p>
                <p className="text-sm mt-2" style={{ fontFamily: 'KaiTi, STKaiti, serif' }}>岁月静好，珍惜当下</p>
              </div>
            ) : (
              selectedTasks.map(task => (
                <div
                  key={task.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    task.is_completed ? 'opacity-60' : ''
                  }`}
                  style={{
                    borderColor: task.is_completed ? '#e0d5c8' :
                      task.priority === 'high' ? '#ef4444' :
                      task.priority === 'medium' ? '#eab308' : '#22c55e',
                    backgroundColor: task.is_completed ? '#faf5f0' : '#ffffff'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => toggleTaskCompletion(task.id, task.is_completed)}
                      className="mt-0.5"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${task.is_completed ? 'line-through text-gray-400' : ''}`} style={{ color: task.is_completed ? undefined : '#8b4513' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded text-white ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                        <span className="text-xs" style={{ color: '#8b7355' }}>{task.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
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

export default ChineseCalendarView;
