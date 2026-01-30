import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Brain, Eye, Shield, Target, MessageSquare, BarChart3, Crown, Zap, Network, ArrowRight, CheckCircle, History, Database } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  icon: React.ComponentType<{className?: string}>;
  color: string;
  status: 'active' | 'standby';
}

const AgentSystem: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('taishige');
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 从后端加载Agent状态
  useEffect(() => {
    const loadAgentStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:8001/api/agent/status');
        if (response.ok) {
          const status = await response.json();
          setAgentStatus(status);
          console.log('Agent状态:', status);
        }
      } catch (error) {
        console.error('加载Agent状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgentStatus();
    // 每30秒刷新一次状态
    const interval = setInterval(loadAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const agents: Agent[] = [
    {
      id: 'taishige',
      name: '太史阁',
      role: '历史记录与反思官',
      description: '负责记录所有操作、决策和结果，构建组织的集体记忆与经验库，确保知识传承和连续性。',
      capabilities: ['操作日志记录', '决策轨迹追踪', '经验知识沉淀', '历史数据分析', '模式识别'],
      icon: History,
      color: 'from-blue-500 to-blue-600',
      status: 'active'
    },
    {
      id: 'jinjiyu',
      name: '锦衣卫',
      role: '安全与情报收集官',
      description: '监控系统安全状态，识别潜在威胁和风险，收集内外部情报，保障系统稳定运行。',
      capabilities: ['安全监控', '威胁检测', '风险评估', '情报收集', '异常预警'],
      icon: Shield,
      color: 'from-red-500 to-red-600',
      status: 'active'
    },
    {
      id: 'tongzhengsi',
      name: '通政司',
      role: '信息与通讯中枢',
      description: '管理所有信息流，确保内外部通讯畅通，促进跨部门协作与知识共享。',
      capabilities: ['信息路由', '通讯协调', '文档流转', '会议管理', '知识分发'],
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      status: 'active'
    },
    {
      id: 'jianchayuan',
      name: '监察院',
      role: '监督与审计官',
      description: '监督各项操作和流程的执行情况，进行合规性审计，确保质量和效率标准。',
      capabilities: ['流程监督', '合规审计', '绩效评估', '质量控制', '改进建议'],
      icon: Eye,
      color: 'from-purple-500 to-purple-600',
      status: 'active'
    },
    {
      id: 'mi-juanfang',
      name: '密卷房',
      role: '知识库与档案管理员',
      description: '专门负责非结构化知识的整理、归档、索引和检索，构建和维护知识图谱。',
      capabilities: ['文档解析', '知识提取', '索引构建', '语义检索', '知识图谱维护'],
      icon: Database,
      color: 'from-indigo-500 to-indigo-600',
      status: 'active'
    },
    {
      id: 'chengxiang-fu',
      name: '丞相府',
      role: '战略规划与决策支持官',
      description: '基于全局数据进行战略分析，提供决策支持，协调各Agent的工作方向。',
      capabilities: ['战略分析', '决策建模', '资源配置', '趋势预测', '多目标优化'],
      icon: Crown,
      color: 'from-yellow-500 to-yellow-600',
      status: 'active'
    },
    {
      id: 'junyiyuan',
      name: '军机处',
      role: '任务执行与结果官',
      description: '执行具体任务，生成分析结果和四色卡片，确保任务高质量完成。',
      capabilities: ['任务执行', '结果生成', '质量控制', '进度报告', '异常处理'],
      icon: Target,
      color: 'from-orange-500 to-orange-600',
      status: 'active'
    },
    {
      id: 'zhichachao',
      name: '指挥使',
      role: '任务协调官',
      description: '协调锦衣卫总指挥使与各部门的工作，确保任务高效流转和沟通顺畅。',
      capabilities: ['任务协调', '流程优化', '沟通管理', '冲突解决', '效率提升'],
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      status: 'active'
    }
  ];

  const selectedAgentData = agents.find(a => a.id === selectedAgent)!;

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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                8-Agent 智能协作系统
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                基于古代朝廷组织架构的现代AI智能体协作体系
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Agent List */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Network className="w-5 h-5 mr-2 text-amber-500" />
                Agent 团队
              </h3>
              <div className="space-y-3">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedAgent === agent.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0`}>
                        <agent.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{agent.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{agent.role}</p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-500" />
                系统状态
              </h3>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-gray-500 py-4">加载中...</div>
                ) : agentStatus ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">系统状态</span>
                      <span className={`font-bold ${agentStatus.status === 'running' ? 'text-green-600' : 'text-amber-600'}`}>
                        {agentStatus.status === 'running' ? '运行中' : agentStatus.status || '未知'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">活跃Agent</span>
                      <span className="font-bold text-green-600">{agents.filter(a => a.status === 'active').length}/8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">NPU加速</span>
                      <span className="font-bold text-blue-600">
                        {agentStatus.npu_enabled !== undefined ? (agentStatus.npu_enabled ? '已启用' : '已禁用') : '已启用'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">任务队列</span>
                      <span className="font-bold text-purple-600">{agentStatus.queue_size || 0}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-red-500 py-4">无法加载状态</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Agent Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Agent Header */}
              <div className={`p-8 bg-gradient-to-br ${selectedAgentData.color} text-white`}>
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center">
                    <selectedAgentData.icon className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{selectedAgentData.name}</h2>
                    <p className="text-xl opacity-90">{selectedAgentData.role}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className={`w-3 h-3 rounded-full ${selectedAgentData.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <span className="text-sm opacity-90">{selectedAgentData.status === 'active' ? '运行中' : '待机'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Description */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Brain className="w-5 h-5 mr-2 text-amber-500" />
                      职能描述
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {selectedAgentData.description}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Target className="w-5 h-5 mr-2 text-amber-500" />
                      核心能力
                    </h3>
                    <div className="space-y-2">
                      {selectedAgentData.capabilities.map((capability, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{capability}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Collaboration Flow */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Network className="w-5 h-5 mr-2 text-amber-500" />
                    协作流程
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between text-sm">
                      {agents.slice(0, 4).map((agent, index) => (
                        <React.Fragment key={agent.id}>
                          <div className="text-center">
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center mx-auto mb-2`}>
                              <agent.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{agent.role}</p>
                          </div>
                          {index < 3 && <ArrowRight className="w-6 h-6 text-gray-400" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-amber-500" />
                性能表现
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">98.5%</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">任务完成率</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">1.2s</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">平均响应</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">156</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">今日处理</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">NPU</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">加速模式</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AgentSystem;