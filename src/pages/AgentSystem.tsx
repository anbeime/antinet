import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, History, Shield, MessageSquare, Eye, Database, Crown, Target, CheckCircle, Activity } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  icon: any;
  color: string;
}

const AgentSystem: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('taishige');

  const agents: Agent[] = [
    {
      id: 'taishige',
      name: '太史阁',
      role: '历史记录与反思官',
      description: '负责记录所有操作、决策和结果，构建组织的集体记忆与经验库。',
      capabilities: ['操作日志记录', '决策轨迹追踪', '经验知识沉淀', '历史数据分析'],
      icon: History,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'jinjiyu',
      name: '锦衣卫',
      role: '安全与情报收集官',
      description: '监控系统安全状态，识别潜在威胁和风险，收集内外部情报。',
      capabilities: ['安全监控', '威胁检测', '风险评估', '情报收集', '异常预警'],
      icon: Shield,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'tongzhengsi',
      name: '通政司',
      role: '信息与通讯中枢',
      description: '管理所有信息流，确保内外部通讯畅通，促进跨部门协作。',
      capabilities: ['信息路由', '通讯协调', '文档流转', '会议管理', '知识分发'],
      icon: MessageSquare,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'jianchayuan',
      name: '监察院',
      role: '监督与审计官',
      description: '监督各项操作和流程的执行情况，进行合规性审计。',
      capabilities: ['流程监督', '合规审计', '绩效评估', '质量控制', '改进建议'],
      icon: Eye,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'mijuanfang',
      name: '密卷房',
      role: '知识库与档案管理员',
      description: '专门负责非结构化知识的整理、归档、索引和检索。',
      capabilities: ['文档解析', '知识提取', '索引构建', '语义检索', '知识图谱维护'],
      icon: Database,
      color: 'from-indigo-500 to-indigo-600'
    },
     {
       id: 'chengxiangfu',
       name: '丞相府',
       role: '战略规划与决策官',
       description: '制定战略规划，提供高层决策建议，协调各方资源',
       capabilities: ['战略规划', '决策建议', '资源协调'],
       icon: Crown,
       color: 'from-yellow-500 to-yellow-600'
     },
     {
       id: 'junjichu',
       name: '军机处',
       role: '执行与协调官',
       description: '负责任务执行、跨部门协调和进度跟踪',
       capabilities: ['任务执行', '跨部门协调', '进度跟踪'],
       icon: Target,
       color: 'from-orange-500 to-orange-600'
     },
     {
       id: 'zhihuishi',
       name: '指挥使',
       role: '总指挥与裁决官',
       description: '统筹全局，做出最终裁决，确保各方协同高效运转',
       capabilities: ['综合决策', '最终裁决', '协同管理'],
       icon: Users,
       color: 'from-teal-500 to-teal-600'
     }
  ];

  const selectedAgentData = agents.find(a => a.id === selectedAgent)!;
  const Icon = selectedAgentData.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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

          {/* 系统状态概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">系统状态</span>
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">运行中</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">智能体数量</span>
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold mt-2">8</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">活跃任务</span>
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">0</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">空闲智能体</span>
                <CheckCircle className="w-5 h-5 text-teal-500" />
              </div>
              <p className="text-2xl font-bold mt-2">8</p>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：Agent列表 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold mb-4">智能体列表</h2>
            {agents.map((agent) => {
              const AgentIcon = agent.icon;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAgent === agent.id
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                      <AgentIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧：Agent详情 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* 头部 */}
              <div className={`bg-gradient-to-r ${selectedAgentData.color} p-6 text-white`}>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedAgentData.name}</h2>
                    <p className="text-white/80">{selectedAgentData.role}</p>
                  </div>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">职责描述</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedAgentData.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">核心能力</h3>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSystem;
