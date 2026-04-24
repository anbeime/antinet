import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, FileText, Presentation, Download, Upload, 
  Save, FolderOpen, X, Maximize2, Minimize2, Eye, Edit3,
  FileType, Search, FilePlus, Trash2, RefreshCw, Clock,
  Edit, Check, ChevronRight, Zap, ArrowRight, File
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

interface DocFile {
  id: string;
  name: string;
  type: 'excel' | 'pdf' | 'ppt' | 'doc';
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

const OfficeDocs: React.FC<OfficeDocsProps> = ({ initialFile }) => {
  useTheme();
  const navigate = useNavigate();
  const [currentFile, setCurrentFile] = useState<DocFile | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf' | 'ppt' | 'docs'>('excel');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileList, setShowFileList] = useState(true);
  const [useSimpleTable, setUseSimpleTable] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showTools, setShowTools] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const luckysheetRef = useRef<HTMLDivElement>(null);

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
      if (fileType !== 'other') {
        setActiveTab(fileType);
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
    
    const linkCDN = (filename: string) => 
      `https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/${filename}`;
    const jsCDN = (filename: string) =>
      `https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/${filename}`;
    const mainCSS = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css';
    const mainJS = 'https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/js/luckysheet.umd.js';

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
      await loadCSS(mainCSS);
      await loadScript(mainJS);
      
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