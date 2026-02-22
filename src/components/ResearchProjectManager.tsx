import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Plus, 
  X, 
  Edit2, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  researchProjectService, 
  ResearchProject, 
  GtdTask
} from '@/services/dataService';

interface ResearchProjectManagerProps {
  onSelectProject?: (project: ResearchProject) => void;
  selectedProjectId?: number | null;
}

const colorOptions = [
  { value: 'blue', label: '蓝色', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { value: 'green', label: '绿色', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { value: 'yellow', label: '黄色', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  { value: 'red', label: '红色', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  { value: 'purple', label: '紫色', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
];

const iconOptions = ['📚', '🔬', '💡', '📊', '🎯', '🚀', '🔧', '🎨', '📝', '⚙️'];

const ResearchProjectManager: React.FC<ResearchProjectManagerProps> = ({
  onSelectProject,
  selectedProjectId
}) => {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ResearchProject | null>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [projectTasks, setProjectTasks] = useState<Record<number, GtdTask[]>>({});
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '📚'
  });

  // 加载专题列表
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await researchProjectService.getAll();
      setProjects(data);
    } catch (err) {
      console.error('加载专题失败:', err);
      toast.error('加载专题失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载专题下的任务
  const loadProjectTasks = async (projectId: number) => {
    try {
      const tasks = await researchProjectService.getTasks(projectId);
      setProjectTasks(prev => ({ ...prev, [projectId]: tasks }));
    } catch (err) {
      console.error('加载专题任务失败:', err);
    }
  };

  // 创建专题
  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('请输入专题名称');
      return;
    }

    try {
      await researchProjectService.create(newProject);
      toast.success('专题创建成功');
      setShowCreateModal(false);
      setNewProject({ name: '', description: '', color: 'blue', icon: '📚' });
      loadProjects();
    } catch (err) {
      console.error('创建专题失败:', err);
      toast.error('创建专题失败');
    }
  };

  // 编辑专题
  const handleEditProject = async () => {
    if (!editingProject?.id || !newProject.name.trim()) {
      toast.error('请输入专题名称');
      return;
    }

    try {
      await researchProjectService.update(editingProject.id, newProject);
      toast.success('专题更新成功');
      setShowEditModal(false);
      setEditingProject(null);
      loadProjects();
    } catch (err) {
      console.error('更新专题失败:', err);
      toast.error('更新专题失败');
    }
  };

  // 删除专题
  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('确定要删除这个专题吗？专题下的任务将变为未分类。')) {
      return;
    }

    try {
      await researchProjectService.delete(projectId);
      toast.success('专题已删除');
      loadProjects();
    } catch (err) {
      console.error('删除专题失败:', err);
      toast.error('删除专题失败');
    }
  };

  // 展开/收起专题
  const toggleProject = (projectId: number) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      if (!projectTasks[projectId]) {
        loadProjectTasks(projectId);
      }
    }
  };

  // 打开编辑模态框
  const openEditModal = (project: ResearchProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setNewProject({
      name: project.name,
      description: project.description || '',
      color: project.color || 'blue',
      icon: project.icon || '📚'
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center">
          <Book className="w-5 h-5 mr-2" />
          专题研究
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          新建专题
        </motion.button>
      </div>

      {/* 专题列表 */}
      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无专题研究</p>
          <p className="text-sm mt-1">点击上方按钮创建第一个专题</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(project => {
            const colorOption = colorOptions.find(c => c.value === project.color) || colorOptions[0];
            const isExpanded = expandedProject === project.id;
            const tasks = projectTasks[project.id!] || [];
            const isSelected = selectedProjectId === project.id;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* 专题头部 */}
                <div
                  onClick={() => {
                    toggleProject(project.id!);
                    onSelectProject?.(project);
                  }}
                  className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${colorOption.bg}`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-xl mr-3">{project.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium truncate ${colorOption.text}`}>{project.name}</h4>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <span className="text-xs text-gray-500">
                      {tasks.length > 0 ? `${tasks.length}个任务` : '无任务'}
                    </span>
                    <button
                      onClick={(e) => openEditModal(project, e)}
                      className="p-1.5 hover:bg-white/50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id!);
                      }}
                      className="p-1.5 hover:bg-white/50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <ChevronRight 
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </div>
                </div>

                {/* 展开的任务列表 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        {tasks.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            该专题下暂无任务
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {tasks.map((task: GtdTask) => (
                              <div
                                key={task.id}
                                className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                              >
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  task.priority === 'high' ? 'bg-red-500' :
                                  task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                                }`} />
                                <span className="flex-1 truncate">{task.title}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {task.category === 'inbox' ? '收集箱' :
                                   task.category === 'today' ? '等待处理' :
                                   task.category === 'later' ? '将来可能' :
                                   task.category === 'archive' ? '归档' : '专题'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 创建专题模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">新建专题</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">专题名称 *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="输入专题名称"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="输入专题描述"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">颜色</label>
                <div className="flex space-x-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewProject({ ...newProject, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.bg} ${color.border} border-2 ${
                        newProject.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">图标</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewProject({ ...newProject, icon })}
                      className={`w-10 h-10 text-xl rounded-lg border-2 ${
                        newProject.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 编辑专题模态框 */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">编辑专题</h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }} 
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">专题名称 *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="输入专题名称"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">描述</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="输入专题描述"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">颜色</label>
                <div className="flex space-x-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewProject({ ...newProject, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.bg} ${color.border} border-2 ${
                        newProject.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">图标</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewProject({ ...newProject, icon })}
                      className={`w-10 h-10 text-xl rounded-lg border-2 ${
                        newProject.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProject(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleEditProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ResearchProjectManager;
