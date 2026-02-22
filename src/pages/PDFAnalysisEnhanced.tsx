import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  BarChart3,
  CheckCircle,
  Loader,
  FileDown,
  Layers,
  Scissors,
  Combine,
  RefreshCw,
  ArrowRight,
  FileType,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import PDFExporter from '@/components/PDFExporter';

interface ProcessingStatus {
  stage: string;
  progress: number;
  message: string;
}

interface AnalysisResult {
  fileName: string;
  pageCount: number;
  wordCount: number;
  extractedText: string;
  summary: string;
  keyPoints: string[];
  tables: any[];
  suggestedCards: string[];
}

interface KnowledgeCard {
  id: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  title: string;
  content: string;
  address: string;
  createdAt: string;
}

interface ConversionTask {
  id: string;
  fileName: string;
  targetFormat: 'word' | 'excel' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  errorMessage?: string;
}

const API_BASE = 'http://localhost:8000';

// 格式配置
const formatConfig = {
  word: {
    name: 'Word 文档',
    icon: <FileType className="w-5 h-5" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: '完美支持中文，可编辑'
  },
  excel: {
    name: 'Excel 表格',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    description: '适合数据分析'
  },
  pdf: {
    name: 'PDF 预览',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    description: '可打印保存'
  }
};

const PDFAnalysisEnhanced: React.FC = () => {
  useTheme();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [generatedCards, setGeneratedCards] = useState<KnowledgeCard[]>([]);
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'merge' | 'split' | 'convert'>('extract');
  
  // 格式转换相关状态
  const [selectedFormat, setSelectedFormat] = useState<'word' | 'excel' | 'pdf'>('word');
  const [conversionTask, setConversionTask] = useState<ConversionTask | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setAnalysisResult(null);
      setGeneratedCards([]);
      setConversionTask(null);
      toast.success(`已选择文件: ${file.name}`);
    } else {
      toast.error('请选择有效的 PDF 文件');
    }
  };

  // 开始格式转换
  const handleStartConversion = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsConverting(true);
    
    const newTask: ConversionTask = {
      id: Date.now().toString(),
      fileName: uploadedFile.name,
      targetFormat: selectedFormat,
      status: 'processing',
      progress: 0
    };
    
    setConversionTask(newTask);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('max_cards', '50');

    try {
      if (selectedFormat === 'word') {
        await convertToWord(newTask, formData);
      } else if (selectedFormat === 'excel') {
        await convertToExcel(newTask, formData);
      } else if (selectedFormat === 'pdf') {
        await convertToPDF(newTask, formData);
      }
    } catch (error) {
      console.error('转换失败:', error);
      const errorMessage = error instanceof Error ? error.message : '转换失败';
      setConversionTask(prev => prev ? {
        ...prev,
        status: 'error',
        errorMessage: errorMessage
      } : null);
      toast.error(errorMessage);
    } finally {
      setIsConverting(false);
    }
  };

  // 转换为 Word
  const convertToWord = async (task: ConversionTask, formData: FormData) => {
    setConversionTask(prev => prev ? { ...prev, progress: 30 } : null);

    const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      throw new Error(`PDF 分析失败: ${errorText}`);
    }

    const analysisResult = await analyzeResponse.json();
    
    // 检查返回数据
    if (!analysisResult || typeof analysisResult !== 'object') {
      throw new Error('返回数据格式错误：不是有效的 JSON 对象');
    }
    
    if (analysisResult.success === false) {
      throw new Error(analysisResult.error || 'PDF 分析失败');
    }

    const cardsData = analysisResult.cards;
    if (!cardsData || !Array.isArray(cardsData)) {
      throw new Error('返回数据格式错误：缺少卡片数据');
    }
    
    setConversionTask(prev => prev ? { ...prev, progress: 60 } : null);

    const cardsForExport = cardsData.map((card: any) => ({
      type: card?.type === 'explanation' ? 'interpret' : (card?.type || 'fact'),
      title: String(card?.title || '无标题'),
      content: String(card?.content || '无内容'),
      tags: Array.isArray(card?.tags) ? card.tags : [],
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
      const errorText = await wordResponse.text();
      throw new Error(`Word 导出失败: ${errorText}`);
    }

    const blob = await wordResponse.blob();
    const url = window.URL.createObjectURL(blob);

    setConversionTask(prev => prev ? {
      ...prev,
      status: 'completed',
      progress: 100,
      resultUrl: url,
      resultBlob: blob
    } : null);

    toast.success('Word 转换完成！');
  };

  // 转换为 Excel
  const convertToExcel = async (task: ConversionTask, formData: FormData) => {
    setConversionTask(prev => prev ? { ...prev, progress: 30 } : null);

    const response = await fetch(`${API_BASE}/api/pdf/export/four-color-excel`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Excel 导出失败: ${errorText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    setConversionTask(prev => prev ? {
      ...prev,
      status: 'completed',
      progress: 100,
      resultUrl: url,
      resultBlob: blob
    } : null);

    toast.success('Excel 转换完成！');
  };

  // 转换为 PDF - 使用浏览器打印功能生成 PDF
  const convertToPDF = async (task: ConversionTask, formData: FormData) => {
    setConversionTask(prev => prev ? { ...prev, progress: 30 } : null);

    const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
      method: 'POST',
      body: formData
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      throw new Error(`PDF 分析失败: ${errorText}`);
    }

    const analysisResult = await analyzeResponse.json();
    
    // 检查返回数据
    if (!analysisResult || typeof analysisResult !== 'object') {
      throw new Error('返回数据格式错误：不是有效的 JSON 对象');
    }
    
    setConversionTask(prev => prev ? { ...prev, progress: 70 } : null);

    // 生成 HTML 内容用于预览和打印
    const htmlContent = generatePDFPreview(analysisResult, task.fileName);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);

    setConversionTask(prev => prev ? {
      ...prev,
      status: 'completed',
      progress: 100,
      resultUrl: url,
      resultBlob: blob
    } : null);

    toast.success('PDF 预览已生成，请点击预览查看');
  };

  // 生成 PDF 预览 HTML
  const generatePDFPreview = (analysisResult: any, fileName: string) => {
    const cards = analysisResult?.cards || [];
    
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

      const cardType = card?.type || 'fact';
      const cardTitle = card?.title || '无标题';
      const cardContent = card?.content || '无内容';

      return `
        <div style="
          margin-bottom: 20px;
          padding: 15px;
          border-left: 4px solid ${colors[cardType] || '#3b82f6'};
          background: #f9fafb;
          page-break-inside: avoid;
        ">
          <div style="
            font-weight: bold;
            color: ${colors[cardType] || '#3b82f6'};
            margin-bottom: 8px;
          ">
            [${typeNames[cardType] || '事实'}] #${index + 1} ${cardTitle}
          </div>
          <div style="color: #374151; line-height: 1.6;">
            ${cardContent.replace(/\n/g, '<br>')}
          </div>
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            margin: 0 0 10px 0;
            color: #111827;
          }
          .header p {
            color: #6b7280;
            margin: 0;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>分析报告</h1>
          <p>文件名: ${fileName}</p>
          <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
        <div class="content">
          ${cardHTML || '<p style="text-align: center; color: #9ca3af;">暂无卡片数据</p>'}
        </div>
        <div class="no-print" style="margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280;">提示：按 Ctrl+P (或 Cmd+P) 可以打印或保存为 PDF</p>
        </div>
      </body>
      </html>
    `;
  };

  // 下载转换后的文件
  const downloadConvertedFile = () => {
    if (!conversionTask?.resultUrl) return;
    
    const a = document.createElement('a');
    a.href = conversionTask.resultUrl;
    a.download = `${conversionTask.fileName.replace('.pdf', '')}_converted.${
      conversionTask.targetFormat === 'word' ? 'docx' : 
      conversionTask.targetFormat === 'excel' ? 'xlsx' : 'html'
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 预览转换后的文件
  const previewConvertedFile = () => {
    if (!conversionTask?.resultUrl) return;
    
    if (conversionTask.targetFormat === 'pdf') {
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <iframe 
            src="${conversionTask.resultUrl}" 
            style="width:100%;height:100vh;border:none;"
          ></iframe>
        `);
        previewWindow.document.close();
      }
    } else {
      downloadConvertedFile();
    }
  };

  const handleExtractText = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProcessingStatus({ stage: 'extract', progress: 30, message: '正在提取文本...' });
      
      const response = await fetch(`${API_BASE}/api/pdf/extract/text`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('提取失败');
      }

      const result = await response.json();
      
      setAnalysisResult({
        fileName: uploadedFile.name,
        pageCount: result.pages || 1,
        wordCount: result.text?.split(/\s+/).length || 0,
        extractedText: result.text || '',
        summary: result.summary || '',
        keyPoints: result.key_points || [],
        tables: result.tables || [],
        suggestedCards: result.suggested_cards || []
      });

      setProcessingStatus({ stage: 'complete', progress: 100, message: '处理完成' });
      toast.success('文本提取成功！');
    } catch (error) {
      console.error('提取失败:', error);
      toast.error('文本提取失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '处理失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractKnowledge = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProcessingStatus({ stage: 'analyze', progress: 30, message: '正在分析内容...' });

      const response = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('知识提取失败');
      }

      const result = await response.json();
      
      // 安全地处理返回数据
      if (!result || typeof result !== 'object') {
        throw new Error('返回数据为空或格式错误');
      }

      if (result.success === false) {
        throw new Error(result.error || '知识提取失败');
      }

      const cardsData = result.cards;
      if (!cardsData || !Array.isArray(cardsData)) {
        throw new Error('返回数据格式错误：缺少卡片数据');
      }

      const cards: KnowledgeCard[] = cardsData.map((card: any, index: number) => {
        // 确保每个字段都有值
        const safeCard = {
          id: String(card?.id || `card-${Date.now()}-${index}`),
          type: String(card?.type || 'fact'),
          title: String(card?.title || '无标题'),
          content: String(card?.content || '无内容'),
        };

        return {
          id: safeCard.id,
          color: (safeCard.type === 'fact' ? 'blue' : 
                  safeCard.type === 'explanation' ? 'green' : 
                  safeCard.type === 'risk' ? 'yellow' : 'red') as 'blue' | 'green' | 'yellow' | 'red',
          title: safeCard.title,
          content: safeCard.content,
          address: `PDF/${result.filename || 'unknown'}/Card-${index + 1}`,
          createdAt: new Date().toISOString(),
        };
      });

      setGeneratedCards(cards);
      setProcessingStatus({ stage: 'complete', progress: 100, message: '知识卡片生成完成' });
      toast.success(`成功生成 ${cards.length} 张知识卡片！`);
    } catch (error) {
      console.error('知识提取失败:', error);
      toast.error('知识提取失败，请检查后端服务');
      setProcessingStatus({ stage: 'error', progress: 0, message: '处理失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToFormatConverter = () => {
    navigate('/format-converter');
  };

  const features = [
    {
      id: 'extract' as const,
      name: '文本提取',
      icon: <FileText size={20} />,
      description: '从 PDF 提取文本和表格',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'generate' as const,
      name: '生成卡片',
      icon: <Layers size={20} />,
      description: '智能生成四色知识卡片',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'convert' as const,
      name: '格式转换',
      icon: <RefreshCw size={20} />,
      description: '转换为 Word/Excel/PDF',
      color: 'from-indigo-500 to-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">PDF 智能分析</h1>
                <p className="text-gray-600 dark:text-gray-400">提取、分析、转换 PDF 文档</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveFeature(feature.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                activeFeature === feature.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-1">{feature.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{feature.description}</p>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Upload Area */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-red-500" />
                文档上传
              </h3>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-red-400 dark:hover:border-red-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  {uploadedFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">点击更换文件</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">点击选择 PDF 文件</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-6">
                {activeFeature === 'extract' && (
                  <button
                    onClick={handleExtractText}
                    disabled={!uploadedFile || isProcessing}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? '提取中...' : '提取文本'}
                  </button>
                )}

                {activeFeature === 'generate' && (
                  <button
                    onClick={handleExtractKnowledge}
                    disabled={!uploadedFile || isProcessing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? '生成中...' : '生成知识卡片'}
                  </button>
                )}

                {activeFeature === 'convert' && (
                  <button
                    onClick={handleGoToFormatConverter}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                  >
                    前往格式转换页面
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                )}
              </div>
            </div>

            {/* Processing Status */}
            {isProcessing && processingStatus && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">处理进度</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{processingStatus.message}</span>
                    <span className="font-medium">{processingStatus.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${processingStatus.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Format Conversion Panel */}
            {activeFeature === 'convert' && uploadedFile && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2 text-indigo-500" />
                  格式转换
                </h3>

                {/* Format Selection */}
                <div className="space-y-3 mb-6">
                  {(Object.keys(formatConfig) as Array<'word' | 'excel' | 'pdf'>).map((format) => {
                    const config = formatConfig[format];
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedFormat === format
                            ? `${config.borderColor} ${config.bgColor} border-2`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white`}>
                            {config.icon}
                          </div>
                          <div>
                            <div className="font-medium">{config.name}</div>
                            <div className="text-xs text-gray-500">{config.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Convert Button */}
                <button
                  onClick={handleStartConversion}
                  disabled={isConverting}
                  className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isConverting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      转换中...
                    </span>
                  ) : (
                    `转换为 ${formatConfig[selectedFormat].name}`
                  )}
                </button>

                {/* Conversion Status */}
                {conversionTask && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{conversionTask.fileName}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        conversionTask.status === 'completed' ? 'bg-green-100 text-green-600' :
                        conversionTask.status === 'error' ? 'bg-red-100 text-red-600' :
                        conversionTask.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {conversionTask.status === 'completed' ? '已完成' :
                         conversionTask.status === 'error' ? '失败' :
                         conversionTask.status === 'processing' ? '转换中' : '等待中'}
                      </span>
                    </div>
                    
                    {conversionTask.status === 'processing' && (
                      <div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${conversionTask.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{conversionTask.progress}%</p>
                      </div>
                    )}

                    {conversionTask.errorMessage && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mt-2">
                        <AlertCircle className="w-4 h-4" />
                        {conversionTask.errorMessage}
                      </p>
                    )}

                    {conversionTask.status === 'completed' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={previewConvertedFile}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          预览
                        </button>
                        <button
                          onClick={downloadConvertedFile}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          下载
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {/* Text Extraction Result */}
            {activeFeature === 'extract' && analysisResult && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  文本提取结果
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{analysisResult.pageCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">页数</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{analysisResult.wordCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">字数</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{analysisResult.tables.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">表格</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {analysisResult.summary && (
                    <div>
                      <h4 className="font-semibold mb-2">文档摘要</h4>
                      <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        {analysisResult.summary}
                      </p>
                    </div>
                  )}

                  {analysisResult.extractedText && (
                    <div>
                      <h4 className="font-semibold mb-2">提取文本</h4>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {analysisResult.extractedText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Knowledge Cards Result */}
            {activeFeature === 'generate' && generatedCards.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-purple-500" />
                    生成的知识卡片
                  </h3>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full text-sm font-medium">
                    {generatedCards.length} 张卡片
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {generatedCards.map((card) => {
                    const colorClasses = {
                      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                    };

                    return (
                      <div key={card.id} className={`p-4 rounded-lg border-2 ${colorClasses[card.color]}`}>
                        <h4 className="font-semibold mb-2">{card.title}</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{card.content}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span>地址: {card.address}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-center">
                  <PDFExporter
                    cards={generatedCards}
                    title="Antinet 知识卡片导出"
                    author="Antinet 智能知识管家"
                    fileName={`antinet-cards-${Date.now()}.pdf`}
                  >
                    <FileDown className="w-4 h-4 mr-2 inline" />
                    导出卡片为 PDF
                  </PDFExporter>
                </div>
              </div>
            )}

            {/* Convert Feature Info */}
            {activeFeature === 'convert' && !uploadedFile && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <RefreshCw className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">格式转换</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  将 PDF 文件转换为 Word、Excel 或 PDF 格式
                </p>
                <ul className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Word 文档 - 完美支持中文，可编辑</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Excel 表格 - 适合数据分析</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>PDF 预览 - 可打印保存</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Empty State */}
            {!isProcessing && !analysisResult && generatedCards.length === 0 && activeFeature !== 'convert' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">开始分析</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  上传 PDF 文件并选择功能开始分析
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysisEnhanced;
