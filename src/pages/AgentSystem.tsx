import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Brain, Eye, Shield, Target, MessageSquare, Settings, BarChart3, Crown, Zap, Network, ArrowRight, CheckCircle, History, Database, Loader, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'standby' | 'offline';
}

interface AgentStatus {
  system_initialized: boolean;
  agents: Record<string, string>;
  agent_count: number;
  active_tasks: number;
  timestamp: string;
}

const API_BASE = 'http://localhost:8000';

const AgentSystem: React.FC = () => {
  const { theme } = useTheme();
  const [selectedAgent, setSelectedAgent] = useState<string>('taishige');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 从后端加载Agent状态
  useEffect(() => {
    loadAgentStatus();

    // 每30秒刷新一次状态
    intervalRef.current = setInterval(loadAgentStatus, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const loadAgentStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/agent/status`);
      if (response.ok) {
        const status: AgentStatus = await response.json();
        setAgentStatus(status);
        console.log('Agent状态:', status);
      } else {
        console.error('加载Agent状态失败');
        toast.error('无法连接到Agent系统');
      }
    } catch (error) {
      console.error('加载Agent状态异常:', error);
      toast.error('连接Agent系统失败');
    } finally {
      setIsLoading(false);
    }
  };

  const agents: Agent[] = [
    {
      id: 'taishige',
      name: '太史阁',
      role: '历史记录与反思官',
      description: '负责记录所有操作、决策和结果，构建组织的集体记忆与经验库，确保知识传承和连续性。',
      capabilities: ['操作日志记录', '决策轨迹追踪', '经验知识沉淀', '历史数据分析', '模式识别'],
      icon: History,
      color: 'from-blue-500 to-blue-600',
      status: 'standby'
    },
    {
      id: 'jinjiyu',
      name: '锦衣卫',
      role: '安全与情报收集官',
      description: '监控系统安全状态，识别潜在威胁和风险，收集内外部情报，保障系统稳定运行。',
      capabilities: ['安全监控', '威胁检测', '风险评估', '情报收集', '异常预警'],
      icon: Shield,
      color: 'from-red-500 to-red-600',
      status: 'standby'
    },
    {
      id: 'tongzhengsi',
      name: '通政司',
      role: '信息与通讯中枢',
      description: '管理所有信息流，确保内外部通讯畅通，促进跨部门协作与知识共享。',
      capabilities: ['信息路由', '通讯协调', '文档流转', '会议管理', '知识分发'],
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      status: 'standby'
    },
    {
      id: 'jianchayuan',
      name: '监察院',
      role: '监督与审计官',
      description: '监督各项操作和流程的执行情况，进行合规性审计，确保质量和效率标准。',
      capabilities: ['流程监督', '合规审计', '绩效评估', '质量控制', '改进建议'],
      icon: Eye,
      color: 'from-purple-500 to-purple-600',
      status: 'standby'
    },
    {
      id: 'mi-juanfang',
      name: '密卷房',
      role: '知识库与档案管理员',
      description: '专门负责非结构化知识的整理、归档、索引和检索，构建和维护知识图谱。',
      capabilities: ['文档解析', '知识提取', '索引构建', '语义检索', '知识图谱维护'],
      icon: Database,
      color: 'from-indigo-500 to-indigo-600',
      status: 'standby'
    },
    {
      id: 'chengxiang-fu',
      name: '丞相府',
      role: '战略决策与调度中心',
      description: '负责制定整体战略，协调各部门工作，进行资源调度和任务分配。',
      capabilities: ['战略规划', '资源调度', '任务分配', '进度跟踪', '决策支持'],
      icon: Crown,
      color: 'from-yellow-500 to-yellow-600',
      status: 'standby'
    },
    {
      id: 'junyiyuan',
      name: '军机处',
      role: '任务执行与结果官',
      description: '执行具体任务，生成分析结果和四色卡片，确保任务高质量完成。',
      capabilities: ['任务执行', '结果生成', '质量控制', '进度报告', '异常处理'],
      icon: Target,
      color: 'from-orange-500 to-orange-600',
      status: 'standby'
    },
    {
      id: 'zhichachao',
      name: '指挥使',
      role: '任务协调官',
      description: '协调锦衣卫总指挥使与各部门的工作，确保任务高效流转和沟通顺畅。',
      capabilities: ['任务协调', '流程优化', '沟通管理', '冲突解决', '效率提升'],
      icon: Users,
      color: 'from-teal-500 to-teal-600',
      status: 'standby'
    }
  ];

  // 执行Agent分析
  const handleAgentExecute = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    try {
      setIsLoading(true);
      toast.info(`正在调用 ${agent.name} 进行分析...`);

      const response = await fetch(`${API_BASE}/api/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `请${agent.name}分析当前系统状态并提供建议`,
          priority: 'high'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${agent.name}分析完成`);
        console.log('Agent分析结果:', result);
      } else {
        toast.error('Agent分析失败');
      }
    } catch (error) {
      console.error('Agent执行失败:', error);
      toast.error('Agent执行失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取Agent状态显示
  const getAgentStatusDisplay = (agentId: string): string => {
    if (!agentStatus) return 'offline';
    const status = agentStatus.agents[agentId] || 'offline';
    return status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      standby: 'bg-yellow-500',
      offline: 'bg-gray-400',
      executing: 'bg-blue-500'
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      active: '运行中',
      standby: '待命',
      offline: '离线',
      executing: '执行中'
    };
    return texts[status] || 'offline';
  };

  // 性能数据
  const performanceData = {
    taskQueue: 12,
    avgResponseTime: '340ms',
    successRate: '98.5%',
    npuUsage: '67%',
    throughput: '15.3 req/s'
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  8-Agent智能体系统
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  协同Agent完成复杂数据分析任务
                </p>
              </div>
            </div>
            <button
              onClick={loadAgentStatus}
              className="flex items-center space-x-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Zap className="w-4 h-4" />
              刷新状态
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Agent List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            <div className="space-y-4">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedAgent === agent.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-lg'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {/* Agent Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg ${getStatusColor(getAgentStatusDisplay(agent.id))} flex items-center justify-center`}>
                        <agent.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{agent.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{agent.role}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${getStatusColor(getAgentStatusDisplay(agent.id))} text-white`}>
                      {getStatusText(getAgentStatusDisplay(agent.id))}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {agent.description}
                  </p>

                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((capability, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgentExecute(agent.id);
                    }}
                    disabled={isLoading}
                    className="w-full mt-3 flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>{isLoading ? '执行中...' : '执行分析'}</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Panel - System Status & Performance */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* System Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                系统概览
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : agentStatus ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">系统状态</span>
                    <span className={`px-3 py-1 text-sm rounded-full ${agentStatus.system_initialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {agentStatus.system_initialized ? '已初始化' : '未初始化'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Agent数量</span>
                    <span className="font-bold text-indigo-600">{agentStatus.agent_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">活跃任务</span>
                    <span className="font-bold text-indigo-600">{agentStatus.active_tasks}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                    最后更新: {new Date(agentStatus.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  无法获取系统状态
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-indigo-500" />
                性能指标
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">任务队列</span>
                  <span className="font-bold text-indigo-600">{performanceData.taskQueue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">平均响应</span>
                  <span className="font-bold text-green-600">{performanceData.avgResponseTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">成功率</span>
                  <span className="font-bold text-green-600">{performanceData.successRate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">NPU使用率</span>
                  <span className="font-bold text-indigo-600">{performanceData.npuUsage}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">吞吐量</span>
                  <span className="font-bold text-indigo-600">{performanceData.throughput}</span>
                </div>
              </div>
            </div>

            {/* Selected Agent Detail */}
            {selectedAgent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-indigo-500" />
                  Agent详情
                </h3>
                {(() => {
                  const agent = agents.find(a => a.id === selectedAgent);
                  if (!agent) return null;
                  return (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{agent.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{agent.description}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">职责范围</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {agent.description}
                        </p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">核心能力</h5>
                        <div className="space-y-1">
                          {agent.capabilities.map((capability, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-xs">
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="text-gray-600 dark:text-gray-400">{capability}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAgentExecute(agent.id)}
                        disabled={isLoading}
                        className="w-full mt-4 flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>{isLoading ? '执行中...' : '启动Agent'}</span>
                      </button>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AgentSystem;
