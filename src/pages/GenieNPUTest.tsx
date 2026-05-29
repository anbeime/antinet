import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cpu, RefreshCw, Send, AlertCircle, MessageSquare, Trash2, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

const NPU_API = 'http://127.0.0.1:8910';

const NPU_MODELS = [
  { id: 'qwen2.5vl3b-8380-2.42', name: 'Qwen 2.5 VL 3B', type: 'vision', desc: '视觉模型' },
  { id: 'Qwen2.0-7B-SSD-8380-2.34', name: 'Qwen 2.0 7B (SSD)', type: 'chat', desc: '中文优化' },
  { id: 'llama3.2-3b-8380-qnn2.37', name: 'Llama 3.2 3B', type: 'chat', desc: '轻量快速' },
  { id: 'bge-base-zh-v1.5-qnn-8380', name: 'BGE Base Chinese', type: 'embedding', desc: '嵌入模型' },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GenieNPUTest: React.FC = () => {
  const { theme } = useTheme();
  const [loadedModel, setLoadedModel] = useState<string>('');
  const [modelType, setModelType] = useState<string>('chat');
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkService();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const checkService = async () => {
    try {
      const res = await fetch(`${NPU_API}/v1/models`);
      if (res.ok) {
        const data = await res.json();
        const models = data.data || [];
        if (models.length > 0) {
          const current = models[0].id;
          setLoadedModel(current);
          setModelType(current.includes('vl') || current.includes('vision') ? 'vision' : 'chat');
          setServiceAvailable(true);
        }
      } else {
        setServiceAvailable(false);
      }
    } catch (e) {
      setServiceAvailable(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isStreaming) return;
    if (!serviceAvailable) {
      toast.error('GenieAPIService 未启动，请运行 启动视觉模型服务.bat');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMsg]);

    const text = inputText;
    setInputText('');
    setIsStreaming(true);
    setStreamContent('');

    const messagesForLLM = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    const requestData = {
      model: loadedModel,
      messages: messagesForLLM,
      stream: true,
      size: maxTokens,
      temp: temperature,
      top_k: 1,
      top_p: 0.95,
    };

    try {
      const res = await fetch(`${NPU_API}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
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
                } catch {}
              }
            }
          }
        }

        setMessages(prev => [...prev, { role: 'assistant', content: fullContent || '(无响应)' }]);
        setStreamContent('');
      } else {
        const err = await res.text();
        toast.error(`错误: ${res.status} - ${err}`);
        setMessages(prev => [...prev, { role: 'assistant', content: `[错误] ${err}` }]);
      }
    } catch (e: any) {
      toast.error('请求失败: ' + e.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `[错误] ${e.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamContent('');
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GenieAPIService (NPU) 测试</h1>
              <p className="text-sm text-gray-500">直接调用端口 8910 · 切换模型需重启服务</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm ${
              serviceAvailable
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {serviceAvailable ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span>{serviceAvailable ? '服务在线' : '服务离线'}</span>
            </div>
            <button
              onClick={checkService}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {serviceAvailable && loadedModel && (
          <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            当前已加载: <strong>{loadedModel}</strong> ({modelType === 'vision' ? '视觉' : '聊天'}模型)
          </div>
        )}

        {!serviceAvailable && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            请运行「启动视觉模型服务.bat」启动 GenieAPIService (端口 8910)
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-3 flex items-center">
                <Cpu className="w-4 h-4 mr-2" />
                可用模型
              </h2>
              <div className="space-y-2">
                {NPU_MODELS.map(model => (
                  <div
                    key={model.id}
                    className={`p-3 rounded-lg text-sm ${
                      loadedModel === model.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                        : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{model.name}</span>
                      {model.type === 'vision' && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">VL</span>
                      )}
                      {model.type === 'embedding' && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">EMB</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{model.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className="text-sm font-semibold mb-3">参数设置</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Temperature: {temperature}</label>
                  <input type="range" min="0" max="2" step="0.1" value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Max Tokens: {maxTokens}</label>
                  <input type="range" min="128" max="4096" step="128" value={maxTokens}
                    onChange={e => setMaxTokens(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col">
            <div className={`rounded-xl flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`} style={{ height: '70vh' }}>
              <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  {modelType === 'vision' ? (
                    <Eye className="w-5 h-5 text-purple-500" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="font-medium">{loadedModel || '未加载'}</span>
                </div>
                <button onClick={clearChat} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="清空">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamContent && (
                  <div className="text-center py-16 text-gray-400">
                    <Cpu className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">GenieAPIService NPU 测试</p>
                    <p className="text-sm mt-2">输入消息开始测试</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : theme === 'dark' ? 'bg-gray-700 rounded-bl-md' : 'bg-gray-100 rounded-bl-md'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))}

                {streamContent && (
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 rounded-bl-md ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{streamContent}<span className="animate-pulse">▊</span></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-end space-x-2">
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="输入消息... (Enter 发送)"
                    className={`flex-1 p-3 rounded-xl resize-none text-sm ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'
                    } border`}
                    rows={2}
                    disabled={isStreaming || !serviceAvailable}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isStreaming || !inputText.trim() || !serviceAvailable}
                    className={`p-2.5 rounded-xl ${
                      isStreaming || !inputText.trim() || !serviceAvailable
                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isStreaming ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenieNPUTest;