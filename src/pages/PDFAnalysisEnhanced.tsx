import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Upload,
  Download,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader,
  FileDown,
  Layers,
  Scissors,
  Combine,
} from 'lucide-react';
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

const PDFAnalysisEnhanced: React.FC = () => {
  const { theme } = useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [generatedCards, setGeneratedCards] = useState<KnowledgeCard[]>([]);
  const [activeFeature, setActiveFeature] = useState<'extract' | 'generate' | 'merge' | 'split'>('extract');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setAnalysisResult(null);
      toast.success(`已选择文件: ${file.name}`);
    } else {
      toast.error('请选择有效的 PDF 文件');
    }
  };

  const handleExtractText = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('preserve_layout', 'true');

      setProcessingStatus({ stage: 'extract', progress: 30, message: '正在提取文本...' });

      const response = await fetch('http://localhost:8000/api/pdf/extract/text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文本提取失败');
      }

      const result = await response.json();

      setProcessingStatus({ stage: 'analyze', progress: 70, message: '正在分析内容...' });

      // 模拟分析延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setAnalysisResult({
        fileName: result.filename,
        pageCount: result.pages.length,
        wordCount: result.full_text.length,
        extractedText: result.full_text,
        summary: result.full_text.substring(0, 200) + '...',
        keyPoints: ['关键点 1', '关键点 2', '关键点 3'],
        tables: [],
        suggestedCards: ['fact', 'interpret'],
      });

      setProcessingStatus({ stage: 'complete', progress: 100, message: '处理完成' });
      toast.success('文本提取成功！');
    } catch (error) {
      console.error('提取失败:', error);
      toast.error('文本提取失败，请检查后端服务');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(null), 2000);
    }
  };

  const handleExtractKnowledge = async () => {
    if (!uploadedFile) {
      toast.error('请先上传 PDF 文件');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      setProcessingStatus({ stage: 'extract', progress: 30, message: '正在提取知识...' });

      const response = await fetch('http://localhost:8000/api/pdf/extract/knowledge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('知识提取失败');
      }

      const result = await response.json();

      setProcessingStatus({ stage: 'generate', progress: 70, message: '正在生成卡片...' });

      // 生成知识卡片
      const cards: KnowledgeCard[] = result.suggested_cards.map((type: string, index: number) => ({
        id: `card-${Date.now()}-${index}`,
        color: type === 'fact' ? 'blue' : type === 'interpret' ? 'green' : type === 'risk' ? 'yellow' : 'red',
        title: `从 ${result.filename} 提取的知识 ${index + 1}`,
        content: result.text_content.substring(index * 100, (index + 1) * 100),
        address: `PDF/${result.filename}/Page-${index + 1}`,
        createdAt: new Date().toISOString(),
      }));

      setGeneratedCards(cards);
      setProcessingStatus({ stage: 'complete', progress: 100, message: '知识卡片生成完成' });
      toast.success(`成功生成 ${cards.length} 张知识卡片！`);
    } catch (error) {
      console.error('知识提取失败:', error);
      toast.error('知识提取失败，请检查后端服务');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(null), 2000);
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
      id: 'merge' as const,
      name: 'PDF 合并',
      icon: <Combine size={20} />,
      description: '合并多个 PDF 文件',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'split' as const,
      name: 'PDF 拆分',
      icon: <Scissors size={20} />,
      description: '拆分 PDF 为多个文件',
      color: 'from-orange-500 to-red-500',
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
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  PDF 智能分析
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  基于 NPU 加速的 PDF 文档深度分析与信息提取
                </p>
              </div>
            </div>

            {/* PDF 导出按钮 */}
            {generatedCards.length > 0 && (
              <PDFExporter
                cards={generatedCards}
                title="Antinet 知识卡片导出"
                author="Antinet 智能知识管家"
                fileName={`antinet-cards-${Date.now()}.pdf`}
              >
                <FileDown className="w-4 h-4 mr-2 inline" />
                导出卡片为 PDF
              </PDFExporter>
            )}
          </div>
        </motion.div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  <FileText className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {uploadedFile ? uploadedFile.name : '点击选择 PDF 文件'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">支持最大 50MB 的 PDF 文档</p>
                </label>
              </div>

              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700 dark:text-green-300">文件已上传</span>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
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
            </div>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Processing Status */}
            {isProcessing && processingStatus && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">处理进度</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{processingStatus.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <motion.div
                    className="bg-gradient-to-r from-red-500 to-orange-600 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${processingStatus.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {processingStatus.message}
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-red-500" />
                      文档摘要
                    </h3>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        页数: <strong>{analysisResult.pageCount}</strong>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        字数: <strong>{analysisResult.wordCount}</strong>
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{analysisResult.summary}</p>
                </div>

                {/* Extracted Text */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">提取的文本</h3>
                  <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {analysisResult.extractedText}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Generated Cards */}
            {generatedCards.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">生成的知识卡片</h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">共 {generatedCards.length} 张</span>
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
              </motion.div>
            )}

            {/* Empty State */}
            {!isProcessing && !analysisResult && generatedCards.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">开始分析</h3>
                <p className="text-gray-600 dark:text-gray-400">上传 PDF 文件并选择功能开始分析</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysisEnhanced;
