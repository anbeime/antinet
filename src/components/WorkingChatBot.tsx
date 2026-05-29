import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Paperclip, Trash2, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

interface WorkingChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

// API 配置 - 使用数据库版接口
const API_BASE = 'http://localhost:8002/api/chat/simple';

export const WorkingChatBot: React.FC<WorkingChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "帮我搜索关于项目管理的知识卡片",
    "分析一下这张图片",
    "生成一个工作总结的PPT"
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查后端状态
  useEffect(() => {
    if (isOpen) {
      checkBackendStatus();
    }
  }, [isOpen]);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const statusMsg = backendStatus === 'offline' 
        ? '\n\n⚠️ 后端服务未连接，请确保后端已启动'
        : '';
      
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 你好！我是智能聊天助手。${statusMsg}\n\n我可以帮您：\n📚 查询知识库卡片\n🖼️ 分析图片内容\n\n请直接输入您的问题，或上传图片！`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, backendStatus]);

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

  // 将文件转为 Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() && !selectedImage) {
      toast.error('请输入消息或选择图片');
      return;
    }

    const query = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let imageData: string | undefined;
      let imageUrl: string | undefined;

      // 处理图片
      if (selectedImage) {
        imageData = await fileToBase64(selectedImage);
        imageUrl = URL.createObjectURL(selectedImage);
      }

      // 添加用户消息到界面
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query || (selectedImage ? '[图片]' : ''),
        timestamp: new Date().toISOString(),
        imageUrl
      };
      
      setMessages(prev => [...prev, userMessage]);

      // 调用后端API
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query || '分析这张图片',
          image_data: imageData,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          })),
          context: {},
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
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setBackendStatus('online');
      updateSuggestedQuestions(query);

      // 清空图片
      setSelectedImage(null);
      setImagePreview(null);

    } catch (error) {
      console.error('发送失败:', error);
      setBackendStatus('offline');
      
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 抱歉，无法连接到后端服务。\n\n请确保：\n1. 后端服务已启动\n2. 服务运行在 http://localhost:8000\n3. 网络连接正常\n\n启动命令：\ncd backend && python main.py`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 根据用户输入生成动态推荐问题
  const updateSuggestedQuestions = (query: string) => {
    const q = query.toLowerCase();
    const s: string[] = [];

    if (q.includes('卡片') || q.includes('知识') || q.includes('搜索') || q.includes('查找') || q.includes('关于')) {
      const topic = query.replace(/(?:搜索|查找|找|查询|关于|帮我)\s*/g, '').replace(/(?:的)?(?:知识|卡片|资料|信息)/g, '').trim();
      if (topic && topic.length < 20) s.push(`帮我搜索更多关于${topic}的知识卡片`);
      s.push('这些卡片之间有什么关联');
    }

    if (q.includes('图片') || q.includes('图像') || q.includes('截图')) {
      s.push('这张图片说明了什么问题');
      s.push('基于这张图片生成知识卡片');
    }

    if (q.includes('ppt') || q.includes('演示') || q.includes('工作总结')) {
      s.push('帮我完善这个PPT的结构');
      s.push('换一种风格重新生成');
    }

    if (q.includes('数据') || q.includes('分析') || q.includes('表格')) {
      s.push('总结数据中的关键趋势');
      s.push('生成数据分析报告');
    }

    if (s.length === 0) {
      s.push('帮我搜索相关知识卡片');
      s.push('能详细展开说明一下吗');
      s.push('我可以使用哪些功能');
    }

    const unique: string[] = [];
    for (const item of s) {
      if (!unique.includes(item)) unique.push(item);
      if (unique.length >= 3) break;
    }
    setSuggestedQuestions(unique);
  };

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast.success(`已选择图片: ${file.name}`);
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    setSelectedImage(null);
    setImagePreview(null);
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
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span className={`w-2 h-2 rounded-full ${
                    backendStatus === 'online' ? 'bg-green-400' : 
                    backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                  {backendStatus === 'online' ? '已连接' : 
                   backendStatus === 'offline' ? '未连接' : '检查中'}
                </div>
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
        <ScrollArea className="flex-1 p-4">
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
                    {message.imageUrl && (
                      <img 
                        src={message.imageUrl} 
                        alt="Uploaded" 
                        className="mt-2 max-w-full rounded-lg max-h-48 object-cover"
                      />
                    )}
                  </div>
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
        </ScrollArea>

        {/* 图片预览 */}
        {imagePreview && (
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedImage?.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedImage ? (selectedImage.size / 1024).toFixed(1) : 0} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 推荐问题 */}
        {suggestedQuestions.length > 0 && messages.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">推荐问题：</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className="text-xs h-auto py-1 px-2 rounded-md transition-colors cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setInput(question)}
                >
                  {question}
                  <ChevronRight className="w-3 h-3 ml-1 inline" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
          {backendStatus === 'offline' && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-2 p-2 bg-amber-50 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>后端服务未连接，请确保后端已启动</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageSelect}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter发送, Shift+Enter换行)"
              className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isLoading}
            />
            
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            支持文本输入和图片上传 | 状态: {backendStatus === 'online' ? '已连接' : '未连接'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkingChatBot;
