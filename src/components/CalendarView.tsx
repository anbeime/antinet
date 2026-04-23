import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, CheckCircle2, Circle, X, Plus, Trash2, Calendar, MapPin, Edit2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { getLunarDate, getTraditionalFestivalsData } from '@/utils/calendar/calendar';
import { calendarEventService, type CalendarEvent, type CalendarEventCreate } from '../services/integrationService';

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

// 统一的日历项类型
interface CalendarItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isCompleted: boolean;
  location?: string;
  color?: string;
  sourceCardId?: number;
  raw: GTDTask | CalendarEvent;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<GTDTask[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);

  // 创建事件弹窗
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<CalendarEventCreate>({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    category: 'default',
  });

  // 编辑事件
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取 GTD 任务和日历事件
        const [taskRes, eventRes] = await Promise.all([
          fetch('http://localhost:8000/api/data/gtd/tasks'),
          fetch('http://localhost:8000/api/integration/calendar/events/all'),
        ]);

        if (taskRes.ok) {
          const data = await taskRes.json();
          setTasks(Array.isArray(data) ? data : []);
        }
        if (eventRes.ok) {
          const data = await eventRes.json();
          setEvents(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    fetchData();
  }, [onRefresh]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const traditionalFestivals = getTraditionalFestivalsData(year);

  const getLunarForDate = (day: number) => {
    const d = dayjs(new Date(year, month, day));
    return getLunarDate(d);
  };

  const getFestivalForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return traditionalFestivals[dateStr] || null;
  };

  // 合并 GTD 任务和日历事件为统一的 CalendarItem 列表
  const getItemsForDate = (day: number): CalendarItem[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items: CalendarItem[] = [];

    // GTD 任务
    tasks.forEach(t => {
      if (t.due_date === dateStr || (!t.due_date && t.created_at && t.created_at.startsWith(dateStr))) {
        items.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          description: t.description,
          date: dateStr,
          priority: t.priority,
          category: t.category,
          isCompleted: t.is_completed,
          raw: t,
        });
      }
    });

    // 日历事件
    events.forEach(e => {
      const eventDate = e.start_time.slice(0, 10);
      if (eventDate === dateStr) {
        items.push({
          id: `event-${e.id}`,
          type: 'event',
          title: e.title,
          description: e.description,
          date: eventDate,
          startTime: e.start_time,
          endTime: e.end_time,
          isCompleted: e.is_completed,
          location: e.location,
          color: e.color,
          sourceCardId: e.source_card_id,
          raw: e,
        });
      }
    });

    return items;
  };

  const getSelectedDateItems = (): CalendarItem[] => {
    if (!selectedDate) return [];
    const day = selectedDate.getDate();
    return getItemsForDate(day);
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

  // P0: 日历事件 CRUD
  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time) {
      toast.error('请填写完整事件信息');
      return;
    }
    try {
      await calendarEventService.create(newEvent);
      toast.success('日程已创建');
      setShowCreateEvent(false);
      setNewEvent({ title: '', start_time: '', end_time: '', location: '', category: 'default' });
      if (onRefresh) onRefresh();
      // 刷新事件列表
      const eventRes = await fetch('http://localhost:8000/api/integration/calendar/events/all');
      if (eventRes.ok) setEvents(await eventRes.json());
    } catch (err) {
      toast.error('创建日程失败');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await calendarEventService.delete(eventId);
      toast.success('日程已删除');
      if (onRefresh) onRefresh();
      const eventRes = await fetch('http://localhost:8000/api/integration/calendar/events/all');
      if (eventRes.ok) setEvents(await eventRes.json());
    } catch (err) {
      toast.error('删除日程失败');
    }
  };

  const handleToggleEventComplete = async (event: CalendarEvent) => {
    try {
      await calendarEventService.update(event.id, { is_completed: !event.is_completed });
      toast.success(event.is_completed ? '日程已标记未完成' : '日程已完成');
      const eventRes = await fetch('http://localhost:8000/api/integration/calendar/events/all');
      if (eventRes.ok) setEvents(await eventRes.json());
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const openCreateEventOnDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const startH = new Date().getHours() + 1;
    setNewEvent({
      title: '',
      start_time: `${dateStr}T${String(startH).padStart(2, '0')}:00`,
      end_time: `${dateStr}T${String(startH + 1).padStart(2, '0')}:00`,
      location: '',
      category: 'default',
    });
    setShowCreateEvent(true);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-28 border" style={{ backgroundColor: '#faf8f5', borderColor: '#e8ddd0' }}></div>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayItems = getItemsForDate(day);
    const hasItems = dayItems.length > 0;
    const lunarStr = getLunarForDate(day);
    const festival = getFestivalForDate(day);
    const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
    const taskCount = dayItems.filter(i => i.type === 'task').length;
    const eventCount = dayItems.filter(i => i.type === 'event').length;

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
          {hasItems && (
            <div className="flex gap-0.5">
              {taskCount > 0 && (
                <span className="text-[10px] text-white px-1 py-0.5 rounded-full" style={{ backgroundColor: '#d4a574' }}>
                  {taskCount}
                </span>
              )}
              {eventCount > 0 && (
                <span className="text-[10px] text-white px-1 py-0.5 rounded-full bg-blue-500">
                  {eventCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 农历日期 */}
        <div className={`text-[10px] mt-0.5 ${festival ? 'font-medium' : ''}`} style={{ color: festival ? '#d4a574' : '#b8a090' }}>
          {festival || lunarStr}
        </div>

        {hasItems && (
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayItems.slice(0, 3).map(item => (
              <div
                key={item.id}
                className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5 ${
                  item.type === 'event'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : `${getPriorityColor(item.priority || 'medium')} text-white`
                } ${item.isCompleted ? 'opacity-50 line-through' : ''}`}
              >
                {item.type === 'event' ? <Calendar size={8} /> : <CheckCircle2 size={8} />}
                <span className="truncate">{item.title}</span>
              </div>
            ))}
            {dayItems.length > 3 && (
              <div className="text-[10px] text-center" style={{ color: '#b8a090' }}>+{dayItems.length - 3} 更多</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedItems = getSelectedDateItems();
  const selectedLunar = selectedDate ? getLunarDate(dayjs(selectedDate)) : '';
  const selectedFestival = selectedDate ? getFestivalForDate(selectedDate.getDate()) : null;
  const selectedDay = selectedDate ? selectedDate.getDate() : null;

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
            <span className="flex items-center text-sm"><span className="w-3 h-3 bg-blue-500 rounded mr-1"></span>日程</span>
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
                <span style={{ color: '#8b7355' }}> · {selectedItems.length} 项</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedDay && openCreateEventOnDate(selectedDay)}
                className="flex items-center px-3 py-1.5 text-white rounded-lg hover:opacity-90 transition-opacity text-sm bg-blue-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                日程
              </button>
              <button
                onClick={() => setShowTaskPanel(false)}
                className="p-2 hover:bg-amber-100 rounded transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#8b7355' }} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-3">
            {selectedItems.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#b8a090' }}>
                <p className="text-lg">暂无安排</p>
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    className="flex items-center px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#d4a574' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加任务
                  </button>
                  <button
                    onClick={() => selectedDay && openCreateEventOnDate(selectedDay)}
                    className="flex items-center px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition-opacity bg-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加日程
                  </button>
                </div>
              </div>
            ) : (
              selectedItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-xl transition-colors ${item.isCompleted ? 'opacity-60' : 'hover:shadow-md'}`}
                  style={{
                    borderColor: item.type === 'event' ? '#93c5fd' : '#e8ddd0',
                    backgroundColor: item.isCompleted
                      ? '#faf5f0'
                      : item.type === 'event'
                        ? '#eff6ff'
                        : '#ffffff'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => {
                        if (item.type === 'task') {
                          handleToggleComplete((item.raw as GTDTask).id, item.isCompleted);
                        } else {
                          handleToggleEventComplete(item.raw as CalendarEvent);
                        }
                      }}
                      className="mt-1 flex-shrink-0"
                    >
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* 类型标签 + 标题 */}
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === 'event' ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Calendar size={10} /> 日程
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: '#d4a574' }}>
                            任务
                          </span>
                        )}
                        <span className={`text-base font-semibold leading-relaxed ${item.isCompleted ? 'line-through text-gray-400' : ''}`}
                          style={{ color: item.isCompleted ? undefined : '#8b4513' }}>
                          {item.title}
                        </span>
                      </div>

                      {/* 描述 */}
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap break-words">{item.description}</div>
                      )}

                      {/* 事件详细信息 */}
                      {item.type === 'event' && item.startTime && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-blue-600 dark:text-blue-400">
                          <span className="flex items-center gap-1"><Clock size={10} />
                            {new Date(item.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {item.endTime && new Date(item.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1"><MapPin size={10} />{item.location}</span>
                          )}
                          {item.sourceCardId && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">
                              来自卡片 #{item.sourceCardId}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 任务标签 */}
                      {item.type === 'task' && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2.5 py-0.5 text-xs rounded-full ${getPriorityColor(item.priority || 'medium')} text-white`}>
                            {item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '低优先级'}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded-full border" style={{ color: '#8b7355', borderColor: '#e8ddd0' }}>
                            {item.category === 'inbox' ? '收集箱' : item.category === 'today' ? '今日' : item.category === 'later' ? '待定' : item.category === 'projects' ? '项目' : item.category === 'archive' ? '归档' : item.category}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (item.type === 'task') {
                          handleDeleteTask((item.raw as GTDTask).id);
                        } else {
                          handleDeleteEvent((item.raw as CalendarEvent).id);
                        }
                      }}
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

      {/* P0: 创建日历事件弹窗 */}
      {showCreateEvent && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20" onClick={() => setShowCreateEvent(false)}>
          <div
            className="w-[400px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6"
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#fffdf9' }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#8b4513' }}>
              <Calendar size={18} className="text-blue-500" />
              创建日程事件
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#8b7355' }}>标题</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  style={{ borderColor: '#e8ddd0', backgroundColor: '#fff' }}
                  placeholder="输入事件标题..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#8b7355' }}>开始时间</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fff' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#8b7355' }}>结束时间</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none text-sm"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fff' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#8b7355' }}>地点</label>
                <input
                  type="text"
                  value={newEvent.location || ''}
                  onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                  style={{ borderColor: '#e8ddd0', backgroundColor: '#fff' }}
                  placeholder="可选..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg transition-colors"
                  style={{ color: '#8b7355' }}
                  onClick={() => setShowCreateEvent(false)}
                >
                  取消
                </button>
                <button
                  className="px-4 py-2 text-sm text-white rounded-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#d4a574' }}
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time}
                >
                  创建日程
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
