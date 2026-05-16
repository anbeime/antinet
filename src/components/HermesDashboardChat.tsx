// src/components/HermesDashboardChat.tsx
// 嵌入 Hermes Dashboard 的 Chat 界面

import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HermesDashboardChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// Hermes Dashboard 配置
const HERMES_DASHBOARD_URL = 'http://localhost:18119';

export const HermesDashboardChat: React.FC<HermesDashboardChatProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 检查 Hermes Dashboard 是否可用
  useEffect(() => {
    if (isOpen) {
      checkHermesStatus();
    }
  }, [isOpen]);

  const checkHermesStatus = async () => {
    try {
      const response = await fetch(`${HERMES_DASHBOARD_URL}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setError(null);
        setIsLoading(true);
      } else {
        setError('Hermes Dashboard 未响应');
      }
    } catch (e) {
      setError(`无法连接到 Hermes Dashboard

请确保已启动 Hermes Dashboard：
双击运行 "启动HermesDashboard.bat"

启动后访问: http://localhost:18119`);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Hermes Chat 加载失败');
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `${HERMES_DASHBOARD_URL}/chat`;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 打开新窗口
  const openInNewWindow = () => {
    window.open(`${HERMES_DASHBOARD_URL}/chat`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
      isFullscreen ? 'p-0' : 'p-4'
    }`}>
      <div 
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
          isFullscreen ? 'w-screen h-screen' : 'w-[95vw] h-[90vh] max-w-6xl'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              🤖
            </div>
            <div>
              <h2 className="font-bold">Hermes 智能助手</h2>
              <p className="text-xs text-white/80">完整 AI 能力 · 8 Agent 协同</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={openInNewWindow}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="新窗口打开"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-800">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">正在连接 Hermes...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 max-w-md">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Hermes Dashboard 未启动
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-line text-left">
                  {error}
                </p>
                <Button 
                  onClick={handleRefresh}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={`${HERMES_DASHBOARD_URL}/chat`}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              allow="cross-origin-isolated"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
          <span>
            {error ? '❌ 未连接' : '✅ 已连接 Hermes Dashboard'}
          </span>
          <span>
            提示：Hermes 提供完整 AI 能力，支持知识库查询、8 Agent 协同
          </span>
        </div>
      </div>
    </div>
  );
};

export default HermesDashboardChat;