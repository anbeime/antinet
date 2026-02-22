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
  Image,
  FileImage,
  Compress,
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
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'merge' | 'split' | 'fromImages' | 'convert'>('extract');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 验证文件类型
    const validFiles = files.filter(file => file.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      toast.error('请选择有效的 PDF 文件');
      return;
    }

    if (activeFeature === 'merge') {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    } else {
      setUploadedFile(validFiles[0]);
    }
    
    setAnalysisResult(null);
    setGeneratedCards([]);
    toast.success(`已选择 ${validFiles.length} 个文件`);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 验证图片格式
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
      toast.error('请选择有效的图片文件（JPG/PNG/BMP/TIFF）');
      return;
    }

    setUploadedFiles(validFiles);
    toast.success(`已选择 ${validFiles.length} 张图片`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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

  // PDF 合并
  const handleMergePDF = async () => {
    if (uploadedFiles.length < 2) {
      toast.error('请至少上传2个 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'merge', progress: 30, message: '正在合并 PDF...' });

    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/merge`, {
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
      a.download = 'merged.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '合并完成' });
      toast.success('PDF 合并成功！');
    } catch (error) {
      console.error('合并失败:', error);
      toast.error('PDF 合并失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '合并失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF 拆分
  const handleSplitPDF = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'split', progress: 30, message: '正在拆分 PDF...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/split`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`拆分失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'split_pdfs.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '拆分完成' });
      toast.success('PDF 拆分成功！');
    } catch (error) {
      console.error('拆分失败:', error);
      toast.error('PDF 拆分失败');
      setProcessingStatus({ stage: 'error', progress: 0, message: '拆分失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF 转图片
  const handlePDFToImages = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'convert', progress: 30, message: '正在转换为图片...' });

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('format', 'jpg');
    formData.append('dpi', '150');

    try {
      const response = await fetch(`${API_BASE}/api/pdf/toolkit/pdf-to-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`转换失败: ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pdf_images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStatus({ stage: 'complete', progress: 100, message: '转换完成' });
      toast.success('PDF 转图片成功！');
    } catch (error) {
      console.error('转换失败:', error);
      toast.error('PDF 转图片失败');
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
      id: 'merge' as const,
      name: 'PDF合并',
      icon: <Combine size={20} />,
      description: '合并多个 PDF 文件',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'split' as const,
      name: 'PDF拆分',
      icon: <Scissors size={20} />,
      description: '拆分 PDF 页面',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'fromImages' as const,
      name: '图片转PDF',
      icon: <FileImage size={20} />,
      description: '将图片合并为 PDF',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      id: 'convert' as const,
      name: '格式转换',
      icon: <RefreshCw size={20} />,
      description: '转换为 Word/Excel',
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
        <div className="grid grid-cols-7 gap-3 mb-8">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveFeature(feature.id);
                setUploadedFile(null);
                setUploadedFiles([]);
              }}
              className={`p-3 rounded-xl border-2 transition-all ${
                activeFeature === feature.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 mx-auto`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold text-xs mb-1">{feature.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{feature.description}</p>
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
                {activeFeature === 'fromImages' ? '上传图片' : '上传 PDF'}
              </h3>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-red-400 dark:hover:border-red-500 transition-colors">
                <input
                  type="file"
                  accept={activeFeature === 'fromImages' ? ".jpg,.jpeg,.png,.bmp,.tiff" : ".pdf"}
                  onChange={activeFeature === 'fromImages' ? handleImageUpload : handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  multiple={activeFeature === 'merge' || activeFeature === 'fromImages'}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploadedFile || uploadedFiles.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {uploadedFile ? uploadedFile.name : `已选择 ${uploadedFiles.length} 个文件`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">点击更换文件</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {activeFeature === 'fromImages' ? <Image className="w-10 h-10 text-gray-400 mb-2" /> : <FileText className="w-10 h-10 text-gray-400 mb-2" />}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeFeature === 'fromImages' ? '点击选择图片' : '点击选择 PDF 文件'}
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* File List for Merge/ImagesToPDF */}
              {(activeFeature === 'merge' || activeFeature === 'fromImages') && uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">已选择的文件：</p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-2 text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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

                {activeFeature === 'merge' && (
                  <button
                    onClick={handleMergePDF}
                    disabled={uploadedFiles.length < 2 || isProcessing}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? '合并中...' : `合并 ${uploadedFiles.length} 个 PDF`}
                  </button>
                )}

                {activeFeature === 'split' && (
                  <button
                    onClick={handleSplitPDF}
                    disabled={!uploadedFile || isProcessing}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? '拆分中...' : '拆分 PDF'}
                  </button>
                )}

                {activeFeature === 'fromImages' && (
                  <button
                    onClick={handleImagesToPDF}
                    disabled={uploadedFiles.length < 1 || isProcessing}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? '合并中...' : `合并 ${uploadedFiles.length} 张图片`}
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

            {/* Empty State */}
            {!isProcessing && !analysisResult && generatedCards.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                {activeFeature === 'merge' ? (
                  <>
                    <Combine className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">PDF 合并</h3>
                    <p className="text-gray-600 dark:text-gray-400">选择多个 PDF 文件进行合并</p>
                  </>
                ) : activeFeature === 'split' ? (
                  <>
                    <Scissors className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">PDF 拆分</h3>
                    <p className="text-gray-600 dark:text-gray-400">将 PDF 拆分为多个单页文件</p>
                  </>
                ) : activeFeature === 'fromImages' ? (
                  <>
                    <FileImage className="w-16 h-16 mx-auto text-teal-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">图片转 PDF</h3>
                    <p className="text-gray-600 dark:text-gray-400">将多张图片合并为一个 PDF</p>
                  </>
                ) : activeFeature === 'convert' ? (
                  <>
                    <RefreshCw className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">格式转换</h3>
                    <p className="text-gray-600 dark:text-gray-400">转换为 Word、Excel 等格式</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">开始分析</h3>
                    <p className="text-gray-600 dark:text-gray-400">上传 PDF 文件并选择功能开始分析</p>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysisEnhanced;
