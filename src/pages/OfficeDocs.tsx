import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, FileText, Presentation, Download, Upload,
  Save, FolderOpen, X, Maximize2, Minimize2, Eye, Edit3,
  FileType, Search, FilePlus, Trash2, RefreshCw, Clock,
  Edit, Check, ChevronRight, Zap, ArrowRight, File,
  FileCode, FileImage, Table, Settings, CheckCircle, AlertCircle, Loader2, Copy
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

interface DocFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf' | 'ppt' | 'doc' | 'other';
  path: string;
  size: number;
  modified: string;
}

interface HistoryItem {
  id: string;
  name: string;
  type: string;
  timestamp: string;
  action: 'upload' | 'view' | 'edit' | 'export';
}

interface OfficeDocsProps {
  initialFile?: string;
}

declare global {
  interface Window {
    luckysheet: any;
  }
}

const getFileType = (fileName: string): 'excel' | 'pdf' | 'ppt' | 'doc' | 'other' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['pptx', 'ppt'].includes(ext)) return 'ppt';
  if (['docx', 'doc'].includes(ext)) return 'doc';
  return 'other';
};

// API 配置
const API_BASE = '/api/markdown-converter';

// 格式转换状态接口
interface ConverterStatus {
  pandoc: { available: boolean; path: string | null };
  mermaid_cli: { available: boolean; path: string | null };
  pdfplumber: boolean;
  dependencies: Record<string, boolean>;
  features: {
    mermaid_rendering: boolean;
    csv_extraction: boolean;
    full_workflow: boolean;
  };
}

const outputFormats = [
  { value: 'pdf', label: 'PDF 文档', icon: FileText, color: 'red' },
  { value: 'docx', label: 'Word 文档', icon: FileCode, color: 'blue' },
  { value: 'html', label: 'HTML 网页', icon: FileText, color: 'green' },
  { value: 'xlsx', label: 'Excel 表格', icon: Table, color: 'emerald' },
  { value: 'pptx', label: 'PPT 演示', icon: Presentation, color: 'orange' },
];

const OfficeDocs: React.FC<OfficeDocsProps> = ({ initialFile }) => {
  useTheme();
  const navigate = useNavigate();
  const [currentFile, setCurrentFile] = useState<DocFile | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [activeTab, setActiveTab] = useState<'excel' | 'convert'>('excel');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileList, setShowFileList] = useState(true);
  const [useSimpleTable, setUseSimpleTable] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showTools, setShowTools] = useState(false);
  // 格式转换状态
  const [markdown, setMarkdown] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [mermaidTheme, setMermaidTheme] = useState('default');
  const [mermaidPreview, setMermaidPreview] = useState('');
  const [converterStatus, setConverterStatus] = useState<ConverterStatus | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const luckysheetRef = useRef<HTMLDivElement>(null);

  const [renderMermaid, setRenderMermaid] = useState(true);
  const [extractCsv, setExtractCsv] = useState(false);

  const [files, setFiles] = useState<DocFile[]>([
    { id: '1', name: '销售数据.xlsx', type: 'excel', path: '/data/exports/sales.xlsx', size: 25600, modified: '2025-01-20' },
    { id: '2', name: '季度报告.pdf', type: 'pdf', path: '/data/exports/report.pdf', size: 512000, modified: '2025-01-19' },
    { id: '3', name: '产品介绍.pptx', type: 'ppt', path: '/data/exports/demo.pptx', size: 128000, modified: '2025-01-18' },
  ]);

  const addToHistory = (name: string, type: string, action: 'upload' | 'view' | 'edit' | 'export') => {
    setHistory(prev => [{
      id: Date.now().toString(),
      name,
      type,
      timestamp: new Date().toLocaleString('zh-CN'),
      action
    }, ...prev].slice(0, 50));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    // Excel文件使用 luckysheet 加载
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      try {
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const luckysheetData = workbook.SheetNames.map((sheetName, index) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          return {
            name: sheetName,
            color: '',
            status: index === 0 ? 1 : 0,
            order: index,
            data: jsonData.length > 0 ? jsonData : [['']],
            config: {},
            zoom: 100,
            scroll: { x: 1, y: 1 }
          };
        });

        if (window.luckysheet && luckysheetRef.current) {
          window.luckysheet.create({
            container: 'luckysheet-container',
            title: file.name,
            lang: 'zh-CN',
            data: luckysheetData
          });
        }
      } catch (error) {
        console.error('加载文件失败:', error);
        alert('加载文件失败: ' + error);
      }
      setIsLoading(false);
    } else {
      // 其他文件添加到文件列表
      const fileType = getFileType(file.name);
      const newFile: DocFile = {
        id: Date.now().toString(),
        name: file.name,
        type: fileType,
        path: URL.createObjectURL(file),
        size: file.size,
        modified: new Date().toLocaleDateString('zh-CN')
      };

      setFiles(prev => [newFile, ...prev]);
      setCurrentFile(newFile);
      
      // 自动切换到对应标签页
      if (fileType === 'excel') {
        setActiveTab('excel');
      } else if (fileType === 'pdf' || fileType === 'ppt' || fileType === 'doc' || fileType === 'other') {
        // 这些类型暂时都使用格式转换功能
        setActiveTab('convert');
      }
      
      addToHistory(file.name, fileType, 'upload');
      toast.success(`已上传: ${file.name}`);
      setIsLoading(false);
    }
  };

  const handleRename = (id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, name: editingName } : f
    ));
    setEditingFileId(null);
    toast.success('文件已重命名');
  };

  const handleDelete = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file) {
      setFiles(prev => prev.filter(f => f.id !== id));
      if (currentFile?.id === id) {
        setCurrentFile(null);
      }
      addToHistory(file.name, file.type, 'export');
      toast.success('文件已删除');
    }
  };

  const startRename = (file: DocFile) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
  };

  useEffect(() => {
    loadLuckysheet();
    return () => {
      if (window.luckysheet) {
        try {
          window.luckysheet.destroy();
        } catch (e) {}
      }
    };
  }, []);

  const loadLuckysheet = async () => {
    if (!luckysheetRef.current) return;
    
    // 检查是否已经加载过
    if (window.luckysheet) {
      initLuckysheet();
      return;
    }
    
    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      // 检查是否已存在
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });

    const loadCSS = (href: string) => new Promise<void>((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve(); // CSS 失败不阻塞
      document.head.appendChild(link);
    });

    try {
      setIsLoading(true);
      // 使用 jsDelivr CDN - 修复路径
      await loadCSS('https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.css');
      await loadScript('https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js');
      
      // 等待 luckysheet 初始化
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsLoading(false);
      
      if (window.luckysheet) {
        initLuckysheet();
      } else {
        throw new Error('Luckysheet not available');
      }
    } catch (error) {
      console.warn('Luckysheet加载失败，使用简易表格模式');
      setIsLoading(false);
      // 使用简易表格替代
      setUseSimpleTable(true);
    }
  };

  const initLuckysheet = () => {
    if (!window.luckysheet || !luckysheetRef.current) return;
    
    try {
      window.luckysheet.create({
        container: 'luckysheet-container',
        title: '在线表格',
        lang: 'zh-CN',
        showinfobar: true,
        showsheetbar: true,
        showstatisticBar: true,
        enableAddRow: true,
        enableAddBackTop: true,
        loadUrl: '',
        data: [{
          name: 'Sheet1',
          color: '',
          order: 0,
          data: [
            ['日期', '销售额', '成本', '利润', '地区'],
            ['2025-01-01', 12500, 8000, 4500, '北京'],
            ['2025-01-02', 15800, 9500, 6300, '上海'],
            ['2025-01-03', 18200, 11000, 7200, '广州'],
            ['2025-01-04', 14300, 8800, 5500, '深圳'],
            ['2025-01-05', 16900, 10200, 6700, '北京'],
          ],
          config: {},
          zoom: 100,
          scroll: { x: 1, y: 1 }
        }]
      });
    } catch (error) {
      console.error('初始化Luckysheet失败:', error);
    }
  };

  const handleExport = () => {
    if (window.luckysheet) {
      try {
        window.luckysheet.getAllSheets();
        const exportData = window.luckysheet.getSheetJson();
        console.log('导出数据:', exportData);
        alert('导出功能需要后端支持');
      } catch (error) {
        console.error('导出失败:', error);
      }
    }
  };

  const openPDF = (file: DocFile) => {
    setCurrentFile(file);
    setActiveTab('convert');
  };

  const openPPT = (file: DocFile) => {
    setCurrentFile(file);
    setActiveTab('convert');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式转换功能
  const loadConverterStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/markdown-converter/status');
      if (response.ok) {
        const data = await response.json();
        setConverterStatus(data);
      }
    } catch (error) {
      console.error('加载转换器状态失败:', error);
    }
  }, []);

  const handleConvert = async () => {
    if (!markdown.trim()) {
      setError('请输入 Markdown 内容');
      return;
    }
    if (!selectedFormat) {
      setError('请选择输出格式');
      return;
    }

    setIsConverting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/markdown-converter/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown,
          output_format: selectedFormat,
          include_mermaid: true,
          mermaid_theme: mermaidTheme,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '转换失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`${selectedFormat.toUpperCase()} 文件已生成并下载`);
    } catch (err: any) {
      setError(err.message || '转换失败');
    } finally {
      setIsConverting(false);
    }
  };

  const handleRenderMermaid = async () => {
    if (!markdown.trim()) {
      setError('请输入包含 Mermaid 图表的 Markdown 内容');
      return;
    }

    setIsConverting(true);
    setError('');

    try {
      const response = await fetch('/api/markdown-converter/mermaid/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mermaid_code: extractMermaidCode(markdown),
          theme: mermaidTheme,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '渲染失败');
      }

      const data = await response.json();
      setMermaidPreview(data.svg);
      setSuccess('Mermaid 图表渲染成功');
    } catch (err: any) {
      setError(err.message || '渲染失败');
    } finally {
      setIsConverting(false);
    }
  };

  const extractMermaidCode = (text: string): string => {
    const match = text.match(/```mermaid\n([\s\S]*?)```/);
    return match ? match[1].trim() : text;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setSuccess('Markdown 已复制到剪贴板');
  };

  const getStatusColor = (available: boolean) => {
    return available ? 'text-green-500' : 'text-red-500';
  };

  // 加载转换器状态
  useEffect(() => {
    if (activeTab === 'convert') {
      loadConverterStatus();
    }
  }, [activeTab, loadConverterStatus]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {showFileList && (
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center">
              <FolderOpen className="w-5 h-5 mr-2 text-blue-500" />
              文件管理
            </h2>
          </div>
          
          <div className="p-4">
            <label className="block">
              <input
                type="file"
                accept=".xlsx,.xls,.pdf,.pptx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <span>上传文件</span>
              </div>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {files.map(file => (
              <motion.div
                key={file.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => file.type === 'pdf' ? openPDF(file) : file.type === 'ppt' ? openPPT(file) : setActiveTab('excel')}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  currentFile?.id === file.id 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center">
                  {file.type === 'excel' && <FileSpreadsheet className="w-5 h-5 text-green-500 mr-2" />}
                  {file.type === 'pdf' && <FileText className="w-5 h-5 text-red-500 mr-2" />}
                  {file.type === 'ppt' && <Presentation className="w-5 h-5 text-orange-500 mr-2" />}
                  <span className="font-medium truncate">{file.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{file.modified}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.aside>
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFileList(!showFileList)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
              
              <div className="flex space-x-1">
                {[
                  { id: 'excel', label: '文档查看', icon: FileSpreadsheet, color: 'text-green-500' },
                  { id: 'convert', label: '格式转换', icon: FileCode, color: 'text-blue-500' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded ${
                      activeTab === tab.id
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${tab.color}`} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'edit' ? 'view' : 'edit')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded ${
                  viewMode === 'edit' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {viewMode === 'edit' ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{viewMode === 'edit' ? '编辑' : '查看'}</span>
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">导出</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'excel' && (
            <div className="h-full flex flex-col">
              {isLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-50">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">正在加载在线表格...</p>
                  </div>
                </div>
              )}
              
              {useSimpleTable ? (
                <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="border p-2 text-left">日期</th>
                          <th className="border p-2 text-left">销售额</th>
                          <th className="border p-2 text-left">成本</th>
                          <th className="border p-2 text-left">利润</th>
                          <th className="border p-2 text-left">地区</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { date: '2025-01-01', sales: 12500, cost: 8000, profit: 4500, region: '北京' },
                          { date: '2025-01-02', sales: 15800, cost: 9500, profit: 6300, region: '上海' },
                          { date: '2025-01-03', sales: 18200, cost: 11000, profit: 7200, region: '广州' },
                          { date: '2025-01-04', sales: 14300, cost: 8800, profit: 5500, region: '深圳' },
                          { date: '2025-01-05', sales: 16900, cost: 10200, profit: 6700, region: '北京' },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border p-2">{row.date}</td>
                            <td className="border p-2">{row.sales.toLocaleString()}</td>
                            <td className="border p-2">{row.cost.toLocaleString()}</td>
                            <td className="border p-2 text-green-600">{row.profit.toLocaleString()}</td>
                            <td className="border p-2">{row.region}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-center text-gray-500 text-sm mt-4">
                    ⚠️ 在线表格加载失败，显示示例数据。请检查网络或浏览器设置。
                  </p>
                </div>
              ) : (
                <div 
                  ref={luckysheetRef}
                  id="luckysheet-container"
                  className="luckysheet-container flex-1"
                  style={{ height: '100%' }}
                />
              )}
            </div>
          )}

          {activeTab === 'convert' && (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
              {/* 状态栏 */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">格式转换中心</h3>
                  <button
                    onClick={loadConverterStatus}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm">刷新状态</span>
                  </button>
                </div>
                {converterStatus && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(converterStatus.pandoc.available)}>●</span>
                      <span>Pandoc: {converterStatus.pandoc.available ? '可用' : '不可用'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(converterStatus.mermaid_cli.available)}>●</span>
                      <span>Mermaid: {converterStatus.mermaid_cli.available ? '可用' : '不可用'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(converterStatus.pdfplumber)}>●</span>
                      <span>PDF处理: {converterStatus.pdfplumber ? '可用' : '不可用'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 错误和成功消息 */}
              {error && (
                <div className="mx-4 mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mx-4 mt-4 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded text-green-700 dark:text-green-300 text-sm">
                  {success}
                </div>
              )}

              {/* 转换面板 */}
              <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* 左侧：输入区域 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">输入 Markdown</h4>
                      <button
                        onClick={handleCopyMarkdown}
                        className="flex items-center space-x-1 text-sm text-blue-500 hover:text-blue-600"
                      >
                        <Copy className="w-4 h-4" />
                        <span>复制</span>
                      </button>
                    </div>
                    <textarea
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                      placeholder="在此输入 Markdown 内容，或粘贴文件内容..."
                      className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-4 flex items-center space-x-4">
                      <label className="flex items-center space-x-2 text-sm">
                        <span>Mermaid 主题:</span>
                        <select
                          value={mermaidTheme}
                          onChange={(e) => setMermaidTheme(e.target.value)}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        >
                          <option value="default">默认</option>
                          <option value="dark">深色</option>
                          <option value="forest">森林</option>
                          <option value="neutral">中性</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* 右侧：输出区域 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col">
                    <h4 className="font-medium mb-4">输出格式</h4>
                    
                    {/* 格式选择 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {outputFormats.map((format) => (
                        <button
                          key={format.value}
                          onClick={() => setSelectedFormat(format.value)}
                          className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                            selectedFormat === format.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <format.icon className={`w-5 h-5 text-${format.color}-500`} />
                          <span className="text-sm">{format.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* 转换按钮 */}
                    <div className="flex space-x-3 mb-4">
                      <button
                        onClick={handleConvert}
                        disabled={isConverting || !markdown.trim()}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>转换中...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            <span>转换为 {selectedFormat?.toUpperCase()}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleRenderMermaid}
                        disabled={isConverting || !markdown.trim()}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileImage className="w-4 h-4" />
                        <span>渲染Mermaid</span>
                      </button>
                    </div>

                    {/* Mermaid 预览 */}
                    {mermaidPreview && (
                      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 overflow-auto">
                        <h5 className="text-sm font-medium mb-2">Mermaid 预览</h5>
                        <div dangerouslySetInnerHTML={{ __html: mermaidPreview }} />
                      </div>
                    )}

                    {/* 无预览时的占位 */}
                    {!mermaidPreview && (
                      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        <p className="text-gray-400 text-sm">
                          输入 Markdown 内容，点击"渲染Mermaid"查看图表预览
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .luckysheet-container {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          position: relative;
        }
        .luckysheet-container .luckysheet Toolbar {
          position: relative !important;
        }
        .luckysheet-container iframe {
          border: none;
        }
      `}</style>
    </div>
  );
};

export default OfficeDocs;