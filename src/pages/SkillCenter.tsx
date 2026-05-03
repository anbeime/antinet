import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, BrainCircuit, FileText, BarChart3, Database, Code, Settings, Shield, Eye, Target, Star, Users, History, MessageSquare, Crown } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiConfig';

// Agent元数据
const agentMeta: Record<string, { name: string; role: string; icon: any; color: string }> = {
  '太史阁': { name: '太史阁', role: '历史记录与反思官', icon: History, color: 'from-blue-500 to-blue-600' },
  '锦衣卫': { name: '锦衣卫', role: '安全与情报收集官', icon: Shield, color: 'from-red-500 to-red-600' },
  '通政司': { name: '通政司', role: '信息与通讯中枢', icon: MessageSquare, color: 'from-green-500 to-green-600' },
  '监察院': { name: '监察院', role: '监督与审计官', icon: Eye, color: 'from-purple-500 to-purple-600' },
  '密卷房': { name: '密卷房', role: '知识库与档案管理员', icon: Database, color: 'from-indigo-500 to-indigo-600' },
  '参谋司': { name: '参谋司', role: '行动建议官', icon: Target, color: 'from-orange-500 to-orange-600' },
  '驿传司': { name: '驿传司', role: '消息传递官', icon: MessageSquare, color: 'from-cyan-500 to-cyan-600' },
  '刑狱司': { name: '刑狱司', role: '风险检测官', icon: Shield, color: 'from-yellow-500 to-yellow-600' },
  '丞相府': { name: '丞相府', role: '战略规划与决策官', icon: Crown, color: 'from-amber-500 to-amber-600' },
};

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
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [apiSkills, setApiSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingSkill, setExecutingSkill] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{skill: string; result: any; error?: string} | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedSkillForExec, setSelectedSkillForExec] = useState<Skill | null>(null);
  const [skillParams, setSkillParams] = useState('');
  const [viewMode, setViewMode] = useState<'category' | 'agent'>('category');

  // 从API获取技能列表
  useEffect(() => {
    fetch(getApiBaseUrl() + '/api/skill/list')
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

  // 提取唯一分类
  const categories = ['全部技能', ...Array.from(new Set(displaySkills.map(s => s.category)))];

  // 提取唯一Agent
  const agents = Array.from(new Set(displaySkills.map(s => s.agent))).filter(Boolean);

  // 筛选技能
  const filteredSkills = displaySkills.filter(skill => {
    const categoryMatch = selectedCategory === 'all' || skill.category === selectedCategory;
    const agentMatch = !selectedAgent || skill.agent === selectedAgent;
    return categoryMatch && agentMatch;
  });

  // 按Agent分组统计
  const skillsByAgent = agents.reduce((acc, agent) => {
    acc[agent] = displaySkills.filter(s => s.agent === agent);
    return acc;
  }, {} as Record<string, Skill[]>);

  // 执行技能
  const handleExecuteSkill = async (skill: Skill, params?: string) => {
    setExecutingSkill(skill.id);
    try {
      const response = await fetch(getApiBaseUrl() + '/api/skill/execute', {
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
            {/* View Mode Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                视图模式
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => { setViewMode('category'); setSelectedAgent(null); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    viewMode === 'category'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  按分类
                </button>
                <button
                  onClick={() => { setViewMode('agent'); setSelectedCategory('all'); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    viewMode === 'agent'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  按Agent
                </button>
              </div>
            </div>

            {/* Categories */}
            {viewMode === 'category' ? (
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
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Agent团队
                </h3>
                <div className="space-y-2">
                  {agents.map((agent) => {
                    const meta = agentMeta[agent] || { name: agent, role: '', icon: Users, color: 'from-gray-500 to-gray-600' };
                    const AgentIcon = meta.icon;
                    const count = skillsByAgent[agent]?.length || 0;
                    return (
                      <button
                        key={agent}
                        onClick={() => setSelectedAgent(selectedAgent === agent ? null : agent)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedAgent === agent
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                          <AgentIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{agent}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{meta.role}</p>
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                          {/* Agent Badge with color */}
                          {(() => {
                            const meta = agentMeta[skill.agent] || { name: skill.agent, role: '', icon: Users, color: 'from-gray-500 to-gray-600' };
                            const AgentIcon = meta.icon;
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-gradient-to-r ${meta.color} text-white`}>
                                <AgentIcon className="w-3 h-3 mr-1" />
                                {skill.agent}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        skill.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {skill.status === 'active' ? '启用' : '测试版'}
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
