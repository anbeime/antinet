import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, FileText, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { chatService, ChatMessage, formatCardType, formatSimilarity } from '../services/chatService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  cards?: any[];
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
      content: '你好！我是Antinet智能知识管家的知识库助手。我可以基于知识库为您解答关于数据分析、风险评估、行动建议等问题。我会检索知识库中的四色卡片（事实/解释/风险/行动）来回答您的问题。有什么可以帮您的？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // 打开模态框时聚焦输入框
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      // 直接使用鼠标移动的增量
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      setPosition({
        x: newX,
        y: newY
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // 添加调试日志追踪状态
  React.useEffect(() => {
    console.log('[ChatBotModal] Component rendered, isOpen:', isOpen);
  }, [isOpen]);

  React.useEffect(() => {
    console.log('[ChatBotModal] isLoading changed:', isLoading);
  }, [isLoading]);

  // 追踪textarea是否挂载
  React.useEffect(() => {
    if (textareaRef.current) {
      console.log('[ChatBotModal] Textarea ref mounted, element:', textareaRef.current);
      console.log('[ChatBotModal] Textarea disabled:', textareaRef.current.disabled);
      console.log('[ChatBotModal] Textarea pointer-events:', window.getComputedStyle(textareaRef.current).pointerEvents);
    }
  }, [isOpen, isLoading]);

  const handleSend = async () => {
    console.log('[ChatBotModal] handleSend called, input:', input);
    console.log('[ChatBotModal] current isLoading state:', isLoading);

    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    console.log('[ChatBotModal] Setting isLoading to true');
    setIsLoading(true);

    try {
      console.log('[ChatBotModal] Calling chatService.query...');
      // 调用知识库查询API
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })) as ChatMessage[];

      const response = await chatService.query(input, history);
      console.log('[ChatBotModal] chatService.query response:', response);

      // 构建回复消息
      let responseContent = response.response;

      // 添加来源信息
      if (response.sources && response.sources.length > 0) {
        responseContent += '\n\n📚 **参考来源：**\n';
        response.sources.slice(0, 5).forEach((source, index) => {
          const cardType = formatCardType(source.card_type);
          const similarity = formatSimilarity(source.similarity);
          responseContent += `${index + 1}. [${cardType}] ${source.title} (相似度: ${similarity})\n`;
        });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        sources: response.sources,
        cards: response.cards,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[ChatBotModal] Chat error:', error);
      console.error('[ChatBotModal] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `知识库服务暂时不可用。错误详情: ${error instanceof Error ? error.message : '未知错误'}\n\n请按以下步骤修复:\n1. 确保后端服务正在运行 (端口8000)\n2. 检查后端日志确认知识库已初始化\n3. 如果服务未运行，请运行 start_backend.bat\n4. 检查防火墙设置，确保端口8000可访问\n5. 确认知识库数据库文件存在 (data/knowledge.db)\n\n知识库功能需要后端支持，无法使用模拟回复。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('知识库服务不可用，请检查后端服务');
    } finally {
      console.log('[ChatBotModal] Finally block, setting isLoading to false');
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
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: position.x,
              y: position.y
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed left-1/2 top-1/2 w-[95vw] max-w-3xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[51] flex flex-col overflow-hidden"
          >
            {/* 标题栏 - 只在这里可以拖拽 */}
            <div
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-move select-none"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Antinet 知识库助手</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">基于四色卡片知识库的智能查询 · 拖拽标题栏可移动</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[50vh]">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
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
                        {message.role === 'assistant' ? '知识库助手' : '您'}
                      </span>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    {/* 显示知识来源 */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <div className="text-xs opacity-80 mb-2">📚 知识来源：</div>
                        <div className="space-y-1">
                          {message.sources.slice(0, 3).map((source, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-xs">
                              {source.card_type === 'blue' && <Info className="w-3 h-3 text-blue-500" />}
                              {source.card_type === 'green' && <FileText className="w-3 h-3 text-green-500" />}
                              {source.card_type === 'yellow' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                              {source.card_type === 'red' && <CheckCircle className="w-3 h-3 text-red-500" />}
                              <span>{formatCardType(source.card_type)}: {source.title}</span>
                              <span className="opacity-60">({formatSimilarity(source.similarity)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-gray-100 dark:bg-gray-700 p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <span className="font-medium">知识库助手</span>
                    </div>
                    <div className="flex space-x-1 mt-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300" />
                    </div>
                  </div>
                </motion.div>
              )}
              {/* 滚动锚点 */}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 - 固定在底部 */}
            <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-4">
                <div className="flex space-x-3">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      console.log('[ChatBotModal] Input changed:', e.target.value);
                      setInput(e.target.value);
                    }}
                    onClick={() => console.log('[ChatBotModal] Textarea clicked')}
                    onFocus={() => console.log('[ChatBotModal] Textarea focused')}
                    onBlur={() => console.log('[ChatBotModal] Textarea blurred')}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您关于系统使用的问题..."
                    className="flex-1 min-h-[80px] max-h-[200px] bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-4 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 text-base overflow-y-auto"
                    rows={3}
                    disabled={isLoading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      console.log('[ChatBotModal] Send button clicked, isLoading:', isLoading);
                      handleSend();
                    }}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-xl self-end transition-colors shadow-lg flex-none"
                  >
                    <Send size={20} />
                  </motion.button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex-none">
                  提示：我会基于知识库中的事实、解释、风险、行动卡片回答您的问题。按 Enter 发送，Shift+Enter 换行。拖拽标题栏可移动对话框。
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatBotModal;