import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Download, Settings, Loader, Film,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CardColors } from '@/types/designSystem';

interface SlideData {
  id: string;
  type: 'cover' | 'content' | 'chart' | 'mindmap' | 'summary';
  title: string;
  content?: string[];
  cards?: { title: string; content: string; type: 'blue' | 'green' | 'yellow' | 'red' }[];
  color?: string;
}

interface RemotionPreviewProps {
  slides: SlideData[];
  onExport?: (format: 'mp4' | 'webm' | 'gif') => void;
  topic: string;
}

const cardColors: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

const slideVariants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const RemotionPreview: React.FC<RemotionPreviewProps> = ({ slides, onExport, topic }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToSlide = useCallback((next: number) => {
    if (next < 0 || next >= slides.length) return;
    setCurrentSlide(next);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [goToSlide, currentSlide]);

  const handleNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [goToSlide, currentSlide]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSlide(prev => {
          const next = prev + 1;
          if (next >= slides.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, slides.length]);

  const handlePlay = useCallback(() => setIsPlaying(p => !p), []);

  const handleExport = async (format: 'mp4' | 'webm' | 'gif') => {
    setIsExporting(true);
    try {
      onExport?.(format);
      await fetch('/api/remotion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, topic, format, quality }),
      });
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Film className="w-5 h-5 text-purple-500" />
          <span className="font-medium">Remotion 动态演示</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b">
          <div className="flex items-center space-x-4">
            <span className="text-sm">输出质量:</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded"
            >
              <option value="low">低 (预览)</option>
              <option value="medium">中 (平衡)</option>
              <option value="high">高 (最终)</option>
            </select>
          </div>
        </div>
      )}

      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <AnimatePresence mode="wait">
          {slide && (
            <motion.div
              key={currentSlide}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="absolute inset-0 p-8 flex flex-col"
            >
              {slide.type === 'cover' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <h1 className="text-4xl font-bold text-white mb-4">{slide.title}</h1>
                  {slide.content?.map((text, i) => (
                    <p key={i} className="text-xl text-gray-300">{text}</p>
                  ))}
                </div>
              )}

              {slide.type === 'content' && (
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-4">{slide.title}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {slide.cards?.map((card, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-lg text-white"
                        style={{ backgroundColor: cardColors[card.type] }}
                      >
                        <div className="font-semibold mb-2">{card.title}</div>
                        <div className="text-sm opacity-90">{card.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slide.type === 'summary' && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <h2 className="text-3xl font-bold text-white mb-6">总结</h2>
                  {slide.content?.map((point, i) => (
                    <div key={i} className="text-xl text-gray-200 mb-3">
                      {i + 1}. {point}
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-4 right-4 text-white text-sm opacity-70">
                {currentSlide + 1} / {slides.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={handlePlay}
            className="p-4 bg-white/20 rounded-full hover:bg-white/30"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlay}
              className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('gif')}
              disabled={isExporting}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              GIF
            </button>
            <button
              onClick={() => handleExport('webm')}
              disabled={isExporting}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              WebM
            </button>
            <button
              onClick={() => handleExport('mp4')}
              disabled={isExporting}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center"
            >
              {isExporting ? <Loader className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              MP4
            </button>
          </div>
        </div>

        <div className="mt-3 flex space-x-2 overflow-x-auto pb-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToSlide(i)}
              className={`flex-shrink-0 w-16 h-10 rounded border-2 ${
                i === currentSlide ? 'border-purple-500' : 'border-transparent'
              }`}
            >
              <div className={`w-full h-full rounded ${
                s.type === 'cover' ? 'bg-purple-600' :
                s.type === 'content' ? 'bg-blue-600' :
                s.type === 'summary' ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                <span className="text-xs text-white p-1">{i + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RemotionPreview;
