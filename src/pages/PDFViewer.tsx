import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Download, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Hash, Edit3, Eye, X
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/lib/apiConfig';
import * as pdfjsLib from 'pdfjs-dist';

const API_BASE = getApiBaseUrl();

// 使用本地安装的 pdfjs-dist（支持离线使用）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface PDFViewerProps {
  fileUrl?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl: propFileUrl }) => {
  useTheme();
  const [searchParams] = useSearchParams();
  const urlParam = searchParams.get('url');
  const fileUrl = propFileUrl || urlParam || undefined;
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loadError, setLoadError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfjsRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const [showMdEditor, setShowMdEditor] = useState(false);
  const [mdInput, setMdInput] = useState('# 文档标题\n\n在此输入 Markdown 内容...');
  const [exportTheme, setExportTheme] = useState('chinese-red');
  const [converting, setConverting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 使用本地安装的 pdfjs-dist（离线可用）
  const loadPDFJS = async (): Promise<any> => {
    if (pdfjsRef.current) return pdfjsRef.current;
    pdfjsRef.current = pdfjsLib;
    return pdfjsLib;
  };

  // Load PDF from URL if provided
  useEffect(() => {
    if (fileUrl) {
      loadPDFFromURL(fileUrl);
    }
  }, [fileUrl]);

  const loadPDFFromURL = async (url: string) => {
    setIsLoading(true);
    setLoadError('');
    try {
      // 从 URL 提取文件名
      try {
        const urlObj = new URL(url, window.location.origin);
        const pathParts = urlObj.pathname.split('/');
        const rawName = decodeURIComponent(pathParts[pathParts.length - 1] || '');
        setFileName(rawName.replace(/^[\w-]+-/, '') || 'PDF文档');
      } catch { /* ignore */ }

      const pdfjsLib = await loadPDFJS();
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: 无法获取文件`);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // PDF.js 3.x: getDocument 返回 PDFDocumentLoadingTask，需通过 .promise 获取 PDFDocumentProxy
      const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
      const pdf = await loadingTask.promise;

      if (!pdf || typeof pdf.getPage !== 'function') {
        throw new Error('PDF 文档解析失败：返回了无效的文档对象');
      }

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('加载PDF失败:', error);
      setLoadError(error.message || '加载PDF失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      setLoadError('请选择有效的PDF文件');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setLoadError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);

      try {
        const pdfjsLib = await loadPDFJS();
        
        // PDF.js 3.x: getDocument 返回 PDFDocumentLoadingTask，需通过 .promise 获取 PDFDocumentProxy
        const loadingTask = pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
        const pdf = await loadingTask.promise;

        if (!pdf || typeof pdf.getPage !== 'function') {
          throw new Error('PDF 文档解析失败：返回了无效的文档对象');
        }

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (error: any) {
        console.error('加载PDF失败:', error);
        setLoadError(error.message || '加载PDF失败，文件可能已损坏');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);

    // 重置 input 以允许重复选择同一文件
    event.target.value = '';
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    const doc = pdfDoc;
    if (!doc || typeof doc.getPage !== 'function') {
      console.error('pdfDoc 不是有效的 PDFDocumentProxy:', typeof doc, doc);
      setLoadError('PDF 文档加载异常，请重试');
      return;
    }

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch (e) { /* ignore */ }
      renderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      }
    } catch (error: any) {
      if (error?.name === 'RenderingCancelledException') return;
      console.error('渲染页面失败:', error);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => setScale(Math.min(scale + 0.25, 3));
  const handleZoomOut = () => setScale(Math.max(scale - 0.25, 0.5));

  const downloadPDF = () => {
    if (!fileName) return;
    const link = document.createElement('a');
    link.href = fileUrl || '';
    link.download = fileName;
    link.click();
  };

  // ========== Markdown → PDF/DOCX/HTML 转换 ==========
  const handleConvertToPdf = async () => {
    if (!mdInput.trim()) return;
    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', new Blob([mdInput], { type: 'text/markdown' }), 'doc.md');
      formData.append('title', '文档');
      formData.append('author', 'PDFViewer');
      formData.append('theme', exportTheme);
      const res = await fetch(`${API_BASE}/api/md2pdf/convert`, { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '转换失败'); }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setFileName(`主题-${exportTheme}.pdf`);
      await loadPDFFromURL(blobUrl);
    } catch (e: any) {
      setLoadError(e.message || '转换PDF失败');
    } finally {
      setConverting(false);
    }
  };

  const handleConvertAndPreview = async (format: 'docx' | 'html') => {
    if (!mdInput.trim()) return;
    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', new Blob([mdInput], { type: 'text/markdown' }), 'doc.md');
      const res = await fetch(`${API_BASE}/api/markdown-converter/convert/file?output_format=${format}&theme=${exportTheme}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '转换失败'); }

      if (format === 'html') {
        const html = await res.text();
        setPreviewTitle('HTML 预览');
        setPreviewHtml(html);
        setShowPreview(true);
      } else {
        const arrayBuffer = await res.arrayBuffer();
        if (typeof (window as any).mammoth === 'undefined') {
          const script = document.createElement('script');
          script.src = '/mammoth.min.js';
          await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
        }
        const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
        setPreviewTitle('DOCX 预览');
        setPreviewHtml(result.value);
        setShowPreview(true);
      }
    } catch (e: any) {
      setLoadError(e.message || '转换失败');
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadDocxHtml = async (format: 'docx' | 'html') => {
    if (!mdInput.trim()) return;
    try {
      const formData = new FormData();
      formData.append('file', new Blob([mdInput], { type: 'text/markdown' }), 'doc.md');
      const res = await fetch(`${API_BASE}/api/markdown-converter/convert/file?output_format=${format}&theme=${exportTheme}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || '导出失败'); }
      const outBlob = await res.blob();
      const url = window.URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `文档.${format}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setLoadError(e.message || '下载失败');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* ========== 顶部工具栏 ========== */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
              <Upload className="w-4 h-4" />
              <span className="text-sm">打开PDF</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>

            <button onClick={() => setShowMdEditor(!showMdEditor)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm ${showMdEditor ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              <Edit3 className="w-4 h-4" />
              <span>Markdown</span>
            </button>

            {fileName && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {fileName} - {totalPages}页
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={handleZoomOut} disabled={scale <= 0.5}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50" title="缩小">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} disabled={scale >= 3}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50" title="放大">
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            <button onClick={handlePrevPage} disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50" title="上一页">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1">
              <Hash className="w-4 h-4 text-gray-500" />
              <input type="number" min={1} max={totalPages} value={currentPage}
                onChange={(e) => { const p = parseInt(e.target.value); if (p >= 1 && p <= totalPages) setCurrentPage(p); }}
                className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm" />
              <span className="text-gray-500">/ {totalPages}</span>
            </div>

            <button onClick={handleNextPage} disabled={currentPage >= totalPages}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50" title="下一页">
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

            <button onClick={downloadPDF} disabled={!fileName}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
              <Download className="w-4 h-4" />
              <span className="text-sm">下载</span>
            </button>
          </div>
        </div>

        {/* ========== Markdown 编辑面板 ========== */}
        {showMdEditor && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-850">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea value={mdInput} onChange={e => setMdInput(e.target.value)}
                  className="w-full h-[200px] p-3 border rounded-lg text-sm font-mono resize-none bg-white dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="# 标题&#10;&#10;在此输入 Markdown 内容..." />
              </div>
              <div className="w-48 flex flex-col gap-2 shrink-0">
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
                <button onClick={handleConvertToPdf} disabled={converting}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm">
                  {converting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}
                  生成 PDF
                </button>
                <button onClick={() => handleConvertAndPreview('html')} disabled={converting}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm">
                  <Eye className="w-4 h-4" />预览 HTML
                </button>
                <button onClick={() => handleConvertAndPreview('docx')} disabled={converting}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm">
                  <Eye className="w-4 h-4" />预览 DOCX
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleDownloadDocxHtml('docx')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Download className="w-3 h-3" />DOCX
                  </button>
                  <button onClick={() => handleDownloadDocxHtml('html')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Download className="w-3 h-3" />HTML
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto flex justify-center p-4 bg-gray-600">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p>正在加载PDF...</p>
            </div>
          </div>
        ) : pdfDoc ? (
          <div className="bg-white shadow-lg">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="text-center text-gray-300">
              <FileText className="w-24 h-24 mx-auto mb-4" />
              <p className="text-lg mb-2">PDF 查看器</p>
              <p className="text-sm mb-4">请上传PDF文件或拖放到此处</p>
              {loadError && (
                <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm max-w-md">
                  {loadError}
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                <Upload className="w-4 h-4" />
                <span>选择文件</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-sm text-gray-500">
        <div>
          页面 {currentPage} / {totalPages}
        </div>
        <div className="flex items-center space-x-4">
          <span>缩放: {Math.round(scale * 100)}%</span>
          <span>{fileName || '未加载文件'}</span>
        </div>
      </footer>

      {/* 预览弹窗（DOCX/HTML） */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h3 className="font-semibold truncate">{previewTitle}</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-900 min-h-0">
              <iframe srcDoc={previewHtml} className="w-full h-full border-0" title="文档预览" sandbox="allow-same-origin" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;