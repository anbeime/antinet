import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Download, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Hash, Edit3, Eye, X, Loader,
  Maximize2, Minimize2, AlertCircle, Bookmark, Plus, Save, Trash2
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiConfig';
import * as pdfjsLib from 'pdfjs-dist';

const API_BASE = getApiBaseUrl();
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

const CARD_COLORS: Record<string, string> = {
  blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  yellow: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  red: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
};
const CARD_TYPE_LABELS: Record<string, string> = { blue: '📋 事实', green: '🔗 关联', yellow: '⚠️ 风险', red: '🎯 行动' };

const PDFViewer: React.FC = () => {
  useTheme();
  const [searchParams] = useSearchParams();

  // PDF 原生渲染
  const [pdfUrl, setPdfUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfjsRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // 文本项位置存储（用于导出编辑后的 PDF）
  const textItemsByPageRef = useRef<Map<number, any[]>>(new Map());
  const originalPageTextsRef = useRef<string[]>([]);

  // 源文件查看器（跟 CardDetailModal 一致）
  const [sourceViewMode, setSourceViewMode] = useState<'markdown' | 'pdf'>('markdown');
  const [sourcePdfUrl, setSourcePdfUrl] = useState('');
  const [sourcePdfGenerating, setSourcePdfGenerating] = useState(false);
  const [sourcePdfError, setSourcePdfError] = useState('');
  const [sourceFullscreen, setSourceFullscreen] = useState(false);

  // 卡片编辑
  const [cardTitle, setCardTitle] = useState('');
  const [cardContent, setCardContent] = useState('');
  const [cardType, setCardType] = useState('blue');
  const [exportTheme, setExportTheme] = useState('chinese-red');

  // 卡片侧边栏
  const [showCardPanel, setShowCardPanel] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardFilter, setCardFilter] = useState('');

  // 当前激活的视图: 'pdf'=原生PDF渲染, 'source'=卡片源文件查看器
  const [activeView, setActiveView] = useState<'pdf' | 'source'>('pdf');

  const loadPDFJS = async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    pdfjsRef.current = pdfjsLib;
    return pdfjsLib;
  };

  // ========== PDF 加载 ==========
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) loadPDFFromURL(urlParam);
  }, []);

  const loadPDFFromURL = async (url: string) => {
    setPdfLoading(true);
    setPdfError('');
    setPdfUrl(url);
    try {
      try {
        const urlObj = new URL(url, window.location.origin);
        const pathParts = urlObj.pathname.split('/');
        const rawName = decodeURIComponent(pathParts[pathParts.length - 1] || '');
        setFileName(rawName.replace(/^[\w-]+-/, '') || 'PDF文档');
      } catch {}
      const pjs = await loadPDFJS();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      const pdf = await pjs.getDocument({ data: new Uint8Array(ab), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (e: any) {
      setPdfError(e.message || '加载PDF失败');
    } finally { setPdfLoading(false); }
  };

  const switchToEditorWithExtractedText = async () => {
    if (!pdfDoc) return;
    setIsNewCard(true); setCardType('blue'); setActiveView('source'); setSourceViewMode('pdf');
    setCardTitle(fileName.replace(/\.pdf$/i, '') || '导入文档');
    const itemsByPage = new Map<number, any[]>();
    const pageTexts: string[] = [];
    let text = '';
    for (let i = 1; i <= Math.min(pdfDoc.numPages, 50); i++) {
      try {
        const p = await pdfDoc.getPage(i);
        const tc = await p.getTextContent();
        itemsByPage.set(i, tc.items);
        const pageText = tc.items.map((t: any) => t.str).join(' ');
        pageTexts.push(pageText);
        text += pageText + '\n\n';
      } catch {}
    }
    textItemsByPageRef.current = itemsByPage;
    originalPageTextsRef.current = pageTexts;
    setCardContent(text.trim() || '');
    if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); }
  };

  useEffect(() => { if (pdfDoc && currentPage > 0) renderPage(currentPage); }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    if (pdfDoc && !pdfLoading && fileName && activeView !== 'source') {
      switchToEditorWithExtractedText();
    }
  }, [pdfDoc, pdfLoading]);

  useEffect(() => {
    if (sourceViewMode === 'pdf' && selectedCard?.id && cardContent && !sourcePdfUrl) {
      generateSourcePdf();
    }
  }, [sourceViewMode, selectedCard?.id]);

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
    try {
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale });
      const c = canvasRef.current;
      c.height = vp.height; c.width = vp.width;
      const ctx = c.getContext('2d');
      if (ctx) { const t = page.render({ canvasContext: ctx, viewport: vp }); renderTaskRef.current = t; await t.promise; renderTaskRef.current = null; }
    } catch (e: any) { if (e?.name === 'RenderingCancelledException') return; }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) { setPdfError('请选择有效的PDF文件'); return; }
    setPdfLoading(true); setPdfError(''); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const ab = ev.target?.result as ArrayBuffer;
      setPdfUrl(URL.createObjectURL(new Blob([ab], { type: 'application/pdf' })));
      try {
        const pjs = await loadPDFJS();
        const pdf = await pjs.getDocument({ data: new Uint8Array(ab), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
        setPdfDoc(pdf); setTotalPages(pdf.numPages); setCurrentPage(1);
      } catch (err: any) { setPdfError(err.message || '加载PDF失败'); } finally { setPdfLoading(false); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ========== 源文件 PDF 生成（跟 CardDetailModal 完全一致） ==========
  const generateSourcePdf = async (theme?: string) => {
    const effectiveTheme = theme || exportTheme;
    const md = `# ${cardTitle}\n\n${cardContent}`;
    if (!md.trim()) return;
    setSourcePdfGenerating(true);
    setSourcePdfError('');
    try {
      const fd = new FormData();
      fd.append('file', new Blob([md], { type: 'text/markdown' }), 'card.md');
      fd.append('title', cardTitle || '知识卡片');
      fd.append('author', 'PDFViewer');
      fd.append('theme', effectiveTheme);
      const res = await fetch(`${API_BASE}/api/md2pdf/convert`, { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'PDF 生成失败'); }
      const blob = await res.blob();
      if (sourcePdfUrl) URL.revokeObjectURL(sourcePdfUrl);
      setSourcePdfUrl(URL.createObjectURL(blob));
    } catch (e: any) { setSourcePdfError(e.message || 'PDF 生成失败'); } finally { setSourcePdfGenerating(false); }
  };

  // ========== 知识卡片 CRUD ==========
  const loadCards = async () => {
    setCardsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/cards?limit=500`);
      if (res.ok) { const d = await res.json(); setCards(d.cards || d || []); }
    } catch {} finally { setCardsLoading(false); }
  };

  useEffect(() => { if (showCardPanel) loadCards(); }, [showCardPanel]);

  const selectCard = (card: any) => {
    setSelectedCard(card);
    setIsNewCard(false);
    setActiveView('source');
    setSourceViewMode('pdf');
    setCardTitle(card.title || '');
    setCardContent(card.content || '');
    setCardType(card.card_type || card.type || 'blue');
    if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); }
  };

  const handleNewCard = () => {
    setSelectedCard(null); setIsNewCard(true); setActiveView('source'); setSourceViewMode('markdown');
    setCardTitle(''); setCardContent(''); setCardType('blue');
    if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); }
  };

  const handleSaveCard = async () => {
    if (!cardContent.trim() && !cardTitle.trim()) return;
    setSaving(true);
    try {
      const body = { title: cardTitle || '无标题', content: cardContent, type: cardType };
      if (isNewCard) {
        const res = await fetch(`${API_BASE}/api/knowledge/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { const saved = await res.json(); setSelectedCard(saved); setIsNewCard(false); loadCards(); }
      } else if (selectedCard?.id) {
        const res = await fetch(`${API_BASE}/api/knowledge/cards/${selectedCard.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { const updated = await res.json(); setSelectedCard(updated); loadCards(); }
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDeleteCard = async () => {
    if (!selectedCard?.id || isNewCard) return;
    if (!window.confirm(`确定删除卡片「${selectedCard.title}」？`)) return;
    try {
      await fetch(`${API_BASE}/api/knowledge/cards/${selectedCard.id}`, { method: 'DELETE' });
      setSelectedCard(null); setIsNewCard(false); setActiveView(pdfUrl ? 'pdf' : 'source');
      loadCards();
    } catch {}
  };

  const filteredCards = cards.filter((c: any) => {
    if (!cardFilter) return true;
    const q = cardFilter.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q);
  });

  // ========== 导出编辑后的 PDF（保留原样式 + 文字编辑） ==========
  const exportEditedPdf = async () => {
    if (!pdfDoc) { setSourcePdfError('没有可导出的 PDF'); return; }
    setSourcePdfGenerating(true);
    setSourcePdfError('');
    try {
      const editedPages = cardContent.split('\n\n');
      const pagesData: any[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const vp = page.getViewport({ scale: 1 });

        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        const textItems = textItemsByPageRef.current.get(pageNum) || [];
        const originalPageText = originalPageTextsRef.current[pageNum - 1] || '';
        const editedPageText = editedPages[pageNum - 1] || '';

        const edits: any[] = [];
        if (editedPageText && editedPageText !== originalPageText) {
          const origWords = originalPageText.split(/\s+/);
          const editWords = editedPageText.split(/\s+/);
          if (origWords.length === editWords.length && textItems.length === origWords.length) {
            for (let j = 0; j < textItems.length; j++) {
              const item = textItems[j];
              if ((item.str || '') !== (editWords[j] || '')) {
                edits.push({
                  x: item.transform[4],
                  y: item.transform[5],
                  width: item.width || 100,
                  height: item.height || Math.abs(item.transform[3]) || 12,
                  fontSize: item.fontSize || Math.abs(item.transform[3]) || 12,
                  text: editWords[j] || '',
                });
              }
            }
          }
        }

        pagesData.push({
          page: pageNum,
          width: vp.width,
          height: vp.height,
          data: dataUrl,
          edits,
        });
      }

      const fd = new FormData();
      fd.append('images', JSON.stringify(pagesData));
      fd.append('title', cardTitle || '文档');
      fd.append('author', 'PDFViewer');

      const res = await fetch(`${API_BASE}/api/pdf/edit-text`, { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || '导出失败'); }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cardTitle || 'export'}-edited.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      setSourcePdfError(e.message || '导出编辑 PDF 失败');
    } finally {
      setSourcePdfGenerating(false);
    }
  };

  // ========== 渲染源文件查看器（跟 CardDetailModal 完全一致） ==========
  const renderSourceViewer = () => (
    <div className={`flex flex-col h-full ${sourceFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-purple-600" />
            <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{cardTitle || (selectedCard?.title || '新建文档')}</h3>
            <p className="text-xs text-gray-500">{isNewCard ? '新卡片' : selectedCard?.id ? `卡片 #${selectedCard.id}` : '临时编辑'}</p>
          </div>
          {/* Markdown/PDF 视图切换 */}
          <div className="flex items-center bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 ml-4">
            <button onClick={() => { setSourceViewMode('markdown'); if (sourcePdfUrl) { URL.revokeObjectURL(sourcePdfUrl); setSourcePdfUrl(''); } }}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors ${sourceViewMode === 'markdown' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              <Edit3 size={12} className="inline mr-1" />Markdown 文本
            </button>
            <button onClick={() => setSourceViewMode('pdf')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors ${sourceViewMode === 'pdf' ? 'bg-red-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              <FileText size={12} className="inline mr-1" />PDF 预览
            </button>
          </div>
          {/* PDF 主题选择 */}
          {sourceViewMode === 'pdf' && (
            <select value={exportTheme} onChange={e => { setExportTheme(e.target.value); if (cardContent) generateSourcePdf(e.target.value); }}
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer ml-2">
              <option value="warm-academic">暖学术</option>
              <option value="classic-thesis">经典论文</option>
              <option value="tufte">Tufte</option>
              <option value="ieee-journal">期刊蓝</option>
              <option value="elegant-book">精装书</option>
              <option value="chinese-red">中国红</option>
              <option value="ink-wash">水墨</option>
              <option value="github-light">GitHub</option>
              <option value="nord-frost">Nord冰霜</option>
              <option value="ocean-breeze">海洋</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSourceFullscreen(!sourceFullscreen)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title={sourceFullscreen ? '退出全屏' : '全屏查看'}>
            {sourceFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {sourceViewMode === 'pdf' ? (
          sourcePdfGenerating ? (
            <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-red-500 mr-3" /><span className="text-gray-500">生成 PDF 中...</span></div>
          ) : sourcePdfError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle size={48} strokeWidth={1} className="mb-4 opacity-30" />
              <p className="text-sm">{sourcePdfError}</p>
              <button onClick={() => generateSourcePdf()} className="mt-4 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">重试</button>
            </div>
          ) : (() => {
            const displayUrl = sourcePdfUrl || (activeView === 'source' && !selectedCard && pdfUrl ? pdfUrl : null);
            const isOriginal = !sourcePdfUrl && displayUrl === pdfUrl;
            return displayUrl ? (
              <div className="-m-6 h-full flex flex-col bg-gray-100 dark:bg-gray-900">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  {isOriginal ? (
                    <>
                      <button onClick={() => setSourceViewMode('markdown')}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                        ✎ 编辑文本
                      </button>
                      <a href={displayUrl} download={`${cardTitle || 'export'}.pdf`}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <Download size={12} />下载 PDF
                      </a>
                      <span className="text-xs text-gray-400">原始文件</span>
                    </>
                  ) : (
                    <>
                      <a href={displayUrl} download={`${cardTitle || 'export'}.pdf`}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <Download size={12} />下载 PDF
                      </a>
                      <span className="text-xs text-gray-400">主题: {exportTheme}</span>
                    </>
                  )}
                  <div className="flex-1" />
                  {isOriginal && cardContent && (
                    <>
                      <button onClick={exportEditedPdf} disabled={sourcePdfGenerating}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {sourcePdfGenerating ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}导出编辑 PDF
                      </button>
                      <button onClick={async () => { if (cardContent) { const md = `# ${cardTitle}\n\n${cardContent}`; const fd = new FormData(); fd.append('file', new Blob([md], { type: 'text/markdown' }), 'doc.md'); fd.append('title', cardTitle); fd.append('author', 'PDFViewer'); fd.append('theme', exportTheme); const res = await fetch(`${API_BASE}/api/md2pdf/convert`, { method: 'POST', body: fd }); if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${cardTitle}-${exportTheme}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); } } }}
                        className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600">生成主题 PDF</button>
                    </>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <object data={displayUrl} type="application/pdf" className="w-full h-full">
                    <embed src={displayUrl} type="application/pdf" className="w-full h-full" />
                  </object>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FileText size={48} strokeWidth={1} className="mb-4 opacity-30" />
                <p className="text-sm mb-4">暂无 PDF</p>
              </div>
            );
          })()
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input value={cardTitle} onChange={e => setCardTitle(e.target.value)}
                className="flex-1 text-lg font-bold px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="卡片标题" />
              <select value={cardType} onChange={e => setCardType(e.target.value)}
                className="text-xs border rounded px-2 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
                <option value="blue">📋 事实</option>
                <option value="green">🔗 关联</option>
                <option value="yellow">⚠️ 风险</option>
                <option value="red">🎯 行动</option>
              </select>
              <button onClick={handleSaveCard} disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm">
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}保存
              </button>
              {!isNewCard && selectedCard?.id && (
                <button onClick={handleDeleteCard} className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                  <Trash2 size={14} />删除
                </button>
              )}
            </div>
            <textarea value={cardContent} onChange={e => setCardContent(e.target.value)}
              className="w-full h-[400px] p-4 border rounded-lg text-sm font-mono resize-none bg-white dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="# 标题&#10;&#10;在此输入 Markdown 内容..." />
            <div className="flex items-center gap-2">
              <select value={exportTheme} onChange={e => setExportTheme(e.target.value)}
                className="text-xs border rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
                <option value="warm-academic">暖学术</option>
                <option value="classic-thesis">经典论文</option>
                <option value="tufte">Tufte</option>
                <option value="ieee-journal">期刊蓝</option>
                <option value="elegant-book">精装书</option>
                <option value="chinese-red">中国红</option>
                <option value="ink-wash">水墨</option>
                <option value="github-light">GitHub</option>
                <option value="nord-frost">Nord冰霜</option>
                <option value="ocean-breeze">海洋</option>
              </select>
              <button onClick={() => generateSourcePdf()}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600">
                <FileText size={12} />生成 PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-3 md:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <label className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
              <Upload className="w-4 h-4" /><span>打开PDF</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            {activeView === 'pdf' && pdfDoc && (
              <>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={16} /></button>
                <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={16} /></button>
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs">-</button>
                <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs">+</button>
              </>
            )}
            {fileName && <span className="text-xs text-gray-400 truncate max-w-[200px]">{fileName}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveView(activeView === 'source' ? 'pdf' : 'source')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${activeView === 'source' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              <Edit3 size={14} />编辑
            </button>
            <button onClick={() => { setShowCardPanel(!showCardPanel); if (!showCardPanel) loadCards(); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${showCardPanel ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              <Bookmark size={14} />卡片
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 主内容 */}
        <main className="flex-1 overflow-auto bg-gray-600">
          {activeView === 'pdf' ? (
            pdfLoading ? (
              <div className="flex items-center justify-center h-full text-white"><Loader size={24} className="animate-spin mr-2" />加载中...</div>
            ) : pdfError ? (
              <div className="flex flex-col items-center justify-center h-full text-red-300"><AlertCircle size={48} className="mb-4 opacity-30" /><p>{pdfError}</p></div>
            ) : pdfDoc ? (
              <div className="flex justify-center p-4">
                <div className="bg-white shadow-lg"><canvas ref={canvasRef} className="max-w-full" /></div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <FileText size={64} className="mb-4 opacity-30" />
                <p className="text-sm mb-2">PDF 查看器</p>
                <p className="text-xs mb-4">上传 PDF 或点击「卡片」管理知识卡片</p>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                  <Upload size={14} />选择文件
                  <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )
          ) : renderSourceViewer()}
        </main>

        {/* 卡片侧边栏 */}
        {showCardPanel && (
          <aside className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1"><Bookmark className="w-4 h-4 text-green-500" />知识卡片</h3>
                <button onClick={handleNewCard} className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"><Plus className="w-3 h-3" />新建</button>
              </div>
              <input value={cardFilter} onChange={e => setCardFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-1 focus:ring-green-400" placeholder="搜索卡片..." />
            </div>
            <div className="flex-1 overflow-y-auto">
              {cardsLoading ? (
                <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-green-500" /></div>
              ) : filteredCards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">{cardFilter ? '无匹配卡片' : '暂无卡片，点击"新建"创建'}</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCards.map((card: any) => (
                    <div key={card.id} onClick={() => selectCard(card)}
                      className={`px-3 py-2 cursor-pointer border-l-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${CARD_COLORS[card.card_type || card.type || 'blue']} ${selectedCard?.id === card.id ? 'ring-1 ring-green-400' : ''}`}>
                      <div className="text-xs font-medium truncate">{card.title || '无标题'}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{card.content || ''}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{CARD_TYPE_LABELS[card.card_type || card.type || 'blue']}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
