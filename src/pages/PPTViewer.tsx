import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  Presentation, Upload, Download, ChevronLeft, ChevronRight,
  Play, Pause, Maximize2, Grid, List, FilePlus
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8000';

interface SlideData {
  title: string;
  content: string[];
  type: 'title' | 'content' | 'list';
}

interface PPTViewerProps {
  slides?: SlideData[];
}

const defaultSlides: SlideData[] = [
  { title: '欢迎', content: ['智能报表分析系统', '数据驱动决策'], type: 'title' },
  { title: '数据概览', content: ['总销售额: 125,000', '增长率: 15%', '客户数: 1,234'], type: 'list' },
  { title: '销售趋势', content: ['1月: 12,500', '2月: 15,800', '3月: 18,200', '4月: 14,300'], type: 'list' },
  { title: '核心发现', content: ['华东地区表现最佳', '线上渠道增长迅速', '新产品好评如潮'], type: 'content' },
  { title: '行动计划', content: ['加大华东投入', '拓展线上渠道', '优化产品线'], type: 'list' },
  { title: '谢谢', content: ['如有疑问，欢迎交流'], type: 'title' },
];

const PPTViewer: React.FC<PPTViewerProps> = ({ slides }) => {
  useTheme();
  const [searchParams] = useSearchParams();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'slide' | 'outline'>('slide');
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const [loadedSlides, setLoadedSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displaySlides = (loadedSlides && loadedSlides.length > 0) 
    ? loadedSlides 
    : (slides && slides.length > 0) 
      ? slides 
      : defaultSlides;
  const totalSlides = displaySlides?.length || 1;
  const currentSlideData = displaySlides?.[currentSlide] || displaySlides?.[0] || { title: '无内容', content: [], type: 'content' };

  // 从 sessionStorage 或 URL参数加载PPT文件
  useEffect(() => {
    const loadPPT = async () => {
      // 优先从URL参数获取
      let fileName = searchParams.get('file');
      console.log('[PPTViewer] URL参数文件名:', fileName);
      
      // 如果没有URL参数，从sessionStorage获取
      if (!fileName) {
        fileName = sessionStorage.getItem('lastPPTFileName');
        console.log('[PPTViewer] Session参数文件名:', fileName);
      }
      
      if (fileName) {
        try {
          const response = await fetch(`${API_BASE}/api/ppt/file?filename=${encodeURIComponent(fileName)}`);
          console.log('[PPTViewer] 响应状态:', response.status);
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              console.log('[PPTViewer] 文件大小:', blob.size);
              const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
              await parsePPTX(file);
              console.log('[PPTViewer] 解析成功');
              toast.success('PPT加载成功');
            } else {
              toast.error('文件为空，请重新生成');
            }
          } else if (response.status === 404) {
            // 文件不存在，清除sessionStorage
            sessionStorage.removeItem('lastPPTFileName');
            toast.error('PPT文件不存在，请重新生成');
          } else {
            const errText = await response.text();
            console.error('加载失败:', response.status, errText);
            toast.error('PPT加载失败: ' + response.status);
          }
        } catch (e) {
          console.error('加载PPT失败:', e);
          toast.error('加载PPT失败: ' + (e as Error).message);
        }
      } else {
        console.log('[PPTViewer] 没有文件名，使用默认数据');
      }
    };
    loadPPT();
  }, []);

  useEffect(() => {
    if (isPlaying && totalSlides > 0) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
      }, 3000);
      setPlayInterval(interval);
    } else if (playInterval) {
      clearInterval(playInterval);
      setPlayInterval(null);
    }
    return () => {
      if (playInterval) clearInterval(playInterval);
    };
  }, [isPlaying, totalSlides]);

const parsePPTX = async (file: File) => {
    setIsLoading(true);
    try {
      const JSZip = await import('jszip');
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      let parsedSlides: SlideData[] = [];
      
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
          return numA - numB;
        });
       
      for (const slideFile of slideFiles) {
        const content = await zip.file(slideFile)?.async('string');
        if (content) {
          const lines: string[] = [];
          let title = '';
          let currentParagraph = '';
          
          const textElements = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
          if (textElements) {
            for (let i = 0; i < textElements.length; i++) {
              const match = textElements[i].match(/<a:t[^>]*>([^<]+)<\/a:t>/);
              if (match && match[1]) {
                const text = match[1].trim();
                if (text) {
                  if (i === 0) {
                    title = text;
                  } else {
                    if (currentParagraph) {
                      currentParagraph += ' ' + text;
                    } else {
                      currentParagraph = text;
                    }
                  }
                }
              }
            }
          }
          
          if (currentParagraph) {
            const sentences = currentParagraph.split(/(?<=[。！？!?.])|(?<=[\n])/).filter(s => s.trim());
            
            if (sentences.length > 1) {
              for (const s of sentences) {
                const trimmed = s.trim();
                if (trimmed) lines.push(trimmed);
              }
            } else {
              lines.push(currentParagraph);
            }
          }
          
          if (!title && lines.length > 0) {
            title = lines[0].substring(0, 30);
          }
          
          parsedSlides.push({
            title: title || `Slide ${parsedSlides.length + 1}`,
            content: lines.length > 0 ? lines : ['无内容'],
            type: title ? 'content' : 'list'
          });
        }
      }
      
      if (parsedSlides.length > 0) {
        setLoadedSlides(parsedSlides);
        setCurrentSlide(0);
      } else {
        alert('无法解析PPT内容，将使用示例数据');
      }
    } catch (error) {
      console.error('解析PPTX失败:', error);
      alert('解析失败: ' + error);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
      await parsePPTX(file);
    } else {
      alert('请上传PPT文件(.pptx, .ppt)');
    }
  };

  const handlePrev = () => {
    setCurrentSlide((currentSlide - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setCurrentSlide((currentSlide + 1) % totalSlides);
  };

  const handleFirst = () => setCurrentSlide(0);
  const handleLast = () => setCurrentSlide(totalSlides - 1);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const themeColors = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600' },
    green: { bg: 'bg-green-600', text: 'text-green-600' },
    red: { bg: 'bg-red-600', text: 'text-red-600' },
  };

  const colorThemes = Object.keys(themeColors);
  const currentTheme = colorThemes[currentSlide % colorThemes.length];
  const theme = themeColors[currentTheme as keyof typeof themeColors];

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Presentation className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">PPT 演示查看器</span>
          <span className="text-gray-400 text-sm">
            ({(currentSlide + 1)} / {totalSlides})
          </span>
          <label className="ml-4 cursor-pointer">
            <input
              type="file"
              accept=".pptx,.ppt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded">
              <Upload className="w-4 h-4 inline mr-1" />
              上传PPT
            </span>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'slide' ? 'outline' : 'slide')}
            className="p-2 hover:bg-gray-700 rounded text-gray-300"
            title={viewMode === 'slide' ? '大纲视图' : '幻灯片视图'}
          >
            {viewMode === 'slide' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-gray-600" />

          <button
            onClick={togglePlay}
            className={`p-2 rounded ${isPlaying ? 'bg-red-500' : 'bg-gray-700'} text-white hover:opacity-80`}
            title={isPlaying ? '暂停' : '自动播放'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button onClick={handleFirst} className="p-2 hover:bg-gray-700 rounded text-gray-300" title="第一页">
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button onClick={handlePrev} className="p-2 hover:bg-gray-700 rounded text-gray-300" title="上一页">
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button onClick={handleNext} className="p-2 hover:bg-gray-700 rounded text-gray-300" title="下一页">
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <button onClick={handleLast} className="p-2 hover:bg-gray-700 rounded text-gray-300" title="最后一页">
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-600" />

          <label className="cursor-pointer flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
            <Upload className="w-4 h-4" />
            <span className="text-sm">导入</span>
            <input type="file" accept=".pptx" className="hidden" />
          </label>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'slide' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-5xl aspect-video bg-white rounded-lg shadow-2xl overflow-hidden">
              <div className={`h-full flex flex-col ${theme.bg} p-6 overflow-y-auto`}>
                <div className="flex-1 flex flex-col justify-start overflow-y-auto">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {displaySlides[currentSlide].type === 'title' ? (
                      <div className="text-center">
                        <h2 className="text-4xl font-bold text-white mb-4">
                          {displaySlides[currentSlide]?.title || ''}
                        </h2>
                        <p className="text-xl text-white/80">
                          {displaySlides[currentSlide]?.content?.[0] || ''}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-white mb-4">
                          {displaySlides[currentSlide]?.title || ''}
                        </h2>
                        <div className="space-y-2">
                          {(displaySlides[currentSlide]?.content || []).map((item, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-start text-white text-lg"
                            >
                              <span className="w-3 h-3 bg-white rounded-full mr-3 mt-1.5 flex-shrink-0" />
                              <span className="leading-relaxed">{item}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
                
                <div className="flex justify-between items-center text-white/60 text-sm">
                  <span>幻灯片 {currentSlide + 1} / {totalSlides}</span>
                  <span>智能报表系统</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(displaySlides || []).map((slide, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setCurrentSlide(idx)}
                  className={`aspect-video rounded-lg cursor-pointer overflow-hidden ${
                    currentSlide === idx ? 'ring-4 ring-blue-500' : ''
                  } bg-white shadow`}
                >
                  <div className={`h-full flex flex-col ${theme.bg} p-2`}>
                    <span className="text-white/60 text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                    <h3 className="text-white text-sm font-medium truncate">
                      {slide.title}
                    </h3>
                    <span className="text-white/60 text-xs mt-auto">
                      {slide.content.length} 项
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={0}
            max={totalSlides - 1}
            value={currentSlide}
            onChange={(e) => setCurrentSlide(parseInt(e.target.value))}
            className="w-32"
          />
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>{displaySlides[currentSlide]?.title || ''}</span>
          <span>按空格键 {isPlaying ? '暂停' : '播放'}</span>
        </div>
      </footer>
    </div>
  );
};

export default PPTViewer;