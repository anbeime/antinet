import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, CheckCircle, Clock, Zap, Download, Settings, 
  Play, Pause, RotateCcw, Loader, AlertTriangle, 
  BarChart3, Gauge, Upload, FileText, FileSpreadsheet, 
  Presentation, Image, X, FolderOpen
} from 'lucide-react';

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'excel' | 'ppt' | 'image' | 'other';
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

interface ProcessingOptions {
  extractContent: boolean;
  generateSummary: boolean;
  generateCards: boolean;
  useNPU: boolean;
}

const BatchProcess: React.FC = () => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [options, setOptions] = useState<ProcessingOptions>({
    extractContent: true,
    generateSummary: true,
    generateCards: true,
    useNPU: true
  });

  // 获取文件类型
  const getFileType = (filename: string): BatchFile['type'] => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['pdf'].includes(ext || '')) return 'pdf';
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'excel';
    if (['pptx', 'ppt'].includes(ext || '')) return 'ppt';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    return 'other';
  };

  // 获取文件图标
  const getFileIcon = (type: BatchFile['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'ppt': return <Presentation className="w-5 h-5 text-orange-500" />;
      case 'image': return <Image className="w-5 h-5 text-blue-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: BatchFile[] = Array.from(selectedFiles).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: getFileType(file.name),
      status: 'waiting',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  // 移除文件
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // 清空所有文件
  const clearAllFiles = () => {
    if (confirm('确定要清空所有文件吗？')) {
      setFiles([]);
      setCurrentTask(null);
    }
  };

  // 处理单个文件
  const processFile = async (batchFile: BatchFile): Promise<void> => {
    setCurrentTask(batchFile.id);
    
    // 更新状态为处理中
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
        ? { ...f, status: 'processing', progress: 10 }
        : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', batchFile.file);

      let apiUrl = '';
      
      // 根据文件类型选择API
      switch (batchFile.type) {
        case 'excel':
          apiUrl = 'http://localhost:8000/api/analysis/upload-and-analyze';
          break;
        case 'pdf':
          apiUrl = 'http://localhost:8000/api/pdf/extract';
          break;
        case 'image':
          apiUrl = 'http://localhost:8000/api/vision/analyze';
          break;
        default:
          throw new Error('不支持的文件类型');
      }

      // 进度更新模拟
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ));
      }, 500);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (response.ok) {
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, status: 'completed', progress: 100, result }
            : f
        ));
      } else {
        throw new Error(result.detail || '处理失败');
      }
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { 
              ...f, 
              status: 'failed', 
              progress: 0, 
              error: error instanceof Error ? error.message : '未知错误'
            }
          : f
      ));
    }
  };

  // 开始批量处理
  const startBatchProcessing = async () => {
    if (files.length === 0) {
      alert('请先选择要处理的文件');
      return;
    }

    const waitingFiles = files.filter(f => f.status === 'waiting');
    if (waitingFiles.length === 0) {
      alert('没有等待处理的文件');
      return;
    }

    setIsProcessing(true);

    // 顺序处理每个文件
    for (const file of waitingFiles) {
      await processFile(file);
    }

    setIsProcessing(false);
    setCurrentTask(null);
  };

  // 导出结果
  const exportResults = () => {
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) {
      alert('没有可导出的结果');
      return;
    }

    const exportData = {
      processedAt: new Date().toISOString(),
      totalFiles: files.length,
      completedFiles: completedFiles.length,
      results: completedFiles.map(f => ({
        filename: f.name,
        type: f.type,
        result: f.result
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_results_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: BatchFile['status']) => {
    switch (status) {
      case 'waiting': return <Clock className="w-5 h-5 text-gray-400" />;
      case 'processing': return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: BatchFile['status']) => {
    switch (status) {
      case 'waiting': return '等待中';
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const waitingCount = files.filter(f => f.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                批量处理中心
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                批量上传和处理多个文档文件
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* File Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-teal-500" />
                添加文件
              </h3>
              
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.pptx,.ppt,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFileSelect}
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>选择文件</span>
                </button>
                
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span>选择文件夹</span>
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                支持: PDF, Excel, PPT, 图片
              </p>
            </div>

            {/* Processing Options */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-teal-500" />
                处理选项
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.extractContent}
                    onChange={(e) => setOptions({...options, extractContent: e.target.checked})}
                    className="w-4 h-4 text-teal-500 rounded"
                  />
                  <span className="text-sm">提取内容</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.generateSummary}
                    onChange={(e) => setOptions({...options, generateSummary: e.target.checked})}
                    className="w-4 h-4 text-teal-500 rounded"
                  />
                  <span className="text-sm">生成摘要</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.generateCards}
                    onChange={(e) => setOptions({...options, generateCards: e.target.checked})}
                    className="w-4 h-4 text-teal-500 rounded"
                  />
                  <span className="text-sm">生成四色卡片</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.useNPU}
                    onChange={(e) => setOptions({...options, useNPU: e.target.checked})}
                    className="w-4 h-4 text-teal-500 rounded"
                  />
                  <span className="text-sm">使用NPU加速</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={startBatchProcessing}
                disabled={isProcessing || waitingCount === 0}
                className="w-full flex items-center justify-center space-x-2 bg-teal-500 text-white py-3 px-4 rounded-lg hover:bg-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span>{isProcessing ? '处理中...' : '开始批量处理'}</span>
              </button>
              
              <button 
                onClick={clearAllFiles}
                disabled={isProcessing || files.length === 0}
                className="w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>清空列表</span>
              </button>
              
              <button 
                onClick={exportResults}
                disabled={completedCount === 0}
                className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>导出结果 ({completedCount})</span>
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-teal-500" />
                处理统计
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">总文件数</span>
                  <span className="font-bold">{files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">等待中</span>
                  <span className="font-bold text-gray-600">{waitingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">处理中</span>
                  <span className="font-bold text-blue-600">{processingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">已完成</span>
                  <span className="font-bold text-green-600">{completedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">失败</span>
                  <span className="font-bold text-red-600">{failedCount}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - File List */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* File List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-teal-500" />
                  文件列表 ({files.length})
                </h3>
              </div>
              
              {files.length === 0 ? (
                <div className="p-12 text-center">
                  <Upload className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                    还没有添加文件
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    点击左侧"选择文件"或"选择文件夹"开始批量处理
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                  {files.map(file => (
                    <div key={file.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                file.status === 'waiting' ? 'bg-gray-100 text-gray-800' :
                                file.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                file.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {getStatusText(file.status)}
                              </span>
                              <button
                                onClick={() => removeFile(file.id)}
                                disabled={isProcessing}
                                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatFileSize(file.size)}</span>
                            {file.error && (
                              <span className="text-red-500">{file.error}</span>
                            )}
                          </div>
                          
                          {file.status === 'processing' && (
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <motion.div 
                                className="bg-teal-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0">
                          {getStatusIcon(file.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overall Progress */}
            {files.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Gauge className="w-5 h-5 mr-2 text-teal-500" />
                    总体进度
                  </h3>
                  <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {completedCount}/{files.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <motion.div 
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${files.length > 0 ? (completedCount / files.length) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BatchProcess;
