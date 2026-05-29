import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '@/lib/apiConfig';
import {
  Layers, CheckCircle, Clock, Settings,
  Play, RotateCcw, Loader, AlertTriangle,
  BarChart3, Upload, FileText, FileSpreadsheet,
  Presentation, Image, X, FolderOpen, Database, FileDown,
  FileAudio, FileArchive
} from 'lucide-react';
import { toast } from 'sonner';

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'excel' | 'ppt' | 'image' | 'audio' | 'archive' | 'other';
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  extractedCards?: ExtractedCard[];
  error?: string;
}

interface ExtractedCard {
  title: string;
  content: string;
  card_type: 'blue' | 'green' | 'yellow' | 'red';
  confidence: number;
}

interface ProcessingOptions {
  extractContent: boolean;
  generateSummary: boolean;
  generateCards: boolean;
  autoSaveCards: boolean;
  syncToGTD: boolean;
  useNPU: boolean;
}

const BatchProcess: React.FC = () => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedCardsCount, setSavedCardsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [options, setOptions] = useState<ProcessingOptions>({
    extractContent: true,
    generateSummary: true,
    generateCards: true,
    autoSaveCards: true,
    syncToGTD: true,
    useNPU: true
  });

// 后端支持的文件扩展名白名单（与后端 supported_extensions 保持一致）
const SUPPORTED_EXTENSIONS = new Set([
  '.pdf', '.txt', '.md', '.docx', '.doc',
  '.xlsx', '.xls', '.pptx', '.ppt',
  '.mp3', '.wav', '.flac',
  '.zip', '.rar', '.7z',
  '.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'
]);

// 获取文件类型
const getFileType = (filename: string): BatchFile['type'] => {
  const ext = filename.toLowerCase().split('.').pop();
  if (['pdf'].includes(ext || '')) return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'excel';
  if (['pptx', 'ppt'].includes(ext || '')) return 'ppt';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['mp3', 'wav', 'flac'].includes(ext || '')) return 'audio';
  if (['zip', 'rar', '7z'].includes(ext || '')) return 'archive';
  return 'other';
};

  // 获取文件图标
  const getFileIcon = (type: BatchFile['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'ppt': return <Presentation className="w-5 h-5 text-orange-500" />;
      case 'image': return <Image className="w-5 h-5 text-blue-500" />;
      case 'audio': return <FileAudio className="w-5 h-5 text-purple-500" />;
      case 'archive': return <FileArchive className="w-5 h-5 text-amber-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 处理文件选择（含预过滤）
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const allFiles = Array.from(selectedFiles);

    // 预过滤：只保留支持的格式，其余跳过并提示
    const validFiles: File[] = [];
    const skippedFiles: string[] = [];

    for (const file of allFiles) {
      const ext = '.' + (file.name.toLowerCase().split('.').pop() || '');
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        validFiles.push(file);
      } else {
        skippedFiles.push(file.name);
      }
    }

    // 如果有被过滤的文件，显示提示
    if (skippedFiles.length > 0) {
      toast.info(`已跳过 ${skippedFiles.length} 个不支持的文件`, {
        description: skippedFiles.slice(0, 5).join(', ') + (skippedFiles.length > 5 ? '...' : '')
      });
    }

    if (validFiles.length === 0 && allFiles.length > 0) {
      toast.error('所选文件均不支持处理');
      return;
    }

    const newFiles: BatchFile[] = validFiles.map(file => ({
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
    }
  };

  // 处理单个文件
  const processFile = async (batchFile: BatchFile): Promise<void> => {
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
        ? { ...f, status: 'processing', progress: 10 }
        : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', batchFile.file);

      // 使用统一的知识导入API
      const apiUrl = `${getApiBaseUrl()}/api/knowledge/import/file`;

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
        const extractedCards: ExtractedCard[] = result.cards || [];
        
        // 自动保存卡片到数据库
        if (options.autoSaveCards && extractedCards.length > 0) {
          let savedCount = 0;
          for (const card of extractedCards) {
            try {
              const saveResponse = await fetch(getApiBaseUrl() + '/api/knowledge/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: card.card_type,
                  title: card.title,
                  content: card.content,
                  category: card.card_type === 'blue' ? '事实' : 
                            card.card_type === 'green' ? '解释' : 
                            card.card_type === 'yellow' ? '风险' : '行动'
                })
              });
              if (saveResponse.ok) savedCount++;
            } catch (e) {
              console.error('保存卡片失败:', e);
            }
          }
          
          setSavedCardsCount(prev => prev + savedCount);
        }
        
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, status: 'completed', progress: 100, result, extractedCards }
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

  // 开始批量处理（使用批量导入端点）
  const startBatchProcessing = async () => {
    if (files.length === 0) {
      toast.error('请先选择要处理的文件');
      return;
    }

    const waitingFiles = files.filter(f => f.status === 'waiting');
    if (waitingFiles.length === 0) {
      toast.warning('没有等待处理的文件');
      return;
    }

    setIsProcessing(true);
    setSavedCardsCount(0);

    // 全部标记为处理中
    setFiles(prev => prev.map(f =>
      waitingFiles.find(wf => wf.id === f.id)
        ? { ...f, status: 'processing', progress: 10 }
        : f
    ));

    try {
      // 使用批量上传端点 POST /api/knowledge/import/batch
      const formData = new FormData();
      waitingFiles.forEach((bf) => {
        formData.append('files', bf.file);
      });

      const apiUrl = `${getApiBaseUrl()}/api/knowledge/import/batch`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const batchResult = await response.json();
        const results = batchResult.results || [];

        // 更新每个文件的状态
        let totalAgentCards = 0;
        for (const result of results) {
          const matchedFile = waitingFiles.find(wf => wf.name === result.filename);
          if (matchedFile) {
            const extractedCards: ExtractedCard[] = [];
            // 尝试从返回结果读取卡片（不同格式兼容）
            if (result.success && result.cards_count > 0) {
              // 如果结果中有详细卡片数据会更好，但API返回只有计数
              // 卡片详细信息在单个文件导入时会返回，批量模式下我们只统计
            }
            setFiles(prev => prev.map(f =>
              f.id === matchedFile.id
                ? {
                    ...f,
                    status: result.success ? 'completed' : 'failed',
                    progress: result.success ? 100 : 0,
                    result,
                    extractedCards,
                    error: result.error
                  }
                : f
            ));
            if (result.success) totalAgentCards += result.cards_count || 0;
          }
        }

        if (totalAgentCards > 0) {
          toast.success(`批量处理完成！共提取 ${totalAgentCards} 张知识卡片`);
        } else {
          toast.success(`批量处理完成！${batchResult.success_count}/${batchResult.total} 个文件处理成功`);
        }
      } else {
        // 回退：逐文件处理
        toast.warning('批量端点不可用，切换为逐文件处理...');
        for (const file of waitingFiles) {
          await processFile(file);
        }
      }
    } catch (error) {
      // 网络错误，回退到逐文件处理
      toast.warning('批量端点出错，切换为逐文件处理...');
      for (const file of waitingFiles) {
        await processFile(file);
      }
    }

    setIsProcessing(false);

    if (options.autoSaveCards && savedCardsCount > 0) {
      toast.success(`处理完成！已保存 ${savedCardsCount} 张卡片到知识库`);
    }
  };

  // 导出为知识卡片格式
  const exportAsCards = () => {
    const allCards: ExtractedCard[] = [];
    files.filter(f => f.status === 'completed').forEach(f => {
      if (f.extractedCards) {
        allCards.push(...f.extractedCards.map(card => ({
          ...card,
          source: f.name
        })));
      }
    });
    
    if (allCards.length === 0) {
      toast.warning('没有可导出的卡片');
      return;
    }

    const blob = new Blob([JSON.stringify(allCards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge_cards_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${allCards.length} 张卡片`);
  };

  // 导出为 Markdown 格式
  const exportAsMarkdown = () => {
    const allCards: ExtractedCard[] = [];
    files.filter(f => f.status === 'completed').forEach(f => {
      if (f.extractedCards) allCards.push(...f.extractedCards);
    });
    
    if (allCards.length === 0) {
      toast.warning('没有可导出的卡片');
      return;
    }

    const colorEmoji = { blue: '🔵', green: '🟢', yellow: '🟡', red: '🔴' };
    const colorName = { blue: '事实', green: '解释', yellow: '风险', red: '行动' };
    
    let md = `# 批量处理知识卡片导出\n\n`;
    md += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    md += `卡片总数: ${allCards.length}\n\n---\n\n`;
    
    allCards.forEach((card) => {
      md += `## ${colorEmoji[card.card_type]} ${card.title}\n\n`;
      md += `**类型**: ${colorName[card.card_type]}\n\n`;
      md += `${card.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge_cards_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`已导出 Markdown 文件`);
  };

  // 导出分析报告
  const exportReport = () => {
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) {
      toast.warning('没有可导出的结果');
      return;
    }

    let report = `# 批量处理报告\n\n`;
    report += `处理时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += `## 统计信息\n\n`;
    report += `- 总文件数: ${files.length}\n`;
    report += `- 成功处理: ${completedFiles.length}\n`;
    report += `- 处理失败: ${files.filter(f => f.status === 'failed').length}\n`;
    report += `- 提取卡片: ${completedFiles.reduce((sum, f) => sum + (f.extractedCards?.length || 0), 0)} 张\n\n`;
    
    report += `## 处理详情\n\n`;
    completedFiles.forEach(f => {
      report += `### ${f.name}\n\n`;
      report += `- 文件类型: ${f.type}\n`;
      report += `- 提取卡片: ${f.extractedCards?.length || 0} 张\n`;
      if (f.extractedCards && f.extractedCards.length > 0) {
        report += `\n卡片预览:\n`;
        f.extractedCards.slice(0, 3).forEach(card => {
          report += `- ${card.title}\n`;
        });
        if (f.extractedCards.length > 3) {
          report += `- ... 还有 ${f.extractedCards.length - 3} 张卡片\n`;
        }
      }
      report += `\n`;
    });

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_report_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('已导出分析报告');
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
                  accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.flac,.zip,.rar,.7z"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFileSelect}
                  {...({ webkitdirectory: '', directory: '' } as any)}
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
                支持: PDF, Word, Excel, PPT, 图片, 音频(MP3/WAV/FLAC), 压缩包(ZIP/RAR/7Z)
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
            </div>
            
            {/* 导出选项 */}
            {completedCount > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileDown className="w-5 h-5 mr-2 text-green-500" />
                  导出选项
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={exportAsCards}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    <span>导出知识卡片 (JSON)</span>
                  </button>
                  <button 
                    onClick={exportAsMarkdown}
                    className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>导出 Markdown</span>
                  </button>
                  <button 
                    onClick={exportReport}
                    className="w-full flex items-center justify-center space-x-2 bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>导出分析报告</span>
                  </button>
                </div>
                {savedCardsCount > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
                    ✓ 已自动保存 {savedCardsCount} 张卡片到知识库
                  </div>
                )}
              </div>
            )}

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
                    <Layers className="w-5 h-5 mr-2 text-teal-500" />
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
