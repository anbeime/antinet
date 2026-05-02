import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cpu, RefreshCw, Send, AlertCircle, Eye, MessageSquare, ImageIcon, Play, Settings2, Wifi, WifiOff, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/lib/apiConfig';

const API_BASE = getApiBaseUrl() + '/api/genie-playground'

interface GenieModel {
  id: string;
  name: string;
  type: string;
  description: string;
  context_length: number;
  has_weights: boolean;
  available: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imagePreview?: string;
}

interface BatchResult {
  model: string;
  name: string;
  status: string;
  response?: string;
  error?: string;
  reason?: string;
}

const GeniePlayground: React.FC = () => {
  const { theme } = useTheme();
  const [models, setModels] = useState<GenieModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5vl3b');
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [currentModelName, setCurrentModelName] = useState<string>('');
  const [currentModelType, setCurrentModelType] = useState<string>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageMime, setImageMime] = useState<string>('jpeg');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(1);
  const [topP, setTopP] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showParams, setShowParams] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchModels();
    checkService();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    }
  };

  const checkService = async () => {
    try {
      const res = await fetch(`${API_BASE}/service-status`);
      if (res.ok) {
        const data = await res.json();
        setServiceAvailable(data.available);
        setOllamaAvailable(data.ollama_available || false);
        setLoadedModels(data.loaded_models || []);
        setCurrentModelName(data.current_model || '');
        setCurrentModelType(data.current_model_type || 'chat');
      }
    } catch (e) {
      setServiceAvailable(false);
      setOllamaAvailable(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeMap: Record<string, string> = {
      jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', bmp: 'bmp', webp: 'webp'
    };
    setImageMime(mimeMap[ext] || 'jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !imageBase64) return;
    if (isStreaming) return;

    const currentModel = models.find(m => m.id === selectedModel);
    if (!currentModel?.available) {
      toast.error('该模型缺少权重文件，无法使用');
      return;
    }
    if (currentModel.type === 'embedding') {
      toast.error('嵌入模型不支持对话');
      return;
    }

    // Ollama 模型不需要 GenieAPIService，直接可用
    const isOllamaModel = currentModel?.type === 'ollama';
    const isVisionModel = currentModelType === 'vision';
    
    if (isOllamaModel) {
      // Ollama 模型直接调用，不需要检查 GenieAPIService
    } else if (!serviceAvailable) {
      toast.error('GenieAPIService 未启动，请用 Ollama 模型（如 gemma4）测试');
      return;
    }

    // NPU 模型需要匹配当前加载的模型，显示提示但不阻止
    if (!isOllamaModel && currentModel?.type !== 'embedding') {
      const selectedIsVision = currentModel?.type === 'vision';
      if ((selectedIsVision && !isVisionModel) || (!selectedIsVision && isVisionModel)) {
        toast.info(`当前加载 ${currentModelName}，选择 ${selectedModel} 需要重启 GenieAPIService`);
      }
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: inputText,
      imagePreview: imagePreview || undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    const hasImage = !!imageBase64;

    setIsStreaming(true);
    setStreamContent('');

    const text = inputText;
    setInputText('');
    const currentImageBase64 = imageBase64;
    clearImage();

    try {
      // 只有非Ollama的视觉模型才能处理图片
      if (!isOllamaModel && isVisionModel && hasImage) {
        // 视觉模型 + 图片 -> 用 vision-chat 接口
        const res = await fetch(`${API_BASE}/vision-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            text,
            image_base64: currentImageBase64,
            image_mime: imageMime,
            stream: false,
            temperature,
            top_k: topK,
            top_p: topP,
            max_tokens: maxTokens,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.response || '(无响应)' }]);
        } else {
          const err = await res.json();
          toast.error(err.detail || '视觉对话失败');
          setMessages(prev => [...prev, { role: 'assistant', content: `[错误] ${err.detail || '视觉对话失败'}` }]);
        }
      } else {
        // 纯文本聊天 -> 用流式接口
        const chatMessages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ];

        const res = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            messages: chatMessages,
            stream: true,
            temperature,
            top_k: topK,
            top_p: topP,
            max_tokens: maxTokens,
          }),
        });

        if (res.ok) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  if (dataStr.trim() === '[DONE]') continue;
                  try {
                    const data = JSON.parse(dataStr);
                    if (data.content) {
                      fullContent += data.content;
                      setStreamContent(fullContent);
                    }
                    if (data.error) {
                      toast.error(data.error);
                    }
                  } catch {}
                }
              }
            }
          }

          setMessages(prev => [...prev, { role: 'assistant', content: fullContent || '(无响应)' }]);
          setStreamContent('');
        } else {
          const err = await res.json();
          toast.error(err.detail || '聊天失败');
          setMessages(prev => [...prev, { role: 'assistant', content: `[错误] ${err.detail || '聊天失败'}` }]);
        }
      }
    } catch (e: any) {
      toast.error('请求失败: ' + (e.message || '未知错误'));
      setMessages(prev => [...prev, { role: 'assistant', content: `[错误] ${e.message || '请求失败'}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const runBatchTest = async () => {
    setBatchRunning(true);
    setBatchResults([]);
    try {
      const res = await fetch(`${API_BASE}/batch-test`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data.results || []);
      }
    } catch (e) {
      toast.error('批量测试失败');
    } finally {
      setBatchRunning(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const clearChat = () => {
    setMessages([]);
    setStreamContent('');
  };

  const selectedModelInfo = models.find(m => m.id === selectedModel);

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Genie 模型测试场</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                通过 GenieAPIService 调用端侧模型 · 端口 8910
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm ${
              serviceAvailable
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {serviceAvailable ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{serviceAvailable ? 'Genie 服务在线' : 'Genie 服务离线'}</span>
            </div>
            <button
              onClick={() => { fetchModels(); checkService(); }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {serviceAvailable && currentModelName && (
          <div className="mb-4 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300 flex items-center space-x-2">
            <Wifi className="w-4 h-4" />
            <span>当前已加载: <strong>{currentModelName}</strong> ({currentModelType === 'vision' ? '视觉' : '聊天'}模型) — NPU 同时只能运行一个模型</span>
          </div>
        )}

        {!serviceAvailable && !ollamaAvailable && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">GenieAPIService 和 Ollama 都未启动</p>
              <p className="mt-1">请启动「启动视觉模型服务.bat」或运行「ollama serve」</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar - Model selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-3 flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                模型列表
              </h2>
              <div className="mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-600 dark:text-amber-400">
                NPU模型需重启切换 / Ollama模型需要服务运行
              </div>
              <div className="space-y-2">
                {models.filter(m => m.available).map(model => (
                  <motion.div
                    key={model.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all text-sm ${
                      selectedModel === model.id
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                        : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{model.name}</span>
                      <div className="flex items-center space-x-1">
                        {model.type === 'vision' && (
                          <span className="flex items-center px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                            <Eye className="w-3 h-3 mr-0.5" /> VL
                          </span>
                        )}
                        {model.type === 'embedding' && (
                          <span className="flex items-center px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                            EMB
                          </span>
                        )}
                        {model.type === 'ollama' && (
                          <span className="flex items-center px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                            Ollama
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">有权重</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {model.description}
                    </p>
                  </motion.div>
                ))}
                {models.filter(m => !m.available).length > 0 && (
                  <>
                    <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 pb-1 border-t border-gray-200 dark:border-gray-700">
                      仅有配置（缺权重文件）
                    </div>
                    {models.filter(m => !m.available).map(model => (
                      <div
                        key={model.id}
                        className={`p-3 rounded-lg text-sm opacity-50 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{model.name}</span>
                          <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">缺权重</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Parameters */}
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <button
                onClick={() => setShowParams(!showParams)}
                className="w-full flex items-center justify-between text-sm font-semibold"
              >
                <span className="flex items-center">
                  <Settings2 className="w-4 h-4 mr-2" />
                  推理参数
                </span>
                <motion.span animate={{ rotate: showParams ? 180 : 0 }}>▾</motion.span>
              </button>

              {showParams && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Temperature: {temperature}</label>
                    <input type="range" min="0" max="2" step="0.1" value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Top-K: {topK}</label>
                    <input type="range" min="1" max="100" step="1" value={topK}
                      onChange={e => setTopK(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Top-P: {topP}</label>
                    <input type="range" min="0" max="1" step="0.05" value={topP}
                      onChange={e => setTopP(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Max Tokens: {maxTokens}</label>
                    <input type="range" min="128" max="4096" step="128" value={maxTokens}
                      onChange={e => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Center - Chat area */}
          <div className="lg:col-span-2 flex flex-col">
            <div className={`rounded-xl flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`} style={{ height: '70vh' }}>
              {/* Chat header */}
              <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  {selectedModelInfo?.type === 'vision' ? (
                    <Eye className="w-5 h-5 text-purple-500" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                  )}
                  <span className="font-medium">{selectedModelInfo?.name || selectedModel}</span>
                  {selectedModelInfo?.type === 'vision' && (
                    <span className="text-xs text-purple-500">(支持图片)</span>
                  )}
                </div>
                <button onClick={clearChat} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="清空对话">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamContent && (
                  <div className="text-center py-16 text-gray-400">
                    <Cpu className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Genie 模型测试场</p>
                    <p className="text-sm mt-2">选择一个模型，开始对话测试</p>
                    <p className="text-xs mt-1 text-gray-300">提示: 视觉模型(VL)支持上传图片</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-white rounded-br-md'
                        : theme === 'dark' ? 'bg-gray-700 rounded-bl-md' : 'bg-gray-100 rounded-bl-md'
                    }`}>
                      {msg.imagePreview && (
                        <img src={msg.imagePreview} alt="upload" className="max-h-40 rounded-lg mb-2" />
                      )}
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="mt-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          title="复制"
                        >
                          {copiedIdx === idx ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {streamContent && (
                  <div className="flex justify-start">
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 rounded-bl-md ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{streamContent}<span className="animate-pulse">▊</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                {/* Image preview */}
                {imagePreview && (
                  <div className="mb-3 flex items-center space-x-2">
                    <img src={imagePreview} alt="preview" className="h-16 rounded-lg border" />
                    <button onClick={clearImage} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-end space-x-2">
                  {/* Image upload button */}
                  {selectedModelInfo?.type === 'vision' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      title="上传图片"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={selectedModelInfo?.type === 'vision' ? "输入问题，可搭配图片..." : "输入消息..."}
                    className={`flex-1 p-3 rounded-xl resize-none text-sm ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                    } border`}
                    rows={2}
                    disabled={isStreaming}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={isStreaming || (!inputText.trim() && !imageBase64)}
                    className={`p-2.5 rounded-xl ${
                      isStreaming || (!inputText.trim() && !imageBase64)
                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isStreaming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar - Batch test */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-3 flex items-center">
                <Play className="w-4 h-4 mr-2" />
                批量连通测试
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                向所有聊天模型发送 "Hello" 测试连通性
              </p>
              <button
                onClick={runBatchTest}
                disabled={batchRunning || !serviceAvailable}
                className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 ${
                  batchRunning || !serviceAvailable
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                {batchRunning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /><span>测试中...</span></>
                ) : (
                  <><Play className="w-4 h-4" /><span>开始测试</span></>
                )}
              </button>

              {batchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {batchResults.map((result, idx) => (
                    <div key={idx} className={`p-3 rounded-lg text-xs ${
                      result.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : result.status === 'skipped'
                        ? 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{result.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          result.status === 'success' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                          result.status === 'skipped' ? 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-200' :
                          'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                        }`}>
                          {result.status === 'success' ? '✓ 成功' : result.status === 'skipped' ? '跳过' : '✗ 失败'}
                        </span>
                      </div>
                      {result.response && (
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-3">{result.response}</p>
                      )}
                      {result.error && (
                        <p className="text-red-500 dark:text-red-400">{result.error}</p>
                      )}
                      {result.reason && (
                        <p className="text-gray-400">{result.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-3">快捷提示词</h2>
              <div className="space-y-2">
                {[
                  '你好，请用一句话介绍自己',
                  '请用中文写一首关于春天的短诗',
                  'What is 15 * 37? Show your work.',
                  'Explain quantum computing in simple terms.',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(prompt)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* API info */}
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-2">GenieAPIService 信息</h2>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p>服务地址: 127.0.0.1:8910 (NPU) / 11434 (Ollama)</p>
                <p>API格式: OpenAI 兼容</p>
                <p>接口: /v1/chat/completions</p>
                <p>限制: NPU/Ollama 各同时只能跑一个模型</p>
                <p className="pt-1 border-t border-gray-200 dark:border-gray-700">NPU 模型:</p>
                <p>· qwen2.5vl3b (视觉)</p>
                <p>· Qwen2.0-7B-SSD (聊天)</p>
                <p>· llama3.2-3b (聊天)</p>
                <p>· bge-base-zh (嵌入)</p>
                <p className="pt-1 border-t border-gray-200 dark:border-gray-700">Ollama 模型:</p>
                <p>· glm-5.1-cloud (智谱云)</p>
                <p>· gemma4</p>
                <p>· gpt-oss-20b</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeniePlayground;
