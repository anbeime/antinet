/**
 * 修复版聊天机器人组件
 * 修复输入和图片发送问题
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Send, Bot, User, 
  Loader2, Paperclip, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  imageUrl?: string;
}

interface ChatBotFixProps {
  isOpen: boolean;
  onClose: () => void;
}

// 简单的消息组件
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-purple-600"
      )}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={cn("max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "px-4 py-2 rounded-2xl text-sm",
          isUser ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
        )}>
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
  );
};

export const ChatBotFix: React.FC<ChatBotFixProps> = ({ isOpen, onClose }) => {
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
        content: `👋 你好！我是修复版聊天机器人。

已修复功能：
✅ 文本输入
✅ 图片发送
✅ 消息显示

请尝试发送消息或图片！`,
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
        // 移除 data:image/xxx;base64, 前缀
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
      let imageBase64: string | undefined;
      let imageUrl: string | undefined;

      // 处理图片
      if (selectedImage) {
        try {
          imageBase64 = await fileToBase64(selectedImage);
          imageUrl = URL.createObjectURL(selectedImage);
        } catch (err) {
          console.error('图片转换失败:', err);
          toast.error('图片处理失败');
        }
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

      // 模拟后端调用（实际项目中替换为真实API）
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟助手回复
      let responseContent = '';
      if (selectedImage && query) {
        responseContent = `📷 收到您的图片和消息："${query}"\n\n图片分析功能需要后端支持。`;
      } else if (selectedImage) {
        responseContent = '📷 收到图片！图片分析功能需要后端支持。';
      } else {
        responseContent = `收到消息："${query}"\n\n✅ 输入功能正常工作！`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 清空图片
      setSelectedImage(null);
      setImagePreview(null);

    } catch (error) {
      console.error('发送失败:', error);
      toast.error('发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setSelectedImage(file);
    
    // 创建预览
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

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl h-[80vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">修复版聊天机器人</h2>
                  <p className="text-xs text-white/80">已修复输入和图片发送问题</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleClear}
                  title="清空对话"
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
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">发送中...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* 图片预览 */}
          {imagePreview && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <div className="flex items-center gap-3">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedImage?.name}</p>
                  <p className="text-xs text-muted-foreground">
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
          <div className="p-4 border-t bg-card">
            <div className="flex gap-2">
              {/* 隐藏的文件输入 */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
              
              {/* 图片上传按钮 */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
                title="上传图片"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              {/* 文本输入框 */}
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                  className="w-full min-h-[44px] max-h-[120px] px-3 py-2.5 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              
              {/* 发送按钮 */}
              <Button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* 提示文字 */}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              支持文本输入和图片上传
            </p>
          </div>
      </div>
    </div>
  );
};

export default ChatBotFix;
