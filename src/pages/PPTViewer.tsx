import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Presentation, Upload, Download, ChevronLeft, ChevronRight,
  Play, Pause, Maximize2, Grid, List, FilePlus, Edit3, Save,
  RotateCcw, Type, Palette, Eye, Sparkles
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import type {
  PPTPreviewData, SlideData, SlideShape,
  DesignTheme, BrandStyle, ThemeColors
} from '@/types/designSystem';

const API_BASE = getApiBaseUrl();

const DEFAULT_THEME: BrandStyle = {
  theme: {
    name: 'professional',
    label: 'Professional',
    description: '',
    colors: { primary: '#1C2833', secondary: '#3498DB', accent: '#F1C40F', background: '#ECF0F1', text: '#2C3E50' },
    fonts: { title: 'Arial', body: 'Arial' },
    layout_style: 'professional',
  },
  card_colors: { blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', red: '#ef4444' },
};

const PPTViewer: React.FC = () => {
  useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [preview, setPreview] = useState<PPTPreviewData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'slide' | 'outline'>('slide');
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [brandStyle, setBrandStyle] = useState<BrandStyle>(DEFAULT_THEME);
  const [availableThemes, setAvailableThemes] = useState<DesignTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('professional');
  const [editSlides, setEditSlides] = useState<SlideData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = preview?.slides || [];
  const totalSlides = slides.length || 1;
  const current = slides[currentSlide];

  useEffect(() => {
    loadThemes();
    loadPPT();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % (totalSlides || 1));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, totalSlides]);

  const loadThemes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/design-system/themes`);
      if (res.ok) setAvailableThemes(await res.json());
    } catch { /* ignore */ }
  };

  const loadPPT = async () => {
    let fileName = searchParams.get('file') || sessionStorage.getItem('lastPPTFileName');
    if (!fileName) return;

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/ppt/file?filename=${encodeURIComponent(fileName)}`);
      if (!resp.ok) { toast.error('PPT 文件不存在'); return; }

      const blob = await resp.blob();
      if (blob.size === 0) { toast.error('文件为空'); return; }

      setCurrentFileName(fileName);
      const formData = new FormData();
      formData.append('file', new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));

      const extResp = await fetch(`${API_BASE}/api/ppt/preview/extract`, { method: 'POST', body: formData });
      if (extResp.ok) {
        const data: PPTPreviewData = await extResp.json();
        setPreview(data);
        setEditSlides(JSON.parse(JSON.stringify(data.slides)));
        if (data.design_system) {
          setBrandStyle(data.design_system);
          setSelectedTheme(data.design_system.theme.name);
        }
        toast.success(`加载成功 (${data.total_slides} 页)`);
      } else {
        fallbackParse(blob, fileName);
      }
    } catch (e) {
      toast.error('加载失败: ' + (e as Error).message);
    }
    setIsLoading(false);
  };

  const fallbackParse = async (blob: Blob, fileName: string) => {
    try {
      const JSZip = await import('jszip');
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
          const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
          return na - nb;
        });

      const parsedSlides: SlideData[] = [];
      for (const sf of slideFiles) {
        const content = await zip.file(sf)?.async('string');
        if (!content) continue;
        const lines: string[] = [];
        let title = '';
        const textElements = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
        if (textElements) {
          for (let i = 0; i < textElements.length; i++) {
            const m = textElements[i].match(/<a:t[^>]*>([^<]+)<\/a:t>/);
            if (m?.[1]) {
              const t = m[1].trim();
              if (t) {
                if (i === 0) title = t;
                else lines.push(t);
              }
            }
          }
        }
        parsedSlides.push({
          index: parsedSlides.length + 1,
          shapes: [{ type: 'PARAGRAPH', left: 40, top: 40, width: 880, height: 460, text: lines.join('\n'), font_size: 18, font_color: '#333' } as SlideShape],
          background: '#ffffff',
        });
      }
      if (parsedSlides.length > 0) {
        const fake: PPTPreviewData = {
          filename: fileName, total_slides: parsedSlides.length,
          slide_width: 960, slide_height: 540, slides: parsedSlides,
        };
        setPreview(fake);
        setEditSlides(JSON.parse(JSON.stringify(parsedSlides)));
      }
    } catch { toast.error('无法解析 PPT 内容'); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setCurrentFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE}/api/ppt/preview/extract`, { method: 'POST', body: formData });
      if (resp.ok) {
        const data: PPTPreviewData = await resp.json();
        setPreview(data);
        setEditSlides(JSON.parse(JSON.stringify(data.slides)));
        if (data.design_system) {
          setBrandStyle(data.design_system);
          setSelectedTheme(data.design_system.theme.name);
        }
        toast.success(`加载成功 (${data.total_slides} 页)`);
      } else {
        fallbackParse(file, file.name);
      }
    } catch { fallbackParse(file, file.name); }
    setIsLoading(false);
  };

  const handleThemeChange = async (name: string) => {
    setSelectedTheme(name);
    try {
      const resp = await fetch(`${API_BASE}/api/design-system/themes/${name}`);
      if (resp.ok) {
        const theme: DesignTheme = await resp.json();
        setBrandStyle(prev => ({ ...prev, theme }));
        toast.success(`已切换主题: ${theme.label}`);
      }
    } catch { /* ignore */ }
  };

  const handleReconstruct = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/ppt/reconstruct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: editSlides,
          theme: selectedTheme,
          filename: currentFileName || `edited_${Date.now()}.pptx`,
          slide_width: preview.slide_width,
          slide_height: preview.slide_height,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCurrentFileName(data.filename);
        sessionStorage.setItem('lastPPTFileName', data.filename);
        toast.success('PPT 已保存并重新加载');
        navigate(`/ppt-viewer?file=${encodeURIComponent(data.filename)}`);
      } else {
        toast.error('保存失败');
      }
    } catch (e) {
      toast.error('保存失败: ' + (e as Error).message);
    }
    setIsLoading(false);
  };

  const updateShapeText = (slideIdx: number, shapeIdx: number, text: string) => {
    setEditSlides(prev => {
      const next = [...prev];
      const shapes = [...next[slideIdx].shapes];
      shapes[shapeIdx] = { ...shapes[shapeIdx], text };
      next[slideIdx] = { ...next[slideIdx], shapes };
      return next;
    });
  };

  const colors = brandStyle.theme.colors;
  const slideBg = current?.background || colors.background;

  const getLuminance = (hex: string) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    const sr = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const sg = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const sb = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
  };

  const getTextColor = (shape: SlideShape, slideBg: string) => {
    if (shape.font_color) return shape.font_color;
    const bg = shape.fill_color || slideBg || colors.background;
    if (bg === 'transparent') return colors.text;
    const lum = getLuminance(bg);
    return lum < 0.3 ? '#FFFFFF' : colors.text;
  };

  const renderSlideContent = (sd: SlideData) => {
    if (!sd) return null;
    const origW = preview?.slide_width || 960;
    const origH = preview?.slide_height || 540;
    const pct = (v: number, dim: number) => `${(v / dim) * 100}%`;
    const scaleFont = (v?: number | null) => Math.max(6, ((v || 14) * origH) / 540);

    return (
      <div style={{
        width: '100%', height: '100%', background: sd.background || '#ffffff',
        position: 'relative', overflow: 'hidden',
      }}>
        {sd.shapes.map((shape, i) => {
          const defaultFontSize = scaleFont(shape.font_size);
          const defaultColor = getTextColor(shape, sd.background || colors.background);
          const paragraphs = shape.paragraphs;

          if (shape.table) {
            return (
              <table key={i} style={{
                position: 'absolute', left: pct(shape.left, origW), top: pct(shape.top, origH),
                width: pct(shape.width, origW), height: pct(shape.height, origH),
                borderCollapse: 'collapse', fontSize: defaultFontSize,
              }}>
                <tbody>
                  {shape.table.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ border: '1px solid #ccc', padding: '2px 4px' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }

          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: pct(shape.left, origW), top: pct(shape.top, origH),
                width: pct(shape.width, origW), height: pct(shape.height, origH),
                background: shape.fill_color || 'transparent',
                opacity: shape.fill_opacity ?? 1,
                fontSize: defaultFontSize,
                color: defaultColor,
                fontWeight: shape.font_bold ? 'bold' : 'normal',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                padding: '2px 4px',
              }}
            >
              {paragraphs?.length
                ? paragraphs.map((p, pi) => (
                    <div key={pi} style={{ textAlign: (p as any).align || 'left', marginBottom: 2 }}>
                      {p.text}
                    </div>
                  ))
                : (shape.text || '').split('\n').map((line, li) => (
                    <div key={li}>{line}</div>
                  ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEditSlides = () => {
    const sd = editSlides[currentSlide];
    if (!sd) return null;
    return (
      <div className="flex flex-col h-full p-4 gap-4">
        <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-inner relative" style={{ aspectRatio: '16/9', maxHeight: '60%' }}>
          {renderSlideContent(sd)}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          <h3 className="text-white font-medium">编辑内容</h3>
          {sd.shapes.map((shape, i) => (
            <div key={i} className="bg-gray-700 rounded p-2">
              <div className="text-xs text-gray-400 mb-1">形状 {i + 1} ({shape.type})</div>
              <textarea
                className="w-full bg-gray-600 text-white rounded p-2 text-sm resize-none"
                rows={3}
                value={shape.text || ''}
                onChange={e => updateShapeText(currentSlide, i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <Presentation className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium">PPT 演示查看器</span>
          <span className="text-gray-400 text-sm">({currentSlide + 1} / {totalSlides})</span>
          <label className="ml-2 cursor-pointer">
            <input type="file" accept=".pptx,.ppt" onChange={handleFileUpload} className="hidden" />
            <span className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-1">
              <Upload className="w-4 h-4" />上传PPT
            </span>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedTheme}
            onChange={e => handleThemeChange(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
          >
            {availableThemes.map(t => (
              <option key={t.name} value={t.name}>{t.label}</option>
            ))}
          </select>

          <button onClick={() => setViewMode(viewMode === 'slide' ? 'outline' : 'slide')}
            className="p-2 hover:bg-gray-700 rounded text-gray-300" title={viewMode === 'slide' ? '大纲视图' : '幻灯片视图'}>
            {viewMode === 'slide' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>

          <button onClick={() => { setEditMode(!editMode); if (!editMode) setEditSlides(JSON.parse(JSON.stringify(slides))); }}
            className={`p-2 rounded ${editMode ? 'bg-green-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`} title="编辑模式">
            <Edit3 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-600" />

          <button onClick={() => { setIsPlaying(p => !p); }} className={`p-2 rounded ${isPlaying ? 'bg-red-500' : 'bg-gray-700'} text-white hover:opacity-80`}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button onClick={() => setCurrentSlide(0)} className="p-2 hover:bg-gray-700 rounded text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentSlide(p => (p - 1 + totalSlides) % totalSlides)} className="p-2 hover:bg-gray-700 rounded text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentSlide(p => (p + 1) % totalSlides)} className="p-2 hover:bg-gray-700 rounded text-gray-300"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentSlide(totalSlides - 1)} className="p-2 hover:bg-gray-700 rounded text-gray-300"><ChevronRight className="w-4 h-4" /></button>

          <div className="w-px h-6 bg-gray-600" />

          <button onClick={() => { const a = document.createElement('a'); a.href = `${API_BASE}/api/ppt/file?filename=${encodeURIComponent(currentFileName)}`; a.download = currentFileName; a.click(); }}
            disabled={!currentFileName}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
            <Download className="w-4 h-4" /><span className="text-sm">下载</span>
          </button>

          {editMode && (
            <button onClick={handleReconstruct} disabled={isLoading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600">
              {isLoading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="text-sm">保存并预览</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>加载中...</p>
            </div>
          </div>
        ) : editMode ? (
          <div className="flex-1 overflow-hidden">{renderEditSlides()}</div>
        ) : viewMode === 'slide' ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-5xl aspect-video bg-white rounded-lg shadow-2xl overflow-hidden cursor-pointer relative"
                  onClick={() => setCurrentSlide(p => (p + 1) % totalSlides)}
                  style={{ maxHeight: 'calc(100vh - 180px)' }}
                >
                  {renderSlideContent(current)}
                  <div className="absolute bottom-2 right-3 text-xs text-gray-500 bg-white/80 px-2 py-0.5 rounded">
                    {currentSlide + 1} / {totalSlides}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slides.map((sd, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => { setCurrentSlide(idx); setViewMode('slide'); }}
                  className={`aspect-video rounded-lg cursor-pointer overflow-hidden relative ${currentSlide === idx ? 'ring-4 ring-blue-500' : ''} bg-white shadow`}
                >
                  {renderSlideContent(sd)}
                  <div className="absolute bottom-1 left-2 text-xs text-white bg-black/50 px-1 rounded">
                    {idx + 1}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input type="range" min={0} max={totalSlides - 1} value={currentSlide}
            onChange={e => setCurrentSlide(parseInt(e.target.value))} className="w-32" />
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>{current?.shapes?.[0] && ((current.shapes[0] as any).paragraphs?.[0]?.text || current.shapes[0].text || '')}</span>
          <span>空格 {isPlaying ? '暂停' : '播放'}</span>
        </div>
      </footer>
    </div>
  );
};

export default PPTViewer;
