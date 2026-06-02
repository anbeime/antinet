import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, ArrowDown, MapPin, Download, Loader, FileText } from 'lucide-react';

// 设置 pdfjs worker（使用本地已安装的版本）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href;

interface CardAnnotation {
  card_id: number;
  title: string;
  card_type: string;
  location_in_source: string;
  content_preview: string;
  isCurrent?: boolean;
}

interface PdfSourceViewerProps {
  pdfUrl: string;
  fileName: string;
  annotations: CardAnnotation[];
  currentCardId?: string | number;
  onClose: () => void;
  onLocateAnnotation?: (cardId: number) => void;
}

const cardColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

const PdfSourceViewer: React.FC<PdfSourceViewerProps> = ({
  pdfUrl,
  fileName,
  annotations,
  currentCardId,
  onClose,
  onLocateAnnotation,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Map<number, CardAnnotation[]>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnnotations = annotations.filter(ann => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (ann.title || '').toLowerCase().includes(q) ||
      (ann.content_preview || '').toLowerCase().includes(q) ||
      String(ann.card_id).includes(q);
  });

  // 加载 PDF
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`无法加载 PDF: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjsLib.getDocument(arrayBuffer).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || '加载 PDF 失败');
          setLoading(false);
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // 搜索卡片内容在 PDF 中的出现页面
  useEffect(() => {
    if (!pdfDoc || annotations.length === 0) return;

    const searchPdf = async () => {
      // 先缓存所有页面的文本（避免每个 annotation 重复加载）
      const pageTextCache = new Map<number, string>();
      const maxPages = Math.min(pdfDoc.numPages, 80);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          pageTextCache.set(pageNum, textContent.items.map((item: any) => item.str).join(' '));
        } catch {
          pageTextCache.set(pageNum, '');
        }
      }

      // 对每个 annotation 搜索匹配页面
      const searchPromises = annotations.map(async (annotation) => {
        const keywords = (annotation.content_preview || '').slice(0, 40).trim();
        if (!keywords) return null;
        
        const searchWords = keywords.split(/[\s,，。；;、]+/).filter(w => w.length >= 2).slice(0, 5);
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const pageText = pageTextCache.get(pageNum) || '';
            const matchCount = searchWords.filter(w => pageText.includes(w)).length;
            if (matchCount >= Math.max(1, Math.floor(searchWords.length * 0.6))) {
              return { pageNum, annotation };
            }
          } catch {
            // skip
          }
        }
        return null;
      });

      const results = await Promise.allSettled(searchPromises);
      const pageResults = new Map<number, CardAnnotation[]>();

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          const { pageNum, annotation } = r.value;
          if (!pageResults.has(pageNum)) {
            pageResults.set(pageNum, []);
          }
          pageResults.get(pageNum)!.push(annotation);
        }
      });

      // 如果关键词搜索没找到，按段落号近似映射页码（粗略估计：每20段≈1页）
      if (pageResults.size === 0) {
        annotations.forEach(annotation => {
          const paraMatch = annotation.location_in_source?.match(/第(\d+)段/);
          if (paraMatch) {
            const paraIndex = parseInt(paraMatch[1]);
            const estimatedPage = Math.ceil(paraIndex / 20);
            if (estimatedPage <= pdfDoc.numPages) {
              if (!pageResults.has(estimatedPage)) {
                pageResults.set(estimatedPage, []);
              }
              pageResults.get(estimatedPage)!.push(annotation);
            }
          }
        });
      }

      setSearchResults(pageResults);
      
      // 自动跳转到当前卡片的第一处匹配页
      if (currentCardId && pageResults.size > 0) {
        for (const [pageNum, anns] of pageResults.entries()) {
          if (anns.some(a => String(a.card_id) === String(currentCardId))) {
            setCurrentPage(pageNum);
            break;
          }
        }
      }
    };

    searchPdf();
  }, [pdfDoc, annotations, currentCardId]);

  // 渲染当前页
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const dpr = window.devicePixelRatio || 1;
      const vp = page.getViewport({ scale }); // CSS-pixel viewport
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;

      if (!context) return;
      context.scale(dpr, dpr);
      
      await page.render({ canvasContext: context, viewport: vp }).promise;

      // 绘制标注高亮
      const pageAnnotations = searchResults.get(currentPage);
      if (pageAnnotations && pageAnnotations.length > 0) {
        const textContent = await page.getTextContent();
        
        for (const ann of pageAnnotations) {
          const searchText = (ann.content_preview || '').slice(0, 60).trim();
          if (!searchText) continue;

          // 查找文本位置的近似坐标
          textContent.items.forEach((item: any) => {
            // 简单的近似匹配：如果文本项包含搜索词的一部分
            const itemStr = item.str || '';
            if (itemStr.length >= 3 && searchText.includes(itemStr.slice(0, Math.min(8, itemStr.length)))) {
              const tx = item.transform;
              const x = tx[4] * scale;
              const y = (vp.height - tx[5] * scale);
              const w = item.width * scale * 1.2;
              const h = Math.abs(tx[1]) * scale || 16;

              const isCurrent = String(ann.card_id) === String(currentCardId);
              context.fillStyle = isCurrent ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.25)';
              context.fillRect(x, y - h, w, h);

              if (isCurrent) {
                context.strokeStyle = 'rgba(168, 85, 247, 0.7)';
                context.lineWidth = 2;
                context.strokeRect(x, y - h, w, h);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error(`渲染第 ${currentPage} 页失败:`, err);
    }
  }, [pdfDoc, currentPage, scale, searchResults, currentCardId]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(numPages, page));
    setCurrentPage(p);
  };

  const handleJumpPage = () => {
    const p = parseInt(jumpPageInput);
    if (!isNaN(p)) {
      goToPage(p);
      setJumpPageInput('');
    }
  };

  // 定位按钮：跳转到当前卡片的第一个匹配页
  const locateAnnotation = (annotation: CardAnnotation) => {
    for (const [pageNum, anns] of searchResults.entries()) {
      if (anns.some(a => a.card_id === annotation.card_id)) {
        goToPage(pageNum);
        break;
      }
    }
    onLocateAnnotation?.(annotation.card_id);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <FileText size={48} className="mb-4 opacity-30" />
        <p className="text-red-500 font-medium">加载 PDF 失败</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-3 text-gray-400">
          将打开 Markdown 溯源视图查看提取的文本内容
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium truncate max-w-[250px]">{fileName}</span>
          {loading && <Loader size={14} className="animate-spin text-blue-500" />}
        </div>
        
        <div className="flex items-center gap-1">
          {/* 页面导航 */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-1 py-0.5">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs px-2 min-w-[70px] text-center tabular-nums">
              {currentPage} / {numPages || '?'}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 跳页输入 */}
          <div className="flex items-center">
            <input
              type="number"
              min={1}
              max={numPages}
              value={jumpPageInput}
              onChange={e => setJumpPageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJumpPage()}
              placeholder={`${currentPage}`}
              className="w-14 text-xs px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-center"
            />
          </div>

          {/* 缩放 */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-1 py-0.5">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.2))}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <button
            onClick={() => window.open(pdfUrl, '_blank')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500"
            title="在新窗口打开"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* PDF 渲染区 */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 flex justify-center p-4">
        {loading ? (
          <div className="flex items-center justify-center self-center py-20">
            <Loader size={32} className="animate-spin text-blue-500 mr-3" />
            <span className="text-gray-500">正在加载 PDF...</span>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-xl bg-white rounded" />
        )}
      </div>

      {/* 底部：卡片标注列表 */}
      {annotations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={14} className="text-purple-500" />
            <div className="flex items-center gap-1 flex-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                卡片标注 · 共 {annotations.length} 张卡片 · 匹配 {searchResults.size} 页
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="text-xs px-2 py-0.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 w-16 outline-none"
                />
                <Search size={12} className="text-gray-400 shrink-0" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="清除搜索"
                  >
                    <ArrowDown size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
            {filteredAnnotations.map(ann => {
              const isCurrent = String(ann.card_id) === String(currentCardId);
              const hasPageMatch = [...searchResults.entries()].some(
                ([_, as]) => as.some(a => a.card_id === ann.card_id)
              );
              const matchPage = hasPageMatch
                ? [...searchResults.entries()].find(([_, as]) =>
                    as.some(a => a.card_id === ann.card_id)
                  )?.[0]
                : null;

              return (
                <button
                  key={ann.card_id}
                  onClick={() => locateAnnotation(ann)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 ring-2 ring-purple-400'
                      : hasPageMatch
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cardColorMap[ann.card_type] || 'bg-gray-400'}`} />
                  <span className="truncate max-w-[120px]">{ann.title?.slice(0, 15) || `卡片 #${ann.card_id}`}</span>
                  {isCurrent && <span className="text-[10px] opacity-75">←</span>}
                  {hasPageMatch && matchPage && (
                    <span className="text-[10px] opacity-50 ml-0.5">p{matchPage}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfSourceViewer;
