// src/components/EvolvingChatBot.tsx
// 自进化聊天机器人 - 集成8-Agent、Memory、四色卡片自进化

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, Settings, RefreshCw, Network, Database,
  Brain, AlertTriangle, CheckCircle, Clock, Loader,
  ChevronDown, ChevronUp, Trash2, Play, Pause
} from 'lucide-react';
import { toast } from 'sonner';
import evolvingChatService, { 
  EvolvingChatResponse, 
  EvolutionStats, 
  HealthCheckResult 
} from '../services/evolvingChatService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  cards?: any[];
  evolution_info?: any;
  sources?: any[];
}

const EvolvingChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<EvolutionStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  
  // 设置
  const [enableEvolution, setEnableEvolution] = useState(true);
  const [enableMemory, setEnableMemory] = useState(true);
  const [enableSkill, setEnableSkill] = useState(true);
  const [enable8Agent, setEnable8Agent] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载统计
  const loadStats = async () => {
    try {
      const data = await evolvingChatService.getStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  // 健康检查
  const performHealthCheck = async () => {
    try {
      const result = await evolvingChatService.healthCheck();
      setHealthStatus(result);
      
      if (result.status === 'healthy') {
        toast.success('知识库健康检查通过');
      } else {
        toast.warning(`发现 ${result.issues.length} 个问题需要关注`);
      }
    } catch (error) {
      console.error('健康检查失败:', error);
      toast.error('健康检查失败');
    }
  };

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
      const response = await evolvingChatService.chat({
        query: userMessage.content,
        enable_evolution: enableEvolution,
        enable_memory: enableMemory,
        enable_skill: enableSkill,
        enable_8agent: enable8Agent
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        cards: response.cards,
        evolution_info: response.evolution_info,
        sources: response.sources
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // 如果有进化信息，显示提示
      if (response.evolution_info?.cards_extracted) {
        const extracted = response.evolution_info.cards_extracted;
        toast.success(`本次对话提取了 ${extracted.total} 张知识卡片`);
      }
      
      // 刷新统计
      loadStats();
      
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败，请重试');
      
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: '抱歉，发生了错误。请检查后端服务是否运行。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 触发探索
  const handleExplore = async () => {
    try {
      const result = await evolvingChatService.triggerExploration();
      toast.info(result.message);
      loadStats();
    } catch (error) {
      toast.error('触发探索失败');
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    toast.success('对话已清空');
  };

  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : isSystem
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          {/* 消息内容 */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
          
          {/* 进化信息 */}
          {message.evolution_info && !isUser && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2 text-xs">
                {message.evolution_info.cards_extracted && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                    📦 提取 {message.evolution_info.cards_extracted.total} 张卡片
                  </span>
                )}
                {message.evolution_info.relations_built > 0 && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                    🔗 建立 {message.evolution_info.relations_built} 个关联
                  </span>
                )}
                {message.evolution_info.skill_executed && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                    ⚡ 执行技能: {message.evolution_info.skill_executed}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* 来源卡片 */}
          {message.sources && message.sources.length > 0 && !isUser && (
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 mb-2">来源知识：</div>
              <div className="flex flex-wrap gap-1">
                {message.sources.slice(0, 3).map((source, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      source.card_type === 'blue' ? 'bg-blue-100 text-blue-600' :
                      source.card_type === 'green' ? 'bg-green-100 text-green-600' :
                      source.card_type === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}
                  >
                    {source.title || source.card_id}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 时间戳 */}
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold">自进化聊天</h1>
            <p className="text-xs text-gray-500">集成8-Agent + Memory + 四色卡片</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="查看统计"
          >
            <Database className="w-5 h-5" />
          </button>
          <button
            onClick={performHealthCheck}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="健康检查"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          <button
            onClick={handleExplore}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="触发探索"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-800 border-b overflow-hidden"
          >
            <div className="p-4 grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.four_color_cards?.by_type?.blue || 0}</div>
                <div className="text-xs text-gray-500">🔵 事实</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.four_color_cards?.by_type?.green || 0}</div>
                <div className="text-xs text-gray-500">🟢 解释</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.four_color_cards?.by_type?.yellow || 0}</div>
                <div className="text-xs text-gray-500">🟡 风险</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.four_color_cards?.by_type?.red || 0}</div>
                <div className="text-xs text-gray-500">🔴 行动</div>
              </div>
            </div>
            <div className="px-4 pb-4 flex gap-4 text-sm">
              <span>总卡片: {stats.four_color_cards?.total_cards || 0}</span>
              <span>总关联: {stats.four_color_cards?.total_relations || 0}</span>
              <span>待探索: {stats.four_color_cards?.explore_status?.待探索 || 0}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-800 border-b overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <h3 className="font-medium text-sm">功能开关</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableEvolution}
                    onChange={(e) => setEnableEvolution(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">🔄 自进化</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableMemory}
                    onChange={(e) => setEnableMemory(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">🧠 记忆</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSkill}
                    onChange={(e) => setEnableSkill(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">⚡ 技能</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enable8Agent}
                    onChange={(e) => setEnable8Agent(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">🎯 8-Agent</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">开始与自进化聊天机器人对话</p>
            <p className="text-sm">系统会自动提取知识卡片并构建知识网络</p>
          </div>
        )}
        
        {messages.map(renderMessage)}
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">思考中...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 px-4 py-2 border rounded-lg resize-none dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="清空对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* 功能提示 */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className={enableEvolution ? 'text-green-600' : 'text-gray-400'}>
            {enableEvolution ? '●' : '○'} 自进化
          </span>
          <span className={enableMemory ? 'text-green-600' : 'text-gray-400'}>
            {enableMemory ? '●' : '○'} 记忆
          </span>
          <span className={enableSkill ? 'text-green-600' : 'text-gray-400'}>
            {enableSkill ? '●' : '○'} 技能
          </span>
          <span className={enable8Agent ? 'text-purple-600' : 'text-gray-400'}>
            {enable8Agent ? '●' : '○'} 8-Agent
          </span>
        </div>
      </div>
    </div>
  );
};

export default EvolvingChatBot;