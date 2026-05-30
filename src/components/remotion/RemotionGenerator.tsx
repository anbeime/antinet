import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Film, Sparkles, Loader, CheckCircle, AlertCircle,
  ChevronDown, Settings, Zap, Download, ExternalLink, Video
} from 'lucide-react';
import RemotionPreview from './RemotionPreview';

interface CardData {
  id: string;
  type: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
}

interface RemotionGeneratorProps {
  cards: CardData[];
  topic: string;
  onGenerated?: (videoUrl: string) => void;
  showSelector?: boolean;
}

interface GeneratedSlide {
  id: string;
  type: 'cover' | 'content' | 'chart' | 'mindmap' | 'summary';
  title: string;
  content?: string[];
  cards?: { title: string; content: string; type: 'blue' | 'green' | 'yellow' | 'red' }[];
}

const RemotionGenerator: React.FC<RemotionGeneratorProps> = ({ cards, topic, onGenerated, showSelector = false }) => {
  const [generating, setGenerating] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [renderCommand, setRenderCommand] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [config, setConfig] = useState({
    style: 'professional',
    duration: 'medium',
    includeTransitions: true,
    autoMusic: false,
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setSlides([]);
    setJobId(null);
    setSourcePath(null);
    setRenderCommand(null);
    setVideoUrl(null);

    const sourceCards = showSelector && selectedCards.size > 0
      ? cards.filter(c => selectedCards.has(c.id))
      : cards;

    try {
      const response = await fetch('/api/remotion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          cards: sourceCards.map(c => ({
            id: c.id,
            type: c.type,
            title: c.title,
            content: c.content,
          })),
          format: 'mp4',
          quality: 'medium',
          config,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `生成失败 (${response.status})`);
      }

      const data = await response.json();
      if (data.slides) setSlides(data.slides);
      if (data.job_id) setJobId(data.job_id);
      if (data.render_command) setRenderCommand(data.render_command);
      if (data.source_path) setSourcePath(data.source_path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const startRender = async () => {
    if (!jobId) return;
    setRendering(true);
    setError(null);

    try {
      const response = await fetch(`/api/remotion/render/${jobId}`, { method: 'POST' });
      const data = await response.json();

      if (data.status === 'completed' && data.video_url) {
        setVideoUrl(data.video_url);
        onGenerated?.(data.video_url);
        setRendering(false);
        return;
      }

      if (data.status === 'no_chrome') {
        setError(data.hint || '需要 Chrome 浏览器进行渲染');
        setRendering(false);
        return;
      }

      if (data.status === 'failed') {
        setError(data.error || '渲染失败');
        setRendering(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/remotion/status/${jobId}`);
          const status = await statusRes.json();
          if (status.video_exists && status.video_url) {
            setVideoUrl(status.video_url);
            onGenerated?.(status.video_url);
            stopPolling();
            setRendering(false);
          } else if (status.status === 'failed' || status.status === 'timeout') {
            setError(status.error || '渲染失败');
            stopPolling();
            setRendering(false);
          }
        } catch {
          stopPolling();
          setRendering(false);
        }
      }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '渲染请求失败';
      setError(msg);
      setRendering(false);
    }
  };

  const handleExport = async (format: 'mp4' | 'webm' | 'gif') => {
    startRender();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Film className="w-5 h-5 text-purple-500" />
          <span className="font-medium">Remotion 动态演示生成器</span>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <Settings className="w-4 h-4" />
          <span>高级设置</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showSelector && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">选择卡片</span>
            <button 
              onClick={() => setSelectedCards(new Set(cards.map(c => c.id)))}
              className="text-xs text-purple-600 hover:underline"
            >
              全选 ({cards.length})
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  const newSet = new Set(selectedCards);
                  if (newSet.has(card.id)) newSet.delete(card.id);
                  else newSet.add(card.id);
                  setSelectedCards(newSet);
                }}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  selectedCards.has(card.id) 
                    ? 'bg-purple-500 text-white border-purple-500' 
                    : `border-${card.type === 'blue' ? 'blue' : card.type === 'green' ? 'green' : card.type === 'yellow' ? 'yellow' : 'red'}-500 text-${card.type === 'blue' ? 'blue' : card.type === 'green' ? 'green' : card.type === 'yellow' ? 'yellow' : 'red'}-500`
                }`}
              >
                {card.title.slice(0, 12)}...
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            已选择: {selectedCards.size} 张卡片
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">风格</label>
              <select
                value={config.style}
                onChange={(e) => setConfig({ ...config, style: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded"
              >
                <option value="professional">专业商务</option>
                <option value="creative">创意活泼</option>
                <option value="minimal">简约现代</option>
                <option value="tech">科技创新</option>
                <option value="business">高端商务</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">时长</label>
              <select
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded"
              >
                <option value="short">短版 (~30s)</option>
                <option value="medium">中版 (~60s)</option>
                <option value="long">长版 (~120s)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeTransitions}
                onChange={(e) => setConfig({ ...config, includeTransitions: e.target.checked })}
                className="rounded"
              />
              <span>包含转场动画</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={config.autoMusic}
                onChange={(e) => setConfig({ ...config, autoMusic: e.target.checked })}
                className="rounded"
              />
              <span>自动配乐</span>
            </label>
          </div>
        </div>
      )}

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}

        {slides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">生成动态演示</h3>
            <p className="text-sm text-gray-500 mb-6">
              将 {showSelector && selectedCards.size > 0 ? selectedCards.size : cards.length} 张卡片转换为动画视频
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating || cards.length === 0}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center mx-auto"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  开始生成
                </>
              )}
            </button>
          </div>
        ) : (
          <RemotionPreview 
            slides={slides} 
            topic={topic} 
            onExport={handleExport}
          />
        )}
      </div>

      {jobId && slides.length > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {rendering ? (
                <Loader className="w-4 h-4 text-purple-500 animate-spin" />
              ) : videoUrl ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {rendering ? '渲染中...' : videoUrl ? '渲染完成' : `已生成 ${slides.length} 张幻灯片`}
              </span>
            </div>
            <span className="text-xs text-gray-400">任务: {jobId}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {!rendering && !videoUrl && (
              <button
                onClick={startRender}
                className="px-3 py-1.5 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center"
              >
                <Video className="w-3 h-3 mr-1" />
                渲染视频
              </button>
            )}
            {sourcePath && (
              <a
                href={`/api/remotion/download/source/${jobId}`}
                download
                className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 flex items-center"
              >
                <Download className="w-3 h-3 mr-1" />
                下载源码
              </a>
            )}
            {videoUrl && (
              <a
                href={videoUrl}
                download
                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
              >
                <Download className="w-3 h-3 mr-1" />
                下载视频
              </a>
            )}
            {renderCommand && (
              <button
                onClick={() => navigator.clipboard.writeText(renderCommand)}
                className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 flex items-center"
                title={renderCommand}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                复制渲染命令
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemotionGenerator;
