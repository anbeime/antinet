import React, { useState } from 'react';
import { 
  Film, Sparkles, Loader, CheckCircle, AlertCircle,
  ChevronDown, Settings, Zap
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
}

interface GeneratedSlide {
  id: string;
  type: 'cover' | 'content' | 'chart' | 'mindmap' | 'summary';
  title: string;
  content?: string[];
  cards?: { title: string; content: string; type: 'blue' | 'green' | 'yellow' | 'red' }[];
}

const RemotionGenerator: React.FC<RemotionGeneratorProps> = ({ cards, topic, onGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState({
    style: 'modern',
    duration: 'medium',
    includeTransitions: true,
    autoMusic: false,
  });

  const generateSlides = () => {
    const newSlides: GeneratedSlide[] = [];
    
    // Cover slide
    newSlides.push({
      id: 'cover-1',
      type: 'cover',
      title: topic,
      content: ['智能分析报告'],
    });

    // Group cards by type
    const blueCards = cards.filter(c => c.type === 'blue');
    const greenCards = cards.filter(c => c.type === 'green');
    const yellowCards = cards.filter(c => c.type === 'yellow');
    const redCards = cards.filter(c => c.type === 'red');

    // Content slides by type
    if (blueCards.length > 0) {
      newSlides.push({
        id: 'content-blue',
        type: 'content',
        title: '核心事实',
        cards: blueCards.map(c => ({ title: c.title, content: c.content, type: c.type })),
      });
    }

    if (greenCards.length > 0) {
      newSlides.push({
        id: 'content-green',
        type: 'content',
        title: '深度解读',
        cards: greenCards.map(c => ({ title: c.title, content: c.content, type: c.type })),
      });
    }

    if (yellowCards.length > 0) {
      newSlides.push({
        id: 'content-yellow',
        type: 'content',
        title: '风险警示',
        cards: yellowCards.map(c => ({ title: c.title, content: c.content, type: c.type })),
      });
    }

    if (redCards.length > 0) {
      newSlides.push({
        id: 'content-red',
        type: 'content',
        title: '行动方案',
        cards: redCards.map(c => ({ title: c.title, content: c.content, type: c.type })),
      });
    }

    // Summary slide
    newSlides.push({
      id: 'summary-1',
      type: 'summary',
      title: '总结',
      content: cards.slice(0, 4).map((c, i) => `${i + 1}. ${c.title}`),
    });

    return newSlides;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSlides([]);

    try {
      // Simulate slide generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newSlides = generateSlides();
      setSlides(newSlides);
    } catch (e) {
      console.error('Generation failed:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: 'mp4' | 'webm' | 'gif') => {
    if (slides.length === 0) return;

    try {
      // Call backend to trigger Remotion render
      const response = await fetch('/api/remotion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides,
          topic,
          format,
          cards,
          config,
        }),
      });

      const data = await response.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        onGenerated?.(data.videoUrl);
      }
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
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

      {/* Advanced Settings */}
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
                <option value="modern">现代简约</option>
                <option value="corporate">企业商务</option>
                <option value="creative">创意活泼</option>
                <option value="minimal">极简主义</option>
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

      {/* Content Area */}
      <div className="p-4">
        {slides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">生成动态演示</h3>
            <p className="text-sm text-gray-500 mb-6">
              将 {cards.length} 张卡片转换为动画视频
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

      {/* Status Footer */}
      {videoUrl && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400">视频生成成功</span>
          <a href={videoUrl} download className="ml-auto text-sm text-purple-500 hover:underline">
            下载视频
          </a>
        </div>
      )}
    </div>
  );
};

export default RemotionGenerator;