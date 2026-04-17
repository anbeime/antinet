import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, FileText, Presentation, Download, Upload, 
  Save, FolderOpen, X, Maximize2, Minimize2, Eye, Edit3,
  FileType, Search, FilePlus, Trash2, RefreshCw
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface DocFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf' | 'ppt' | 'doc';
  path: string;
  size: number;
  modified: string;
}

interface OfficeDocsProps {
  initialFile?: string;
}

declare global {
  interface Window {
    luckysheet: any;
  }
}

const OfficeDocs: React.FC<OfficeDocsProps> = ({ initialFile }) => {
  useTheme();
  const [currentFile, setCurrentFile] = useState<DocFile | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf' | 'ppt' | 'docs'>('excel');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileList, setShowFileList] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const luckysheetRef = useRef<HTMLDivElement>(null);

  const sampleFiles: DocFile[] = [
    { id: '1', name: '销售数据.xlsx', type: 'excel', path: '/data/exports/sales.xlsx', size: 25600, modified: '2025-01-20' },
    { id: '2', name: '季度报告.pdf', type: 'pdf', path: '/data/exports/report.pdf', size: 512000, modified: '2025-01-19' },
    { id: '3', name: '产品介绍.pptx', type: 'ppt', path: '/data/exports/demo.pptx', size: 128000, modified: '2025-01-18' },
  ];

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
    
    const linkCDN = (filename: string) => 
      `https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/${filename}`;
    const jsCDN = (filename: string) =>
      `https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/${filename}`;
    const mainCSS = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css';
    const mainJS = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/js/luckysheet.umd.js';

    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });

    const loadCSS = (href: string) => new Promise<void>((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });

    try {
      setIsLoading(true);
      await loadCSS(mainCSS);
      await loadScript(mainJS);
      setIsLoading(false);
      
      initLuckysheet();
    } catch (error) {
      console.error('加载Luckysheet失败:', error);
      setIsLoading(false);
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
          status: 1,
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
          status: 1,
          zoom: 100,
          scroll: { x: 1, y: 1 }
        }]
      });
    } catch (error) {
      console.error('初始化Luckysheet失败:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data && window.luckysheet) {
          try {
            window.luckysheet.create({
              container: 'luckysheet-container',
              title: file.name,
              lang: 'zh-CN',
              data: [{
                name: 'Sheet1',
                data: [['加载中...']],
                status: 1
              }]
            });
          } catch (error) {
            console.error('加载文件失败:', error);
          }
        }
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsLoading(false);
      alert('暂不支持此格式，请上传Excel文件');
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
    setActiveTab('pdf');
  };

  const openPPT = (file: DocFile) => {
    setCurrentFile(file);
    setActiveTab('ppt');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
            {sampleFiles.map(file => (
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
                  { id: 'excel', label: '表格', icon: FileSpreadsheet, color: 'text-green-500' },
                  { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500' },
                  { id: 'ppt', label: '演示', icon: Presentation, color: 'text-orange-500' },
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
              
              <div 
                ref={luckysheetRef}
                id="luckysheet-container"
                className="luckysheet-container flex-1"
                style={{ height: '100%' }}
              />
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
              <div className="text-center p-8">
                <FileText className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">PDF 查看器</h3>
                <p className="text-gray-500 mb-4">
                  支持PDF文件在线预览
                </p>
                <div className="flex justify-center space-x-3">
                  <label className="block">
                    <input type="file" accept=".pdf" className="hidden" />
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600">
                      <Upload className="w-4 h-4" />
                      <span>上传PDF</span>
                    </div>
                  </label>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    <FolderOpen className="w-4 h-4" />
                    <span>打开文件</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ppt' && (
            <div className="h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
              <div className="text-center p-8">
                <Presentation className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">PPT 演示查看器</h3>
                <p className="text-gray-500 mb-4">
                  支持PowerPoint文件在线预览
                </p>
                <div className="flex justify-center space-x-3">
                  <label className="block">
                    <input type="file" accept=".pptx,.ppt" className="hidden" />
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600">
                      <Upload className="w-4 h-4" />
                      <span>上传PPT</span>
                    </div>
                  </label>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    <FolderOpen className="w-4 h-4" />
                    <span>打开文件</span>
                  </button>
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