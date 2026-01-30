import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Download, Settings, BarChart3, CheckCircle, Loader } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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
  entities: { text: string; type: string; confidence: number }[];
}

const PDFAnalysis: React.FC = () => {
  useTheme();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processingOptions, setProcessingOptions] = useState({
    extractText: true,
    generateSummary: true,
    extractKeyPoints: true,
    entityRecognition: true,
    ocrEnabled: false
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setAnalysisResult(null);
    }
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setProcessingStatus({ stage: 'upload', progress: 0, message: '正在上传文件...' });

    const stages = [
      { stage: 'upload', message: '正在上传文件...', duration: 1000 },
      { stage: 'extract', message: '正在提取文本内容...', duration: 2000 },
      { stage: 'analyze', message: '正在进行AI分析...', duration: 3000 },
      { stage: 'summarize', message: '正在生成摘要...', duration: 1500 },
      { stage: 'complete', message: '处理完成', duration: 500 }
    ];

    let currentProgress = 0;
    stages.forEach((stageInfo, index) => {
      setTimeout(() => {
        currentProgress += (index + 1) * 20;
        setProcessingStatus({ 
          stage: stageInfo.stage, 
          progress: Math.min(currentProgress, 100), 
          message: stageInfo.message 
        });

        if (stageInfo.stage === 'complete') {
          setIsProcessing(false);
          setAnalysisResult({
            fileName: uploadedFile?.name || 'document.pdf',
            pageCount: 12,
            wordCount: 8540,
            extractedText: '这是从PDF中提取的示例文本内容。实际使用时，这里会包含完整的文档文本内容...',
            summary: '本文档介绍了Antinet智能知识管家的核心功能和架构设计，重点阐述了基于骁龙AIPC平台的端侧智能数据处理能力。',
            keyPoints: [
              '基于NPU加速的轻量化大模型推理',
              '四色卡片知识管理系统',
              '自然语言驱动的数据分析',
              '端侧隐私保护与数据不出域',
              '8-Agent智能协作系统'
            ],
            entities: [
              { text: 'Antinet', type: 'PRODUCT', confidence: 0.95 },
              { text: '骁龙AIPC', type: 'PRODUCT', confidence: 0.92 },
              { text: 'NPU', type: 'TECHNOLOGY', confidence: 0.88 },
              { text: '四色卡片', type: 'CONCEPT', confidence: 0.85 }
            ]
          });
        }
      }, stageInfo.duration + index * 500);
    });
  };

  const downloadResults = () => {
    // 模拟下载功能
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysisResult?.fileName.replace('.pdf', '')}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                PDF智能分析
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                基于NPU加速的PDF文档深度分析与信息提取
              </p>
            </div>
          </div>
        </motion.div>

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
                    {uploadedFile ? uploadedFile.name : '点击选择PDF文件'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    支持最大50MB的PDF文档
                  </p>
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

            {/* Processing Options */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-red-500" />
                分析选项
              </h3>
              
              <div className="space-y-3">
                {Object.keys(processingOptions).map((key) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {key === 'extractText' && '提取文本内容'}
                      {key === 'generateSummary' && '生成智能摘要'}
                      {key === 'extractKeyPoints' && '提取关键要点'}
                      {key === 'entityRecognition' && '实体识别'}
                      {key === 'ocrEnabled' && 'OCR文字识别'}
                    </span>
                    <input
                      type="checkbox"
                      checked={processingOptions[key as keyof typeof processingOptions]}
                      onChange={(e) => setProcessingOptions(prev => ({...prev, [key]: e.target.checked}))}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={simulateProcessing}
              disabled={!uploadedFile || isProcessing}
              className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isProcessing ? '分析中...' : '开始智能分析'}
            </button>
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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-red-500" />
                      分析结果
                    </h3>
                    <button 
                      onClick={downloadResults}
                      className="flex items-center space-x-2 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出</span>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{analysisResult.pageCount}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">页数</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analysisResult.wordCount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">词数</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analysisResult.keyPoints.length}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">要点</div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">智能摘要</h4>
                    <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* Key Points */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">关键要点</h4>
                    <ul className="space-y-2">
                      {analysisResult.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Entities */}
                  <div>
                    <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">识别实体</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.entities.map((entity, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                          {entity.text}
                          <span className="text-xs text-gray-500 ml-1">({entity.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {!analysisResult && !isProcessing && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">等待文档分析</h3>
                <p className="text-gray-500 dark:text-gray-400">上传PDF文档并点击分析开始智能处理</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnalysis;