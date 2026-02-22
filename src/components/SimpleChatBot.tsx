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
}

interface SimpleChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimpleChatBot: React.FC<SimpleChatBotProps> = ({ isOpen, onClose }) => {
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
        content: '你好！我是简单版聊天机器人。\n\n功能：\n✅ 文本输入\n✅ 图片发送\n✅ 正常关闭\n\n请测试这些功能！',
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
      let imageUrl: string | undefined;

      if (selectedImage) {
        imageUrl = URL.createObjectURL(selectedImage);
      }

      // 添加用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query || (selectedImage ? '[图片]' : ''),
        timestamp: new Date().toISOString(),
        imageUrl
      };
      
      setMessages(prev => [...prev, userMessage]);

      // 模拟回复
      await new Promise(resolve => setTimeout(resolve, 500));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `收到："${query || '[图片]'}"\n\n✅ 功能正常！`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      setSelectedImage(null);
      setImagePreview(null);

    } catch (error) {
      toast.error('发送失败');
    } finally {
      setIsLoading(false);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 背景点击关闭 */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        style={{ position: 'absolute', inset: 0 }}
      />
      
      {/* 聊天窗口 */}
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
                <h2 className="text-lg font-bold">简单版聊天机器人</h2>
                <p className="text-xs text-white/80">已修复关闭问题</p>
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
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
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
                <span className="text-sm">发送中...</span>
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
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter发送)"
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
        </div>
      </div>
    </div>
  );
};

export default SimpleChatBot;
