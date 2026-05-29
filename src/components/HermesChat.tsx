// src/components/HermesChat.tsx - Hermes 智能助手聊天组件
// 使用 Hermes TUI Gateway，提供完整 AI 能力

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Loader2, Trash2, Zap, Brain, Wrench, ChevronDown, ChevronUp, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import hermesGateway, { HermesStreamEvent, HermesMessage } from '@/services/hermesGateway';

interface HermesChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// 消息显示组件
const MessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 简单的格式化渲染
  const renderContent = (text: string) => {
    if (!text) return null;
    
    // 分割代码块
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0]?.trim();
        const code = lines.slice(1).join('\n');
        return (
          <pre key={i} className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 text-xs overflow-x-auto">
            <code>{code}</code>
          </pre>
        );
      }
      
      // 普通文本处理
      return part.split('\n').map((line, j) => {
        // 标题
        if (line.startsWith('### ')) return <h3 key={`${i}-${j}`} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={`${i}-${j}`} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={`${i}-${j}`} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        
        // 列表
        if (line.startsWith('- ')) return <li key={`${i}-${j}`} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (/^\d+\. /.test(line)) return <li key={`${i}-${j}`} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        
        // 引用
        if (line.startsWith('> ')) return <blockquote key={`${i}-${j}`} className="border-l-2 border-blue-500 pl-3 my-1 text-gray-600 dark:text-gray-400">{line.slice(2)}</blockquote>;
        
        // 分割线
        if (line === '---') return <hr key={`${i}-${j}`} className="my-3 border-gray-300" />;
        
        // 粗体/斜体
        const formatted = line
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>');
        
        return line.trim() ? (
          <p key={`${i}-${j}`} className="my-1" dangerouslySetInnerHTML={{ __html: formatted }} />
        ) : <br key={`${i}-${j}`} />;
      });
    });
  };

  return (
    <div className="group relative">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {renderContent(content)}
      </div>
      {!isUser && content && (
        <button
          onClick={handleCopy}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

// 工具调用显示组件
const ToolCallsDisplay: React.FC<{ tools: any[] }> = ({ tools }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!tools || tools.length === 0) return null;
  
  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        调用了 {tools.length} 个工具
      </button>
      
      {expanded && (
        <div className="pl-2 border-l-2 border-purple-200 dark:border-purple-800 space-y-1">
          {tools.map((tool, idx) => (
            <div key={idx} className="text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-700 dark:text-purple-300">
                <Wrench className="w-3 h-3" />
                {tool.name}
              </span>
              {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                <pre className="mt-1 p-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(tool.arguments, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const HermesChat: React.FC<HermesChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Array<HermesMessage & { toolCalls?: any[]; isStreaming?: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "帮我搜索关于项目管理的知识卡片",
    "分析一下这张图片",
    "生成一个工作总结的PPT"
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 连接 Hermes Gateway
  useEffect(() => {
    if (isOpen && !isConnected) {
      hermesGateway.connect().then(() => {
        setIsConnected(true);
        toast.success('已连接到 Hermes 智能助手');
        
        // 添加欢迎消息
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `🤖 Hermes 智能助手已就绪！

我可以帮您：
• 访问系统知识数据库
• 调用各种工具完成任务
• 多 Agent 协同工作（8 个专业 Agent 并行处理）
• 使用各种技能（Skills）处理复杂任务

请告诉我您需要什么帮助？`,
          timestamp: new Date().toISOString()
        }]);
      }).catch((err) => {
        toast.error(`连接失败: ${err.message}`);
        console.error(err);
      });

      // 监听事件
      hermesGateway.onStream(handleStreamEvent);
      hermesGateway.onError((err) => {
        toast.error(`Hermes 错误: ${err.message}`);
        setIsLoading(false);
      });
    }

    return () => {
      if (!isOpen) {
        hermesGateway.disconnect();
        setIsConnected(false);
      }
    };
  }, [isOpen]);

  // 流式事件处理
  const handleStreamEvent = useCallback((event: HermesStreamEvent) => {
    switch (event.type) {
      case 'message.delta':
        // 增量文本
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.isStreaming && !last.toolCalls) {
            return [{
              ...last,
              content: last.content + event.payload.delta,
            }];
          }
          return prev;
        });
        break;

      case 'message.complete':
        // 消息完成
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.isStreaming) {
            updated[updated.length - 1] = {
              ...last,
              content: event.payload.text || last.content,
              toolCalls: event.payload.tool_calls,
              isStreaming: false
            };
          }
          return updated;
        });
        setIsLoading(false);
        break;

      case 'tool.start':
        // 工具开始
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.isStreaming) {
            return [...prev.slice(0, -1), {
              ...last,
              toolCalls: [...(last.toolCalls || []), { name: event.payload.name, arguments: event.payload.arguments, status: 'running' }]
            }];
          }
          return prev;
        });
        break;

      case 'tool.complete':
        // 工具完成
        setMessages(prev => {
          return prev.map(msg => ({
            ...msg,
            toolCalls: msg.toolCalls?.map((t: any) => 
              t.name === event.payload.name ? { ...t, status: 'complete', result: event.payload.result } : t
            )
          }));
        });
        break;

      case 'gateway.ready':
        console.log('[Hermes] Gateway ready, skin:', event.payload);
        break;
    }
  }, []);

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
    const text = input.trim();
    if (!text || isLoading || !isConnected) return;

    setInput('');
    setIsLoading(true);

    // 添加用户消息
    const userMsg: HermesMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    // 添加AI消息占位符
    const aiMsg: HermesMessage & { isStreaming?: boolean } = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMsg]);

    try {
      await hermesGateway.sendMessage(text);
      updateSuggestedQuestions(text);
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(`发送失败: ${error.message}`);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) {
          updated[updated.length - 1] = {
            ...last,
            content: `❌ 错误: ${error.message}`,
            isStreaming: false
          };
        }
        return updated;
      });
      setIsLoading(false);
    }
  };

  // 根据用户输入生成动态推荐问题
  const updateSuggestedQuestions = (query: string) => {
    const q = query.toLowerCase();
    const s: string[] = [];
    if (q.includes('卡片') || q.includes('知识') || q.includes('搜索') || q.includes('查找')) {
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
    if (q.includes('数据') || q.includes('分析') || q.includes('表格') || q.includes('excel')) {
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

  // 清空对话
  const handleClear = async () => {
    try {
      await hermesGateway.call('session.branch', { session_id: hermesGateway.getSessionId(), action: 'clear' });
    } catch (e) {
      // 忽略
    }
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
        className="relative w-full max-w-3xl h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Hermes 智能助手</h2>
                <p className="text-xs text-white/80">
                  {isConnected ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      已连接
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      连接中...
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowCapabilities(!showCapabilities)}
                title="查看能力"
              >
                <Zap className="w-4 h-4" />
              </Button>
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

          {/* 能力展示 */}
          {showCapabilities && (
            <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm">
              <p className="font-semibold mb-2">🎯 Hermes 核心能力：</p>
              <ul className="space-y-1 text-white/90">
                <li>• 知识库检索与问答</li>
                <li>• 8 个专业 Agent 并行协同工作</li>
                <li>• 100+ 技能（Skills）可用</li>
                <li>• 文件读取、编辑、搜索</li>
                <li>• 代码执行与调试</li>
                <li>• Web 搜索与信息获取</li>
                <li>• 数据库操作</li>
                <li>• ...以及更多工具</li>
              </ul>
            </div>
          )}
        </div>

        {/* 消息区域 */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">
            {messages.map((message, idx) => (
              <div 
                key={message.id || idx}
                className={`flex gap-3 mb-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-blue-600'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                <div className={`max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white dark:bg-gray-800 rounded-bl-md'
                  }`}>
                    <MessageContent content={message.content} isUser={message.role === 'user'} />
                    
                    {/* 工具调用显示 */}
                    {!message.isStreaming && message.toolCalls && message.toolCalls.length > 0 && (
                      <ToolCallsDisplay tools={message.toolCalls} />
                    )}
                  </div>
                  
                  <span className="text-xs text-gray-500 mt-1 px-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Hermes 思考中...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 推荐问题 */}
        {suggestedQuestions.length > 0 && messages.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">推荐问题：</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, index) => (
                <button
                  key={index}
                  className="text-xs h-auto py-1 px-2 rounded-md transition-colors cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setInput(q)}
                >
                  {q}
                  <ChevronRight className="w-3 h-3 ml-1 inline" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 border-t bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题... (Enter 发送，Shift+Enter 换行)"
              className="flex-1 min-h-[50px] max-h-[150px] px-4 py-3 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={1}
              disabled={isLoading || !isConnected}
            />
            
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !isConnected}
              className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              size="lg"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>
              {isConnected ? '🔗 Hermes Gateway 已连接' : '⚠️ 未连接'}
            </span>
            <span>Powered by Hermes Agent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HermesChat;