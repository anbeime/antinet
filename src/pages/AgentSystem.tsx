import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Brain, Eye, Shield, Target, MessageSquare, BarChart3, Crown, Zap, Network, ArrowRight, CheckCircle, History, Database, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/api'; // 导入API配置

// API端点
const API_ENDPOINTS = {
  agentStatus: `${API_BASE_URL}/api/agent/status`,
}; // 添加导入语句的结束分号

// 定义后端Agent状态类型
interface BackendAgentStatus {
  status: string;
  name?: string;
  title?: string;
  avatar?: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  icon: React.ComponentType<{className?: string}>;
  color: string;
  status: 'active' | 'standby' | 'executing' | 'error';
}

interface BackendAgentStatus {
  status: string;
  name?: string;
  title?: string;
  avatar?: string;
}

interface SystemStatus {
  system_initialized: boolean;
  agents: Record<string, BackendAgentStatus>;
  agent_count: number;
  active_tasks: number;
  timestamp: string;
}

const AgentSystem: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('taishige');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 前端硬编码的Agent定义（保持原有设计）
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

  // 从后端加载Agent状态
  const loadSystemStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.agentStatus);
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
        setLastUpdated(new Date());
        console.log('系统状态:', status);
      }
    } catch (error) {
      console.error('加载系统状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    // 每30秒刷新一次状态
    const interval = setInterval(loadSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 获取Agent的后端状态
  const getAgentBackendStatus = (agentId: string): string => {
    if (!systemStatus?.agents) return 'unknown';
    
    // 映射前端Agent ID到后端Agent ID
    const agentMapping: Record<string, string> = {
      'taishige': 'memory',
      'jinjiyu': 'risk_detector',
      'tongzhengsi': 'fact_generator',
      'jianchayuan': 'interpreter',
      'mi-juanfang': 'preprocessor',
      'chengxiang-fu': 'action_advisor',
      'junyiyuan': 'messenger',
      'zhichachao': 'orchestrator'
    };
    
    const backendId = agentMapping[agentId];
    if (backendId && systemStatus.agents[backendId]) {
      return systemStatus.agents[backendId].status;
    }
    return 'unknown';
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'executing':
        return { text: '执行中', color: 'bg-green-500', animate: true };
      case 'idle':
        return { text: '空闲', color: 'bg-blue-500', animate: false };
      case 'error':
        return { text: '错误', color: 'bg-red-500', animate: false };
      default:
        return { text: '未知', color: 'bg-gray-400', animate: false };
    }
  };

  const selectedAgentData = agents.find(a => a.id === selectedAgent)!;
  const Icon = selectedAgentData.icon;

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
            
            {/* 系统状态指示器 */}
            <div className="flex items-center space-x-4">
              {systemStatus && (
                <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className={`w-3 h-3 rounded-full ${systemStatus.system_initialized ? 'bg-green-500' : 'bg-red-500'} ${systemStatus.active_tasks > 0 ? 'animate-pulse' : ''}`} />
                  <span className="text-sm">
                    系统{systemStatus.system_initialized ? '运行中' : '未就绪'}
                    {systemStatus.active_tasks > 0 && ` (${systemStatus.active_tasks}个活跃任务)`}
                  </span>
                </div>
              )}
              
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  更新于: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              
              <button
                onClick={loadSystemStatus}
                disabled={isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                title="刷新状态"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 系统状态概览 */}
          {systemStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">系统状态</span>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold mt-2">
                  {systemStatus.system_initialized ? '运行中' : '未初始化'}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">智能体数量</span>
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{systemStatus.agent_count}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">活跃任务</span>
                  <Zap className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{systemStatus.active_tasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">空闲智能体</span>
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                </div>
                <p className="text-2xl font-bold mt-2">
                  {systemStatus.agent_count - systemStatus.active_tasks}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：Agent列表 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold mb-4">智能体列表</h2>
            {agents.map((agent, index) => {
              const backendStatus = getAgentBackendStatus(agent.id);
              const statusDisplay = getStatusDisplay(backendStatus);
              const Icon = agent.icon;
              
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAgent === agent.id
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{agent.name}</h3>
                        {systemStatus && (
                          <div className={`w-2 h-2 rounded-full ${statusDisplay.color} ${statusDisplay.animate ? 'animate-pulse' : ''}`} />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                  
                  {systemStatus && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        backendStatus === 'executing' 
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                          : backendStatus === 'idle'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {statusDisplay.text}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 右侧：Agent详情 */}
          <div className="lg:col-span-2">
            <motion.div
              key={selectedAgent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* 头部 */}
              <div className={`bg-gradient-to-r ${selectedAgentData.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedAgentData.name}</h2>
                      <p className="text-white/80">{selectedAgentData.role}</p>
                    </div>
                  </div>
                  
                  {systemStatus && (
                    <div className="text-right">
                      <div className="text-sm text-white/70">后端状态</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusDisplay(getAgentBackendStatus(selectedAgent)).color} ${getStatusDisplay(getAgentBackendStatus(selectedAgent)).animate ? 'animate-pulse' : ''}`} />
                        <span className="font-medium">{getStatusDisplay(getAgentBackendStatus(selectedAgent)).text}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-amber-500" />
                    职责描述
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedAgentData.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-amber-500" />
                    核心能力
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgentData.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 后端映射信息 */}
                {systemStatus && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Network className="w-5 h-5 mr-2 text-amber-500" />
                      后端映射
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        前端 <strong>{selectedAgentData.name}</strong> 对应后端 Agent: 
                        <code className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                          {(() => {
                            const mapping: Record<string, string> = {
                              'taishige': 'memory',
                              'jinjiyu': 'risk_detector',
                              'tongzhengsi': 'fact_generator',
                              'jianchayuan': 'interpreter',
                              'mi-juanfang': 'preprocessor',
                              'chengxiang-fu': 'action_advisor',
                              'junyiyuan': 'messenger',
                              'zhichachao': 'orchestrator'
                            };
                            return mapping[selectedAgent] || 'unknown';
                          })()}
                        </code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 系统架构说明 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Network className="w-6 h-6 mr-2 text-amber-500" />
                系统架构
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">协作流程</h3>
                  <ol className="space-y-2 text-gray-600 dark:text-gray-300 list-decimal list-inside">
                    <li>指挥使接收任务并分解</li>
                    <li>各Agent并行执行子任务</li>
                    <li>通政司协调信息流转</li>
                    <li>监察院监督执行质量</li>
                    <li>太史阁记录完整过程</li>
                    <li>指挥使聚合最终结果</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">核心特性</h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      分布式任务处理
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      实时状态监控
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      智能任务调度
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      完整审计追踪
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSystem;
