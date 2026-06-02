import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, RefreshCw, Send, Check, AlertCircle, Zap, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  params: string;
  quantization: string;
  max_tokens: number;
  recommended: boolean;
  loaded: boolean;
}

const MultiModel: React.FC = () => {
  const { theme } = useTheme();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isInferencing, setIsInferencing] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchCurrentModel();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(getApiBaseUrl() + '/api/multi/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const fetchCurrentModel = async () => {
    try {
      const res = await fetch(getApiBaseUrl() + '/api/multi/current');
      if (res.ok) {
        const data = await res.json();
        setCurrentModel(data.current_model);
      }
    } catch (error) {
      console.error('Failed to fetch current model:', error);
    }
  };

  const switchModel = async (modelId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiBaseUrl() + '/api/multi/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentModel(modelId);
        toast.success(`已切换到 ${data.new_model}`);
        fetchModels();
      }
    } catch (error) {
      toast.error('切换模型失败');
    } finally {
      setIsLoading(false);
    }
  };

  const runInference = async () => {
    if (!prompt.trim()) {
      toast.warning('请输入提示词');
      return;
    }

    setIsInferencing(true);
    setResponse('');
    
    try {
      const res = await fetch(getApiBaseUrl() + '/api/multi/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: 512, temperature: 0.7 })
      });
      
      if (res.ok) {
        const data = await res.json();
        setResponse(data.response);
        toast.success('推理完成');
      } else {
        const error = await res.json();
        toast.error(error.detail || '推理失败');
      }
    } catch (error) {
      toast.error('推理请求失败');
    } finally {
      setIsInferencing(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">多模型 API</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">切换和管理不同的 AI 模型</p>
            </div>
          </div>
          <button
            onClick={() => { fetchModels(); fetchCurrentModel(); }}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              可用模型
            </h2>
            
            <div className="space-y-3">
              {models.map((model) => (
                <motion.div
                  key={model.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentModel === model.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : isLoading
                        ? 'border-gray-300 dark:border-gray-600 opacity-60 cursor-wait'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (isLoading) {
                      toast.info('正在切换模型中，请稍候...');
                      return;
                    }
                    currentModel !== model.id && switchModel(model.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{model.name}</span>
                        {isLoading && currentModel !== model.id && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        )}
                        {model.recommended && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            推荐
                          </span>
                        )}
                        {currentModel === model.id && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {model.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{model.params}</div>
                      <div className="text-xs text-gray-500">{model.quantization}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {models.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无可用模型</p>
                <p className="text-sm">请检查后端服务是否运行</p>
              </div>
            )}
          </div>

          <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              模型推理测试
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">提示词</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入您的问题或提示..."
                  className={`w-full h-32 p-3 rounded-lg border resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>

              <button
                onClick={runInference}
                disabled={isInferencing || !prompt.trim()}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 ${
                  isInferencing || !prompt.trim()
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isInferencing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>推理中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>开始推理</span>
                  </>
                )}
              </button>

              {response && (
                <div>
                  <label className="block text-sm font-medium mb-2">推理结果</label>
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <pre className="whitespace-pre-wrap text-sm">{response}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <h2 className="text-lg font-semibold mb-4">API 使用说明</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className="font-medium mb-2">列出模型</h3>
              <code className="text-sm text-blue-500">GET /api/multi/models</code>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className="font-medium mb-2">切换模型</h3>
              <code className="text-sm text-blue-500">POST /api/multi/switch</code>
            </div>
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className="font-medium mb-2">模型推理</h3>
              <code className="text-sm text-blue-500">POST /api/multi/inference</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiModel;
