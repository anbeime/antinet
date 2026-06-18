import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Upload, Loader, Mic, MicOff, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { getApiBaseUrl } from '@/lib/apiConfig';

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
      content: '你好！我是小易视觉助手。\n\n🍵 我支持图片分析功能，可以上传图片进行智能分析，基于本地 NPU 模型运行，数据不出域。\n\n有什么可以帮您的？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "帮我搜索关于项目管理的知识卡片",
    "分析一下这张图片",
    "生成一个工作总结的PPT"
  ]);

  // 语音相关状态
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

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

  // 初始化语音合成
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

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

        const response = await fetch(getApiBaseUrl() + '/api/vision/analyze', {
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
        const searchResponse = await fetch(getApiBaseUrl() + '/api/chat/search', {
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
            const chatResponse = await fetch(getApiBaseUrl() + '/api/chat/query', {
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
          const chatResponse = await fetch(getApiBaseUrl() + '/api/chat/query', {
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

  // 根据用户输入生成动态推荐问题
  const updateSuggestedQuestions = (query: string) => {
    const q = query.toLowerCase();
    const s: string[] = [];

    if (q.includes('图片') || q.includes('图像') || q.includes('截图') || q.includes('照片')) {
      s.push('这张图片说明了什么问题');
      s.push('基于这张图片生成知识卡片');
    }

    if (q.includes('卡片') || q.includes('知识') || q.includes('搜索') || q.includes('查找')) {
      const topic = query.replace(/(?:搜索|查找|找|查询|关于|帮我)\s*/g, '').replace(/(?:的)?(?:知识|卡片|资料|信息)/g, '').trim();
      if (topic && topic.length < 20) s.push(`帮我搜索更多关于${topic}的知识卡片`);
      s.push('这些卡片之间有什么关联');
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

  // 在发送消息后更新推荐问题
  const handleSendAndUpdate = async () => {
    const text = input.trim();
    await handleSend();
    if (text) updateSuggestedQuestions(text);
  };

  // 语音识别（ASR）
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('您的浏览器不支持语音识别，建议使用 Chrome');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInput(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      toast.error('语音识别失败，请重试');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success('正在聆听...', { duration: 2000 });
  };

  // 语音合成（TTS）
  const speakText = async (text: string) => {
    if (isSpeaking) {
      synthRef.current?.cancel();
      setIsSpeaking(false);
      return;
    }

    // 去除 emoji
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '');

    try {
      const response = await fetch(getApiBaseUrl() + '/api/chat/enhanced/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: '晓伊' }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('audio/mpeg')) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          setIsSpeaking(true);
          audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
          audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); _browserTTS(text); };
          audio.play();
          return;
        }
      }
    } catch {}

    _browserTTS(text);
  };

  const _browserTTS = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    const voices = synthRef.current.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh') && v.name.includes('Xiao')) || voices.find(v => v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
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
        className="relative rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#fff9f3', border: '1px solid #e8ddd0' }}
      >
        {/* 头部 - 中国风 */}
        <div
          className="flex items-center justify-between p-4 cursor-move"
          style={{ background: 'linear-gradient(135deg, #8b4513, #d4a574)', borderBottom: '2px solid #d4a574' }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-semibold" style={{ fontFamily: 'KaiTi, STKaiti, serif' }}>视觉智能助手</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#faf8f5' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? '' : ''
              }`} style={{ backgroundColor: msg.role === 'user' ? '#8b4513' : '#d4a574' }}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                  msg.role === 'user' ? '' : ''
                }`} style={{
                  backgroundColor: msg.role === 'user' ? '#8b4513' : '#fef3e2',
                  color: msg.role === 'user' ? '#fff9f3' : '#4a3728',
                  border: msg.role === 'user' ? 'none' : '1px solid #e8ddd0'
                }}>
                  {msg.role === 'assistant' ? (
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
                            <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#fff9f3', color: '#8b4513' }} {...props}>{children}</code>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="pl-3 my-2 rounded-r py-1" style={{ borderLeft: '3px solid #d4a574', backgroundColor: '#fff9f3' }}>
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
                    >{msg.content}</ReactMarkdown>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded" 
                      className="mt-2 max-w-full rounded-lg max-h-48 object-cover"
                    />
                  )}
                  {/* 语音播放按钮 - 仅助手消息 */}
                  {msg.role === 'assistant' && msg.content && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="mt-1 flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent"
                      style={{ color: '#8b4513' }}
                      title={isSpeaking ? '停止朗读' : '朗读'}
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      <span>{isSpeaking ? '停止' : '朗读'}</span>
                    </button>
                  )}
                </div>
                <div className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`} style={{ color: '#8b7355' }}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2" style={{ color: '#8b7355' }}>
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">处理中...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 图片预览 */}
        {previewUrl && (
          <div className="px-4 py-2" style={{ backgroundColor: '#fef3e2', borderTop: '1px solid #e8ddd0' }}>
            <div className="flex items-center gap-3">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded-lg border"
                style={{ borderColor: '#d4a574' }}
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
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="p-4 flex-shrink-0" style={{ backgroundColor: '#fff9f3', borderTop: '2px solid #d4a574' }}>
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
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
              disabled={isLoading}
            >
              <Upload className="w-5 h-5" />
            </button>
            
            {/* 语音输入按钮 */}
            <button
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isListening ? '#8b4513' : '#fef3e2',
                color: isListening ? '#fff9f3' : '#8b4513',
                border: isListening ? '2px solid #8b4513' : '1px solid #e8ddd0'
              }}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? '停止录音' : '语音输入'}
            >
              {isListening ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "正在聆听..." : "输入消息... (Enter发送, Shift+Enter换行)"}
              className="flex-1 px-3 py-2 text-sm rounded-lg resize-none focus:outline-none"
              style={{ backgroundColor: '#fef3e2', border: '1px solid #e8ddd0', color: '#4a3728' }}
              rows={2}
              disabled={isLoading}
            />
            
             <button
              onClick={handleSendAndUpdate}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="p-2 text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#8b4513' }}
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {/* 推荐问题 */}
          {suggestedQuestions.length > 0 && messages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className="text-xs h-auto py-1 px-2 rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: '#fef3e2', color: '#8b4513', border: '1px solid #e8ddd0' }}
                  onClick={() => setInput(question)}
                >
                  {question}
                  <ChevronRight className="w-3 h-3 ml-1 inline" />
                </button>
              ))}
            </div>
          )}
          
          <div className="mt-2 text-xs" style={{ color: '#8b7355' }}>
            {isListening ? '🎤 正在聆听...' : '[提示] 支持文本和图片分析 · 语音输入 · 基于本地 NPU 模型'}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatBotModalWithVision;