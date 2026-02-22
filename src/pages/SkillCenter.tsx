import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, BrainCircuit, FileText, BarChart3, Database, Code, Settings, Shield, Eye, Target, Star, Users } from 'lucide-react';

// 图标映射函数
const getCategoryIcon = (category: string): React.ComponentType<{className?: string}> => {
  const iconMap: Record<string, React.ComponentType<{className?: string}>> = {
    '数据处理': Code,
    '事实生成': FileText,
    '解释生成': BrainCircuit,
    '风险检测': Shield,
    '行动建议': Target,
    '记忆管理': Database,
    '知识管理': Database,
    '数据可视化': BarChart3,
    '消息传递': Users,
    '任务调度': Settings,
    'default': Zap
  };
  return iconMap[category] || iconMap['default'];
};

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  agent: string;
  icon: React.ComponentType<{className?: string}>;
  status: 'active' | 'beta' | 'development';
  usage: number;
  rating: number;
}

const SkillCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [apiSkills, setApiSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingSkill, setExecutingSkill] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{skill: string; result: any; error?: string} | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedSkillForExec, setSelectedSkillForExec] = useState<Skill | null>(null);
  const [skillParams, setSkillParams] = useState('');

  // 从API获取技能列表
  useEffect(() => {
    fetch('http://localhost:8000/api/skill/list')
      .then(res => res.json())
      .then(data => {
        console.log('API返回数据:', data);
        if (data.skills && Array.isArray(data.skills)) {
          setApiSkills(data.skills);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('获取技能失败:', err);
        setIsLoading(false);
      });
  }, []);

  // 转换API数据为显示格式
  const displaySkills: Skill[] = apiSkills.map((skill: any) => ({
    id: skill.name,
    name: skill.name,
    description: skill.description || '暂无描述',
    category: skill.category || '未分类',
    agent: skill.agent_name || '未分配',
    icon: getCategoryIcon(skill.category),
    status: skill.enabled ? 'active' : 'beta',
    usage: skill.usage_count || 0,
    rating: 4.5
  }));

  // 筛选技能
  const filteredSkills = displaySkills.filter(skill => {
    return selectedCategory === 'all' || skill.category === selectedCategory;
  });

  // 提取唯一分类
  const categories = ['全部技能', ...Array.from(new Set(displaySkills.map(s => s.category)))];

  // 执行技能
  const handleExecuteSkill = async (skill: Skill, params?: string) => {
    setExecutingSkill(skill.id);
    try {
      const response = await fetch('http://localhost:8000/api/skill/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skill.name,
          parameters: params ? JSON.parse(params) : {}
        })
      });
      const data = await response.json();
      setExecutionResult({ skill: skill.name, result: data, error: data.error });
    } catch (error) {
      setExecutionResult({ skill: skill.name, result: null, error: String(error) });
    } finally {
      setExecutingSkill(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-violet-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">加载技能列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                技能中心
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {displaySkills.length}项AI技能的集中管理与智能调度
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold mb-4 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                技能分类
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const categoryId = category === '全部技能' ? 'all' : category;
                  const count = category === '全部技能' 
                    ? displaySkills.length 
                    : displaySkills.filter(s => s.category === category).length;
                  const Icon = category === '全部技能' ? Zap : getCategoryIcon(category);
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(categoryId)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === categoryId
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        <span>{category}</span>
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSkills.map((skill, index) => {
                const Icon = skill.icon;
                return (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{skill.name}</h3>
                          <p className="text-xs text-gray-500">{skill.agent}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        skill.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {skill.status === 'active' ? '已启用' : '测试版'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {skill.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          {skill.rating}
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {skill.usage}次使用
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSkillForExec(skill);
                          setShowExecuteModal(true);
                        }}
                        disabled={executingSkill === skill.id}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                      >
                        {executingSkill === skill.id ? '执行中...' : '执行'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredSkills.length === 0 && (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">暂无符合条件的技能</p>
              </div>
            )}
          </div>
        </div>

        {/* Execute Modal */}
        {showExecuteModal && selectedSkillForExec && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg w-full mx-4"
            >
              <h3 className="text-lg font-semibold mb-4">
                执行技能: {selectedSkillForExec.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {selectedSkillForExec.description}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  参数 (JSON格式，可选)
                </label>
                <textarea
                  value={skillParams}
                  onChange={(e) => setSkillParams(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                  rows={4}
                />
              </div>
              
              {executionResult && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  executionResult.error 
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                    : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  <p className="font-medium">{executionResult.error ? '执行失败' : '执行成功'}</p>
                  <pre className="mt-2 text-xs overflow-auto max-h-32">
                    {JSON.stringify(executionResult.result, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowExecuteModal(false);
                    setExecutionResult(null);
                    setSkillParams('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleExecuteSkill(selectedSkillForExec, skillParams)}
                  disabled={executingSkill === selectedSkillForExec.id}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50"
                >
                  {executingSkill === selectedSkillForExec.id ? '执行中...' : '执行'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillCenter;
