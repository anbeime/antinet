/**
 * 增强版聊天机器人组件
 * 集成知识库查询、图片解析、技能调用
 * 参考: https://github.com/anbeime/skill/tree/main/projects
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Bot, User, Image as ImageIcon, 
  FileText, Table, Presentation, Search,
  Sparkles, ChevronRight, Loader2, Paperclip,
  HelpCircle, Trash2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  enhancedChatService, 
  ChatMessage, 
  CardReference, 
  SkillResult,
  ImageAnalysisResult,
  SceneType
} from '@/services/enhancedChatService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface EnhancedChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

// 消息组件
const MessageBubble: React.FC<{
  message: ChatMessage;
  cards?: CardReference[];
  skillResult?: SkillResult;
  imageAnalysis?: ImageAnalysisResult;
  sceneType?: SceneType;
}> = ({ message, cards, skillResult, imageAnalysis, sceneType }) => {
  const isUser = message.role === 'user';
  const isSkill = message.role === 'skill';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary" : isSkill ? "bg-purple-500" : "bg-gradient-to-br from-blue-500 to-purple-600"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isSkill ? (
          <Sparkles className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "max-w-[80%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 场景标签 */}
        {sceneType && sceneType !== 'general' && !isUser && (
          <Badge variant="secondary" className="text-xs">
            {enhancedChatService.getSceneIcon(sceneType)} {enhancedChatService.getSceneName(sceneType)}
          </Badge>
        )}

        {/* 文本内容 */}
        <div className={cn(
          "px-4 py-2 rounded-2xl text-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted rounded-bl-md"
        )}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* 卡片展示 */}
        {cards && cards.length > 0 && (
          <div className="space-y-2 mt-2">
            {cards.slice(0, 3).map((card, index) => (
              <Card key={card.card_id} className="border-l-4" style={{
                borderLeftColor: card.color === 'blue' ? '#3b82f6' : 
                                card.color === 'green' ? '#22c55e' :
                                card.color === 'yellow' ? '#eab308' : '#ef4444'
              }}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {enhancedChatService.formatCardType(card.card_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {enhancedChatService.formatSimilarity(card.similarity)}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{card.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {card.content}
                  </p>
                </CardContent>
              </Card>
            ))}
            {cards.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                还有 {cards.length - 3} 张相关卡片
              </div>
            )}
          </div>
        )}

        {/* 技能结果 */}
        {skillResult && (
          <Card className="mt-2 border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-sm">技能执行结果</span>
                <Badge variant={skillResult.success ? "default" : "destructive"} className="text-xs">
                  {skillResult.success ? '成功' : '失败'}
                </Badge>
              </div>
              {skillResult.result && (
                <p className="text-sm text-muted-foreground">{skillResult.result}</p>
              )}
              {skillResult.file_path && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span className="truncate">{skillResult.file_path}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 图片分析结果 */}
        {imageAnalysis && (
          <Card className="mt-2 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">图片分析</span>
                <Badge variant="secondary" className="text-xs">
                  置信度 {Math.round(imageAnalysis.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-sm mb-2">{imageAnalysis.description}</p>
              {imageAnalysis.facts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">识别到的事实：</p>
                  {imageAnalysis.facts.slice(0, 3).map((fact, i) => (
                    <p key={i} className="text-xs text-muted-foreground pl-2">• {fact}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

// 快捷操作按钮
const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}> = ({ icon, label, onClick, color = "bg-muted" }) => (
  <Button
    variant="outline"
    size="sm"
    className="flex items-center gap-2 text-xs h-auto py-2 px-3"
    onClick={onClick}
  >
    <span className={cn("p-1 rounded", color)}>{icon}</span>
    {label}
  </Button>
);

export const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [currentScene, setCurrentScene] = useState<SceneType>('general');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `👋 你好！我是知易智能知识管家助手。

我可以帮您：
📚 **查询知识库卡片** - 搜索事实、解释、风险、行动卡片
🖼️ **分析图片内容** - 上传图片进行智能分析
📊 **生成PPT演示** - 快速创建专业演示文稿
📈 **分析Excel数据** - 数据分析和可视化
📝 **生成Word文档** - 创建专业文档

有什么可以帮您的吗？`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen]);

  // 自动滚动到底部
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
    if (!input.trim() && !selectedImage) return;

    const query = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      let imageData: string | undefined;
      
      // 如果有选中的图片，转换为base64
      if (selectedImage) {
        imageData = await enhancedChatService.fileToBase64(selectedImage);
      }

      // 添加用户消息
      const userMessage: ChatMessage = {
        role: 'user',
        content: query || '[图片]',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // 发送到后端
      const response = await enhancedChatService.sendMessage(query, { imageData });

      // 添加助手回复
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        metadata: {
          scene_type: response.scene_type,
          cards: response.cards,
          skill_result: response.skill_result,
          image_analysis: response.image_analysis
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestedQuestions(response.suggested_questions);
      setCurrentScene(response.scene_type);

      // 清空图片
      setSelectedImage(null);
      setImagePreview(null);

    } catch (error) {
      toast.error('发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过10MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    setSuggestedQuestions([]);
    enhancedChatService.clearConversationHistory();
    toast.success('对话已清空');
  };

  // 使用建议问题
  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  // 快捷操作
  const quickActions = [
    {
      icon: <Search className="w-3 h-3" />,
      label: "查卡片",
      onClick: () => handleSuggestedQuestion("搜索知识库卡片"),
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: <ImageIcon className="w-3 h-3" />,
      label: "分析图片",
      onClick: () => fileInputRef.current?.click(),
      color: "bg-green-100 text-green-600"
    },
    {
      icon: <Presentation className="w-3 h-3" />,
      label: "生成PPT",
      onClick: () => handleSuggestedQuestion("生成一个工作总结PPT"),
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: <Table className="w-3 h-3" />,
      label: "分析Excel",
      onClick: () => handleSuggestedQuestion("分析Excel数据"),
      color: "bg-orange-100 text-orange-600"
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl h-[80vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">知易智能助手</CardTitle>
                  <p className="text-xs text-white/80">
                    支持知识库查询 · 图片分析 · 技能调用
                  </p>
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
          </CardHeader>

          {/* 消息区域 */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  cards={message.metadata?.cards}
                  skillResult={message.metadata?.skill_result}
                  imageAnalysis={message.metadata?.image_analysis}
                  sceneType={message.metadata?.scene_type}
                />
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">思考中...</span>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* 建议问题 */}
          {suggestedQuestions.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">推荐问题：</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 快捷操作 */}
          <div className="px-4 py-2 border-t">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <QuickAction
                  key={index}
                  icon={action.icon}
                  label={action.label}
                  onClick={action.onClick}
                  color={action.color}
                />
              ))}
            </div>
          </div>

          {/* 图片预览 */}
          {imagePreview && (
            <div className="px-4 py-2 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedImage?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedImage!.size / 1024).toFixed(1)} KB
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
          <div className="p-4 border-t">
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
              
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入消息... (Shift+Enter换行)"
                  className="w-full min-h-[44px] max-h-[120px] px-3 py-2 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={1}
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedChatBot;
