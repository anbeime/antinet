import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, BrainCircuit, FileText, Presentation, BarChart3, Database, Image, Code, Settings, Crown, Shield, Eye, MessageSquare, Users, Target, CheckCircle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');

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
    { id: 'chengxiang-fu', name: '丞相府' },
    { id: 'li-shu-mi-shu', name: '李书记' },
    { id: 'da-zhi-li-guan', name: '大治理官' }
  ];

  const skills: Skill[] = [
    { id: 'nlp-analysis', name: '自然语言分析', description: '基于NPU加速的文本理解和情感分析', category: 'analysis', agent: '太史阁', icon: BrainCircuit, status: 'active', usage: 1247, rating: 4.8 },
    { id: 'pdf-extract', name: 'PDF内容提取', description: '智能提取PDF文本、表格和图像内容', category: 'document', agent: '密卷房', icon: FileText, status: 'active', usage: 892, rating: 4.6 },
    { id: 'chart-generation', name: '智能图表生成', description: '根据数据自动生成各类可视化图表', category: 'visualization', agent: '丞相府', icon: BarChart3, status: 'active', usage: 634, rating: 4.7 },
    { id: 'ppt-creation', name: 'PPT自动生成', description: '基于内容智能生成演示文稿', category: 'document', agent: '通政司', icon: Presentation, status: 'beta', usage: 456, rating: 4.4 },
    { id: 'knowledge-graph', name: '知识图谱构建', description: '自动构建实体关系知识图谱', category: 'knowledge', agent: '密卷房', icon: Database, status: 'active', usage: 723, rating: 4.9 },
    { id: 'threat-detection', name: '威胁检测', description: '实时监控系统安全威胁', category: 'security', agent: '锦衣卫', icon: Shield, status: 'active', usage: 567, rating: 4.8 },
    { id: 'sentiment-analysis', name: '情感倾向分析', description: '分析文本情感和态度倾向', category: 'analysis', agent: '监察院', icon: Eye, status: 'active', usage: 445, rating: 4.5 },
    { id: 'auto-summary', name: '智能摘要生成', description: '自动生成文档摘要和要点提取', category: 'document', agent: '太史阁', icon: FileText, status: 'active', usage: 1034, rating: 4.7 },
    { id: 'data-cleaning', name: '数据清洗', description: '自动识别和清理数据异常', category: 'analysis', agent: '大治理官', icon: BarChart3, status: 'beta', usage: 389, rating: 4.3 },
    { id: 'image-recognition', name: '图像内容识别', description: '识别图像中的文字和对象', category: 'visualization', agent: '密卷房', icon: Image, status: 'active', usage: 298, rating: 4.6 },
    { id: 'code-analysis', name: '代码质量分析', description: '分析代码质量和安全漏洞', category: 'analysis', agent: '大治理官', icon: Code, status: 'development', usage: 156, rating: 4.2 },
    { id: 'workflow-automation', name: '工作流自动化', description: '自动化业务流程执行', category: 'knowledge', agent: '李书记', icon: Settings, status: 'beta', usage: 234, rating: 4.5 }
  ];

  const filteredSkills = skills.filter(skill => {
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
                  <span className="font-bold">{skills.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">已激活</span>
                  <span className="font-bold text-green-600">{skills.filter(s => s.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">测试中</span>
                  <span className="font-bold text-yellow-600">{skills.filter(s => s.status === 'beta').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">开发中</span>
                  <span className="font-bold text-gray-600">{skills.filter(s => s.status === 'development').length}</span>
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
                      <button className="flex-1 bg-violet-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-violet-600 transition-colors">
                        执行技能
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
    </div>
  );
};

// Missing imports
import Star from 'lucide-react/dist/esm/icons/star';

export default SkillCenter;