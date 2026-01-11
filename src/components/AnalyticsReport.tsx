import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart as LineChartIcon, 
  Network, 
  Map, 
  BarChart3,
  Calendar,
  TrendingUp,
  Book,
  Lightbulb,
  Clock,
  Users,
  ArrowUpRight,
  Brain,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// 模拟知识增长趋势数据
const knowledgeGrowthData = [
  { month: '1月', 卡片总数: 45, 蓝色卡片: 15, 绿色卡片: 10, 黄色卡片: 12, 红色卡片: 8 },
  { month: '2月', 卡片总数: 58, 蓝色卡片: 20, 绿色卡片: 12, 黄色卡片: 14, 红色卡片: 12 },
  { month: '3月', 卡片总数: 75, 蓝色卡片: 25, 绿色卡片: 18, 黄色卡片: 18, 红色卡片: 14 },
  { month: '4月', 卡片总数: 92, 蓝色卡片: 30, 绿色卡片: 22, 黄色卡片: 20, 红色卡片: 20 },
  { month: '5月', 卡片总数: 118, 蓝色卡片: 40, 绿色卡片: 28, 黄色卡片: 25, 红色卡片: 25 },
  { month: '6月', 卡片总数: 150, 蓝色卡片: 50, 绿色卡片: 35, 黄色卡片: 30, 红色卡片: 35 },
  { month: '7月', 卡片总数: 185, 蓝色卡片: 65, 绿色卡片: 40, 黄色卡片: 35, 红色卡片: 45 },
  { month: '8月', 卡片总数: 220, 蓝色卡片: 75, 绿色卡片: 50, 黄色卡片: 40, 红色卡片: 55 },
  { month: '9月', 卡片总数: 260, 蓝色卡片: 90, 绿色卡片: 60, 黄色卡片: 50, 红色卡片: 60 },
  { month: '10月', 卡片总数: 300, 蓝色卡片: 105, 绿色卡片: 70, 黄色卡片: 60, 红色卡片: 65 }
];

// 模拟关联网络数据
const networkData = [
  { subject: '产品设计', A: 80, fullMark: 100 },
  { subject: '技术开发', A: 90, fullMark: 100 },
  { subject: '市场营销', A: 70, fullMark: 100 },
  { subject: '用户研究', A: 75, fullMark: 100 },
  { subject: '数据分析', A: 85, fullMark: 100 },
  { subject: '项目管理', A: 95, fullMark: 100 }
];

// 模拟知识热度数据
const knowledgeHeatData = [
  { name: 'AI技术', 热度值: 90, 增长率: 25 },
  { name: '用户体验', 热度值: 85, 增长率: 18 },
  { name: '产品创新', 热度值: 80, 增长率: 22 },
  { name: '数据分析', 热度值: 75, 增长率: 15 },
  { name: '技术架构', 热度值: 70, 增长率: 10 },
  { name: '团队协作', 热度值: 65, 增长率: 12 },
  { name: '市场策略', 热度值: 60, 增长率: 8 }
];

// 模拟ROI数据
const roiData = [
  { name: '知识检索时间', 实施前: 100, 实施后: 45, 改进率: 55 },
  { name: '团队协作效率', 实施前: 100, 实施后: 140, 改进率: 40 },
  { name: '员工知识贡献', 实施前: 100, 实施后: 160, 改进率: 60 },
  { name: '项目知识复用', 实施前: 100, 实施后: 135, 改进率: 35 },
  { name: '创新想法产生', 实施前: 100, 实施后: 150, 改进率: 50 },
  { name: '决策质量', 实施前: 100, 实施后: 130, 改进率: 30 }
];

// 模拟关联强度数据
const connectionStrengthData = [
  { name: '强关联', value: 35, color: '#3b82f6' },
  { name: '中等关联', value: 45, color: '#22c55e' },
  { name: '弱关联', value: 20, color: '#eab308' }
];

// 模拟时间节省数据
const timeSavingData = [
  { name: '员工A', x: 20, y: 30, z: 40 },
  { name: '员工B', x: 40, y: 30, z: 30 },
  { name: '员工C', x: 30, y: 40, z: 60 },
  { name: '员工D', x: 40, y: 60, z: 80 },
  { name: '员工E', x: 60, y: 50, z: 70 },
  { name: '员工F', x: 50, y: 70, z: 90 },
  { name: '员工G', x: 70, y: 60, z: 80 },
];

const AnalyticsReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'growth' | 'network' | 'heatmap' | 'roi'>('growth');
  
  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  // 颜色配置
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 功能标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
        <button 
          onClick={() => setActiveTab('growth')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'growth' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <LineChartIcon size={18} className="mr-2" />
            <span>知识增长趋势</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('network')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'network' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Network size={18} className="mr-2" />
            <span>关联网络分析</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('heatmap')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'heatmap' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <Map size={18} className="mr-2" />
            <span>知识热度地图</span>
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('roi')}
          className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${
            activeTab === 'roi' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium' 
              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-750'
          }`}
        >
          <div className="flex items-center justify-center">
            <BarChart3 size={18} className="mr-2" />
            <span>ROI分析</span>
          </div>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 知识增长趋势 */}
        {activeTab === 'growth' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold mb-2">知识增长趋势</h2>
              <p className="text-gray-600 dark:text-gray-300">跟踪团队知识体系的发展和增长情况</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：关键指标 */}
              <motion.div variants={itemVariants} className="lg:col-span-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-400">总卡片数</p>
                        <p className="text-2xl font-bold mt-1">300</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Book size={20} />
                      </div>
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp size={14} className="text-green-500 mr-1" />
                      <span className="text-green-600 dark:text-green-400">+56% 较上月</span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-400">月增长</p>
                        <p className="text-2xl font-bold mt-1">40</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp size={14} className="text-green-500 mr-1" />
                      <span className="text-green-600 dark:text-green-400">+15% 较上月</span>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-purple-700 dark:text-purple-400">活跃领域</p>
                        <p className="text-2xl font-bold mt-1">8</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Network size={20} />
                      </div>
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp size={14} className="text-green-500 mr-1" />
                      <span className="text-green-600 dark:text-green-400">+2 本月新增</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-amber-700 dark:text-amber-400">关联数</p>
                        <p className="text-2xl font-bold mt-1">520</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Brain size={20} />
                      </div>
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp size={14} className="text-green-500 mr-1" />
                      <span className="text-green-600 dark:text-green-400">+45% 较上月</span>
                    </div>
                  </div>
                </div>
                
                <motion.div 
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold mb-3">增长预测</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>下月预计增长</span>
                        <span>15%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>季末目标完成度</span>
                        <span>85%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        根据当前增长趋势，预计下月总卡片数将达到345张，季末有望达到400张目标。
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* 右侧：图表 */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">知识卡片增长趋势</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
                        <option>最近10个月</option>
                        <option>最近6个月</option>
                        <option>最近3个月</option>
                      </select>
                      <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={knowledgeGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="卡片总数" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line type="monotone" dataKey="蓝色卡片" stroke="#3b82f6" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="绿色卡片" stroke="#22c55e" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="黄色卡片" stroke="#eab308" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="红色卡片" stroke="#ef4444" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">最快增长日</p>
                        <p className="font-medium">10月20日</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">最高贡献者</p>
                        <p className="font-medium">张明 (42张)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3">
                        <Lightbulb size={18} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">热门领域</p>
                        <p className="font-medium">AI应用 (85张)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 关联网络分析 */}
        {activeTab === 'network' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold mb-2">关联网络分析</h2>
              <p className="text-gray-600 dark:text-gray-300">可视化知识间的关联强度和网络结构</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：关联统计 */}
              <motion.div variants={itemVariants} className="lg:col-span-1 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">关联统计</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                          <Network size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">总关联数</p>
                          <p className="text-xl font-bold">520</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                          <TrendingUp size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">月增长关联</p>
                          <p className="text-xl font-bold">85</p>
                        </div>
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-sm">+20%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-3">
                          <Book size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">平均关联度</p>
                          <p className="text-xl font-bold">4.3</p>
                        </div>
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-sm">+0.5</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mr-3">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">活跃连接者</p>
                          <p className="text-xl font-bold">12</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">关联强度分布</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={connectionStrengthData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {connectionStrengthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">AI智能关联建议</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                    系统发现了5组潜在的高价值知识关联，建议进一步探索这些连接点。
                  </p>
                  <button className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Brain size={16} className="mr-2" />
                    <span>查看关联建议</span>
                  </button>
                </div>
              </motion.div>

              {/* 右侧：网络图表 */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">知识领域关联强度</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
                        <option>按领域查看</option>
                        <option>按项目查看</option>
                        <option>按团队查看</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={150} data={networkData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="关联强度"
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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">最强关联对</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2">
                              <Book size={12} />
                            </div>
                            <span className="text-sm">AI技术 & 产品设计</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400">
                            95%
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-2">
                              <Book size={12} />
                            </div>
                            <span className="text-sm">用户研究 & 数据分析</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400">
                            88%
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-800">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-2">
                              <Book size={12} />
                            </div>
                            <span className="text-sm">技术开发 & 项目管理</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400">
                            82%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">关联洞察</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          项目管理领域与其他所有领域都有较强关联，是团队知识网络的核心节点
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          市场营销与用户研究的关联较弱，建议加强这两个领域的知识交流
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          技术开发领域近期增长迅速，与AI技术的结合产生了许多新的知识连接
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* 知识热度地图 */}
        {activeTab === 'heatmap' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold mb-2">知识热度地图</h2>
              <p className="text-gray-600 dark:text-gray-300">识别团队中最活跃和重要的知识领域</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：热门领域 */}
              <motion.div variants={itemVariants} className="lg:col-span-1 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">热门知识领域</h3>
                  <div className="space-y-3">
                    {knowledgeHeatData.map((item, index) => (
                      <div key={index} className="p-3 bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-950/30 dark:to-red-950/30 rounded-lg border border-amber-100 dark:border-amber-800">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              item.热度值 > 80 ? 'bg-red-500' : 
                              item.热度值 > 70 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}></div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 dark:bg-gray-800">
                            热度: {item.热度值}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={`h-full rounded-full ${
                              item.热度值 > 80 ? 'bg-red-500' : 
                              item.热度值 > 70 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.热度值}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center mt-1">
                          <ArrowUpRight size={12} className="text-green-500 mr-1" />
                          <span className="text-xs text-green-600 dark:text-green-400">增长率: {item.增长率}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">热度指标</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 rounded-xl p-4 border border-red-100 dark:border-red-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300">最高热度</p>
                      <p className="text-2xl font-bold mt-1">90</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI技术</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300">平均热度</p>
                      <p className="text-2xl font-bold mt-1">75</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">所有领域</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300">最快增长</p>
                      <p className="text-2xl font-bold mt-1">25%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI技术</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300">热度范围</p>
                      <p className="text-2xl font-bold mt-1">60-90</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">所有领域</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 右侧：热度图表 */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">知识领域热度分布</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
                        <option>按热度排序</option>
                        <option>按增长率排序</option>
                        <option>按卡片数量排序</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={knowledgeHeatData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="热度值" 
                          name="热度指数"
                          radius={[0, 4, 4, 0]}
                        >
                          {knowledgeHeatData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.热度值 > 80 ? '#ef4444' : entry.热度值 > 70 ? '#f97316' : '#eab308'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">热度变化趋势</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>AI技术</span>
                          <span>+25%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>用户体验</span>
                          <span>+18%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>产品创新</span>
                          <span>+22%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>数据分析</span>
                          <span>+15%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">热度洞察</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          AI技术领域热度持续攀升，已成为团队最活跃的知识领域
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          用户体验和产品创新领域热度较高且增长稳定，表明团队注重用户导向
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          市场策略领域热度相对较低，建议加强该领域的知识建设
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          技术架构和数据分析领域存在协同增长趋势，建议加强这两个领域的交叉合作
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ROI分析 */}
        {activeTab === 'roi' && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-bold mb-2">ROI分析</h2>
              <p className="text-gray-600 dark:text-gray-300">评估知识管理系统对团队效率和创新的影响</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：关键ROI指标 */}
              <motion.div variants={itemVariants} className="lg:col-span-1 space-y-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                  <h3 className="font-semibold mb-4">总体ROI评估</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-blue-100">效率提升</p>
                      <p className="text-3xl font-bold mt-1">45%</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-blue-100">创新增长</p>
                      <p className="text-3xl font-bold mt-1">50%</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-blue-100">投资回报周期</p>
                      <p className="text-3xl font-bold mt-1">3.2个月</p>
                    </div>
                    
                    <div className="mt-6 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                      <p className="text-sm">
                        根据分析，系统实施后团队整体效率提升显著，预计6个月内可实现200%的投资回报。
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">时间节省分析</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">平均每周节省</p>
                          <p className="text-xl font-bold">12.5小时</p>
                        </div>
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-sm">+40%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">团队总节省</p>
                          <p className="text-xl font-bold">150小时/月</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 mt-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        系统实施后，团队成员查找和分享知识的时间显著减少，相当于每月增加了近4个全职工作日。
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">员工满意度</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: '非常满意', value: 65, color: '#22c55e' },
                            { name: '满意', value: 25, color: '#3b82f6' },
                            { name: '一般', value: 8, color: '#eab308' },
                            { name: '不满意', value: 2, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: '非常满意', value: 65, color: '#22c55e' },
                            { name: '满意', value: 25, color: '#3b82f6' },
                            { name: '一般', value: 8, color: '#eab308' },
                            { name: '不满意', value: 2, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              {/* 右侧：ROI图表 */}
              <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">关键指标改进情况</h3>
                    <div className="flex items-center space-x-2">
                      <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
                        <option>实施前后对比</option>
                        <option>月度趋势</option>
                        <option>季度趋势</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roiData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="实施前" fill="#94a3b8" name="实施前" />
                        <Bar dataKey="实施后" fill="#3b82f6" name="实施后" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">改进率排行</h3>
                    <div className="space-y-3">
                      {roiData.sort((a, b) => b.改进率 - a.改进率).map((item, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{item.name}</span>
                              <span className="text-green-600 dark:text-green-400">+{item.改进率}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.改进率}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-750 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">ROI洞察</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0">
                          <TrendingUp size={12} />
                        </div>
                        <p className="text-sm">
                          知识检索时间减少了55%，显著提高了团队工作效率
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0">
                          <TrendingUp size={12} />
                        </div>
                        <p className="text-sm">
                          员工知识贡献度增加了60%，团队知识共享文化明显改善
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0">
                          <TrendingUp size={12} />
                        </div>
                        <p className="text-sm">
                          创新想法产生频率增加了50%，促进了团队创新能力的提升
                        </p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0">
                          <Lightbulb size={12} />
                        </div>
                        <p className="text-sm">
                          建议进一步加强系统推广和培训，提高全员使用率，以获得更大的ROI
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">员工时间节省分布</h4>
                      <div className="h-[100px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" dataKey="x" name="卡片创建" unit="%" />
                            <YAxis type="number" dataKey="y" name="知识检索" unit="%" />
                            <ZAxis type="number" dataKey="z" range={[60, 400]} name="时间节省" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="员工" data={timeSavingData} fill="#8884d8" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsReport;