import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Download,
  Loader,
  CheckCircle,
  FileType,
  FileSpreadsheet,
  FileOutput,
  ArrowRight,
  RefreshCw,
  X,
  Eye,
  Trash2,
  File,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';

interface ConversionTask {
  id: string;
  file: File;
  fileName: string;
  targetFormat: 'word' | 'excel' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  errorMessage?: string;
  createdAt: Date;
}

const API_BASE = 'http://localhost:8000';

const FormatConverter: React.FC = () => {
  useTheme();
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'word' | 'excel' | 'pdf'>('word');
  const [previewTask, setPreviewTask] = useState<ConversionTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  };

  // 添加文件到任务列表
  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      toast.error('请选择 PDF 文件');
      return;
    }

    const invalidCount = files.length - validFiles.length;
    if (invalidCount > 0) {
      toast.warning(`已过滤 ${invalidCount} 个非 PDF 文件`);
    }

    const newTasks: ConversionTask[] = validFiles.map(file => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      fileName: file.name,
      targetFormat: selectedFormat,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }));

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

  // 转换为 Word
  const convertToWord = async (task: ConversionTask, formData: FormData) => {
    // 第一步：分析 PDF 生成四色卡片
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || 'PDF 分析失败');
    }

    const analysisResult = await analyzeResponse.json();
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 60 } : t
    ));

    // 第二步：导出为 Word
    const cardsForExport = analysisResult.cards.map((card: any) => ({
      type: card.type === 'explanation' ? 'interpret' : card.type,
      title: card.title,
      content: card.content,
      tags: card.tags || [],
      source: task.fileName
    }));

    const wordResponse = await fetch(`${API_BASE}/api/pdf/export/cards-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: cardsForExport,
        title: `${task.fileName.replace('.pdf', '')}_分析报告`,
        author: 'Antinet 智能知识管家'
      })
    });

    if (!wordResponse.ok) {
      throw new Error('Word 导出失败');
    }

    const blob = await wordResponse.blob();
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

    toast.success(`${task.fileName} 转换为 Word 成功！`);
  };

  // 转换为 Excel
  const convertToExcel = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 30 } : t
    ));

    const response = await fetch(`${API_BASE}/api/pdf/export/four-color-excel`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Excel 导出失败');
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

    toast.success(`${task.fileName} 转换为 Excel 成功！`);
  };

  // 转换为 PDF - 使用浏览器打印功能生成 PDF
  const convertToPDF = async (task: ConversionTask, formData: FormData) => {
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 20 } : t
    ));

    // 分析 PDF 内容
    const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || 'PDF 分析失败');
    }

    const analysisResult = await analyzeResponse.json();
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 50 } : t
    ));

    // 创建 PDF 内容
    const pdfContent = generatePDFContent(analysisResult, task.fileName);
    
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, progress: 80 } : t
    ));

    // 转换为 Blob
    const blob = new Blob([pdfContent], { type: 'text/html' });
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

    toast.success(`${task.fileName} 准备就绪，点击预览查看`);
  };

  // 生成 PDF 预览内容
  const generatePDFContent = (analysisResult: any, fileName: string) => {
    const cards = analysisResult.cards || [];
    
    const cardHTML = cards.map((card: any, index: number) => {
      const colors: Record<string, string> = {
        fact: '#3b82f6',
        explanation: '#10b981',
        risk: '#f59e0b',
        action: '#ef4444'
      };
      
      const typeNames: Record<string, string> = {
        fact: '事实',
        explanation: '解释',
        risk: '风险',
        action: '行动'
      };

      return `
        <div style="
          margin-bottom: 20px;
          padding: 15px;
          border-left: 4px solid ${colors[card.type] || '#3b82f6'};
          background: #f9fafb;
          page-break-inside: avoid;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          ">
            <h3 style="margin: 0; color: ${colors[card.type] || '#3b82f6'};">
              [${typeNames[card.type] || '其他'}] ${card.title}
            </h3>
            <span style="color: #9ca3af; font-size: 12px;">#${index + 1}</span>
          </div>
          <p style="margin: 0; line-height: 1.6; color: #374151;">${card.content}</p>
          ${card.tags ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">标签: ${card.tags.join(', ')}</p>` : ''}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName} - 分析报告</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
          }
          .header h1 {
            margin: 0 0 10px 0;
            color: #1e40af;
          }
          .header p {
            margin: 0;
            color: #6b7280;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-item {
            text-align: center;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 8px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PDF 分析报告</h1>
          <p>源文件: ${fileName}</p>
          <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${cards.length}</div>
            <div class="stat-label">总卡片数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${cards.filter((c: any) => c.type === 'fact').length}</div>
            <div class="stat-label">事实卡片</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${cards.filter((c: any) => c.type === 'explanation').length}</div>
            <div class="stat-label">解释卡片</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${cards.filter((c: any) => c.type === 'action').length}</div>
            <div class="stat-label">行动卡片</div>
          </div>
        </div>

        <h2 style="color: #1f2937; margin-top: 30px;">知识卡片详情</h2>
        ${cardHTML}

        <div class="no-print" style="
          margin-top: 40px;
          padding: 20px;
          background: #eff6ff;
          border-radius: 8px;
          text-align: center;
        ">
          <p style="margin: 0 0 10px 0; color: #1e40af;">
            💡 提示：按 Ctrl+P（或 Cmd+P）可以打印或保存为 PDF
          </p>
          <button onclick="window.print()" style="
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">
            打印 / 保存为 PDF
          </button>
        </div>
      </body>
      </html>
    `;
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

    if (task.targetFormat === 'pdf') {
      // PDF 格式在新窗口打开预览
      const previewFile = async () => {
        const previewWindow = window.open('', '_blank');
        if (previewWindow && task.resultBlob) {
          const text = await task.resultBlob.text();
          previewWindow.document.write(text);
          previewWindow.document.close();
        }
      };
      previewFile();
    } else {
      // Word 和 Excel 直接下载
      downloadFile(task);
      toast.info('Word/Excel 文件已下载，请在本地查看');
    }
  };

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
            上传 PDF 文件，一键转换为 Word、Excel 或 PDF 格式
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* 文件上传区域 */}
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
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              点击或拖拽 PDF 文件到此处
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              支持批量上传，将自动转换为 {formatConfig[selectedFormat].name}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <FileText className="w-4 h-4" />
              <span>支持 .pdf 格式</span>
            </div>
          </div>
        </motion.div>

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
      </div>
    </div>
  );
};

export default FormatConverter;
