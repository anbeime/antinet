import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cards?: any[];
  skillResult?: any;
}

interface ChatBotWithAPIProps {
  isOpen: boolean;
  onClose: () => void;
}

// API 基础 URL
const API_BASE = getApiBaseUrl() + '/api/chat/enhanced'

export const ChatBotWithAPI: React.FC<ChatBotWithAPIProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是Antinet智能助手，可以帮您查询知识库中的信息。请问有什么我可以帮您的吗？',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 发送消息到后端
  const handleSend = async () => {
    const query = input.trim();
    if (!query || isLoading) return;

    setInput('');
    setIsLoading(true);

    try {
      // 添加用户消息到界面
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // 调用后端API
      const response = await fetch(`${API_BASE}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          session_id: `session_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 添加助手回复
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || '抱歉，我没有理解您的问题。',
        timestamp: new Date().toISOString(),
        cards: data.cards,
        skillResult: data.skill_result
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('发送失败:', error);
      toast.error('发送失败，请检查后端服务是否运行');
      
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ 抱歉，处理您的请求时出现错误。请检查后端服务是否运行。\n\n请确保：\n1. 后端服务已启动 (python main.py)\n2. 服务运行在 http://localhost:8000',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    toast.success('对话已清空');
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-2xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">智能聊天助手</h2>
                <p className="text-xs text-white/80">纯文本聊天</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleClear}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex gap-3 mb-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>

                <div className={`max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'
                  }`}>
                    {message.content}
                  </div>
                  
                  {/* 显示卡片 */}
                  {message.cards && message.cards.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.cards.map((card, idx) => (
                        <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="font-medium text-sm">{card.title}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{card.content?.substring(0, 100)}...</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">处理中...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isLoading}
            />
            
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            支持文本输入 | 后端: {API_BASE}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBotWithAPI;
