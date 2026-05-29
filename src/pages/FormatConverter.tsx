import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();
import {
  FileText,
  Upload,
  Download,
  Loader,
  Loader2,
  CheckCircle,
  FileType,
  FileSpreadsheet,
  FileOutput,
  ArrowRight,
  RefreshCw,
  X,
  Eye,
  Trash2,
  AlertCircle,
  FileCode,
  Presentation,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

interface ConversionTask {
  id: string;
  file: File;
  fileName: string;
  targetFormat: 'word' | 'excel' | 'pdf' | 'markdown' | 'libreoffice' | 'ppt';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  errorMessage?: string;
  createdAt: Date;
}

const API_BASE = getApiBaseUrl()

const FormatConverter: React.FC = () => {
  useTheme();
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'word' | 'excel' | 'pdf' | 'markdown' | 'libreoffice' | 'ppt'>('word');
  const [previewTask, setPreviewTask] = useState<ConversionTask | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('warm-academic');
  const [pdfWatermark, setPdfWatermark] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfAuthor, setPdfAuthor] = useState('');
  const [libreOfficeFormat, setLibreOfficeFormat] = useState('pdf');
  const [documentSearch, setDocumentSearch] = useState('');
const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [markdownEditor, setMarkdownEditor] = useState('# 标题\n\n## 二级标题\n\n报告内容...\n');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [renderMermaid, setRenderMermaid] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [mdOutputFormat, setMdOutputFormat] = useState<'pdf' | 'docx' | 'html' | 'pptx'>('pdf');
  const [mermaidPreviewSvg, setMermaidPreviewSvg] = useState<string>('');
  const [isMermaidLoading, setIsMermaidLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

  // 预览 Mermaid 图表（内联渲染到页面中）
  const handlePreviewMermaid = async () => {
    const mermaidMatch = markdownEditor.match(/```mermaid\s*\n([\s\S]*?)```/);
    const mermaidCode = mermaidMatch?.[1] || '';
    if (!mermaidCode) {
      toast.error('未找到 Mermaid 代码块，请在 Markdown 中添加 ```mermaid ... ``` 代码块');
      return;
    }
    setIsMermaidLoading(true);
    setMermaidPreviewSvg('');
    try {
      const response = await fetch(`${API_BASE}/api/markdown-converter/mermaid/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mermaidCode, output_format: 'svg' })
      });
      if (response.ok) {
        const svg = await response.text();
        setMermaidPreviewSvg(svg);
        toast.success('Mermaid 图表渲染完成');
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.detail || 'Mermaid 渲染失败');
      }
    } catch (err) {
      toast.error('Mermaid 渲染失败，请检查后端服务');
    } finally {
      setIsMermaidLoading(false);
    }
  };

  // 简单的 Markdown → HTML 渲染（用于预览）
  const renderMarkdownToHtml = (md: string): string => {
    let html = md
      // 转义 HTML 标签
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // 代码块
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
        `<pre class="bg-gray-800 text-green-400 p-3 rounded-lg my-2 overflow-x-auto text-sm"><code>${code.trim()}</code></pre>`)
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-purple-600">$1</code>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-800 dark:text-gray-200">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white border-b pb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-3 text-blue-600 dark:text-blue-400">$1</h1>')
      // 粗体和斜体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 表格
      .replace(/^\|(.+)\|$/gm, (_m, row) => {
        const cells = row.split('|').map((c: string) => c.trim());
        const isSeparator = cells.every((c: string) => /^[-:]+$/.test(c));
        if (isSeparator) return '';
        return `<tr>${cells.map((c: string) => `<td class="border border-gray-300 dark:border-gray-600 px-3 py-1.5">${c}</td>`).join('')}</tr>`;
      })
      // 无序列表
      .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // 段落
      .replace(/\n\n/g, '</p><p class="my-2">')
      // 单换行
      .replace(/\n/g, '<br/>');

    // 包裹表格
    html = html.replace(/(<tr>.*?<\/tr>)/gs, (_m) => {
      if (html.indexOf('<table') === -1) {
        return `<table class="w-full border-collapse my-2">${_m}</table>`;
      }
      return _m;
    });

    return html || '<span class="text-gray-400">开始输入 Markdown 内容...</span>';
  };

  // 直接转换 Markdown 编辑器内容
  const handleConvertMarkdown = async () => {
    if (!markdownEditor) return;
    setIsConverting(true);
    try {
      const formData = new FormData();
      const blob = new Blob([markdownEditor], { type: 'text/markdown' });
      formData.append('file', blob, 'input.md');
      formData.append('output_format', mdOutputFormat);
      formData.append('render_mermaid', String(renderMermaid));
      formData.append('theme', selectedTheme);
      if (pdfTitle) formData.append('title', pdfTitle);
      if (pdfAuthor) formData.append('author', pdfAuthor);

      const response = await fetch(`${API_BASE}/api/markdown-converter/convert/file`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const resultBlob = await response.blob();
        const url = window.URL.createObjectURL(resultBlob);
        const extMap: Record<string, string> = { pdf: '.pdf', docx: '.docx', html: '.html', pptx: '.pptx' };
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted_${Date.now()}${extMap[mdOutputFormat] || '.' + mdOutputFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        const fmtNameMap: Record<string, string> = { pdf: 'PDF', docx: 'Word', html: 'HTML', pptx: 'PPT' };
        toast.success(`Markdown → ${fmtNameMap[mdOutputFormat] || mdOutputFormat.toUpperCase()} 转换成功！`);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.detail || '转换失败');
      }
    } catch (err) {
      toast.error('转换失败，请检查后端服务');
    } finally {
      setIsConverting(false);
    }
  };

  // 主题配置
  const themeOptions = [
    { id: 'warm-academic', name: '暖学术', color: '#b45309' },
    { id: 'classic-thesis', name: '经典论文', color: '#78350f' },
    { id: 'tufte', name: 'Tufte', color: '#9f1239' },
    { id: 'ieee-journal', name: '期刊蓝', color: '#1e3a8a' },
    { id: 'elegant-book', name: '精装书', color: '#78350f' },
    { id: 'chinese-red', name: '中国红', color: '#dc2626' },
    { id: 'ink-wash', name: '水墨', color: '#374151' },
    { id: 'github-light', name: 'GitHub', color: '#2563eb' },
    { id: 'nord-frost', name: 'Nord冰霜', color: '#4c566a' },
    { id: 'ocean-breeze', name: '海洋', color: '#0d9488' },
  ];

  // 格式配置
  const formatConfig = {
    word: {
      name: 'Word 文档',
      extension: '.docx',
      icon: <FileType className="w-6 h-6" />,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600',
      description: '转换为可编辑的 Word 文档，完美支持中文'
    },
    excel: {
      name: 'Excel 表格',
      extension: '.xlsx',
      icon: <FileSpreadsheet className="w-6 h-6" />,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600',
      description: '转换为 Excel 表格，适合数据分析'
    },
    pdf: {
      name: 'PDF 文档',
      extension: '.pdf',
      icon: <FileOutput className="w-6 h-6" />,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600',
      description: '转换为 PDF 格式，固定版式'
    },
    markdown: {
      name: 'MD 转 PDF',
      extension: '.pdf',
      icon: <FileCode className="w-6 h-6" />,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600',
      description: 'Markdown 转换为专业版式 PDF'
    },
    libreoffice: {
      name: '文档转换',
      extension: '.pdf',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600',
      description: 'Word/Excel/PPT 转换为 PDF'
    },
    ppt: {
      name: 'PPT 转 PDF',
      extension: '.pdf',
      icon: <Presentation className="w-6 h-6" />,
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600',
      borderColor: 'border-pink-200',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      textColor: 'text-pink-600',
      description: 'PPT 幻灯片转换为 PDF'
    }
  };

  // LibreOffice 支持的格式
  const libreOfficeFormats = [
    { value: 'pdf', label: '转为 PDF' },
    { value: 'docx', label: '转为 Word' },
    { value: 'xlsx', label: '转为 Excel' },
    { value: 'pptx', label: '转为 PPT' },
    { value: 'odt', label: '转为 ODT' },
    { value: 'ods', label: '转为 ODS' },
  ];

  // 文档搜索
  const searchDocuments = async () => {
    if (!documentSearch.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/api/libreoffice/search?q=${encodeURIComponent(documentSearch)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error('搜索失败:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  };

  // 根据文件扩展名自动检测目标格式
  const detectTargetFormat = (fileName: string, selectedFmt: string): string => {
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    
    // 如果选择的是"文档转换"(libreoffice)，根据文件类型自动选择
    if (selectedFmt === 'libreoffice') {
      if (ext === '.pptx' || ext === '.ppt') {
        return 'ppt'; // PPT文件使用PPT转PDF
      }
      // docx, doc, xlsx, xls 继续使用 libreoffice
      return 'libreoffice';
    }
    
    // 如果选择的是"PPT转PDF"但文件不是PPT格式
    if (selectedFmt === 'ppt') {
      if (ext === '.pdf') {
        return 'error-pdf'; // 特殊标记，提示不支持
      }
      if (ext !== '.pptx' && ext !== '.ppt') {
        return 'error-unsupported'; // 提示不支持
      }
    }
    
    return selectedFmt;
  };

  // 添加文件到任务列表
  const addFiles = (files: File[]) => {
    // 支持多种输入格式
    const validExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.pptx', '.ppt'];
    let validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return validExtensions.includes(ext) ||
             file.type === 'application/pdf' ||
             file.type === 'application/msword' ||
             file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             file.type === 'application/vnd.ms-excel' ||
             file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             file.type === 'text/plain';
    });

    // MD转PDF只接受md文件
    if (selectedFormat === 'markdown') {
      validFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.md'));
    }

    if (validFiles.length === 0) {
      toast.error(selectedFormat === 'markdown' ? '请选择 .md 文件' : '请选择支持的文件格式');
      return;
    }

    const invalidCount = files.length - validFiles.length;
    if (invalidCount > 0) {
      toast.warning(`已过滤 ${invalidCount} 个不支持的文件`);
    }

    // 为每个文件检测正确的目标格式
    const newTasks: ConversionTask[] = validFiles.map(file => {
      const detectedFormat = detectTargetFormat(file.name, selectedFormat);
      
      // 如果检测到不支持的格式，记录错误
      if (detectedFormat === 'error-pdf') {
        toast.error(`文件 ${file.name} 不支持转换：PDF文件无法通过此方式转换`);
        return null;
      }
      if (detectedFormat === 'error-unsupported') {
        toast.error(`文件 ${file.name} 格式不支持，请选择正确的转换格式`);
        return null;
      }
      
      return {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName: file.name,
        targetFormat: detectedFormat,
        status: 'pending',
        progress: 0,
        createdAt: new Date()
      };
    }).filter(Boolean) as ConversionTask[];

    setTasks(prev => [...prev, ...newTasks]);
    toast.success(`已添加 ${newTasks.length} 个文件到转换队列`);

    // 自动开始转换
    newTasks.forEach((task, index) => {
      setTimeout(() => startConversion(task), index * 500);
    });
  };

  // 开始转换 - 接收完整的 task 对象
  const startConversion = async (task: ConversionTask) => {
    // 更新状态为处理中
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'processing', progress: 10 } : t
    ));

    try {
      const formData = new FormData();
      formData.append('file', task.file);

      switch (task.targetFormat) {
        case 'word':
          await convertToWord(task, formData);
          break;

        case 'excel':
          await convertToExcel(task, formData);
          break;

        case 'pdf':
          await convertToPDF(task, formData);
          break;
        
        case 'markdown':
          await convertMarkdownToPDF(task, formData);
          break;
        
        case 'libreoffice':
          await convertWithLibreOffice(task, formData);
          break;

        case 'ppt':
          await convertPPTToPDF(task, formData);
          break;
      }
    } catch (error) {
      console.error('转换失败:', error);
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { 
          ...t, 
          status: 'error',
          errorMessage: error instanceof Error ? error.message : '转换失败'
        } : t
      ));
      toast.error(`${task.fileName} 转换失败`);
    }
  };

  // 转换为 Word（通过 LibreOffice 真实转换）
  const convertToWord = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    formData.append('output_format', 'docx');

    const response = await fetch(`${API_BASE}/api/libreoffice/convert`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Word 转换失败');
    }

    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 80 } : t
    ));

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const outputName = task.fileName.replace(/\.[^.]+$/, '.docx');
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { 
        ...t, 
        status: 'completed', 
        progress: 100,
        resultUrl: url,
        resultBlob: blob,
        fileName: outputName
      } : t
    ));

    toast.success(`${task.fileName} 转换为 Word 成功！`);
  };

  // 转换为 Excel（通过 LibreOffice 真实转换）
  const convertToExcel = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    formData.append('output_format', 'xlsx');

    const response = await fetch(`${API_BASE}/api/libreoffice/convert`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Excel 转换失败');
    }

    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 80 } : t
    ));

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const outputName = task.fileName.replace(/\.[^.]+$/, '.xlsx');
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { 
        ...t, 
        status: 'completed', 
        progress: 100,
        resultUrl: url,
        resultBlob: blob,
        fileName: outputName
      } : t
    ));

    toast.success(`${task.fileName} 转换为 Excel 成功！`);
  };

  // 转换为 PDF（通过 LibreOffice 真实转换）
  const convertToPDF = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    formData.append('output_format', 'pdf');

    const response = await fetch(`${API_BASE}/api/libreoffice/convert`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'PDF 转换失败');
    }

    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 80 } : t
    ));

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const outputName = task.fileName.replace(/\.[^.]+$/, '.pdf');
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { 
        ...t, 
        status: 'completed', 
        progress: 100,
        resultUrl: url,
        resultBlob: blob,
        fileName: outputName
      } : t
    ));

    toast.success(`${task.fileName} 转换为 PDF 成功！`);
  };

  // Markdown 转 PDF
  const convertMarkdownToPDF = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    // 添加 PDF 选项到 formData
    formData.append('theme', selectedTheme);
    if (pdfTitle) formData.append('title', pdfTitle);
    if (pdfAuthor) formData.append('author', pdfAuthor);
    if (pdfWatermark) formData.append('watermark', pdfWatermark);

    try {
      const response = await fetch(`${API_BASE}/api/md2pdf/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'MD转PDF失败');
      }

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, progress: 80 } : t
      ));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { 
          ...t, 
          status: 'completed', 
          progress: 100,
          resultUrl: url,
          resultBlob: blob
        } : t
      ));

      toast.success(`${task.fileName} 转换为 PDF 成功！`);
    } catch (error) {
      throw error;
    }
  };

  // PPT 转 PDF
  const convertPPTToPDF = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    try {
      const response = await fetch(`${API_BASE}/api/ppt/to-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'PPT转PDF失败');
      }

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, progress: 80 } : t
      ));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const outputName = task.fileName.replace(/\.pptx?$/i, '.pdf');
      
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { 
          ...t, 
          status: 'completed', 
          progress: 100,
          resultUrl: url,
          resultBlob: blob,
          fileName: outputName
        } : t
      ));

      toast.success(`${task.fileName} 转换为 PDF 成功！`);
    } catch (error) {
      throw error;
    }
  };

  // LibreOffice 文档转换
  const convertWithLibreOffice = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    // 添加输出格式
    formData.append('output_format', libreOfficeFormat);

    try {
      const response = await fetch(`${API_BASE}/api/libreoffice/convert`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'LibreOffice转换失败');
      }

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, progress: 80 } : t
      ));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const ext = libreOfficeFormat;
      const outputName = task.fileName.replace(/\.[^.]+$/, `.${ext}`);
      
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { 
          ...t, 
          status: 'completed', 
          progress: 100,
          resultUrl: url,
          resultBlob: blob,
          fileName: outputName
        } : t
      ));

      toast.success(`${task.fileName} 转换为 ${ext.toUpperCase()} 成功！`);
    } catch (error) {
      throw error;
    }
  };



  // 下载文件
  const downloadFile = (task: ConversionTask) => {
    if (!task.resultUrl) {
      toast.error('文件尚未准备好');
      return;
    }

    const extension = formatConfig[task.targetFormat].extension;
    const downloadName = task.fileName.replace(/\.pdf$/i, '') + extension;

    const a = document.createElement('a');
    a.href = task.resultUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success(`开始下载: ${downloadName}`);
  };

  // 预览文件
  const previewFile = (task: ConversionTask) => {
    if (!task.resultUrl) {
      toast.error('文件尚未准备好');
      return;
    }

    if (task.targetFormat === 'pdf' || task.targetFormat === 'markdown' || task.targetFormat === 'ppt') {
      // PDF/PPT 转换的 PDF 使用内嵌预览
      openPdfPreview(task);
    } else {
      // Word 和 Excel 直接下载
      downloadFile(task);
      toast.info('Word/Excel 文件已下载，请在本地查看');
    }
  };

  // 使用本地安装的 pdfjs-dist（离线可用）
const loadPdfJs = async (): Promise<any> => pdfjsLib;

  // 打开 PDF 预览弹窗
  const openPdfPreview = async (task: ConversionTask) => {
    setPreviewTask(task);
    setShowPdfPreview(true);
    setIsPdfLoading(true);
    
    try {
      const pdfjsLib = await loadPdfJs();
      
      const response = await fetch(task.resultUrl!);
      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      setPdfDoc(pdf);
      setPdfTotalPages(pdf.numPages);
      setPdfCurrentPage(1);
      setPdfScale(1.0);
    } catch (error) {
      console.error('加载 PDF 失败:', error);
      toast.error('加载 PDF 失败');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // 关闭 PDF 预览弹窗
  const closePdfPreview = () => {
    setShowPdfPreview(false);
    setPreviewTask(null);
    setPdfDoc(null);
  };

  const pdfRenderTaskRef = useRef<any>(null);

  // 渲染 PDF 页面
  const renderPdfPage = async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    if (pdfRenderTaskRef.current) {
      try { pdfRenderTaskRef.current.cancel(); } catch (e) { /* ignore */ }
      pdfRenderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pdfCurrentPage);
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderTask = page.render({ canvasContext: context, viewport });
        pdfRenderTaskRef.current = renderTask;
        await renderTask.promise;
        pdfRenderTaskRef.current = null;
      }
    } catch (error: any) {
      if (error?.name === 'RenderingCancelledException') return;
      console.error('渲染 PDF 页面失败:', error);
    }
  };

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // 当 PDF 文档、页码或缩放改变时重新渲染
  useEffect(() => {
    if (pdfDoc && pdfCurrentPage > 0) {
      renderPdfPage();
    }
  }, [pdfDoc, pdfCurrentPage, pdfScale]);

  // 删除任务
  const removeTask = (taskId: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task?.resultUrl) {
        window.URL.revokeObjectURL(task.resultUrl);
      }
      return prev.filter(t => t.id !== taskId);
    });
    toast.success('任务已删除');
  };

  // 清空所有任务
  const clearAllTasks = () => {
    tasks.forEach(task => {
      if (task.resultUrl) {
        window.URL.revokeObjectURL(task.resultUrl);
      }
    });
    setTasks([]);
    toast.success('所有任务已清空');
  };

  // 重试转换
  const retryConversion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // 重置状态
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'pending',
          progress: 0,
          errorMessage: undefined
        } : t
      ));
      // 重新开始
      setTimeout(() => startConversion(task), 100);
    }
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  // 获取状态显示
  const getStatusDisplay = (task: ConversionTask) => {
    switch (task.status) {
      case 'pending':
        return { text: '等待中', color: 'text-gray-500', bgColor: 'bg-gray-100' };
      case 'processing':
        return { text: '转换中', color: 'text-blue-500', bgColor: 'bg-blue-100' };
      case 'completed':
        return { text: '已完成', color: 'text-green-500', bgColor: 'bg-green-100' };
      case 'error':
        return { text: '失败', color: 'text-red-500', bgColor: 'bg-red-100' };
      default:
        return { text: '未知', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <RefreshCw className="w-10 h-10 text-blue-600" />
            格式转换中心
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            上传文件，一键转换为 Word、Excel、PDF 等多种格式
          </p>
        </motion.div>

        {/* 格式选择 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            选择目标格式
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(formatConfig) as Array<keyof typeof formatConfig>).map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === format
                    ? `${formatConfig[format].borderColor} ${formatConfig[format].bgColor} border-2 ring-2 ring-offset-2 ring-${formatConfig[format].color.split('-')[1]}-500`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${formatConfig[format].color} text-white`}>
                    {formatConfig[format].icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {formatConfig[format].name}
                      </h3>
                      {selectedFormat === format && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatConfig[format].description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* MD转PDF 设置面板 */}
        {selectedFormat === 'markdown' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              PDF 主题设置
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {themeOptions.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTheme === theme.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedTheme === theme.id ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    <span className="text-sm font-medium">{theme.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">文档标题</label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={e => setPdfTitle(e.target.value)}
                  placeholder="可选，默认从文件名提取"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">作者</label>
                <input
                  type="text"
                  value={pdfAuthor}
                  onChange={e => setPdfAuthor(e.target.value)}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">水印</label>
                <input
                  type="text"
                  value={pdfWatermark}
                  onChange={e => setPdfWatermark(e.target.value)}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* LibreOffice 文档转换与搜索面板 */}
        {selectedFormat === 'libreoffice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              LibreOffice 文档管理
            </h3>
            
            {/* 格式转换设置 */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">输出格式</h4>
              <div className="flex flex-wrap gap-2">
                {libreOfficeFormats.map(fmt => (
                  <button
                    key={fmt.value}
                    onClick={() => setLibreOfficeFormat(fmt.value)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      libreOfficeFormat === fmt.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 文档搜索 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">知识库文档搜索</h4>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={documentSearch}
                  onChange={e => setDocumentSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchDocuments()}
                  placeholder="输入关键词搜索文档内容..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={searchDocuments}
                  disabled={isSearching}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSearching ? '搜索中...' : '搜索'}
                </button>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{result.filename}</span>
                        <span className="text-xs text-gray-500">匹配 {result.score} 次</span>
                      </div>
                      {result.matches?.map((m: any, i: number) => (
                        <div key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-orange-500 mb-1">
                          <span className="text-xs text-gray-400">第{m.line}行: </span>
                          {m.text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

{/* Markdown 编辑与转换面板 */}
        {selectedFormat === 'markdown' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📝 Markdown 编辑器
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.readText().then(text => {
                      if (text) setMarkdownEditor(text);
                    }).catch(() => {});
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  粘贴
                </button>
                <button
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    showMarkdownPreview ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {showMarkdownPreview ? '编辑' : '预览'}
                </button>
              </div>
            </div>

            {/* 输出格式选择 */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">输出格式</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'pdf', label: 'PDF 文档', desc: '专业版式' },
                  { value: 'docx', label: 'Word 文档', desc: '可编辑' },
                  { value: 'html', label: 'HTML 网页', desc: '浏览器打开' },
                  { value: 'pptx', label: 'PPT 演示', desc: '幻灯片' }
                ].map(fmt => (
                  <button
                    key={fmt.value}
                    onClick={() => setMdOutputFormat(fmt.value as any)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                      mdOutputFormat === fmt.value
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300'
                    }`}
                  >
                    <span className="font-medium">{fmt.label}</span>
                    <span className={`text-xs ml-1 ${mdOutputFormat === fmt.value ? 'text-purple-200' : 'text-gray-400'}`}>({fmt.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Markdown 编辑器 / 预览 */}
            <div className="flex gap-4" style={{ height: '380px' }}>
              {!showMarkdownPreview ? (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-gray-400 mb-1 px-1">编辑</div>
                  <textarea
                    value={markdownEditor}
                    onChange={(e) => { setMarkdownEditor(e.target.value); setMermaidPreviewSvg(''); }}
                    className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={"# 标题\n\n## 二级标题\n\n```mermaid\ngraph TD\n    A[开始] --> B{判断}\n    B -->|是| C[处理中]\n    B -->|否| D[结束]\n```\n\n| 表格 | 列1 | 列2 |\n|------|-----|-----|\n| 数据1 | 100 | 200 |\n\n```python\nprint(\"Hello World\")\n```\n"}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-gray-400 mb-1 px-1">预览</div>
                  <div ref={mermaidContainerRef} className="flex-1 w-full p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-auto prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(markdownEditor) }} />
                </div>
              )}
            </div>

            {/* Mermaid 选项与内联预览 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renderMermaid}
                    onChange={(e) => setRenderMermaid(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">转换时渲染 Mermaid 图表</span>
                </label>
                <button
                  onClick={handlePreviewMermaid}
                  disabled={!markdownEditor || isMermaidLoading}
                  className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                >
                  {isMermaidLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  渲染 Mermaid 预览
                </button>
              </div>

              {/* Mermaid 内联预览区 */}
              {mermaidPreviewSvg && (
                <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-purple-50/50 dark:bg-purple-900/20 overflow-auto max-h-64">
                  <div className="text-xs text-purple-500 mb-2 font-medium">Mermaid 图表渲染结果</div>
                  <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: mermaidPreviewSvg }} />
                </div>
              )}
            </div>

            {/* 快速模板 */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">快速模板：</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMarkdownEditor(markdownEditor + `\n\n\`\`\`mermaid\ngraph TD\nA[开始] --> B[结束]\n\`\`\`\n`)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
                >
                  + 流程图
                </button>
                <button
                  onClick={() => setMarkdownEditor(markdownEditor + `\n\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| 数据 | 数据 | 数据 |\n`)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
                >
                  + 表格
                </button>
                <button
                  onClick={() => setMarkdownEditor(markdownEditor + `\n\n\`\`\`python\nprint("Hello")\n\`\`\`\n`)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
                >
                  + 代码块
                </button>
              </div>
            </div>

            {/* 转换按钮 */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleConvertMarkdown}
                disabled={!markdownEditor || isConverting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors"
              >
                {isConverting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    转换中...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    转换为 {(() => { const map = {'pdf':'PDF','docx':'Word','html':'HTML','pptx':'PPT'}; return map[mdOutputFormat] || mdOutputFormat.toUpperCase(); })()}
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                使用 Pandoc + Mermaid 渲染引擎 · 支持流程图/表格/代码块 · 输出 {mdOutputFormat.toUpperCase()} 格式
              </p>
            </div>
          </motion.div>
        )}

        {/* 文件上传区域（Markdown 格式时隐藏） */}
        {selectedFormat !== 'markdown' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.pptx,.ppt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                点击或拖拽文件到此处
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                支持批量上传，将自动转换为 {formatConfig[selectedFormat].name}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <FileType className="w-4 h-4" />
                <span>支持 PDF/Word/Excel/PPT/TXT/MD</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 任务列表 */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                转换任务 ({tasks.length})
              </h2>
              <button
                onClick={clearAllTasks}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空全部
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {tasks.map((task) => {
                  const status = getStatusDisplay(task);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      {/* 文件图标 */}
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {task.fileName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.text}
                          </span>
                          <span className={`text-sm ${formatConfig[task.targetFormat].textColor}`}>
                            → {formatConfig[task.targetFormat].name}
                          </span>
                          {task.errorMessage && (
                            <span className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {task.errorMessage}
                            </span>
                          )}
                        </div>
                        
                        {/* 进度条 */}
                        {task.status === 'processing' && (
                          <div className="mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {task.progress}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {task.status === 'completed' && task.resultUrl && (
                          <>
                            <button
                              onClick={() => previewFile(task)}
                              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                              title="预览"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">预览</span>
                            </button>
                            <button
                              onClick={() => downloadFile(task)}
                              className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                              title="下载"
                            >
                              <Download className="w-4 h-4" />
                              <span className="hidden sm:inline">下载</span>
                            </button>
                          </>
                        )}
                        
                        {task.status === 'error' && (
                          <button
                            onClick={() => retryConversion(task.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden sm:inline">重试</span>
                          </button>
                        )}

                        <button
                          onClick={() => removeTask(task.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="删除"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* 使用说明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
        >
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            使用提示
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Word 文档</strong>：推荐格式，完美支持中文，可编辑，转换完成后点击下载获取 .docx 文件</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>Excel 表格</strong>：适合需要数据分析的场景，转换完成后点击下载获取 .xlsx 文件</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span><strong>PDF 文档</strong>：点击预览可在浏览器中查看，按 Ctrl+P 可打印或保存为 PDF</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>支持批量上传，自动依次转换，每个文件独立显示进度和下载按钮</span>
            </li>
          </ul>
        </motion.div>

        {/* PDF 预览弹窗 */}
        <AnimatePresence>
          {showPdfPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={closePdfPreview}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {previewTask?.fileName || 'PDF 预览'}
                  </h3>
                  <button
                    onClick={closePdfPreview}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* PDF 工具栏 */}
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    {/* 页码导航 */}
                    <button
                      onClick={() => setPdfCurrentPage(Math.max(1, pdfCurrentPage - 1))}
                      disabled={pdfCurrentPage <= 1}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      第 {pdfCurrentPage} / {pdfTotalPages} 页
                    </span>
                    <button
                      onClick={() => setPdfCurrentPage(Math.min(pdfTotalPages, pdfCurrentPage + 1))}
                      disabled={pdfCurrentPage >= pdfTotalPages}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* 缩放控制 */}
                    <button
                      onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.25))}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[60px] text-center">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <button
                      onClick={() => setPdfScale(Math.min(3, pdfScale + 0.25))}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 下载按钮 */}
                  {previewTask && (
                    <button
                      onClick={() => downloadFile(previewTask)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                  )}
                </div>

                {/* PDF 内容区 */}
                <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-start justify-center p-4">
                  {isPdfLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
                    </div>
                  ) : (
                    <canvas ref={pdfCanvasRef} className="shadow-lg" />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FormatConverter;
