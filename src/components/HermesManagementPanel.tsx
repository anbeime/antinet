// src/components/HermesManagementPanel.tsx - Hermes Agent 管理面板
// 集成Hermes的技能管理、模型选择、配置管理
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Settings, Play, Square, RefreshCw, 
  Cpu, MessageSquare, Key, Terminal, 
  ChevronDown, ChevronRight, Plus, Trash2,
  Check, AlertCircle, Loader
} from 'lucide-react';
import { toast } from 'sonner';
import hermesService from '../services/hermesService';

interface HermesSkill {
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

interface HermesConfig {
  model: string;
  provider: string;
  tools: string[];
  max_tokens: number;
}

const HermesManagementPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'skills' | 'models' | 'config'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [skills, setSkills] = useState<HermesSkill[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [config, setConfig] = useState<HermesConfig | null>(null);
  
  const [hermesStatus, setHermesStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

  useEffect(() => {
    checkHermesStatus();
  }, []);

  const checkHermesStatus = async () => {
    try {
      const response = await fetch('http://localhost:8001/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setHermesStatus('connected');
        loadData();
      } else {
        setHermesStatus('disconnected');
      }
    } catch {
      setHermesStatus('disconnected');
    }
  };

  const loadData = async () => {
    try {
      const [models, skillsData, configData] = await Promise.all([
        hermesService.getModels(),
        hermesService.listSkills(),
        hermesService.getConfig()
      ]);
      setAvailableModels(models || []);
      setSkills(skillsData.map((name: string) => ({
        name,
        description: '',
        category: 'general',
        enabled: true
      })));
      setConfig(configData);
      if (configData?.model) setCurrentModel(configData.model);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || loading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await hermesService.chat({
        message: userMessage,
        history
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.response 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Hermes服务调用失败');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '连接Hermes服务失败，请确保Hermes API服务正在运行'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (model: string) => {
    try {
      await hermesService.setModel(model);
      setCurrentModel(model);
      toast.success(`已切换到模型: ${model}`);
    } catch (error) {
      toast.error('切换模型失败');
    }
  };

  const handleSkillToggle = async (skillName: string, enabled: boolean) => {
    try {
      if (enabled) {
        await hermesService.useSkill(skillName);
      }
      setSkills(prev => prev.map(s => 
        s.name === skillName ? { ...s, enabled } : s
      ));
      toast.success(`${enabled ? '启用' : '禁用'}技能: ${skillName}`);
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const renderChatTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 py-8"
            >
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>开始与Hermes Agent对话</p>
            </motion.div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${
                msg.role === 'user' 
                  ? 'ml-auto bg-blue-100' 
                  : 'mr-auto bg-gray-100'
              } p-3 rounded-lg max-w-[80%]`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !chatInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSkillsTab = () => (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold mb-4">Hermes 技能管理</h3>
      {skills.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          未找到可用技能
        </div>
      ) : (
        skills.map(skill => (
          <div
            key={skill.name}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="font-medium">{skill.name}</div>
              <div className="text-sm text-gray-500">{skill.description}</div>
            </div>
            <button
              onClick={() => handleSkillToggle(skill.name, !skill.enabled)}
              className={`p-2 rounded ${skill.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200'}`}
            >
              {skill.enabled ? <Check className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
        ))
      )}
    </div>
  );

  const renderModelsTab = () => (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold mb-4">模型选择</h3>
      <div className="grid gap-2">
        {availableModels.map(model => (
          <button
            key={model}
            onClick={() => handleModelChange(model)}
            className={`p-4 text-left rounded-lg border-2 transition-all ${
              model === currentModel 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{model}</span>
              {model === currentModel && (
                <Check className="w-5 h-5 text-blue-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Hermes 配置</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">当前模型</span>
          <span className="font-medium">{currentModel}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">工具数量</span>
          <span className="font-medium">{config?.tools?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-600">最大Token</span>
          <span className="font-medium">{config?.max_tokens || 4096}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow">
      {/* 状态栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold">Hermes Agent</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            hermesStatus === 'connected' ? 'bg-green-500' :
            hermesStatus === 'loading' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          <span className="text-sm text-gray-500">
            {hermesStatus === 'connected' ? '已连接' :
             hermesStatus === 'loading' ? '连接中...' : '未连接'}
          </span>
          <button
            onClick={checkHermesStatus}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b">
        {[
          { id: 'chat', icon: MessageSquare, label: '对话' },
          { id: 'skills', icon: Terminal, label: '技能' },
          { id: 'models', icon: Cpu, label: '模型' },
          { id: 'config', icon: Settings, label: '配置' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {hermesStatus === 'disconnected' ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
            <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
            <h3 className="font-semibold mb-2">Hermes 服务未连接</h3>
            <p className="text-sm mb-4">
              请先启动Hermes API服务:
            </p>
            <code className="bg-gray-100 px-4 py-2 rounded text-sm">
              python hermes_api.py --port 8001
            </code>
          </div>
        ) : (
          <>
            {activeTab === 'chat' && renderChatTab()}
            {activeTab === 'skills' && renderSkillsTab()}
            {activeTab === 'models' && renderModelsTab()}
            {activeTab === 'config' && renderConfigTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default HermesManagementPanel;