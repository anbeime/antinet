import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  BarChart3,
  CheckCircle,
  Loader,
  FileDown,
  Layers,
  FileType,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  AlertCircle,
  Image,
  FileImage,
  Clock,
  History,
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
  file: File;
  fileName: string;
  targetFormat: 'word' | 'excel';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultUrl?: string;
  resultBlob?: Blob;
  errorMessage?: string;
  createdAt: Date;
}

const API_BASE = 'http://localhost:8000';

const PDFAnalysisEnhanced: React.FC = () => {
  useTheme();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [generatedCards, setGeneratedCards] = useState<KnowledgeCard[]>([]);
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'toExcel' | 'toWord' | 'fromImages' | 'history'>('extract');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 转换记录
  const [conversionHistory, setConversionHistory] = useState<ConversionTask[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.type === 'application/pdf');
    
    if (validFiles.length === 0) {
      toast.error('请选择有效的 PDF 文件');
      return;
    }

    setUploadedFile(validFiles[0]);
    setAnalysisResult(null);
    setGeneratedCards([]);
    toast.success(`已选择: ${validFiles[0].name}`);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length === 0) {
      toast.error('请选择有效的图片文件 (JPG/PNG/BMP/TIFF)');
      return;
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    toast.success(`已添加 ${validFiles.length} 张图片`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setUploadedFile(null);
  };

  // 文本提取
  const handleExtractText = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'extract', progress: 10, message: '正在提取文本...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(`${API_BASE}/api/pdf/extract/text`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('文本提取失败');
      }

      const result = await response.json();
      
      console.log('文本提取结果:', result);
      
      // 检查后端返回的字段名
      const pageCount = result.pages || result.page_count || 0;
      const wordCount = result.word_count || result.words || 0;
      const extractedText = result.text || result.content || result.extracted_text || '';
      
      setAnalysisResult({
        fileName: uploadedFile.name,
        pageCount: pageCount,
        wordCount: wordCount,
        extractedText: extractedText,
        summary: result.summary || '',
        keyPoints: result.key_points || [],
        tables: result.tables || [],
        suggestedCards: result.suggested_cards || []
      });
      
      if (pageCount === 0 && wordCount === 0 && !extractedText) {
        toast.warning('未能从 PDF 中提取到文本内容，可能是扫描件或图片 PDF');
      }

      setProcessingStatus({ stage: 'complete', progress: 100, message: '文本提取完成' });
      toast.success('文本提取成功！');
    } catch (error) {
      console.error('提取失败:', error);
      toast.error('文本提取失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '提取失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 生成知识卡片
  const handleExtractKnowledge = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'analyze', progress: 20, message: '正在分析 PDF 内容...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('max_cards', '20');

    try {
      console.log('开始生成知识卡片...');
      
      const response = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
        method: 'POST',
        body: formData
      });

      console.log('响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('错误响应:', errorText);
        throw new Error(`知识提取失败: ${errorText}`);
      }

      const result = await response.json();
      console.log('生成结果:', result);
      
      if (!result.success) {
        throw new Error(result.error || '知识提取失败');
      }
      
      if (!result.cards || !Array.isArray(result.cards) || result.cards.length === 0) {
        toast.warning('未能从 PDF 中提取到知识卡片，可能是扫描件或内容为空');
        setGeneratedCards([]);
        return;
      }
      
      const cards: KnowledgeCard[] = result.cards.map((card: any, index: number) => ({
        id: `card-${Date.now()}-${index}`,
        color: card.type === 'fact' ? 'blue' : 
               card.type === 'explanation' ? 'green' : 
               card.type === 'risk' ? 'yellow' : 'red',
        title: card.title || '无标题',
        content: card.content || '无内容',
        address: `PDF/${result.filename || 'unknown'}/Card-${index + 1}`,
        createdAt: new Date().toISOString(),
      }));

      setGeneratedCards(cards);
      setProcessingStatus({ stage: 'complete', progress: 100, message: '知识卡片生成完成' });
      toast.success(`成功生成 ${cards.length} 张知识卡片！`);
    } catch (error) {
      console.error('生成失败:', error);
      toast.error(`知识卡片生成失败: ${error}`);
      setProcessingStatus({ stage: 'error', progress: 0, message: '生成失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF 转 Excel
  const handleConvertToExcel = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'convert', progress: 30, message: '正在转换为 Excel...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('max_cards', '50');

    try {
      const response = await fetch(`${API_BASE}/api/pdf/export/four-color-excel`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Excel 转换失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${uploadedFile.name.replace('.pdf', '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 添加到历史记录
      const newTask: ConversionTask = {
        id: Date.now().toString(),
        file: uploadedFile,
        fileName: uploadedFile.name,
        targetFormat: 'excel',
        status: 'completed',
        progress: 100,
        createdAt: new Date()
      };
      setConversionHistory(prev => [newTask, ...prev]);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '转换完成' });
      toast.success('PDF 转 Excel 成功！');
    } catch (error) {
      console.error('转换失败:', error);
      toast.error('PDF 转 Excel 失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '转换失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF 转 Word
  const handleConvertToWord = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'convert', progress: 20, message: '正在分析 PDF...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('max_cards', '50');

    try {
      // 第一步：分析 PDF
      const analyzeResponse = await fetch(`${API_BASE}/api/pdf/generate/four-color-cards`, {
        method: 'POST',
        body: formData
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'PDF 分析失败');
      }

      const analysisResult = await analyzeResponse.json();

      if (!analysisResult.success || !analysisResult.cards) {
        throw new Error('PDF 分析失败');
      }

      setProcessingStatus({ stage: 'convert', progress: 60, message: '正在生成 Word...' });

      // 第二步：导出为 Word
      const cardsForExport = analysisResult.cards.map((card: any) => ({
        type: card.type === 'explanation' ? 'interpret' : card.type,
        title: card.title || '无标题',
        content: card.content || '无内容',
        tags: card.tags || [],
        source: uploadedFile.name
      }));

      const exportResponse = await fetch(`${API_BASE}/api/pdf/export/cards-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cards: cardsForExport,
          title: `${uploadedFile.name.replace('.pdf', '')}_分析报告`,
          author: 'Antinet 智能知识管家'
        })
      });

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Word 导出失败');
      }

      const blob = await exportResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${uploadedFile.name.replace('.pdf', '')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 添加到历史记录
      const newTask: ConversionTask = {
        id: Date.now().toString(),
        file: uploadedFile,
        fileName: uploadedFile.name,
        targetFormat: 'word',
        status: 'completed',
        progress: 100,
        createdAt: new Date()
      };
      setConversionHistory(prev => [newTask, ...prev]);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '转换完成' });
      toast.success('PDF 转 Word 成功！');
    } catch (error) {
      console.error('转换失败:', error);
      toast.error('PDF 转 Word 失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '转换失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 图片转 PDF
  const handleImagesToPDF = async () => {
    if (uploadedFiles.length < 1) {
      toast.error('请至少上传1张图片');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'convert', progress: 30, message: '正在合并为 PDF...' });

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/images-to-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`合并失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '合并完成' });
      toast.success('图片转 PDF 成功！');
    } catch (error) {
      console.error('合并失败:', error);
      toast.error('图片转 PDF 失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '合并失败' });
    } finally {
      setIsProcessing(false);
    }
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
      id: 'toExcel' as const,
      name: 'PDF转Excel',
      icon: <FileSpreadsheet size={20} />,
      description: '转换为 Excel 表格',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'toWord' as const,
      name: 'PDF转Word',
      icon: <FileType size={20} />,
      description: '转换为 Word 文档',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'fromImages' as const,
      name: '图片转PDF',
      icon: <FileImage size={20} />,
      description: '将多张图片合并为 PDF',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      id: 'history' as const,
      name: '转换记录',
      icon: <History size={20} />,
      description: '查看转换历史记录',
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

        {/* Feature Selection */}
        <div className="grid grid-cols-6 gap-3 mb-8">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              onClick={() => {
                setActiveFeature(feature.id);
                clearAllFiles();
                setAnalysisResult(null);
                setGeneratedCards([]);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                activeFeature === feature.id
                  ? `border-transparent bg-gradient-to-br ${feature.color} text-white shadow-lg`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`mb-2 ${activeFeature === feature.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {feature.icon}
              </div>
              <div className={`font-semibold text-sm ${activeFeature === feature.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                {feature.name}
              </div>
              <div className={`text-xs mt-1 ${activeFeature === feature.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {feature.description}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Upload & Controls */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              {activeFeature === 'history' ? (
                // 转换记录视图
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    转换记录
                  </h2>
                  
                  {conversionHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>暂无转换记录</p>
                      <p className="text-sm mt-1">转换的文件将显示在这里</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conversionHistory.map((task) => (
                        <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate flex-1">{task.fileName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              task.targetFormat === 'word' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {task.targetFormat === 'word' ? 'Word' : 'Excel'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {task.createdAt.toLocaleString('zh-CN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // 其他功能视图
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    {activeFeature === 'fromImages' ? <Image className="w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                    {activeFeature === 'fromImages' ? '上传图片' : '上传 PDF'}
                  </h2>

                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept={activeFeature === 'fromImages' ? ".jpg,.jpeg,.png,.bmp,.tiff" : ".pdf"}
                      onChange={activeFeature === 'fromImages' ? handleImageUpload : handleFileUpload}
                      multiple={activeFeature === 'fromImages'}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      {activeFeature === 'fromImages' ? <Image className="w-10 h-10 text-gray-400 mb-2 mx-auto" /> : <FileText className="w-10 h-10 text-gray-400 mb-2 mx-auto" />}
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {activeFeature === 'fromImages' ? '点击选择图片' : '点击选择 PDF 文件'}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {activeFeature === 'fromImages' ? '支持多选' : '单个文件'}
                      </p>
                    </button>
                  </div>

                  {/* File List for Images */}
                  {activeFeature === 'fromImages' && uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">已选择 {uploadedFiles.length} 个文件</span>
                        <button
                          onClick={clearAllFiles}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          清空
                        </button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <span className="truncate flex-1">{file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-600 ml-2"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Single File Display */}
                  {activeFeature !== 'fromImages' && uploadedFile && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate flex-1">
                          {uploadedFile.name}
                        </span>
                        <button
                          onClick={clearAllFiles}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 space-y-3">
                    {activeFeature === 'extract' && (
                      <button
                        onClick={handleExtractText}
                        disabled={!uploadedFile || isProcessing}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessing ? '提取中...' : '提取文本'}
                      </button>
                    )}

                    {activeFeature === 'generate' && (
                      <button
                        onClick={handleExtractKnowledge}
                        disabled={!uploadedFile || isProcessing}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessing ? '生成中...' : '生成知识卡片'}
                      </button>
                    )}

                    {activeFeature === 'toExcel' && (
                      <button
                        onClick={handleConvertToExcel}
                        disabled={!uploadedFile || isProcessing}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessing ? '转换中...' : '转换为 Excel'}
                      </button>
                    )}

                    {activeFeature === 'toWord' && (
                      <button
                        onClick={handleConvertToWord}
                        disabled={!uploadedFile || isProcessing}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessing ? '转换中...' : '转换为 Word'}
                      </button>
                    )}

                    {activeFeature === 'fromImages' && (
                      <button
                        onClick={handleImagesToPDF}
                        disabled={uploadedFiles.length < 1 || isProcessing}
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessing ? '合并中...' : `合并 ${uploadedFiles.length} 张图片`}
                      </button>
                    )}
                  </div>

                  {/* Processing Status */}
                  {isProcessing && processingStatus && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        <span className="text-sm font-medium">{processingStatus.message}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processingStatus.progress}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {processingStatus.progress}%
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Analysis Results */}
              {analysisResult && activeFeature === 'extract' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    分析结果
                  </h2>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {analysisResult.pageCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">页数</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {analysisResult.wordCount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">字数</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {analysisResult.tables.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">表格</div>
                    </div>
                  </div>

                  {analysisResult.summary && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">文档摘要</h3>
                      <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        {analysisResult.summary}
                      </p>
                    </div>
                  )}

                  {analysisResult.keyPoints.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">关键要点</h3>
                      <ul className="space-y-2">
                        {analysisResult.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.extractedText && (
                    <div>
                      <h3 className="font-semibold mb-2">提取的文本</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {analysisResult.extractedText.substring(0, 2000)}
                          {analysisResult.extractedText.length > 2000 && '...'}
                        </pre>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Knowledge Cards */}
              {generatedCards.length > 0 && activeFeature === 'generate' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Layers className="w-5 h-5 mr-2" />
                    知识卡片 ({generatedCards.length}张)
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {generatedCards.map((card) => (
                      <div
                        key={card.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          card.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' :
                          card.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-500' :
                          card.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                          'bg-red-50 dark:bg-red-900/20 border-red-500'
                        }`}
                      >
                        <div className={`font-semibold mb-2 ${
                          card.color === 'blue' ? 'text-blue-700 dark:text-blue-300' :
                          card.color === 'green' ? 'text-green-700 dark:text-green-300' :
                          card.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                          'text-red-700 dark:text-red-300'
                        }`}>
                          {card.title}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{card.content}</p>
                      </div>
                    ))}
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
                </motion.div>
              )}

              {/* Empty State */}
              {!isProcessing && !analysisResult && generatedCards.length === 0 && activeFeature !== 'history' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center"
                >
                  {activeFeature === 'toExcel' ? (
                    <>
                      <FileSpreadsheet className="w-16 h-16 mx-auto text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PDF 转 Excel</h3>
                      <p className="text-gray-600 dark:text-gray-400">将 PDF 转换为 Excel 表格格式</p>
                    </>
                  ) : activeFeature === 'toWord' ? (
                    <>
                      <FileType className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">PDF 转 Word</h3>
                      <p className="text-gray-600 dark:text-gray-400">将 PDF 转换为可编辑的 Word 文档</p>
                    </>
                  ) : activeFeature === 'fromImages' ? (
                    <>
                      <FileImage className="w-16 h-16 mx-auto text-teal-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">图片转 PDF</h3>
                      <p className="text-gray-600 dark:text-gray-400">将多张图片合并为一个 PDF 文件</p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{activeFeature === 'extract' ? '文本提取' : '生成卡片'}</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {activeFeature === 'extract' 
                          ? '上传 PDF 文件开始提取文本和表格' 
                          : '上传 PDF 文件生成四色知识卡片'}
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysisEnhanced;
