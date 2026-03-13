/**
 * 增强版聊天机器人组件
 * 集成知识库查询、图片解析、技能调用
 * 参考: https://github.com/anbeime/skill/tree/main/projects
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Bot, User,
  FileText, Table, Presentation, Search,
  Sparkles, ChevronRight, Loader2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  enhancedChatService, 
  ChatMessage, 
  CardReference, 
  SkillResult,
  SceneType
} from '@/services/enhancedChatService';
// visionService 已移除（视觉模型暂不可用）
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  sceneType?: SceneType;
}> = ({ message, cards, skillResult, sceneType }) => {
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
        isUser ? "bg-primary" : isSkill ? "bg-purple-500" : "bg-transparent"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isSkill ? (
          <Sparkles className="w-4 h-4 text-white" />
        ) : (
          <img src="/src/pages/chat.png" alt="bot" className="w-8 h-8 rounded-full object-contain" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "max-w-[80%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 场景标签 */}
        {sceneType && sceneType !== 'general' && !isUser && (
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            {enhancedChatService.getSceneIcon(sceneType)} {enhancedChatService.getSceneName(sceneType)}
          </span>
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
            {cards.slice(0, 3).map((card, idx) => (
              <Card key={card.card_id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 border rounded">
                      {enhancedChatService.formatCardType(card.card_type)}
                    </span>
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
                <span className={`text-xs px-2 py-0.5 rounded ${skillResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {skillResult.success ? '成功' : '失败'}
                </span>
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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [currentScene, setCurrentScene] = useState<SceneType>('general');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `你好！我是知易智能知识管家助手。

我可以帮您：
查询知识库卡片 - 搜索事实、解释、风险、行动卡片
生成PPT演示 - 快速创建专业演示文稿
分析Excel数据 - 数据分析和可视化
生成Word文档 - 创建专业文档

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
    if (!input.trim()) return;

    const query = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const userMessage: ChatMessage = {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      const response = await enhancedChatService.sendMessage(query);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        metadata: {
          scene_type: response.scene_type,
          cards: response.cards,
          skill_result: response.skill_result
        }
      };
      setMessages(prev => [...prev, assistantMessage]);
      setSuggestedQuestions(response.suggested_questions);
      setCurrentScene(response.scene_type);

    } catch (error) {
      toast.error('发送失败，请重试');
    } finally {
      setIsLoading(false);
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
          className="w-full max-w-2xl h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
                    支持知识库查询 · 技能调用
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
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  cards={message.metadata?.cards}
                  skillResult={message.metadata?.skill_result}
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
          </div>

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

          {/* 输入区域 */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
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
                disabled={isLoading || !input.trim()}
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
