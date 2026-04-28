import React, { useState } from 'react';
import { Calendar, ListTodo, Plus, X, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CalendarView from '@/components/CalendarView';
import TaskListView from '@/components/TaskListView';
import { toast } from 'sonner';

interface GTDTaskManagerProps {
  initialView?: 'calendar' | 'list';
}

interface NewTaskForm {
  title: string;
  description: string;
  category: string;
  priority: string;
  due_date: string;
  remind_at: string;
  reminder_enabled: boolean;
}

const GTDTaskManager: React.FC<GTDTaskManagerProps> = ({ initialView = 'list' }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(initialView);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const [formData, setFormData] = useState<NewTaskForm>({
    title: '',
    description: '',
    category: 'today',
    priority: 'medium',
    due_date: '',
    remind_at: '',
    reminder_enabled: false
  });

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('http://localhost:8000/api/data/gtd/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('任务创建成功');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          category: 'today',
          priority: 'medium',
          due_date: '',
          remind_at: '',
          reminder_enabled: false
        });
        window.location.reload();
      } else {
        const err = await response.json();
        toast.error(err.detail || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#faf8f5' }}>
      <div className="border-b px-6 py-4" style={{ backgroundColor: '#fff9f3', borderColor: '#e8ddd0' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold" style={{ color: '#8b4513', fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.05em' }}>任务管理</h1>
            <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#f5ebe0', color: '#8b7355' }}>
              任务 · 日历
            </span>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#d4a574' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* 左侧：任务列表 */}
        <div className="flex-1 overflow-hidden">
          <TaskListView />
        </div>
        
        {/* 右侧：日历面板 */}
        <div className="w-[400px] border-l overflow-hidden" style={{ borderColor: '#e8ddd0' }}>
          {calendarFullscreen ? (
            <div className="fixed inset-0 z-50" style={{ backgroundColor: '#faf8f5' }}>
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button
                  onClick={() => setCalendarFullscreen(false)}
                  className="flex items-center px-3 py-1.5 text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#d4a574' }}
                >
                  <Minimize2 className="w-4 h-4 mr-2" />
                  退出全屏
                </button>
              </div>
              <CalendarView />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 日历标题栏 */}
              <div className="flex items-center justify-between p-3 border-b" style={{ backgroundColor: '#fff9f3', borderColor: '#e8ddd0' }}>
                <h3 className="font-bold text-sm" style={{ color: '#8b4513' }}>日历</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarFullscreen(true)}
                    className="p-1.5 hover:bg-amber-100 rounded transition-colors"
                    title="全屏"
                  >
                    <Maximize2 className="w-4 h-4" style={{ color: '#8b7355' }} />
                  </button>
                </div>
              </div>
              {/* 日历内容（简化版） */}
              <div className="flex-1 overflow-hidden">
                <CalendarView />
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(139, 115, 85, 0.3)' }}>
          <div className="rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" style={{ backgroundColor: '#fff9f3', border: '2px solid #d4a574' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: '#d4a574' }}>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'KaiTi, STKaiti, serif', letterSpacing: '0.1em' }}>新建任务</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none transition-colors"
                  style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  placeholder="请输入任务标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none transition-colors"
                  style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  rows={3}
                  placeholder="请输入任务描述"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  >
                    <option value="inbox">收集箱</option>
                    <option value="today">今日</option>
                    <option value="later">待定</option>
                    <option value="projects">项目</option>
                    <option value="archive">归档</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>优先级</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>到期日期</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b4513' }}>提醒时间</label>
                  <input
                    type="datetime-local"
                    value={formData.remind_at}
                    onChange={(e) => setFormData({ ...formData, remind_at: e.target.value, reminder_enabled: !!e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:outline-none"
                    style={{ borderColor: '#e8ddd0', backgroundColor: '#fffdf9', color: '#8b4513' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4" style={{ borderTop: '1px solid #e8ddd0' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ border: '1px solid #e8ddd0', color: '#8b7355' }}
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creating}
                className="px-5 py-2.5 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#d4a574' }}
              >
                {creating ? '创建中...' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GTDTaskManager;
