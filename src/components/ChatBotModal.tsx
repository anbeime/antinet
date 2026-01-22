import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBotModal: React.FC<ChatBotModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是Antinet智能知识管家的答疑助手。我可以帮您解答关于系统使用、数据分析、知识卡片管理等问题。有什么可以帮您的？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用 GenieAPIService 聊天接口
      const response = await fetch('http://localhost:8910/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qwen2.0-7B-SSD',
          messages: [
            { role: 'system', content: '你是一个专业的Antinet智能知识管家使用助手。请用中文回答用户关于系统使用的疑问，提供清晰、有用的指导。' },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: input },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      // 禁止模拟回复，只显示错误信息和修复指导
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `答疑服务暂时不可用。错误详情: ${error instanceof Error ? error.message : '未知错误'}\n\n请按以下步骤修复:\n1. 确保 GenieAPIService 正在运行 (端口8910)\n2. 检查命令提示符是否显示服务已启动\n3. 如果服务未运行，请运行 start_genie_service.bat\n4. 检查防火墙设置，确保端口8910可访问\n5. 重启后端服务 (运行 start_all.bat)\n\n禁止使用模拟回复，必须修复底层服务问题。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('答疑服务不可用，请修复后端服务');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Antinet 使用答疑助手</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">基于 GenieAPIService 的智能指南</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {message.role === 'assistant' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {message.role === 'assistant' ? '答疑助手' : '您'}
                      </span>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-gray-100 dark:bg-gray-700 p-4">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <span className="font-medium">答疑助手</span>
                    </div>
                    <div className="flex space-x-1 mt-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 输入区域 */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您关于系统使用的问题..."
                  className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl p-4 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={2}
                  disabled={isLoading}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-xl self-end transition-colors"
                >
                  <Send size={20} />
                </motion.button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                提示：您可以询问关于知识卡片、数据分析、团队协作、GTD系统等问题。按 Enter 发送，Shift+Enter 换行。
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatBotModal;