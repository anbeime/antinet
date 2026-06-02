// src/components/FiveStepSuccess.tsx
// 五步成事法 AI 智能体 - 基于瑞·达利欧《原则》中的五步成事法
// 帮助用户设定目标、识别障碍、诊断问题、规划方案、执行达成

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  AlertTriangle, 
  Search, 
  Lightbulb, 
  Rocket,
  Send,
  User,
  Bot,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { toast } from 'sonner';

// 五步定义
const FIVE_STEPS = [
  { 
    id: 'goal', 
    name: '设立目标', 
    icon: Target,
    color: 'blue',
    description: '定义具体、可衡量的目标',
    questions: [
      '您想要达成什么目标？',
      '这个目标符合SMART原则吗？（具体、可测量、可达成、相关性、时限性）',
      '您为什么想要实现这个目标？背后的动机是什么？'
    ]
  },
  { 
    id: 'obstacle', 
    name: '识别障碍', 
    icon: AlertTriangle,
    color: 'red',
    description: '识别可能妨碍目标达成的因素',
    questions: [
      '目前有什么因素阻碍您实现这个目标？',
      '这些障碍中，哪个是最关键的？',
      '您是否在回避某些问题？'
    ]
  },
  { 
    id: 'diagnosis', 
    name: '诊断问题', 
    icon: Search,
    color: 'yellow',
    description: '深入分析问题背后的原因',
    questions: [
      '这个问题的根本原因是什么？',
      '表象和本质有什么区别？',
      '真正的瓶颈在哪里？'
    ]
  },
  { 
    id: 'solution', 
    name: '规划方案', 
    icon: Lightbulb,
    color: 'purple',
    description: '构思并评估可行的解决方案',
    questions: [
      '您能想到哪些可能的解决方案？',
      '每个方案的优缺点是什么？',
      '您选择这个方案的理由是什么？'
    ]
  },
  { 
    id: 'execute', 
    name: '执行与调整', 
    icon: Rocket,
    color: 'green',
    description: '落实计划并根据情况调整',
    questions: [
      '您的第一步行动是什么？',
      '什么时候开始执行？',
      '如何定期检查进度？'
    ]
  }
];

// 五步成事法系统提示词
const SYSTEM_PROMPT = `你是"五步成事法"AI智能体，基于瑞·达利欧《原则》中的五步成事法。

## 你的角色
帮助职场人士通过五步流程达成目标：
1. 设立目标 - 引导用户定义具体、可衡量的目标
2. 识别障碍 - 帮助识别可能妨碍目标达成的因素
3. 诊断问题 - 深入分析问题背后的原因
4. 规划方案 - 支持构思并评估可行的解决方案
5. 执行与调整 - 激励采取行动并灵活调整

## 工作原则
- 激励用户保持目标导向
- 鼓励用户面对并解决阻碍目标的问题
- 提供结构化的流程支持
- 强调持续改进的重要性
- 善于倾听，提供有针对性的建议

## 沟通风格
- 专业、鼓励、启发式提问
- 每个回答都要推动用户向前一步
- 适时总结和确认用户的进展
- 当用户完成一步时，温和地引导进入下一步

## 技能
- 目标设定与评估能力
- 问题识别与解决技巧
- 批判性思维
- 沟通与指导
- 项目管理知识

开始与用户对话时，先介绍自己，然后询问用户想要达成什么目标。`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GoalSession {
  id: string;
  goal: string;
  currentStep: number;
  obstacles: string[];
  diagnosis: string;
  solutions: string[];
  plan: string;
  createdAt: Date;
}

const FiveStepSuccess: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showStepGuide, setShowStepGuide] = useState(true);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 目标会话状态追踪
  const [goalSession, setGoalSession] = useState<GoalSession>({
    id: `session-${Date.now()}`,
    goal: '',
    currentStep: 0,
    obstacles: [],
    diagnosis: '',
    solutions: [],
    plan: '',
    createdAt: new Date()
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化对话
  const initConversation = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🎯 **五步成事法 AI 智能体**

您好！我是基于瑞·达利欧《原则》开发的"五步成事法"AI助手。

**五步成事法**是一个系统化的方法论，帮助您：
- ✅ 设定明确、可实现的目标
- 🔍 识别并克服障碍
- 🔬 深入诊断问题根源
- 💡 规划有效的解决方案
- 🚀 执行计划并持续改进

无论您是想完成一个项目、解决一个问题，还是实现个人成长，我都可以帮助您用结构化的方式思考和行动。

**请告诉我，您现在想要达成什么目标？**`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    setCurrentStep(0);
  };

  useEffect(() => {
    initConversation();
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 构建消息历史
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      conversationHistory.push({ role: 'user', content: userMessage.content });

      const response = await fetch(`${getApiBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          system_prompt: SYSTEM_PROMPT,
          stream: false
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || data.content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 根据回复内容判断当前步骤
      updateCurrentStep(assistantMessage.content);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('发送消息失败，请重试');
      
      // 添加错误回复
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 根据AI回复更新当前步骤
  const updateCurrentStep = (content: string) => {
    const lowerContent = content.toLowerCase();
    
    // 简单的关键词检测来判断步骤
    if (lowerContent.includes('目标') || lowerContent.includes('goal')) {
      if (currentStep === 0) setCurrentStep(1); // 进入识别障碍
    }
    if (lowerContent.includes('障碍') || lowerContent.includes('问题') || lowerContent.includes('obstacle')) {
      if (currentStep <= 1) setCurrentStep(2); // 进入诊断问题
    }
    if (lowerContent.includes('诊断') || lowerContent.includes('原因') || lowerContent.includes('diagnosis')) {
      if (currentStep <= 2) setCurrentStep(3); // 进入规划方案
    }
    if (lowerContent.includes('方案') || lowerContent.includes('解决') || lowerContent.includes('solution')) {
      if (currentStep <= 3) setCurrentStep(4); // 进入执行
    }
  };

  // 手动跳转到指定步骤
  const goToStep = (step: number) => {
    setCurrentStep(step);
    setShowStepGuide(true);
    setGoalSession(prev => ({ ...prev, currentStep: step }));
    
    const stepInfo = FIVE_STEPS[step];
    const guidanceMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📍 **${stepInfo.name}**

${stepInfo.description}

${stepInfo.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

请分享您的想法，让我们开始这个步骤。`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, guidanceMessage]);
  };

  // 重置对话
  const handleReset = () => {
    initConversation();
    setGoalSession({
      id: `session-${Date.now()}`,
      goal: '',
      currentStep: 0,
      obstacles: [],
      diagnosis: '',
      solutions: [],
      plan: '',
      createdAt: new Date()
    });
  };

  // 生成会话摘要
  const getSessionSummary = (): string => {
    const parts: string[] = [];
    if (goalSession.goal) parts.push(`🎯 目标: ${goalSession.goal}`);
    if (goalSession.obstacles.length > 0) parts.push(`🚧 障碍: ${goalSession.obstacles.join('、')}`);
    if (goalSession.diagnosis) parts.push(`🔍 诊断: ${goalSession.diagnosis}`);
    if (goalSession.solutions.length > 0) parts.push(`💡 方案: ${goalSession.solutions.join('、')}`);
    if (goalSession.plan) parts.push(`🚀 计划: ${goalSession.plan}`);
    if (parts.length === 0) return '尚未记录任何进展。';
    return parts.join('\n');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 顶部步骤导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">五步成事法</h2>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            重新开始
          </button>
        </div>
        
        {/* 步骤指示器 */}
        <div className="flex items-center justify-between">
          {FIVE_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <motion.button
                  onClick={() => goToStep(index)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive 
                      ? 'bg-blue-500 text-white' 
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">{step.name}</span>
                </motion.button>
                
                {index < FIVE_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* 头像 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-purple-500 text-white'
              }`}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              {/* 消息内容 */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none shadow-sm'
              }`}>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* 加载指示器 */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none shadow-sm px-4 py-3">
              <div className="flex gap-1">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 当前步骤提示 */}
      <AnimatePresence>
        {showStepGuide && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-1">
              {React.createElement(FIVE_STEPS[currentStep].icon, { 
                size: 16, 
                className: 'text-blue-600 dark:text-blue-400' 
              })}
              <span className="font-medium text-blue-700 dark:text-blue-300">
                当前步骤: {FIVE_STEPS[currentStep].name}
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {FIVE_STEPS[currentStep].description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 会话摘要弹窗 */}
      <AnimatePresence>
        {showSessionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowSessionSummary(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-500" />
                会话进展摘要
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-sans">
                {getSessionSummary()}
              </pre>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowSessionSummary(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入区域 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入您的问题或想法..."
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            disabled={loading}
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send size={18} />
          </motion.button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>按 Enter 发送，Shift + Enter 换行</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSessionSummary(true)}
              className="hover:text-green-500 transition-colors"
              title="查看会话进展摘要"
            >
              📋 会话摘要
            </button>
            <button
              onClick={() => setShowStepGuide(!showStepGuide)}
              className="hover:text-blue-500 transition-colors"
            >
              {showStepGuide ? '隐藏步骤提示' : '显示步骤提示'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiveStepSuccess;