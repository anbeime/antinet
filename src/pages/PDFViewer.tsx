import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Download, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Hash
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useSearchParams } from 'react-router-dom';

// CDN 动态加载 PDF.js（避免 pdfjs-dist 依赖缺失问题）
const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

  // 动态加载 PDF.js 库
  const loadPDFJS = async (): Promise<any> => {
    if (pdfjsRef.current) return pdfjsRef.current;

    // 检查是否已全局加载
    if ((window as any).pdfjsLib) {
      pdfjsRef.current = (window as any).pdfjsLib;
      return pdfjsRef.current;
    }

    return new Promise<any>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_CDN_URL;
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN_URL;
        pdfjsRef.current = pdfjs;
        resolve(pdfjs);
      };
      script.onerror = () => reject(new Error('PDF.js 库加载失败，请检查网络连接'));
      document.head.appendChild(script);
    });
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

    try {
      // 防御性检查：确保 pdfDoc 是有效的 PDFDocumentProxy 对象
      const doc = pdfDoc;
      if (!doc || typeof doc.getPage !== 'function') {
        console.error('pdfDoc 不是有效的 PDFDocumentProxy:', typeof doc, doc);
        setLoadError('PDF 文档加载异常，请重试');
        return;
      }
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
      }
    } catch (error) {
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

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="cursor-pointer flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
            <Upload className="w-4 h-4" />
            <span className="text-sm">打开PDF</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {fileName && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {fileName} - {totalPages}页
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            title="上一页"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1">
            <Hash className="w-4 h-4 text-gray-500" />
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) setCurrentPage(page);
              }}
              className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
            />
            <span className="text-gray-500">/ {totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            title="下一页"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

          <button
            onClick={downloadPDF}
            disabled={!fileName}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">下载</span>
          </button>
        </div>
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
    </div>
  );
};

export default PDFViewer;