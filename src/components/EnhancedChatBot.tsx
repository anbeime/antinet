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
  Trash2, FileType, FileSpreadsheet,
  Upload, Mic, MicOff, Volume2, VolumeX,
  Download, Eye, Maximize2, Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import enhancedChatService from '@/services/enhancedChatService';
import type {
  ChatMessage,
  CardReference,
  SkillResult,
  SceneType
} from '@/services/enhancedChatService';
import { fileToBase64 } from '@/services/visionService';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
          <div className="whitespace-pre-wrap"><MessageContent content={message.content} onClose={onClose || (() => {})} /></div>
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

        {/* 卡片展示 - 保持原有漂亮样式，仅微调边框色 */}
        {cards && cards.length > 0 && (
          <div className="space-y-2 mt-2">
            {cards.slice(0, 3).map((card, idx) => (
              <div
                key={card.id || idx}
                className={`rounded-lg shadow transition-all ${onCardClick ? 'cursor-pointer hover:shadow-md' : ''}`}
                style={{
                  backgroundColor: '#fff9f3',
                  borderLeft: '4px solid #d4a574',
                  border: '1px solid #e8ddd0',
                  borderLeftWidth: '4px',
                  borderLeftColor: '#d4a574'
                }}
                onClick={() => onCardClick?.(card)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}>
                      {enhancedChatService.formatCardType(card.card_type)}
                    </span>
                    <span className="text-xs" style={{ color: '#8b7355' }}>
                      {enhancedChatService.formatSimilarity(card.match_score)}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm mb-1 transition-colors" style={{ color: '#8b4513' }}>{card.title}</h4>
                  <p className="text-xs line-clamp-2" style={{ color: '#6b5a4e' }}>
                    {card.content}
                  </p>
                </CardContent>
              </div>
            ))}
            {cards.length > 3 && (
              <div className="text-xs text-center" style={{ color: '#8b7355' }}>
                还有 {cards.length - 3} 张相关卡片
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

export const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({ isOpen, onClose, onCardClick }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 图片相关状态
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  
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

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `你好！我是小易。

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
      
      // 转换为Base64
      fileToBase64(file).then(base64 => {
        setImageData(base64);
      }).catch(error => {
        console.error('图片转换失败:', error);
        toast.error('图片处理失败');
      });
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageData(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          
          const response = await fetch('http://localhost:8000/api/speech/stt/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            const transcript = result.text?.trim();
            
            if (transcript) {
              setInput(transcript);
              toast.success(`识别: ${transcript}`, { duration: 2000 });
              setTimeout(() => handleSendWithText(transcript, imageData || undefined), 300);
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
      const response = await fetch('http://localhost:8000/api/speech/tts/speak-bytes', {
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
    await handleSendWithText(input.trim(), imageData || undefined);
  };

  const handleSendWithText = async (text: string, imgData?: string) => {
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
          image_url: previewUrl || undefined
        }
      };
      setMessages(prev => [...prev, userMessage]);

      const response = await enhancedChatService.sendMessage(query, {
        imageData: imgData
      });
      
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
      setSuggestedQuestions(response.suggestions || []);

      // 自动朗读
      if (autoSpeak && replyContent) {
        // 停止当前朗读
        synthRef.current?.cancel();
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        setTimeout(() => speakText(replyContent), 300);
      }


    } catch (error) {
      toast.error('发送失败，请重试');
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

  // 快捷操作 - 直接跳转到对应页面
  const quickActions = [
    {
      icon: <Search className="w-3 h-3" />,
      label: "查卡片",
      onClick: () => {
        onClose();
        navigate('/');
        setTimeout(() => {
          const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
          }
        }, 100);
      },
      color: "#8b4513"
    },
    {
      icon: <Presentation className="w-3 h-3" />,
      label: "生成PPT",
      onClick: () => {
        onClose();
        navigate('/ppt-analysis');
      },
      color: "#a0522d"
    },
    {
      icon: <Table className="w-3 h-3" />,
      label: "分析Excel",
      onClick: () => {
        onClose();
        navigate('/excel-analysis');
      },
      color: "#b87333"
    },
    {
      icon: <FileType className="w-3 h-3" />,
      label: "PDF分析",
      onClick: () => {
        onClose();
        navigate('/pdf-analysis');
      },
      color: "#cd853f"
    },
    {
      icon: <FileSpreadsheet className="w-3 h-3" />,
      label: "格式转换",
      onClick: () => {
        onClose();
        navigate('/pdf-analysis');
      },
      color: "#d4a574"
    },
    {
      icon: <Sparkles className="w-3 h-3" />,
      label: "NPU分析",
      onClick: () => {
        onClose();
        navigate('/npu-analysis');
      },
      color: "#8b7355"
    },
    {
      icon: <Sparkles className="w-3 h-3" />,
      label: "深度思考",
      onClick: () => {
        setInput("请帮我深度分析：");
        textareaRef.current?.focus();
      },
      color: "#6b4423"
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'KaiTi, STKaiti, serif' }}>小易</h3>
                <p className="text-xs text-white/80">
                  知识库查询 · 技能调用 · 深度思考
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg text-white/60 hover:bg-white/20 transition-colors"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? '退出全屏' : '全屏模式'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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
          <div className="flex-1 p-4 overflow-y-auto" style={{ backgroundColor: '#faf8f5' }}>
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

          {/* 快捷操作 */}
          <div className="px-4 py-2" style={{ borderTop: '1px solid #e8ddd0' }}>
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
          <div className="p-4" style={{ backgroundColor: '#fff9f3', borderTop: '2px solid #d4a574' }}>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
              
              <button
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="w-4 h-4" />
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
                disabled={isLoading || (!input.trim() && !selectedImage)}
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
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedChatBot;
