import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Network, 
  FileCheck, 
  Lightbulb, 
  BarChart3, 
  ChevronRight, 
  Search, 
  Clock,
  UserPlus,
  RefreshCw,
  MessageSquare,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Award
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// 模拟团队成员数据
const teamMembers = [
  { id: 1, name: '张明', role: '产品经理', avatar: '👨‍💼', online: true, contributions: 42 },
  { id: 2, name: '李华', role: 'UI设计师', avatar: '🎨', online: true, contributions: 28 },
  { id: 3, name: '王强', role: '前端开发', avatar: '💻', online: false, contributions: 35 },
  { id: 4, name: '陈静', role: '后端开发', avatar: '🛠️', online: true, contributions: 40 },
  { id: 5, name: '赵伟', role: '数据分析师', avatar: '📊', online: false, contributions: 22 },
];

// 模拟知识整合数据
const knowledgeIntegrationData = [
  { name: '合并的重复内容', value: 15 },
  { name: '发现的互补内容', value: 28 },
  { name: '新增的关联关系', value: 42 },
];

// 模拟知识空白数据
const knowledgeGapsData = [
  { subject: '技术创新', A: 65, fullMark: 100 },
  { subject: '市场分析', A: 80, fullMark: 100 },
  { subject: '用户研究', A: 45, fullMark: 100 },
  { subject: '运营策略', A: 70, fullMark: 100 },
  { subject: '竞品分析', A: 55, fullMark: 100 },
];

// 模拟协作活跃度数据
const collaborationActivityData = [
  { name: '周一', 活跃成员: 8, 新增卡片: 12, 评论数: 45 },
  { name: '周二', 活跃成员: 10, 新增卡片: 15, 评论数: 52 },
  { name: '周三', 活跃成员: 7, 新增卡片: 9, 评论数: 38 },
  { name: '周四', 活跃成员: 9, 新增卡片: 14, 评论数: 48 },
  { name: '周五', 活跃成员: 6, 新增卡片: 8, 评论数: 30 },
  { name: '周六', 活跃成员: 3, 新增卡片: 3, 评论数: 12 },
  { name: '周日', 活跃成员: 2, 新增卡片: 1, 评论数: 5 },
];

// 模拟团队贡献数据
const teamContributionData = teamMembers.map(member => ({
  name: member.name,
  卡片数量: member.contributions,
  评论数量: Math.floor(member.contributions * 1.5)
}));

// 模拟实时活动数据
const realtimeActivities = [
  { id: 1, user: '李华', action: '创建了蓝色卡片', content: 'AI驱动的用户体验优化策略', time: '1分钟前' },
  { id: 2, user: '张明', action: '评论了', content: '这个策略很有见地，建议增加A/B测试的内容', time: '3分钟前' },
  { id: 3, user: '王强', action: '链接了两张卡片', content: '前端性能优化与用户留存率分析', time: '5分钟前' },
  { id: 4, user: '陈静', action: '编辑了', content: 'API设计规范文档', time: '10分钟前' },
  { id: 5, user: '系统', action: 'AI发现了新的关联', content: '用户研究数据与市场趋势分析', time: '15分钟前' },
];

const TeamCollaboration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integration' | 'realtime' | 'gaps' | 'reports'>('integration');
  const [progress, setProgress] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  // 模拟进度条动画
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        return newProgress > 100 ? 0 : newProgress;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 模拟活动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentActivityIndex(prev => (prev + 1) % realtimeActivities.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // 颜色配置
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 功能标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
        <button 
          onClick={() => setActiveTab('integration')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'integration' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Network size={18} className="mr-2" />
            <span>团队知识整合</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('realtime')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'realtime' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Clock size={18} className="mr-2" />
            <span>实时协作编辑</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('gaps')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'gaps' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Lightbulb size={18} className="mr-2" />
            <span>知识空白识别</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'reports' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <BarChart3 size={18} className="mr-2" />
            <span>协作分析报告</span>
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 团队知识整合 */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">团队知识整合</h2>
              <p className="text-gray-600 dark:text-gray-300">AI智能识别重复和互补内容，生成完整的团队知识图谱</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：整合状态和进度 */}
              <div className="lg:col-span-1 space-y-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800"
                >
                  <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">整合进度</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>AI分析重复内容</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>识别互补知识</span>
                        <span>{Math.min(progress + 20, 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress + 20, 100)}%` }}
                          className="h-full bg-green-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>建立知识关联</span>
                        <span>{Math.min(progress + 40, 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress + 40, 100)}%` }}
                          className="h-full bg-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <button className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <RefreshCw size={16} className="mr-2" />
                    <span>重新整合</span>
                  </button>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold mb-3">整合发现</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">发现了12个重复的核心概念卡片</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">识别出8组互补的知识体系</p>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle2 size={18} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">建立了25个新的知识关联</p>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">发现3个潜在的知识冲突点</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 右侧：团队成员和统计图表 */}
              <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold mb-3">团队成员 ({teamMembers.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full text-sm"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2">
                          {member.avatar}
                        </span>
                        <span className="mr-2">{member.name}</span>
                        <span className={`w-2 h-2 rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      </div>
                    ))}
                    <button className="flex items-center bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/30 px-3 py-1.5 rounded-full text-sm text-blue-600 dark:text-blue-400 transition-colors">
                      <UserPlus size={14} className="mr-2" />
                      <span>添加成员</span>
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[300px]"
                >
                  <h3 className="font-semibold mb-3">知识整合结果分布</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={knowledgeIntegrationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {knowledgeIntegrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {/* 实时协作编辑 */}
        {activeTab === 'realtime' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">实时协作编辑</h2>
              <p className="text-gray-600 dark:text-gray-300">多人同时编辑和评论，加速知识发展过程</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：实时活动流 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-1 bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col"
              >
                <h3 className="font-semibold mb-3 flex items-center">
                  <MessageSquare size={18} className="mr-2" />
                  实时活动
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {realtimeActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: currentActivityIndex === index ? 1 : 0.7, 
                        x: 0 
                      }}
                      transition={{ duration: 0.3 }}
                      className={`p-3 rounded-lg ${
                        currentActivityIndex === index 
                          ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800' 
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-xl mr-2">{teamMembers.find(m => m.name === activity.user)?.avatar || '👤'}</span>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{activity.user}</span> {activity.action}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{activity.content}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{activity.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* 右侧：协作编辑界面 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="lg:col-span-2 bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <FileCheck size={16} />
                    </div>
                    <h3 className="font-semibold">产品创新策略讨论</h3>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                      5人正在编辑
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Search size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Users size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-750 rounded-lg p-4 border border-gray-200 dark:border-gray-700 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute -left-3 top-2 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        我们需要制定一个新的产品创新策略，结合AI技术和用户体验研究的最新成果。
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">张明 · 10分钟前</span>
                        <button className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">回复</button>
                      </div>
                    </div>

                    <div className="relative pl-4 border-l border-gray-200 dark:border-gray-700">
                      <div className="absolute -left-3 top-2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        我认为可以从用户旅程地图入手，识别关键痛点和机会点，然后用AI技术来优化这些环节。
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">李华 · 8分钟前</span>
                        <button className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">回复</button>
                      </div>

                      <div className="relative mt-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                        <div className="absolute -left-3 top-2 w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          这个思路很好！我建议我们可以先做一个快速的用户调研，收集一些初步反馈。
                        </p>
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500">王强 · 5分钟前</span>
                          <button className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">回复</button>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-3 top-2 w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        我们还应该考虑技术可行性和资源限制，制定一个分阶段的实施计划。
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">陈静 · 3分钟前</span>
                        <button className="ml-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">回复</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-2 flex-shrink-0">
                    👤
                  </div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800 transition-colors">
                    <input 
                      type="text" 
                      placeholder="添加你的想法或评论..." 
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                  <button className="ml-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* 知识空白识别 */}
        {activeTab === 'gaps' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">知识空白识别</h2>
              <p className="text-gray-600 dark:text-gray-300">智能发现团队知识体系中的空白点和机会点</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：知识空白列表 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-1 space-y-4"
              >
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FileSearch size={18} className="mr-2" />
                    发现的知识空白
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800">
                      <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm">用户研究方法论</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">团队缺乏系统性的用户研究方法和工具</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">中等优先级</span>
                        <button className="text-xs text-amber-600 dark:text-amber-400 hover:underline">查看详情</button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800">
                      <h4 className="font-medium text-red-800 dark:text-red-300 text-sm">竞品分析数据</h4>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-1">缺乏最新的竞品产品功能和市场表现数据</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">高优先级</span>
                        <button className="text-xs text-red-600 dark:text-red-400 hover:underline">查看详情</button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm">技术发展趋势</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">对行业新技术发展趋势的了解不够全面</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">低优先级</span>
                        <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">查看详情</button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-800">
                      <h4 className="font-medium text-green-800 dark:text-green-300 text-sm">数据分析方法</h4>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">需要补充高级数据分析和可视化的方法</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">中等优先级</span>
                        <button className="text-xs text-green-600 dark:text-green-400 hover:underline">查看详情</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">知识机会点</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">AI技术与用户体验设计的交叉应用</p>
                    </div>
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">跨部门知识共享平台的建立</p>
                    </div>
                    <div className="flex items-start">
                      <Lightbulb size={18} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">建立持续学习和知识更新的机制</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 右侧：知识覆盖度雷达图 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="lg:col-span-2 bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">知识领域覆盖度分析</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={150} data={knowledgeGapsData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="知识覆盖度"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.5}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium mb-2">空白填补建议</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>组织用户研究方法论培训工作坊</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>建立定期竞品分析报告机制</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>订阅行业技术趋势分析报告</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium mb-2">预期效果</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>提高产品创新的准确性和成功率</span>
                      </li>
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>缩短从创意到实施的周期</span>
                      </li>
                      <li className="flex items-start">
                        <Award size={16} className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>增强团队的市场竞争力</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* 协作分析报告 */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2">协作分析报告</h2>
              <p className="text-gray-600 dark:text-gray-300">可视化团队知识贡献和协作模式分析</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 协作活跃度图表 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3 flex items-center">
                  <LineChartIcon size={18} className="mr-2" />
                  一周协作活跃度
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={collaborationActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="活跃成员" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="新增卡片" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="评论数" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* 团队贡献图表 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3 flex items-center">
                  <PieChartIcon size={18} className="mr-2" />
                  团队成员贡献分析
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamContributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="卡片数量" fill="#8884d8" />
                      <Bar dataKey="评论数量" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 协作模式分析 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">协作模式分析</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>同步协作</span>
                      <span>45%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>异步协作</span>
                      <span>55%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '55%' }}></div>
                    </div>
                  </div>
                  <div className="p-3 mt-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      团队倾向于异步协作模式，建议优化异步协作工具和流程，提高效率。
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 知识类型分布 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">知识类型分布</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>核心概念</span>
                        <span>35%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>关联链接</span>
                        <span>25%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>参考来源</span>
                        <span>20%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>索引关键词</span>
                        <span>20%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 协作效率指标 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
                className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold mb-3">协作效率指标</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm">平均响应时间</p>
                        <p className="text-xl font-bold">12分钟</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">-15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-sm">参与度</p>
                        <p className="text-xl font-bold">85%</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">+8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3">
                        <Network size={20} />
                      </div>
                      <div>
                        <p className="text-sm">知识关联度</p>
                        <p className="text-xl font-bold">68%</p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">+12%</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-800"
            >
              <h3 className="font-semibold mb-3">改进建议</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium">加强跨部门协作</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">建立跨部门知识共享机制，促进不同团队间的知识交流和创新。</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3 flex-shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium">优化会议效率</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">减少不必要的会议，改用更加高效的异步协作方式。</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0">
                    <Award size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium">建立激励机制</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">设立知识贡献奖励制度，鼓励团队成员积极分享知识。</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3 flex-shrink-0">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <h4 className="font-medium">定期知识回顾</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">建立每周/每月知识回顾机制，整理和优化现有知识体系。</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}


      </div>
    </div>
  );
};

export default TeamCollaboration;