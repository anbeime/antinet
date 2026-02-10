import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, BrainCircuit, FileText, Presentation, BarChart3, Database, Image, Code, Settings, Shield, Eye, Users, Target, CheckCircle, Star } from 'lucide-react';

// 图标映射函数（放在组件外部避免依赖问题）
const getCategoryIcon = (category: string): React.ComponentType<{className?: string}> => {
  const iconMap: Record<string, React.ComponentType<{className?: string}>> = {
    'analysis': BrainCircuit,
    'document': FileText,
    'visualization': BarChart3,
    'knowledge': Database,
    'security': Shield,
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
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [apiSkills, setApiSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingSkill, setExecutingSkill] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{skill: string; result: any; error?: string} | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedSkillForExec, setSelectedSkillForExec] = useState<Skill | null>(null);
  const [skillParams, setSkillParams] = useState('');

  // 防止 TS6133 警告 - 确保状态被使用
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('SkillCenter states initialized:', { apiSkillsCount: apiSkills.length, isLoading });
    }
  }, [apiSkills, isLoading]);

  // 执行技能
  const handleExecuteSkill = async (skill: Skill, params: string) => {
    setExecutingSkill(skill.id);
    try {
      // 使用技能名称作为skill_name（后端使用name作为标识）
      const skillName = skill.name;
      const response = await fetch('http://localhost:8000/api/skill/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillName,
          params: params ? JSON.parse(params) : {}
        })
      });

      const data = await response.json();
      if (response.ok) {
        setExecutionResult({ skill: skill.name, result: data.result });
      } else {
        setExecutionResult({ skill: skill.name, result: null, error: data.detail || '执行失败' });
      }
    } catch (error) {
      setExecutionResult({ skill: skill.name, result: null, error: String(error) });
    } finally {
      setExecutingSkill(null);
    }
  };

  // 从后端加载技能列表
  useEffect(() => {
    const loadSkills = async () => {
      try {
        setIsLoading(true);
        // 修复API端点路径
        const response = await fetch('http://localhost:8000/api/skill/list');
        if (response.ok) {
          const data = await response.json();
          setApiSkills(data.skills || []);
          console.log('从API加载技能:', data.skills?.length || 0);
        } else {
          console.error('API返回错误:', response.status);
        }
      } catch (error) {
        console.error('加载技能列表失败:', error);
        setApiSkills([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkills();
  }, []);

  const categories = [
    { id: 'all', name: '全部技能', icon: Zap },
    { id: 'analysis', name: '数据分析', icon: BarChart3 },
    { id: 'document', name: '文档处理', icon: FileText },
    { id: 'visualization', name: '可视化', icon: Presentation },
    { id: 'knowledge', name: '知识管理', icon: Database },
    { id: 'security', name: '安全防护', icon: Shield }
  ];

  const agents = [
    { id: 'all', name: '全部Agent' },
    { id: 'taishige', name: '太史阁' },
    { id: 'jinjiyu', name: '锦衣卫' },
    { id: 'tongzhengsi', name: '通政司' },
    { id: 'jianchayuan', name: '监察院' },
    { id: 'mi-juanfang', name: '密卷房' },
    { id: 'chengxiang-fu', name: '丞相府' }
  ];

  // 使用API返回的真实技能数据，如果没有数据则显示空状态
  const displaySkills: Skill[] = apiSkills.length > 0 ? apiSkills.map((skill: any) => ({
    id: skill.skill_id || skill.id || skill.name,
    name: skill.name || skill.skill_name,
    description: skill.description || '暂无描述',
    category: skill.category || 'analysis',
    agent: skill.agent_name || skill.agent || '未分配',
    icon: getCategoryIcon(skill.category || 'default'),
    status: skill.enabled ? 'active' : 'beta',
    usage: skill.usage_count || 0,
    rating: 4.5 // 默认评分
  })) : [];

  const filteredSkills = displaySkills.filter(skill => {
    const matchCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    const matchAgent = selectedAgent === 'all' || 
      agents.find(a => a.id === selectedAgent)?.name === skill.agent;
    return matchCategory && matchAgent;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      beta: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      development: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                技能中心
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                28项AI技能的集中管理与智能调度
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Filters */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-violet-500" />
                技能分类
              </h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors ${selectedCategory === category.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                  >
                    <category.icon className="w-5 h-5" />
                    <span className="font-medium">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-violet-500" />
                所属Agent
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${selectedAgent === agent.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-violet-500" />
                技能统计
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">总技能数</span>
                  <span className="font-bold">{displaySkills.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">已激活</span>
                  <span className="font-bold text-green-600">{displaySkills.filter((s: Skill) => s.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">测试中</span>
                  <span className="font-bold text-yellow-600">{displaySkills.filter((s: Skill) => s.status === 'beta').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">开发中</span>
                  <span className="font-bold text-gray-600">{displaySkills.filter((s: Skill) => s.status === 'development').length}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Skills Grid */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-9"
          >
            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSkills.map((skill, index) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className={`p-6 bg-gradient-to-br ${skill.status === 'active' ? 'from-violet-500 to-purple-600' : skill.status === 'beta' ? 'from-yellow-500 to-orange-600' : 'from-gray-500 to-gray-600'} text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                        <skill.icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(skill.status)} text-gray-800`}>
                        {skill.status === 'active' ? '已激活' : skill.status === 'beta' ? '测试中' : '开发中'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-1">{skill.name}</h3>
                    <p className="text-sm opacity-90 mb-2">{skill.agent}</p>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                      {skill.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span>{skill.usage} 次使用</span>
                      </div>
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-4 h-4 mr-1 fill-current" />
                        <span>{skill.rating}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSkillForExec(skill);
                          setShowExecuteModal(true);
                          setSkillParams('');
                          setExecutionResult(null);
                        }}
                        disabled={executingSkill === skill.id}
                        className="flex-1 bg-violet-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-violet-600 transition-colors disabled:opacity-50"
                      >
                        {executingSkill === skill.id ? '执行中...' : '执行技能'}
                      </button>
                      <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {filteredSkills.length === 0 && (
              <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <Zap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">未找到匹配的技能</h3>
                  <p className="text-gray-500 dark:text-gray-400">请尝试调整筛选条件</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Execute Skill Modal */}
      {showExecuteModal && selectedSkillForExec && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold">执行技能: {selectedSkillForExec.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{selectedSkillForExec.description}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  参数 (JSON格式, 可选)
                </label>
                <textarea
                  value={skillParams}
                  onChange={(e) => setSkillParams(e.target.value)}
                  placeholder='{"text": "示例文本"}'
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">留空则使用默认参数执行</p>
              </div>

              {executionResult && (
                <div className={`p-4 rounded-lg ${executionResult.error ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' : 'bg-green-50 dark:bg-green-900/20 border border-green-200'}`}>
                  <h4 className="font-medium mb-2">{executionResult.error ? '执行失败' : '执行成功'}</h4>
                  <pre className="text-xs overflow-auto max-h-40 bg-white dark:bg-gray-900 p-2 rounded">
                    {executionResult.error || JSON.stringify(executionResult.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowExecuteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                关闭
              </button>
              <button
                onClick={() => handleExecuteSkill(selectedSkillForExec, skillParams)}
                disabled={executingSkill === selectedSkillForExec.id}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50"
              >
                {executingSkill === selectedSkillForExec.id ? '执行中...' : '执行'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SkillCenter;