import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
  cards?: any[];
  skillResult?: any;
}

interface ChatBotWithAPIProps {
  isOpen: boolean;
  onClose: () => void;
}

// API 基础 URL
const API_BASE = 'http://localhost:8000/api/chat/enhanced';

export const ChatBotWithAPI: React.FC<ChatBotWithAPIProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 你好！我是知易智能助手。

我可以帮您：
📚 查询知识库卡片
🖼️ 分析图片内容  
📊 生成PPT/Excel/Word

请直接输入您的问题，或上传图片进行分析！`,
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

  // 发送消息到后端
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
        try {
          imageData = await fileToBase64(selectedImage);
          imageUrl = URL.createObjectURL(selectedImage);
        } catch (err) {
          console.error('图片转换失败:', err);
          toast.error('图片处理失败');
          setIsLoading(false);
          return;
        }
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
        content: data.response || '抱歉，我没有理解您的问题。',
        timestamp: new Date().toISOString(),
        cards: data.cards,
        skillResult: data.skill_result
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 清空图片
      setSelectedImage(null);
      setImagePreview(null);

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

  // 直接上传图片分析
  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/analyze-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const imageUrl = URL.createObjectURL(file);
        
        // 添加用户消息
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: '[图片]',
          timestamp: new Date().toISOString(),
          imageUrl
        };
        
        setMessages(prev => [...prev, userMessage]);

        // 添加分析结果
        const analysisContent = data.analysis ? 
          `📷 **图片分析结果**\n\n${data.analysis.description}\n\n**识别到的事实：**\n${data.analysis.facts?.map((f: string) => `• ${f}`).join('\n') || '无'}\n\n**洞察：**\n${data.analysis.insights?.map((i: string) => `• ${i}`).join('\n') || '无'}`
          : '图片分析完成';

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: analysisContent,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        toast.success('图片分析完成！');
      } else {
        toast.error(data.error || '图片分析失败');
      }

    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error('图片分析服务暂时不可用');
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
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

    toast.success(`已选择图片: ${file.name}，点击发送进行分析`);
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
                <p className="text-xs text-white/80">支持图片分析</p>
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

        {/* 输入区域 */}
        <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
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
            支持文本输入和图片上传分析 | 后端: {API_BASE}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBotWithAPI;
