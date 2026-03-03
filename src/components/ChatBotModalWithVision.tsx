import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Image, Upload, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChatBotModalWithVisionProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBotModalWithVision: React.FC<ChatBotModalWithVisionProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是知易智能知识管家的视觉助手。\n\n[提示] 使用提示：\n1. 我支持图片分析功能\n2. 可以上传图片进行智能分析\n3. 基于本地 NPU 模型运行\n4. 数据不出域，完全本地化\n\n有什么可以帮您的？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startTransformX = transform.x;
    const startTransformY = transform.y;
    
    setDragStart({ x: startMouseX, y: startMouseY });
    setStartPos({ x: startTransformX, y: startTransformY });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const newX = startPos.x + dx;
      const newY = startPos.y + dy;

      const modalWidth = modalRef.current?.offsetWidth || 0;
      const modalHeight = modalRef.current?.offsetHeight || 0;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      setTransform({ x: clampedX, y: clampedY });
    }
  }, [isDragging, dragStart, startPos]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      imageUrl: previewUrl || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let result: string;
      
      if (selectedImage) {
        // For image queries, always use vision analysis (AI inference required)
        const formData = new FormData();
        formData.append('file', selectedImage);
        if (input.trim()) {
          formData.append('question', input.trim());
        }

        const response = await fetch('http://localhost:8000/api/vision/analyze', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('图片分析请求失败');
        }

        const data = await response.json();
        result = data.result || data.analysis || JSON.stringify(data);
      } else {
        // For text queries, first try searching existing knowledge cards
        // This is faster than AI inference and should be used when possible
        const searchResponse = await fetch('http://localhost:8000/api/chat/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: input.trim(), 
            limit: 5 
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const cards = searchData.cards || [];
          
          // If we found relevant cards, use them instead of AI inference
          if (cards.length > 0) {
            // Format the search results as a readable response
            let formattedResult = '根据您的查询，找到以下相关知识：\n\n';
            cards.forEach((card: any, index: number) => {
              formattedResult += `${index + 1}. ${card.title}\n   ${card.content}\n\n`;
            });
            formattedResult += '如需更深入的分析，请提供更多详细信息。';
            result = formattedResult;
          } else {
            // No relevant cards found, fall back to AI inference
            const chatResponse = await fetch('http://localhost:8000/api/chat/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: input.trim(), conversation_history: [] }),
            });

            if (!chatResponse.ok) {
              throw new Error('聊天请求失败');
            }

            const chatData = await chatResponse.json();
            result = chatData.response || chatData.result || JSON.stringify(chatData);
          }
        } else {
          // Search failed, fall back to AI inference
          const chatResponse = await fetch('http://localhost:8000/api/chat/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input.trim(), conversation_history: [] }),
          });

          if (!chatResponse.ok) {
            throw new Error('聊天请求失败');
          }

          const chatData = await chatResponse.json();
          result = chatData.response || chatData.result || JSON.stringify(chatData);
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('请求失败，请稍后重试');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，处理您的请求时出现错误。请检查后端服务是否运行。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      handleRemoveImage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px)` }}
      >
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 cursor-move bg-gradient-to-r from-blue-500 to-purple-600"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 text-white">
            <Bot className="w-5 h-5" />
            <span className="font-semibold">视觉智能助手</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {msg.content}
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded" 
                      className="mt-2 max-w-full rounded-lg max-h-48 object-cover"
                    />
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">处理中...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 图片预览 */}
        {previewUrl && (
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedImage?.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedImage ? (selectedImage.size / 1024).toFixed(1) : 0} KB
                </p>
              </div>
              <button
                onClick={handleRemoveImage}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t bg-white dark:bg-gray-800 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageSelect}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <Upload className="w-5 h-5" />
            </button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter发送, Shift+Enter换行)"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isLoading}
            />
            
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            [提示] 支持文本和图片分析 · 基于本地 NPU 模型
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatBotModalWithVision;