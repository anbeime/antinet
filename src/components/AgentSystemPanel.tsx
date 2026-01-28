// src/components/AgentSystemPanel.tsx - 8-Agent系统面板
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, FileText, Lightbulb, AlertTriangle, Compass, BookOpen, Send, Loader } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000';

interface AgentStatus {
  orchestrator?: string;
  preprocessor?: string;
  fact_generator?: string;
  interpreter?: string;
  risk_detector?: string;
  action_advisor?: string;
  memory?: string;
  messenger?: string;
}

interface TaskHistory {
  task_id: string;
  query: string;
  status: string;
  execution_time: number;
  created_at: string;
}

const AgentSystemPanel: React.FC = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgentStatus();
    fetchHistory();
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/status`);
      const data = await response.json();
      setAgentStatus(data);
    } catch (error) {
      console.error('获取Agent状态失败:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/history`);
      const data = await response.json();
      setHistory(data.tasks || []);
    } catch (error) {
      console.error('获取历史任务失败:', error);
    }
  };

  const agents = [
    {
      name: '锦衣卫总指挥使',
      role: 'Orchestrator',
      description: '任务分解与调度',
      icon: <Target className="w-8 h-8" />,
      color: 'bg-blue-100 dark:bg-blue-900',
      status: agentStatus?.orchestrator || 'unknown'
    },
    {
      name: '密卷房',
      role: 'Preprocessor',
      description: '数据预处理',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-green-100 dark:bg-green-900',
      status: agentStatus?.preprocessor || 'unknown'
    },
    {
      name: '通政司',
      role: 'FactGenerator',
      description: '事实提取',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-purple-100 dark:bg-purple-900',
      status: agentStatus?.fact_generator || 'unknown'
    },
    {
      name: '监察院',
      role: 'Interpreter',
      description: '解释生成',
      icon: <Lightbulb className="w-8 h-8" />,
      color: 'bg-yellow-100 dark:bg-yellow-900',
      status: agentStatus?.interpreter || 'unknown'
    },
    {
      name: '刑狱司',
      role: 'RiskDetector',
      description: '风险识别',
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'bg-red-100 dark:bg-red-900',
      status: agentStatus?.risk_detector || 'unknown'
    },
    {
      name: '参谋司',
      role: 'ActionAdvisor',
      description: '行动建议',
      icon: <Compass className="w-8 h-8" />,
      color: 'bg-indigo-100 dark:bg-indigo-900',
      status: agentStatus?.action_advisor || 'unknown'
    },
    {
      name: '太史阁',
      role: 'Memory',
      description: '知识存储',
      icon: <BookOpen className="w-8 h-8" />,
      color: 'bg-pink-100 dark:bg-pink-900',
      status: agentStatus?.memory || 'unknown'
    },
    {
      name: '驿传司',
      role: 'Messenger',
      description: '结果整合',
      icon: <Send className="w-8 h-8" />,
      color: 'bg-teal-100 dark:bg-teal-900',
      status: agentStatus?.messenger || 'unknown'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">8-Agent智能体系统</h1>
        <p className="text-blue-100">
          基于古代官制设计的8个智能体协作系统，每个Agent负责特定任务，协同完成复杂的数据分析工作
        </p>
      </div>

      {/* Agent卡片网格 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Users className="w-6 h-6 mr-2" />
          智能体列表
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className={`${agent.color} rounded-lg p-4 border border-gray-200 dark:border-gray-700`}
            >
              <div className="flex items-center justify-between mb-2">
                {agent.icon}
                <div className={`text-xs px-2 py-1 rounded ${
                  agent.status === 'idle' ? 'bg-green-500 text-white' :
                  agent.status === 'running' ? 'bg-blue-500 text-white' :
                  'bg-gray-400 text-white'
                }`}>
                  {agent.status}
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{agent.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{agent.role}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{agent.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 协作流程 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">协作流程</h2>
        <div className="flex items-center justify-between overflow-x-auto">
          <div className="flex items-center space-x-4">
            <div className="text-center min-w-[100px]">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm font-medium">任务分解</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[100px]">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium">数据预处理</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[100px]">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lightbulb className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm font-medium">智能分析</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center min-w-[100px]">
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Send className="w-8 h-8 text-teal-600" />
              </div>
              <p className="text-sm font-medium">结果整合</p>
            </div>
          </div>
        </div>
      </div>

      {/* 历史任务 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">历史任务</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无历史任务
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((task, index) => (
              <div key={index} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{task.query}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      任务ID: {task.task_id}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {task.status}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>耗时: {task.execution_time}ms</span>
                  <span>{new Date(task.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSystemPanel;
