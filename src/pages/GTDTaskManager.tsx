import React, { useState } from 'react';
import { Calendar, ListTodo, Plus, X } from 'lucide-react';
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
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-800">任务管理</h1>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListTodo className="w-4 h-4 mr-1.5" />
                列表
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                日历
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'calendar' ? <CalendarView /> : <TaskListView />}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">新建任务</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入任务标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="请输入任务描述"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="inbox">收集箱</option>
                    <option value="today">今日</option>
                    <option value="later">待定</option>
                    <option value="projects">项目</option>
                    <option value="archive">归档</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">到期日期</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提醒时间</label>
                <input
                  type="datetime-local"
                  value={formData.remind_at}
                  onChange={(e) => setFormData({ ...formData, remind_at: e.target.value, reminder_enabled: !!e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GTDTaskManager;
