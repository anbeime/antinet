/**
 * 增强版聊天机器人组件
 * 集成知识库查询、图片解析、技能调用
 * 参考: https://github.com/anbeime/skill/tree/main/projects
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Send, Bot, User,
  FileText, Table, Presentation, Search,
  Sparkles, ChevronRight, Loader2,
  Trash2,
  Upload, Mic, MicOff, Volume2, VolumeX,
  Music,
  Eye, Maximize2, Minimize2,
  Brain, GitBranch, FileSearch, CheckSquare,
  Network, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import enhancedChatService from '@/services/enhancedChatService';
import { getApiBaseUrl } from '@/lib/apiConfig';
import type {
  ChatMessage,
  CardReference,
  SkillResult,
  SceneType
} from '@/services/enhancedChatService';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import CardDetailModal from '@/components/CardDetailModal';

interface EnhancedChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  onCardClick?: (card: CardReference) => void;
}

// Markdown 渲染组件 - 中国风配色（参考日历组件）
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1" style={{ color: '#8b4513', fontFamily: 'KaiTi, STKaiti, serif' }}>{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-1" style={{ color: '#a0522d' }}>{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-1" style={{ color: '#b87333' }}>{children}</h3>,
        p: ({ children }) => <p className="text-xs leading-relaxed my-1" style={{ color: '#4a3728' }}>{children}</p>,
        ul: ({ children }) => <ul className="space-y-0.5 my-1 ml-3 list-disc list-outside">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-0.5 my-1 ml-3 list-decimal list-outside">{children}</ol>,
        li: ({ children }) => <li className="text-xs leading-relaxed" style={{ color: '#4a3728' }}>{children}</li>,
        strong: ({ children }) => <strong className="font-semibold" style={{ color: '#8b4513' }}>{children}</strong>,
        em: ({ children }) => <em className="italic" style={{ color: '#a0522d' }}>{children}</em>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-');
          return isBlock ? (
            <pre className="rounded-lg p-3 my-2 overflow-x-auto border" style={{ backgroundColor: '#faf5f0', borderColor: '#e8ddd0' }}>
              <code className="text-xs" style={{ color: '#6b4423' }} {...props}>{children}</code>
            </pre>
          ) : (
            <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#fef3e2', color: '#8b4513' }} {...props}>{children}</code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className="pl-3 my-2 rounded-r py-1" style={{ borderLeft: '3px solid #d4a574', backgroundColor: '#fef3e2' }}>
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-2" style={{ borderColor: '#e8ddd0' }} />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded border" style={{ borderColor: '#e8ddd0' }}>
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ backgroundColor: '#fef3e2' }}>{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1 text-left font-medium border-b" style={{ color: '#8b4513', borderColor: '#e8ddd0' }}>{children}</th>,
        td: ({ children }) => <td className="px-2 py-1 border-b" style={{ color: '#4a3728', borderColor: '#f0e6d8' }}>{children}</td>,
        a: ({ href, children }) => <a href={href} className="underline hover:opacity-80" style={{ color: '#b87333' }} target="_blank" rel="noopener noreferrer">{children}</a>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// 渲染消息内容组件 - 支持 markdown 渲染和 [点击跳转:url] 格式的链接
const MessageContent: React.FC<{ content: string; onClose: () => void }> = ({ content, onClose }) => {
  const navigate = useNavigate();

  if (!content) return null;

  // 匹配 [点击跳转:url] 格式
  const linkRegex = /\[点击跳转:([^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  const handleNavigate = (url: string) => {
    onClose(); // 关闭聊天框
    navigate(url); // 跳转到对应页面
  };
  
  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, url] = match;
    const beforeText = content.slice(lastIndex, match.index);
    
    // 添加链接前的文本（用 markdown 渲染）
    if (beforeText) {
      parts.push(<MarkdownContent key={`md-${lastIndex}`} content={beforeText} />);
    }
    
    // 添加可点击的按钮（使用navigate跳转）
    parts.push(
      <button
        key={`link-${match.index}`}
        onClick={() => handleNavigate(url)}
        className="inline-flex items-center gap-1 px-3 py-1.5 mt-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors cursor-pointer border-none"
      >
        <span>点击打开页面</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    );
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // 添加剩余的文本（用 markdown 渲染）
  const remainingText = content.slice(lastIndex);
  if (remainingText) {
    parts.push(<MarkdownContent key={`md-end`} content={remainingText} />);
  }
  
  return <>{parts}</>;
};

// 消息组件
const MessageBubble: React.FC<{
  message: ChatMessage;
  cards?: CardReference[];
  skillResult?: SkillResult;
  sceneType?: SceneType;
  onClose?: () => void;
  onCardClick?: (card: CardReference) => void;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}> = ({ message, cards, skillResult, sceneType, onClose, onCardClick, onSpeak, isSpeaking }) => {
  const isUser = message.role === 'user';
  const isSkill = message.role === 'skill';
  const [cardsCollapsed, setCardsCollapsed] = useState(false);

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
        isUser ? "" : isSkill ? "" : "bg-transparent"
      )} style={{ backgroundColor: isUser ? '#8b4513' : isSkill ? '#b87333' : undefined }}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isSkill ? (
          <Sparkles className="w-4 h-4 text-white" />
        ) : (
          <img src="/src/pages/logo.gif" alt="bot" className="w-8 h-8 rounded-full object-contain" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "max-w-[80%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 场景标签 */}
        {sceneType && sceneType !== 'general' && !isUser && (
          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#fef3e2', color: '#8b7355', border: '1px solid #e8ddd0' }}>
            {enhancedChatService.getSceneIcon(sceneType)} {enhancedChatService.getSceneName(sceneType)}
          </span>
        )}

        {/* 文本内容 */}
        <div className={cn(
          "px-4 py-2 rounded-2xl text-sm",
          isUser
            ? "rounded-br-md"
            : "rounded-bl-md"
        )} style={{
          backgroundColor: isUser ? '#8b4513' : '#fef3e2',
          color: isUser ? '#fff9f3' : '#4a3728',
          border: isUser ? 'none' : '1px solid #e8ddd0'
        }}>
          <div className="whitespace-pre-wrap">
            {isUser ? message.content : <MessageContent content={message.content} onClose={onClose || (() => {})} />}
          </div>
          {/* 语音播放按钮 - 仅助手消息显示 */}
          {!isUser && onSpeak && message.content && (
            <button
              onClick={() => onSpeak(message.content)}
              className="mt-1 flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent"
              style={{ color: '#8b4513' }}
              title={isSpeaking ? '停止朗读' : '朗读'}
            >
              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{isSpeaking ? '停止' : '朗读'}</span>
            </button>
          )}
        </div>

        {/* 图片显示 */}
        {message.metadata?.image_url && (
          <img
            src={message.metadata.image_url}
            alt="Uploaded"
            className="mt-2 max-w-full rounded-lg max-h-64 object-cover"
            style={{ border: '2px solid #d4a574' }}
          />
        )}

        {/* 卡片展示 - 可折叠，先推送显示 */}
        {cards && cards.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setCardsCollapsed(!cardsCollapsed)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors mb-2"
              style={{ backgroundColor: '#f5e6d3', color: '#8b4513' }}
            >
              <Sparkles className="w-3 h-3" />
              <span>相关卡片 {cards.length} 张</span>
              <ChevronRight className={cn("w-3 h-3 transition-transform", cardsCollapsed && "-rotate-90")} />
              <span className="ml-1 opacity-60">{cardsCollapsed ? '展开' : '收起'}</span>
            </button>
            {!cardsCollapsed && (
              <div className="space-y-2">
                {cards.slice(0, 10).map((card, idx) => {
                  const cardColors: Record<string, { bg: string; border: string; tag: string; title: string }> = {
                    blue: { bg: '#f0f5ff', border: '#4a90d9', tag: '#e6f0ff', title: '#1a4d8f' },
                    green: { bg: '#f0fff4', border: '#52c41a', tag: '#e6ffed', title: '#237804' },
                    yellow: { bg: '#fffbe6', border: '#faad14', tag: '#fff7e6', title: '#ad6b00' },
                    red: { bg: '#fff1f0', border: '#ff4d4f', tag: '#ffe6e6', title: '#a8071a' },
                  };
                  const colors = cardColors[card.card_type] || { bg: '#fff9f3', border: '#d4a574', tag: '#fef3e2', title: '#8b4513' };
                  return (
                    <div
                      key={card.id || idx}
                      className="rounded-lg shadow transition-all cursor-pointer hover:shadow-md"
                      style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderLeft: `4px solid ${colors.border}`,
                      }}
                      onClick={() => onCardClick?.(card)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: colors.tag, color: colors.title, border: `1px solid ${colors.border}40` }}>
                            {enhancedChatService.formatCardType(card.card_type)}
                          </span>
                          <span className="text-xs" style={{ color: '#8b7355' }}>
                            {enhancedChatService.formatSimilarity(card.match_score)}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-1 transition-colors" style={{ color: colors.title }}>{card.title || card.name || card.content}</h4>
                        <p className="text-xs line-clamp-2" style={{ color: '#6b5a4e' }}>
                          {card.content}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                          <Eye className="w-3 h-3" />
                          <span>点击查看卡片详情</span>
                        </div>
                      </CardContent>
                    </div>
                  );
                })}
                {cards.length > 10 && (
                  <div className="text-xs text-center" style={{ color: '#8b7355' }}>
                    还有 {cards.length - 10} 张相关卡片
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 技能结果 */}
        {skillResult && (
          <div className="mt-2 rounded-lg shadow-sm overflow-hidden" style={{ backgroundColor: '#fef3e2', border: '1px solid #d4a574' }}>
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: '#b87333' }} />
                <span className="font-medium text-sm" style={{ color: '#8b4513' }}>技能执行结果</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: skillResult.success ? '#f0fdf4' : '#fef2f2',
                  color: skillResult.success ? '#166534' : '#991b1b'
                }}>
                  {skillResult.success ? '成功' : '失败'}
                </span>
              </div>
              {skillResult.result && (
                <p className="text-sm" style={{ color: '#6b5a4e' }}>{skillResult.result}</p>
              )}
              {skillResult.file_path && (
                <div className="flex items-center gap-2 mt-2">
                  <FileText className="w-4 h-4" style={{ color: '#8b7355' }} />
                  <span className="text-sm flex-1 truncate" style={{ color: '#6b5a4e' }}>{skillResult.file_path}</span>
                  <button 
                    onClick={() => {
                      const fileName = skillResult.file_path?.split('/').pop() || '';
                      window.location.href = `/ppt-viewer?file=${encodeURIComponent(fileName)}`;
                    }}
                    className="px-3 py-1 text-xs rounded flex items-center gap-1 hover:opacity-80"
                    style={{ backgroundColor: '#b87333', color: 'white' }}
                  >
                    <Eye className="w-3 h-3" />
                    立即查看
                  </button>
                </div>
              )}
            </div>
          </div>
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
}> = ({ icon, label, onClick, color }) => (
  <button
    className="flex items-center gap-2 text-xs h-auto py-2 px-3 rounded-md transition-colors cursor-pointer"
    style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
    onClick={onClick}
  >
    <span className="p-1 rounded" style={{ backgroundColor: color || '#d4a574' }}>{icon}</span>
    {label}
  </button>
);

const CHAT_STORAGE_KEY = 'enhanced_chat_messages';

// 加载本地存储的聊天记录
const loadSavedMessages = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const decompressed = decompressMessages(saved);
      if (decompressed.length > 0) {
        return decompressed;
      }
    }
  } catch (e) {
    console.warn('加载聊天记录失败:', e);
  }
  return [];
};

// 压缩聊天记录（只保留必要字段，截断长内容）
const compressMessages = (messages: ChatMessage[]): string => {
  const compressed = messages.map(m => ({
    r: m.role,
    c: m.content.length > 2000 ? m.content.slice(0, 2000) + '...[已截断]' : m.content,
    t: m.timestamp
  }));
  return JSON.stringify(compressed);
};

// 解压聊天记录
const decompressMessages = (data: string): ChatMessage[] => {
  try {
    const parsed = JSON.parse(data);
    return parsed.map((m: { r: string; c: string; t?: string }) => ({
      role: m.r as MessageRole,
      content: m.c,
      timestamp: m.t
    }));
  } catch {
    return [];
  }
};

// 保存聊天记录到本地存储
const saveMessages = (messages: ChatMessage[]) => {
  try {
    const compressed = compressMessages(messages);
    localStorage.setItem(CHAT_STORAGE_KEY, compressed);
  } catch (e) {
    console.warn('保存聊天记录失败:', e);
  }
};

// 根据用户输入和对话上下文生成动态推荐问题
const generateLocalSuggestions = (query: string, hasImage: boolean, recentMessages?: ChatMessage[]): string[] => {
  const s: string[] = [];
  const q = query.toLowerCase();

  if (hasImage || q.includes('图片') || q.includes('图像') || q.includes('截图') || q.includes('照片')) {
    s.push('分析一下这张图片的详细内容');
    s.push('这张图片说明了什么问题');
    s.push('基于这张图片生成知识卡片');
  }

  if (q.includes('ppt') || q.includes('演示') || q.includes('幻灯片') || q.includes('文稿') || q.includes('工作总结')) {
    s.push('帮我完善这个PPT的结构');
    s.push('生成一份更详细的大纲');
    s.push('换一种风格重新生成');
  }

  if (q.includes('卡片') || q.includes('知识库') || q.includes('搜索') || q.includes('查找') || q.includes('查询') || q.includes('找') || q.includes('关于')) {
    const topic = query.replace(/(?:搜索|查找|找|查询|关于|帮我)\s*/g, '').replace(/(?:的)?(?:知识|卡片|资料|信息|相关内容)/g, '').trim();
    if (topic && topic.length < 20) {
      s.push(`帮我搜索更多关于${topic}的知识卡片`);
      s.push(`用四色卡片总结${topic}`);
    }
    s.push('这些卡片之间有什么关联');
    s.push('基于这些卡片生成一个报告');
  }

  if (q.includes('excel') || q.includes('表格') || q.includes('电子表格') || q.includes('xlsx') || q.includes('csv')) {
    s.push('对这份数据进行可视化分析');
    s.push('总结数据中的关键趋势');
    s.push('生成数据分析报告');
  }

  if (q.includes('总结') || q.includes('摘要') || q.includes('概括') || q.includes('提炼')) {
    s.push('提炼出核心要点');
    s.push('生成一份详细的报告');
    s.push('将总结内容保存为知识卡片');
  }

  if (q.includes('对比') || q.includes('比较') || q.includes('区别') || q.includes('差异')) {
    s.push('用表格展示对比结果');
    s.push('哪个方案更优');
    s.push('总结各自的优缺点');
  }

  if (q.includes('风险') || q.includes('问题') || q.includes('注意') || q.includes('警告')) {
    s.push('如何规避这些风险');
    s.push('制定应对措施');
    s.push('创建风险卡片存档');
  }

  if (q.includes('项目') || q.includes('任务') || q.includes('计划') || q.includes('规划')) {
    s.push('制定详细的项目计划');
    s.push('生成项目进度时间线');
    s.push('需要哪些资源支持');
  }

  if (q.includes('word') || q.includes('文档') || q.includes('报告') || q.includes('文章') || q.includes('论文')) {
    s.push('调整文档的格式和样式');
    s.push('导出为PDF格式');
    s.push('在文档中插入图表');
  }

  if (q.includes('pdf') || q.includes('文件') || q.includes('上传') || q.includes('导入')) {
    s.push('提取文档的核心内容');
    s.push('将文档转换为知识卡片');
    s.push('文档中有哪些关键数据');
  }

  if (q.includes('管理') || q.includes('团队') || q.includes('协作') || q.includes('协同')) {
    s.push('如何提高团队协作效率');
    s.push('推荐协作工具和方法');
    s.push('建立团队知识库');
  }

  if (q.includes('学习') || q.includes('教程') || q.includes('教学') || q.includes('培训') || q.includes('课程')) {
    s.push('制定学习计划');
    s.push('生成学习笔记卡片');
    s.push('推荐相关学习资源');
  }

  // 根据对话上下文生成连续性推荐
  if (s.length === 0 && recentMessages && recentMessages.length >= 2) {
    const lastAssistantMsg = [...recentMessages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      const lastContent = lastAssistantMsg.content.toLowerCase();
      if (lastContent.includes('卡片') || lastContent.includes('知识')) {
        s.push('这些信息如何应用到实际工作中');
        s.push('帮我梳理一下这些知识点');
      } else if (lastContent.includes('ppt') || lastContent.includes('演示')) {
        s.push('调整PPT的主题风格');
        s.push('在PPT中添加图表和数据');
      } else if (lastContent.includes('数据') || lastContent.includes('分析')) {
        s.push('这些数据说明了什么趋势');
        s.push('基于数据给出建议');
      }
    }
  }

  if (s.length === 0) {
    s.push('帮我搜索相关知识卡片');
    s.push('能详细展开说明一下吗');
    s.push('我可以使用哪些功能');
  }

  // 去重并返回前3个
  const unique: string[] = [];
  for (const item of s) {
    if (!unique.includes(item)) unique.push(item);
    if (unique.length >= 3) break;
  }
  return unique;
};

export const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({ isOpen, onClose, onCardClick }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [evolutionMode, setEvolutionMode] = useState(() => {
    return localStorage.getItem('evolutionMode') === 'true';
  });
  const [workflowMode, setWorkflowMode] = useState(() => {
    return localStorage.getItem('workflowMode') === 'true';
  });
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [detectedIntent, setDetectedIntent] = useState<{
    primary: string;
    name: string;
    emoji: string;
    confidence: number;
  } | null>(null);
  
  // 卡片详情弹窗状态
  const [selectedCard, setSelectedCard] = useState<CardReference | null>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  
  // 快捷操作展开状态
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // 图片相关状态
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  
  // 音频文件相关状态
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  
  // 语音相关状态
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    return localStorage.getItem('autoSpeak') === 'true';
  });
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

// 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `你好！我是小易。

我可以帮您：
📝 创建四色知识卡片 - 从对话、文档中提取
🔍 搜索知识库 - 语义搜索，精准查询
📊 生成PPT演示 - 快速创建专业演示文稿
📄 分析文档/PDF - 多格式文档智能分析
✅ 管理GTD任务 - 个人工作流管理
🔗 构建知识图谱 - 发现隐藏知识关联
🔄 智能工作流 - 文献综述/项目复盘/竞品分析/风险评估

💡 开启工作流模式可体验自动化工作流编排！

有什么可以帮您的吗？`,
        timestamp: new Date().toISOString()
      }]);
      setSuggestedQuestions([
        "帮我搜索关于项目管理的知识卡片",
        "分析一下这张图片",
        "生成一个工作总结的PPT",
        "启动文献综述工作流"
      ]);
    }
  }, [isOpen]);

  // 聊天记录持久化到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // 监听消息内容变化时也滚动
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      // 有新内容时延迟滚动，确保 DOM 已更新
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 图片处理函数
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

      // 读取完整 DataURL（供显示）+ 裸 Base64（供 API）
      const reader = new FileReader();
      reader.onload = () => {
        const fullDataUrl = reader.result as string;
        const base64 = fullDataUrl.split(',')[1];
        setImageData(base64);
        setImageDataUrl(fullDataUrl);
      };
      reader.onerror = () => {
        console.error('图片转换失败');
        toast.error('图片处理失败');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageData(null);
    setImageDataUrl(null);
    if (previewUrl) {
      const oldUrl = previewUrl;
      setPreviewUrl(null);          // 先置空，React 不会再挂载旧 img
      setTimeout(() => URL.revokeObjectURL(oldUrl), 100); // 延迟释放
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('请选择音频文件');
        return;
      }
      setSelectedAudio(file);
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
      setAudioTranscribing(true);

      try {
        const formData = new FormData();
        const ext = file.name.split('.').pop() || 'mp3';
        formData.append('file', file, `audio.${ext}`);
        formData.append('language', 'zh');
        formData.append('model_size', 'base');

        const response = await fetch(getApiBaseUrl() + '/api/speech/stt/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const transcript = result.text?.trim();

          if (transcript) {
            setInput(transcript);
            toast.success(`识别: ${transcript}`, { duration: 2000 });
          } else {
            toast.error('未识别到语音内容，请重试');
          }
        } else {
          const error = await response.json().catch(() => ({ detail: '识别失败' }));
          toast.error(error.detail || '语音识别失败，请重试');
        }
      } catch (err) {
        console.error('STT 请求失败:', err);
        toast.error('语音识别服务不可用，请确保后端服务已启动');
      } finally {
        setAudioTranscribing(false);
        if (audioInputRef.current) {
          audioInputRef.current.value = '';
        }
      }
    }
  };

  const handleRemoveAudio = () => {
    setSelectedAudio(null);
    if (audioPreviewUrl) {
      const oldUrl = audioPreviewUrl;
      setAudioPreviewUrl(null);
      URL.revokeObjectURL(oldUrl);
    }
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  // ============ 语音功能 ============
  
  // 初始化语音合成
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // 语音识别（ASR）- 使用后端 Whisper 进行语音识别（更准确，不需要联网）
  const toggleListening = async () => {
    if (isListening) {
      // 停止录音
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      // 请求麦克风权限并开始录音
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.length === 0) {
          toast.error('未录制到音频，请重试');
          setIsListening(false);
          return;
        }
        
        // 合并音频块
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        
        try {
          // 发送到后端进行 STT 识别
          const formData = new FormData();
          formData.append('file', audioBlob, `recording.${mediaRecorder.mimeType.includes('webm') ? 'webm' : 'mp4'}`);
          formData.append('language', 'zh');
          formData.append('model_size', 'base');
          
          const response = await fetch(getApiBaseUrl() + '/api/speech/stt/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            const transcript = result.text?.trim();
            
            if (transcript) {
              setInput(transcript);
              toast.success(`识别: ${transcript}`, { duration: 2000 });
              setTimeout(() => handleSendWithText(transcript, imageData || undefined, imageDataUrl || undefined), 300);
            } else {
              toast.error('未识别到语音内容，请重试');
            }
          } else {
            const error = await response.json().catch(() => ({ detail: '识别失败' }));
            toast.error(error.detail || '语音识别失败，请重试');
          }
        } catch (err) {
          console.error('STT 请求失败:', err);
          toast.error('语音识别服务不可用，请确保后端服务已启动');
        }
        
        setIsListening(false);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('录音错误:', event);
        stream.getTracks().forEach(track => track.stop());
        toast.error('录音失败，请重试');
        setIsListening(false);
      };
      
      mediaRecorder.start();
      setIsListening(true);
      toast.success('开始录音，请说话...', { duration: 1500 });
      
    } catch (err) {
      console.error('获取麦克风失败:', err);
      if ((err as Error).name === 'NotAllowedError') {
        toast.error('请允许使用麦克风');
      } else {
        toast.error('无法访问麦克风，请检查权限设置');
      }
      setIsListening(false);
    }
  };

  // 语音合成（TTS）- 优先后端 Edge-TTS，回退浏览器 TTS
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, (m) => m.replace(/`/g, ''))
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
      .replace(/^>\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/\|/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
      .trim();
  };

  const speakText = async (text: string) => {
    // 停止当前播放
    if (isSpeaking) {
      synthRef.current?.cancel();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    try {
      const response = await fetch(getApiBaseUrl() + '/api/speech/tts/speak-bytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice: 'zh-CN-XiaoxiaoNeural' }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('audio/mpeg')) {
          // 后端返回了音频文件
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
            // 回退到浏览器 TTS
            _browserTTS(cleanText);
          };
          audio.play();
          return;
        }
      }
    } catch {
      // 后端 TTS 不可用
    }

    // 回退到浏览器 TTS
    _browserTTS(cleanText);
  };

  const _browserTTS = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // 选择中文女声
    const voices = synthRef.current.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh') && v.name.includes('Xiao')) 
      || voices.find(v => v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };



  // 发送消息
  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    await handleSendWithText(input.trim(), imageData || undefined, imageDataUrl || undefined);
  };

  const handleSendWithText = async (text: string, imgData?: string, imgDisplayUrl?: string) => {
    if (!text.trim() && !imgData) return;

    const query = text.trim();
    setInput('');
    setIsLoading(true);

    try {
      const userMessage: ChatMessage = {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
        metadata: {
          image_url: imgDisplayUrl || undefined
        }
      };
      setMessages(prev => [...prev, userMessage]);

      // 工作流模式：先检测意图
      if (workflowMode && query.length > 3) {
        try {
          const intentResult = await enhancedChatService.detectIntent(query, false);  // 正则匹配，不走LLM
          if (intentResult.success && intentResult.intent) {
            setDetectedIntent({
              primary: intentResult.intent.primary,
              name: intentResult.intent.primary_name,
              emoji: intentResult.intent.primary_emoji,
              confidence: intentResult.intent.confidence,
            });
            
            // 如果是复杂工作流意图，自动启动工作流
            if (intentResult.intent.primary === 'complex_workflow' || 
                intentResult.intent.primary === 'analyze_document' ||
                intentResult.intent.primary === 'generate_ppt') {
              const wfResult = await enhancedChatService.startWorkflow(query);
              if (wfResult.success && wfResult.execution_id) {
                setActiveWorkflowId(wfResult.execution_id);
                toast.success(`🚀 工作流已启动: ${wfResult.intent?.name} (${wfResult.total_steps}步)`);
              }
            }
          }
        } catch (e) {
          console.warn('意图检测失败:', e);
        }
      }

      let response;
      
      if (evolutionMode) {
        // 自进化模式 - 调用自进化聊天 API
        try {
          const evoResponse = await fetch(getApiBaseUrl() + '/api/evolving-chat/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              context: imgData ? { image: imgData } : {},
              enable_evolution: true,
              enable_memory: true,
              enable_skill: true,
              user_id: 'default_user'
            })
          });
          
          if (evoResponse.ok) {
            const evoData = await evoResponse.json();
            response = {
              reply: evoData.response,
              scene_type: 'general',
              cards: evoData.cards || [],
              skill_result: evoData.skill_used ? { result: evoData.skill_used } : null,
              suggestions: evoData.suggested_questions || []
            };
          } else {
            throw new Error('自进化API调用失败');
          }
        } catch (e) {
          console.error('自进化聊天失败:', e);
          toast.error('自进化模式暂时不可用，已切换到普通模式');
          setEvolutionMode(false);
          response = await enhancedChatService.sendMessage(query, { imageData: imgData });
        }
        
        const replyContent = response.reply || '抱歉，我暂时无法回答这个问题。请尝试换个方式提问。';
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: replyContent,
          timestamp: new Date().toISOString(),
          metadata: {
            scene_type: response.scene_type,
            cards: response.cards,
            skill_result: response.skill_result
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
        const localSuggestions = generateLocalSuggestions(query, !!imgData, messages);
        const mergedSuggestions = response.suggestions && response.suggestions.length > 0
          ? response.suggestions
          : localSuggestions;
        setSuggestedQuestions(mergedSuggestions.slice(0, 3));

        if (autoSpeak && replyContent) {
          synthRef.current?.cancel();
          if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
          setTimeout(() => speakText(replyContent), 300);
        }
      } else {
        // 普通模式 — SSE 流式输出
        const apiBase = getApiBaseUrl();
        setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString(), metadata: {} }]);
        let fullContent = '';

        try {
          const res = await fetch(`${apiBase}/api/chat/enhanced/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, image_data: imgData, session_id: 'default_user' })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const reader = res.body?.getReader();
          if (!reader) throw new Error('无响应流');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const block of parts) {
              if (!block.trim()) continue;
              const lines = block.split('\n');
              let eventType = '', dataStr = '';
              for (const l of lines) {
                if (l.startsWith('event:')) eventType = l.slice(6).trim();
                if (l.startsWith('data:')) dataStr = l.slice(5).trim();
              }
              if (!eventType || !dataStr) continue;
              if (eventType === 'token') {
                try {
                  fullContent += JSON.parse(dataStr).content;
                  setMessages(prev => { const u = [...prev]; const m = u[u.length - 1]; if (m?.role === 'assistant') u[u.length - 1] = { ...m, content: fullContent }; return u; });
                } catch {}
              } else if (eventType === 'meta') {
                try {
                  const d = JSON.parse(dataStr);
                  if (d.cards) {
                    // 转换卡片数据，确保有 match_score 和其他必要字段
                    const transformedCards = d.cards.map((c: any) => ({
                      id: c.id || c.card_id || '',
                      card_type: c.card_type || 'blue',
                      title: c.title || '',
                      content: c.content || '',
                      match_score: c.match_score ?? c.similarity ?? 0,
                      color: c.color || 'blue'
                    }));
                    setMessages(prev => { const u = [...prev]; const m = u[u.length - 1]; if (m?.role === 'assistant') u[u.length - 1] = { ...m, metadata: { ...m.metadata, cards: transformedCards } }; return u; });
                  }
                } catch {}
              } else if (eventType === 'done') {
                try {
                  const d = JSON.parse(dataStr);
                  // 转换卡片数据
                  const transformedCards = (d.cards || []).map((c: any) => ({
                    id: c.id || c.card_id || '',
                    card_type: c.card_type || 'blue',
                    title: c.title || '',
                    content: c.content || '',
                    match_score: c.match_score ?? c.similarity ?? 0,
                    color: c.color || 'blue'
                  }));
                  setMessages(prev => { const u = [...prev]; const m = u[u.length - 1]; if (m?.role === 'assistant') u[u.length - 1] = { ...m, content: d.full_text || fullContent, metadata: { scene_type: d.scene_type, cards: transformedCards, skill_result: d.skill_result } }; return u; });
                  setSuggestedQuestions(generateLocalSuggestions(query, !!imgData, messages).slice(0, 3));
                  if (autoSpeak && fullContent) {
                    synthRef.current?.cancel();
                    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
                    setTimeout(() => speakText(fullContent), 300);
                  }
                } catch {}
              } else if (eventType === 'error') {
                try { throw new Error(JSON.parse(dataStr).error); } catch {}
              }
            }
          }
        } catch (e: any) {
          console.error('流式输出失败，回退到普通模式:', e);
          // 移除空白助手消息
          setMessages(prev => prev.filter(m => m.content !== '' || m.role !== 'assistant'));
          response = await enhancedChatService.sendMessage(query, { imageData: imgData });
          const replyContent = response.reply || '抱歉，我暂时无法回答这个问题。请尝试换个方式提问。';
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: replyContent,
            timestamp: new Date().toISOString(),
            metadata: { scene_type: response.scene_type, cards: response.cards, skill_result: response.skill_result }
          };
          setMessages(prev => [...prev, assistantMessage]);
          setSuggestedQuestions(generateLocalSuggestions(query, !!imgData, messages).slice(0, 3));
          if (autoSpeak && replyContent) {
            synthRef.current?.cancel();
            if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
            setTimeout(() => speakText(replyContent), 300);
          }
        }
      }


    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送失败，请重试: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
      handleRemoveImage();
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

  // 关闭卡片详情弹窗
  const handleCloseCardDetail = () => {
    setShowCardDetail(false);
    setSelectedCard(null);
  };

  // 快捷操作 - 直接跳转到对应页面
  const quickActions = [
    {
      icon: <Search className="w-3 h-3" />,
      label: "查卡片",
      onClick: () => {
        setInput("帮我搜索关于");
        textareaRef.current?.focus();
      },
      color: "#8b4513"
    },
    {
      icon: <Presentation className="w-3 h-3" />,
      label: "生成PPT",
      onClick: () => {
        setInput("生成一个PPT报告：");
        textareaRef.current?.focus();
      },
      color: "#a0522d"
    },
    {
      icon: <Sparkles className="w-3 h-3" />,
      label: "创建卡片",
      onClick: () => {
        setInput("帮我创建知识卡片：");
        textareaRef.current?.focus();
      },
      color: "#b87333"
    },
    {
      icon: <FileText className="w-3 h-3" />,
      label: "分析文档",
      onClick: () => {
        onClose();
        navigate('/pdf-analysis');
      },
      color: "#cd853f"
    },
    {
      icon: <GitBranch className="w-3 h-3" />,
      label: "文献综述",
      onClick: async () => {
        if (workflowMode) {
          try {
            const result = await enhancedChatService.startWorkflow('启动文献综述工作流');
            if (result.success && result.execution_id) {
              setActiveWorkflowId(result.execution_id);
              toast.success(`工作流已启动: ${result.intent?.name || '文献综述'} (${result.total_steps}步)`);
              setInput(`文献综述：`);
              textareaRef.current?.focus();
            }
          } catch (e) {
            toast.error('启动工作流失败');
          }
        } else {
          setInput("帮我做一个文献综述，主题是：");
          textareaRef.current?.focus();
        }
      },
      color: "#6b8e23"
    },
    {
      icon: <CheckSquare className="w-3 h-3" />,
      label: "GTD任务",
      onClick: () => {
        setInput("管理我的任务：");
        textareaRef.current?.focus();
      },
      color: "#4169e1"
    },
    {
      icon: <Network className="w-3 h-3" />,
      label: "知识图谱",
      onClick: () => {
        onClose();
        navigate('/knowledge-graph');
      },
      color: "#9370db"
    },
    {
      icon: <FileSearch className="w-3 h-3" />,
      label: "项目复盘",
      onClick: async () => {
        if (workflowMode) {
          try {
            const result = await enhancedChatService.startWorkflow('启动项目复盘工作流');
            if (result.success && result.execution_id) {
              setActiveWorkflowId(result.execution_id);
              toast.success(`工作流已启动: ${result.intent?.name || '项目复盘'} (${result.total_steps}步)`);
              setInput(`项目复盘：`);
              textareaRef.current?.focus();
            }
          } catch (e) {
            toast.error('启动工作流失败');
          }
        } else {
          setInput("帮我做一个项目复盘：");
          textareaRef.current?.focus();
        }
      },
      color: "#dc143c"
    },
    {
      icon: <Table className="w-3 h-3" />,
      label: "竞品分析",
      onClick: async () => {
        if (workflowMode) {
          try {
            const result = await enhancedChatService.startWorkflow('启动竞品分析工作流');
            if (result.success && result.execution_id) {
              setActiveWorkflowId(result.execution_id);
              toast.success(`工作流已启动: ${result.intent?.name || '竞品分析'} (${result.total_steps}步)`);
              setInput(`竞品分析：`);
              textareaRef.current?.focus();
            }
          } catch (e) {
            toast.error('启动工作流失败');
          }
        } else {
          setInput("帮我做一个竞品分析，用表格对比：");
          textareaRef.current?.focus();
        }
      },
      color: "#2e8b57"
    },
    {
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "风险评估",
      onClick: async () => {
        if (workflowMode) {
          try {
            const result = await enhancedChatService.startWorkflow('启动风险评估工作流');
            if (result.success && result.execution_id) {
              setActiveWorkflowId(result.execution_id);
              toast.success(`工作流已启动: ${result.intent?.name || '风险评估'} (${result.total_steps}步)`);
              setInput(`风险评估：`);
              textareaRef.current?.focus();
            }
          } catch (e) {
            toast.error('启动工作流失败');
          }
        } else {
          setInput("帮我做一次风险评估：");
          textareaRef.current?.focus();
        }
      },
      color: "#ff8c00"
    },
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
          className={cn(
            "rounded-2xl shadow-2xl flex flex-col overflow-hidden",
            isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "w-full max-w-2xl"
          )}
          style={{ 
            backgroundColor: '#fff9f3', 
            border: '1px solid #e8ddd0',
            height: isFullscreen ? '100vh' : '80vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 - 中国风 */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #8b4513, #d4a574)', borderBottom: '2px solid #d4a574' }}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white truncate" style={{ fontFamily: 'KaiTi, STKaiti, serif' }}>小易</h3>
                <p className="text-xs text-white/80 hidden sm:block">
                  知识库查询 · 技能调用 · 深度思考
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className="p-2 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? '退出全屏' : '全屏模式'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <span className="hidden sm:inline-flex items-center gap-1">
                <button
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${evolutionMode ? 'bg-purple-500/50' : 'text-white/60 hover:bg-white/20'}`}
                  onClick={() => {
                    const newVal = !evolutionMode;
                    setEvolutionMode(newVal);
                    localStorage.setItem('evolutionMode', String(newVal));
                    toast.success(newVal ? '已开启自进化模式 (8-Agent+四色卡片)' : '已关闭自进化模式', { duration: 2000 });
                  }}
                  title={evolutionMode ? '关闭自进化模式' : '开启自进化模式 - 启用8-Agent和四色卡片提取'}
                >
                  <Brain className="w-5 h-5" />
                </button>
                <button
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${workflowMode ? 'bg-green-500/50' : 'text-white/60 hover:bg-white/20'}`}
                  onClick={() => {
                    const newVal = !workflowMode;
                    setWorkflowMode(newVal);
                    localStorage.setItem('workflowMode', String(newVal));
                    toast.success(newVal ? '已开启工作流模式 (智能编排)' : '已关闭工作流模式', { duration: 2000 });
                  }}
                  title={workflowMode ? '关闭工作流模式' : '开启工作流模式 - 自动识别意图并编排工作流'}
                >
                  <GitBranch className="w-5 h-5" />
                </button>
                <button
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${autoSpeak ? 'bg-white/30' : 'text-white/60 hover:bg-white/20'}`}
                  onClick={() => {
                    const newVal = !autoSpeak;
                    setAutoSpeak(newVal);
                    localStorage.setItem('autoSpeak', String(newVal));
                    if (!newVal) {
                      synthRef.current?.cancel();
                      if (currentAudioRef.current) {
                        currentAudioRef.current.pause();
                        currentAudioRef.current = null;
                      }
                      setIsSpeaking(false);
                    }
                    toast.success(newVal ? '已开启自动朗读' : '已关闭自动朗读', { duration: 1500 });
                  }}
                  title={autoSpeak ? '关闭自动朗读' : '开启自动朗读'}
                >
                  {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </span>
              <button
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                onClick={handleClear}
                title="清空对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 消息区域 */}
          <div className="flex-1 p-4 overflow-y-auto pb-36" style={{ backgroundColor: '#faf8f5' }}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  cards={message.metadata?.cards}
                  skillResult={message.metadata?.skill_result}
                  sceneType={message.metadata?.scene_type}
                  onClose={onClose}
                  onCardClick={onCardClick}
                  onSpeak={speakText}
                  isSpeaking={isSpeaking}
                />
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                  style={{ color: '#8b7355' }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">思考中...</span>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 意图识别结果 */}
          {detectedIntent && workflowMode && (
            <div className="px-4 py-2" style={{ backgroundColor: '#f0faf0', borderTop: '1px solid #c8e6c9' }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">{detectedIntent.emoji}</span>
                <span style={{ color: '#2e7d32' }}>
                  意图识别: <strong>{detectedIntent.name}</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#c8e6c9', color: '#1b5e20' }}>
                  {(detectedIntent.confidence * 100).toFixed(0)}%
                </span>
                {activeWorkflowId && (
                  <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#d4e157', color: '#827717' }}>
                    🔄 工作流运行中
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 建议问题 */}
          {suggestedQuestions.length > 0 && (
            <div className="px-4 py-2" style={{ backgroundColor: '#fef3e2', borderTop: '1px solid #e8ddd0' }}>
              <p className="text-xs mb-2" style={{ color: '#8b7355' }}>推荐问题：</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="text-xs h-auto py-1 px-2 rounded-md transition-colors cursor-pointer"
                    style={{ backgroundColor: '#fff9f3', color: '#8b4513', border: '1px solid #e8ddd0' }}
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                    <ChevronRight className="w-3 h-3 ml-1 inline" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 图片预览 */}
          {previewUrl && (
            <div className="px-4 py-2" style={{ backgroundColor: '#fef3e2', borderTop: '1px solid #e8ddd0' }}>
              <div className="flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg"
                  style={{ border: '2px solid #d4a574' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#8b4513' }}>{selectedImage?.name}</p>
                  <p className="text-xs" style={{ color: '#8b7355' }}>
                    {selectedImage ? (selectedImage.size / 1024).toFixed(1) : 0} KB
                  </p>
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: '#8b7355' }}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 音频预览 */}
          {audioPreviewUrl && (
            <div className="px-4 py-2" style={{ backgroundColor: '#fef3e2', borderTop: '1px solid #e8ddd0' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 flex items-center justify-center rounded-lg"
                  style={{ border: '2px solid #d4a574', backgroundColor: '#fff9f3' }}
                >
                  <Music className="w-8 h-8" style={{ color: '#8b4513' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#8b4513' }}>{selectedAudio?.name}</p>
                  <p className="text-xs" style={{ color: '#8b7355' }}>
                    {selectedAudio ? (selectedAudio.size / 1024).toFixed(1) : 0} KB
                    {audioTranscribing && ' - 识别中...'}
                  </p>
                  <audio src={audioPreviewUrl} controls className="h-8 w-full mt-1" />
                </div>
                <button
                  onClick={handleRemoveAudio}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: '#8b7355' }}
                  disabled={isLoading || audioTranscribing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 快捷操作 - 可折叠 */}
          <div className="hidden md:block border-t" style={{ borderColor: '#e8ddd0' }}>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{ color: '#8b4513', backgroundColor: '#fef3e2' }}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                快捷操作
              </span>
              <ChevronRight className={cn("w-4 h-4 transition-transform", showQuickActions && "rotate-90")} />
            </button>
            {showQuickActions && (
              <div className="px-4 py-3 flex flex-wrap gap-2" style={{ backgroundColor: '#faf8f5' }}>
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
            )}
          </div>

          {/* 输入区域 */}
          <div className="p-4" style={{ backgroundColor: '#fff9f3', borderTop: '2px solid #d4a574' }}>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
              <input
                type="file"
                ref={audioInputRef}
                className="hidden"
                accept="audio/*"
                onChange={handleAudioSelect}
              />
              
              <button
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="上传图片"
              >
                <Upload className="w-4 h-4" />
              </button>
              
              <button
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: audioTranscribing ? '#d4a574' : '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
                onClick={() => audioInputRef.current?.click()}
                disabled={isLoading || audioTranscribing}
                title="上传音频转文字"
              >
                {audioTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
              </button>
              
              {/* 语音输入按钮 */}
              <button
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{
                  backgroundColor: isListening ? '#8b4513' : '#fef3e2',
                  color: isListening ? '#fff9f3' : '#8b4513',
                  border: isListening ? '2px solid #8b4513' : '1px solid #e8ddd0'
                }}
                onClick={toggleListening}
                disabled={isLoading}
                title={isListening ? '停止录音' : '语音输入'}
              >
                {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>
              
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
                  placeholder={isListening ? "正在聆听..." : "输入消息... (Shift+Enter换行)"}
                  className="w-full min-h-[44px] max-h-[120px] px-3 py-2 text-sm rounded-md resize-none focus:outline-none"
                  style={{ backgroundColor: '#fef3e2', border: '1px solid #e8ddd0', color: '#4a3728' }}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage && !selectedAudio)}
                className="p-2 text-white rounded-md transition-colors flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: '#8b4513' }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            {isListening && (
              <div className="mt-1 text-xs flex items-center gap-1" style={{ color: '#8b4513' }}>
                <Mic className="w-3 h-3 animate-pulse" />
                <span>正在聆听，请说话...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* 卡片详情弹窗 */}
        {showCardDetail && selectedCard && (
          <CardDetailModal
            isOpen={showCardDetail}
            onClose={handleCloseCardDetail}
            card={{
              id: selectedCard.id,
              color: selectedCard.color as 'blue' | 'green' | 'yellow' | 'red',
              title: selectedCard.title,
              content: selectedCard.content,
              address: '',
              createdAt: new Date().toISOString(),
              relatedCards: [],
              projectId: undefined,
            }}
            allCards={[]}
            onDelete={() => {}}
            onRelatedCardClick={() => {}}
            onUpdateCard={() => {}}
            onCreateRecommendedCard={() => {}}
            refreshTrigger={0}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedChatBot;
